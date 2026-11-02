from typing import Optional
from pydantic import BaseModel


class DoctorCreate(BaseModel):
    name: str
    department: str
    available: bool = True
    average_consultation_time: int = 15


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    available: Optional[bool] = None
    average_consultation_time: Optional[int] = None


class DoctorResponse(BaseModel):
    id: int
    name: str
    department: str
    available: bool
    average_consultation_time: int

    class Config:
        from_attributes = True

