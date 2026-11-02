from typing import Optional
from pydantic import BaseModel
from app.schemas.patient import PatientResponse
from app.schemas.doctor import DoctorResponse


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: str  # YYYY-MM-DD
    appointment_time: str  # HH:MM
    priority: Optional[str] = "Normal"     # Normal, Priority, Emergency
    status: Optional[str] = "Scheduled"    # Scheduled, Waiting, In Consultation, Completed, Cancelled


class AppointmentUpdate(BaseModel):
    priority: Optional[str] = None
    status: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: str
    appointment_time: str
    priority: str
    status: str
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None

    class Config:
        from_attributes = True
