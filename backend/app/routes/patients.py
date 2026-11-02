from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all patient records from SQLite."""
    # If role is patient, they can see their own linked records, staff/admin see all
    if current_user.role == "patient":
        return db.query(Patient).filter(Patient.user_id == current_user.id).all()
    return db.query(Patient).order_by(Patient.id.desc()).all()


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_data: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save a new patient record into the SQLite database."""
    # Associate with user if not explicitly provided and user is a patient
    user_id = patient_data.user_id
    if user_id is None and current_user.role == "patient":
        user_id = current_user.id

    new_patient = Patient(
        name=patient_data.name.strip(),
        age=patient_data.age,
        gender=patient_data.gender,
        phone=patient_data.phone.strip(),
        user_id=user_id
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve a specific patient record by ID."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    if current_user.role == "patient" and patient.user_id is not None and patient.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update patient information in SQLite."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id is not None and patient.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if patient_data.name is not None:
        patient.name = patient_data.name.strip()
    if patient_data.age is not None:
        patient.age = patient_data.age
    if patient_data.gender is not None:
        patient.gender = patient_data.gender
    if patient_data.phone is not None:
        patient.phone = patient_data.phone.strip()

    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete patient record from SQLite."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id is not None and patient.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(patient)
    db.commit()
    return {"message": f"Patient #{patient_id} ({patient.name}) deleted successfully"}

