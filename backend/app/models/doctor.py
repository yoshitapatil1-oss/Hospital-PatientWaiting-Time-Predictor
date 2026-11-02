from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    available = Column(Boolean, default=True, nullable=False)
    average_consultation_time = Column(Integer, default=15, nullable=False)  # in minutes

    appointments = relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
