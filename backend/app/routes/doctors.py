from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.doctor import Doctor
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

INITIAL_DOCTORS = [
    {"name": "Dr. Aarav Sharma", "department": "General Medicine", "average_consultation_time": 15, "available": True},
    {"name": "Dr. Priya Patel", "department": "Cardiology", "average_consultation_time": 25, "available": True},
    {"name": "Dr. Rohan Deshmukh", "department": "Orthopedics", "average_consultation_time": 20, "available": True},
    {"name": "Dr. Ananya Joshi", "department": "Pediatrics", "average_consultation_time": 15, "available": True},
    {"name": "Dr. Vikram Kulkarni", "department": "Emergency Care", "average_consultation_time": 10, "available": True},
]


def seed_default_doctors(db: Session):
    """Ensure baseline hospital doctors exist in SQLite."""
    count = db.query(Doctor).count()
    if count == 0:
        for doc in INITIAL_DOCTORS:
            db.add(Doctor(**doc))
        db.commit()


@router.get("", response_model=List[DoctorResponse])
def get_doctors(db: Session = Depends(get_db)):
    """Retrieve all doctor records from SQLite, seeding defaults if empty."""
    seed_default_doctors(db)
    return db.query(Doctor).order_by(Doctor.id.asc()).all()


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new doctor to the SQLite database (Admin & Receptionist only)."""
    if current_user.role not in ["admin", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and receptionists can register doctors."
        )

    new_doc = Doctor(
        name=doctor_data.name.strip(),
        department=doctor_data.department.strip(),
        available=doctor_data.available,
        average_consultation_time=doctor_data.average_consultation_time
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc


@router.patch("/{doctor_id}/toggle-availability", response_model=DoctorResponse)
def toggle_availability(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle a doctor's active availability in SQLite."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    doctor.available = not doctor.available
    db.commit()
    db.refresh(doctor)
    return doctor


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int,
    doctor_data: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update doctor details in SQLite (Admin & Receptionist only)."""
    if current_user.role not in ["admin", "receptionist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and receptionists can modify doctor details."
        )

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    if doctor_data.name is not None:
        doctor.name = doctor_data.name.strip()
    if doctor_data.department is not None:
        doctor.department = doctor_data.department.strip()
    if doctor_data.available is not None:
        doctor.available = doctor_data.available
    if doctor_data.average_consultation_time is not None:
        doctor.average_consultation_time = doctor_data.average_consultation_time

    db.commit()
    db.refresh(doctor)
    return doctor


@router.delete("/{doctor_id}")
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a doctor record from SQLite (Admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete doctor records."
        )

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    db.delete(doctor)
    db.commit()
    return {"message": f"Doctor #{doctor_id} ({doctor.name}) deleted successfully"}

