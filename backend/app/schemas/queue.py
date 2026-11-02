from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel


class QueueItemCreate(BaseModel):
    department: str
    doctor_id: Optional[int] = None
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    patients_waiting: int = 1
    patients_ahead: int = 0
    emergency_patients: int = 0
    current_status: Optional[str] = "Waiting"  # Waiting, In Consultation, Completed, Cancelled
    priority: Optional[str] = "Normal"        # Normal, Priority, Emergency


class QueueItemUpdate(BaseModel):
    department: Optional[str] = None
    doctor_id: Optional[int] = None
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    patients_waiting: Optional[int] = None
    patients_ahead: Optional[int] = None
    emergency_patients: Optional[int] = None
    current_status: Optional[str] = None
    priority: Optional[str] = None
    estimated_wait_time: Optional[float] = None


class QueueItemResponse(BaseModel):
    id: int
    department: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    patients_waiting: int
    patients_ahead: int
    emergency_patients: int
    current_status: str
    priority: str
    estimated_wait_time: float
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True


class QueueDashboardStats(BaseModel):
    total_patients: int
    current_waiting_patients: int
    average_predicted_waiting_time: float
    emergency_cases: int
    available_doctors: int
    queue_status: str  # Low, Moderate, High
