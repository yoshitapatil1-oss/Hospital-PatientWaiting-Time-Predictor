from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AIChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"  # en, mr, hi
    department: Optional[str] = None


class AIChatResponse(BaseModel):
    response: str
    detected_intent: str
    language: str
    context_data: Optional[Dict[str, Any]] = None
    suggested_questions: Optional[List[str]] = None


class DepartmentWaitInsight(BaseModel):
    department: str
    avg_wait_minutes: float
    waiting_patients: int
    doctor_count: int


class DoctorAvailabilityInsight(BaseModel):
    total_doctors: int
    available_doctors: int
    unavailable_doctors: int
    departments_with_no_doctor: List[str]
    doctor_workload: List[Dict[str, Any]]


class AIAdminInsightsResponse(BaseModel):
    highest_waiting_department: DepartmentWaitInsight
    peak_hospital_hours: Dict[str, Any]
    high_queue_alerts: List[Dict[str, Any]]
    doctor_availability: DoctorAvailabilityInsight
    staffing_recommendations: List[Dict[str, Any]]
    analyzed_at: str
