from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.patients import router as patients_router
from app.routes.doctors import router as doctors_router
from app.routes.departments import router as departments_router
from app.routes.appointments import router as appointments_router
from app.routes.predictions import router as predictions_router
from app.routes.queue import router as queue_router
from app.routes.ai import router as ai_router

__all__ = [
    "health_router",
    "auth_router",
    "patients_router",
    "doctors_router",
    "departments_router",
    "appointments_router",
    "predictions_router",
    "queue_router",
    "ai_router",
]


