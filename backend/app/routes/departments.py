from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.doctor import Doctor
from app.models.queue import QueueItem
from app.models.prediction import PredictionRecord

router = APIRouter(prefix="/api/departments", tags=["Departments"])

DEPARTMENTS = [
    "General Medicine",
    "Cardiology",
    "Orthopedics",
    "Pediatrics",
    "Emergency Care",
    "Neurology",
    "Dermatology",
]


@router.get("/list", response_model=List[str])
def get_department_names():
    """Return list of supported hospital departments."""
    return DEPARTMENTS


@router.get("", response_model=List[Dict[str, Any]])
def get_departments_overview(db: Session = Depends(get_db)):
    """Retrieve operational capacity and live queue metrics for each department."""
    overview = []

    for dept in DEPARTMENTS:
        doctors = db.query(Doctor).filter(Doctor.department == dept).all()
        total_docs = len(doctors)
        avail_docs = sum(1 for d in doctors if d.available)
        avg_consult = (
            sum(d.average_consultation_time for d in doctors) / total_docs
            if total_docs > 0
            else 15.0
        )

        # Active queue
        queues = db.query(QueueItem).filter(
            QueueItem.department == dept,
            QueueItem.current_status.in_(["Waiting", "In Consultation"])
        ).all()

        waiting_count = sum(q.patients_waiting for q in queues if q.current_status == "Waiting")
        emergency_count = sum(q.emergency_patients for q in queues) + sum(1 for q in queues if q.priority == "Emergency")

        # Average wait time
        recent_preds = db.query(PredictionRecord.predicted_waiting_time).filter(
            PredictionRecord.department == dept
        ).order_by(PredictionRecord.id.desc()).limit(10).all()

        if recent_preds:
            avg_wait = round(sum(p[0] for p in recent_preds) / len(recent_preds), 1)
        elif queues:
            avg_wait = round(sum(q.estimated_wait_time for q in queues) / len(queues), 1)
        else:
            avg_wait = round(float(avg_consult * max(1, waiting_count) / max(1, avail_docs)), 1)

        # Operational status
        if avail_docs == 0:
            status = "No Doctor Available"
        elif waiting_count >= 10 or emergency_count >= 2:
            status = "High Congestion"
        elif waiting_count >= 4:
            status = "Moderate Load"
        else:
            status = "Optimal"

        overview.append({
            "name": dept,
            "total_doctors": total_docs,
            "available_doctors": avail_docs,
            "waiting_patients": waiting_count,
            "emergency_cases": emergency_count,
            "average_consultation_time": round(avg_consult, 1),
            "estimated_wait_time": avg_wait,
            "status": status,
        })

    return overview
