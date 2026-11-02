from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="patient", nullable=False)  # patient, receptionist, admin
    language = Column(String(10), default="en", nullable=False)   # en, mr, hi
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patients = relationship("Patient", back_populates="user", cascade="all, delete-orphan")
