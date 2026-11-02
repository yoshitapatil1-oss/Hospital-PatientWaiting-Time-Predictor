from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    user_id: Optional[int] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    phone: str
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

