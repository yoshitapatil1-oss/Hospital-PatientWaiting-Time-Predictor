from app.schemas.user import UserRegister, UserLogin, UserResponse, Token
from app.schemas.patient import PatientCreate, PatientResponse
from app.schemas.doctor import DoctorCreate, DoctorResponse
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    PredictionHistoryItem,
    ModelMetadataResponse
)
from app.schemas.queue import (
    QueueItemCreate,
    QueueItemUpdate,
    QueueItemResponse,
    QueueDashboardStats
)
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIAdminInsightsResponse,
    DepartmentWaitInsight,
    DoctorAvailabilityInsight
)

__all__ = [
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "Token",
    "PatientCreate",
    "PatientResponse",
    "DoctorCreate",
    "DoctorResponse",
    "AppointmentCreate",
    "AppointmentUpdate",
    "AppointmentResponse",
    "PredictionRequest",
    "PredictionResponse",
    "PredictionHistoryItem",
    "ModelMetadataResponse",
    "QueueItemCreate",
    "QueueItemUpdate",
    "QueueItemResponse",
    "QueueDashboardStats",
    "AIChatRequest",
    "AIChatResponse",
    "AIAdminInsightsResponse",
    "DepartmentWaitInsight",
    "DoctorAvailabilityInsight",
]
