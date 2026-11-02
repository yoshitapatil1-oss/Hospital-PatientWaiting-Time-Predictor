from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    department = Column(String(100), nullable=False)
    patients_waiting = Column(Integer, nullable=False)
    patients_ahead = Column(Integer, nullable=False)
    emergency_count = Column(Integer, nullable=False, default=0)
    available_doctors = Column(Integer, nullable=False, default=1)
    average_consultation_time = Column(Float, nullable=False, default=15.0)
    priority = Column(String(50), nullable=False, default="Normal")
    predicted_waiting_time = Column(Float, nullable=False)
    prediction_unit = Column(String(20), nullable=False, default="minutes")
    model_name = Column(String(100), nullable=False, default="RandomForestRegressor")
    model_version = Column(String(20), nullable=False, default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", backref="predictions")
    doctor = relationship("Doctor", backref="predictions")
