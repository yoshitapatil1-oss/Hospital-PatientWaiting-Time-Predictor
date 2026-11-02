from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all appointments with patient and doctor details."""
    query = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    )

    # Patient users only see their own appointments
    if current_user.role == "patient":
        patient_ids = [p.id for p in db.query(Patient.id).filter(Patient.user_id == current_user.id).all()]
        query = query.filter(Appointment.patient_id.in_(patient_ids))

    return query.order_by(Appointment.id.desc()).all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_by_id(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """View a single appointment by its ID."""
    appt = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == appointment_id).first()

    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    # If role is patient, ensure ownership if patient is linked to a user account
    if current_user.role == "patient" and appt.patient and appt.patient.user_id is not None and appt.patient.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return appt


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def book_appointment(
    appt_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Book a new appointment and save it into SQLite."""
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == appt_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == appt_data.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    new_appt = Appointment(
        patient_id=appt_data.patient_id,
        doctor_id=appt_data.doctor_id,
        appointment_date=appt_data.appointment_date,
        appointment_time=appt_data.appointment_time,
        priority=appt_data.priority or "Normal",
        status=appt_data.status or "Scheduled"
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    return db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == new_appt.id).first()


@router.put("/{appointment_id}", response_model=AppointmentResponse)
@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: int,
    update_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update appointment status or priority in SQLite."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if update_data.status is not None:
        appt.status = update_data.status
    if update_data.priority is not None:
        appt.priority = update_data.priority

    db.commit()
    db.refresh(appt)

    return db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == appt.id).first()


@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an appointment and record the status change in SQLite."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    appt.status = "Cancelled"
    db.commit()
    db.refresh(appt)

    return db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == appt.id).first()


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete or cancel an appointment from SQLite."""
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    db.delete(appt)
    db.commit()
    return {"message": f"Appointment #{appointment_id} deleted successfully"}
