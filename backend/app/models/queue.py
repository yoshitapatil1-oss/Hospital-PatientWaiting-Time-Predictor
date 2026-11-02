from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class QueueItem(Base):
    __tablename__ = "queues"

    id = Column(Integer, primary_key=True, index=True)
    department = Column(String(100), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    patient_name = Column(String(100), nullable=True)
    patients_waiting = Column(Integer, nullable=False, default=1)
    patients_ahead = Column(Integer, nullable=False, default=0)
    emergency_patients = Column(Integer, nullable=False, default=0)
    current_status = Column(String(50), nullable=False, default="Waiting")  # Waiting, In Consultation, Completed, Cancelled
    priority = Column(String(30), nullable=False, default="Normal")  # Normal, Priority, Emergency
    estimated_wait_time = Column(Float, nullable=False, default=15.0)  # in minutes (from ML model)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    doctor = relationship("Doctor", backref="queue_entries")
    patient = relationship("Patient", backref="queue_entries")
