from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal
# Import all models to ensure metadata registration
import app.models  # noqa: F401
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.patients import router as patients_router
from app.routes.doctors import router as doctors_router, seed_default_doctors
from app.routes.departments import router as departments_router
from app.routes.appointments import router as appointments_router
from app.routes.predictions import router as predictions_router
from app.routes.queue import router as queue_router, seed_default_queues
from app.routes.ai import router as ai_router

# Initialize SQLite database schema
Base.metadata.create_all(bind=engine)

# Seed initial doctors and queue records if tables are empty
db_init = SessionLocal()
try:
    seed_default_doctors(db_init)
    seed_default_queues(db_init)
finally:
    db_init.close()

app = FastAPI(
    title="Hospital Patient Waiting-Time Predictor API",
    description="Backend API for hospital patient management, live queue management, appointments, ML-powered waiting-time predictions, and multilingual AI assistant.",
    version="1.0.0"
)

# Configure CORS to allow frontend web, Capacitor Android, emulator (10.0.2.2), and LAN devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost",
        "https://localhost",
        "capacitor://localhost",
        "http://10.0.2.2:8000",
        "http://10.0.2.2:5173",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modular routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(doctors_router)
app.include_router(departments_router)
app.include_router(appointments_router)
app.include_router(predictions_router)
app.include_router(queue_router)
app.include_router(ai_router)


@app.get("/")
def read_root():
    return {
        "message": "Hospital Patient Waiting-Time Predictor API is running",
        "docs": "/docs",
        "health": "/api/health",
        "version": "1.0.0",
        "endpoints": {
            "ai_chat": "POST /api/ai/chat",
            "ai_insights": "GET /api/ai/insights",
            "queue": "GET, POST /api/queue",
            "queue_stats": "GET /api/queue/stats",
            "queue_item": "PUT, DELETE /api/queue/{id}",
            "predict": "POST /api/predictions/predict",
            "model_info": "GET /api/predictions/model-info",
            "auth_register": "POST /api/auth/register",
            "auth_login": "POST /api/auth/login",
            "auth_me": "GET /api/auth/me",
            "patients": "/api/patients",
            "doctors": "/api/doctors",
            "departments": "/api/departments",
            "appointments": "/api/appointments"
        }
    }


