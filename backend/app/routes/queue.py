from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.queue import QueueItem
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.models.prediction import PredictionRecord
from app.schemas.queue import (
    QueueItemCreate,
    QueueItemUpdate,
    QueueItemResponse,
    QueueDashboardStats,
)
from app.services.auth import get_current_user
from app.ml.predict import predict_waiting_time

router = APIRouter(prefix="/api/queue", tags=["Queue Management"])


def _format_queue_response(item: QueueItem) -> QueueItemResponse:
    doc_name = item.doctor.name if item.doctor else None
    pat_name = item.patient.name if item.patient else (item.patient_name or "Walk-in Patient")
    return QueueItemResponse(
        id=item.id,
        department=item.department,
        doctor_id=item.doctor_id,
        doctor_name=doc_name,
        patient_id=item.patient_id,
        patient_name=pat_name,
        patients_waiting=item.patients_waiting,
        patients_ahead=item.patients_ahead,
        emergency_patients=item.emergency_patients,
        current_status=item.current_status,
        priority=item.priority,
        estimated_wait_time=item.estimated_wait_time,
        created_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else "",
        updated_at=item.updated_at.strftime("%Y-%m-%d %H:%M:%S") if item.updated_at else "",
    )


@router.get("", response_model=List[QueueItemResponse])
def get_queue(
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve hospital queue entries from SQLite."""
    query = db.query(QueueItem).options(
        joinedload(QueueItem.doctor),
        joinedload(QueueItem.patient)
    )

    if department:
        query = query.filter(QueueItem.department == department)
    if status_filter:
        query = query.filter(QueueItem.current_status == status_filter)

    items = query.order_by(QueueItem.id.desc()).all()
    return [_format_queue_response(item) for item in items]


@router.get("/stats", response_model=QueueDashboardStats)
def get_queue_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate real hospital queue and patient dashboard metrics from SQLite."""
    # Total patients count
    total_patients = db.query(Patient).count()

    # Active queue items (not completed or cancelled)
    active_queues = db.query(QueueItem).filter(
        QueueItem.current_status.in_(["Waiting", "In Consultation"])
    ).all()

    current_waiting = 0
    emergency_cases = 0
    for q in active_queues:
        if q.current_status == "Waiting":
            current_waiting += max(1, q.patients_waiting)
        emergency_cases += q.emergency_patients
        if q.priority == "Emergency":
            emergency_cases += 1

    # Available doctors
    available_doctors = db.query(Doctor).filter(Doctor.available == True).count()

    # Average predicted waiting time from recent predictions or active queues
    recent_predictions = db.query(PredictionRecord.predicted_waiting_time).order_by(
        PredictionRecord.id.desc()
    ).limit(20).all()

    if recent_predictions:
        avg_wait = sum(r[0] for r in recent_predictions) / len(recent_predictions)
    elif active_queues:
        avg_wait = sum(q.estimated_wait_time for q in active_queues) / len(active_queues)
    else:
        avg_wait = 20.0

    avg_wait = round(float(avg_wait), 1)

    # Determine Queue Status: Low, Moderate, High
    if current_waiting <= 5 and emergency_cases == 0:
        queue_status = "Low"
    elif current_waiting <= 15 and emergency_cases <= 2:
        queue_status = "Moderate"
    else:
        queue_status = "High"

    return QueueDashboardStats(
        total_patients=total_patients,
        current_waiting_patients=current_waiting,
        average_predicted_waiting_time=avg_wait,
        emergency_cases=emergency_cases,
        available_doctors=available_doctors,
        queue_status=queue_status,
    )


@router.post("", response_model=QueueItemResponse, status_code=status.HTTP_201_CREATED)
def create_queue_entry(
    queue_data: QueueItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new queue entry to SQLite and predict estimated wait time using ML."""
    doctor = None
    if queue_data.doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == queue_data.doctor_id).first()

    patient = None
    if queue_data.patient_id:
        patient = db.query(Patient).filter(Patient.id == queue_data.patient_id).first()

    dept = queue_data.department or (doctor.department if doctor else "General Medicine")
    consult_time = doctor.average_consultation_time if doctor else 15.0

    # Calculate estimated waiting time with ML Random Forest
    now = datetime.now()
    available_doc_count = db.query(Doctor).filter(Doctor.available == True).count() or 1

    ml_features = {
        "department": dept,
        "patients_waiting": queue_data.patients_waiting,
        "patients_ahead": queue_data.patients_ahead,
        "emergency_count": queue_data.emergency_patients,
        "available_doctors": available_doc_count,
        "average_consultation_time": consult_time,
        "hour": now.hour,
        "day_of_week": now.weekday(),
        "priority": queue_data.priority or "Normal",
        "previous_average_waiting_time": 25.0,
    }

    try:
        pred_res = predict_waiting_time(ml_features)
        predicted_time = pred_res["predicted_waiting_time"]
    except Exception as e:
        # Fallback to realistic calculation if ML invocation fails
        predicted_time = round(max(5.0, (queue_data.patients_ahead + 1) * (consult_time / available_doc_count)), 1)

    new_queue = QueueItem(
        department=dept,
        doctor_id=queue_data.doctor_id,
        patient_id=queue_data.patient_id,
        patient_name=queue_data.patient_name or (patient.name if patient else "Walk-in Patient"),
        patients_waiting=queue_data.patients_waiting,
        patients_ahead=queue_data.patients_ahead,
        emergency_patients=queue_data.emergency_patients,
        current_status=queue_data.current_status or "Waiting",
        priority=queue_data.priority or "Normal",
        estimated_wait_time=predicted_time,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_queue)
    db.commit()
    db.refresh(new_queue)

    item = db.query(QueueItem).options(
        joinedload(QueueItem.doctor),
        joinedload(QueueItem.patient)
    ).filter(QueueItem.id == new_queue.id).first()

    return _format_queue_response(item)


@router.put("/{queue_id}", response_model=QueueItemResponse)
def update_queue_entry(
    queue_id: int,
    update_data: QueueItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update queue status, waiting counts, or priority in SQLite."""
    item = db.query(QueueItem).filter(QueueItem.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found")

    if update_data.department is not None:
        item.department = update_data.department
    if update_data.doctor_id is not None:
        item.doctor_id = update_data.doctor_id
    if update_data.patient_id is not None:
        item.patient_id = update_data.patient_id
    if update_data.patient_name is not None:
        item.patient_name = update_data.patient_name
    if update_data.patients_waiting is not None:
        item.patients_waiting = max(0, update_data.patients_waiting)
    if update_data.patients_ahead is not None:
        item.patients_ahead = max(0, update_data.patients_ahead)
    if update_data.emergency_patients is not None:
        item.emergency_patients = max(0, update_data.emergency_patients)
    if update_data.current_status is not None:
        item.current_status = update_data.current_status
    if update_data.priority is not None:
        item.priority = update_data.priority
    if update_data.estimated_wait_time is not None:
        item.estimated_wait_time = update_data.estimated_wait_time

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    loaded = db.query(QueueItem).options(
        joinedload(QueueItem.doctor),
        joinedload(QueueItem.patient)
    ).filter(QueueItem.id == item.id).first()

    return _format_queue_response(loaded)


@router.delete("/{queue_id}")
def delete_queue_entry(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a queue entry from SQLite."""
    item = db.query(QueueItem).filter(QueueItem.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found")

    db.delete(item)
    db.commit()
    return {"message": f"Queue item #{queue_id} deleted successfully"}


def seed_default_queues(db: Session):
    """Seed initial queue entries if the queues table is empty."""
    if db.query(QueueItem).count() > 0:
        return

    doctors = db.query(Doctor).all()
    doc_map = {d.department: d.id for d in doctors}

    initial_queues = [
        QueueItem(
            department="Cardiology",
            doctor_id=doc_map.get("Cardiology"),
            patient_name="Sunil Patil",
            patients_waiting=5,
            patients_ahead=2,
            emergency_patients=1,
            current_status="Waiting",
            priority="Priority",
            estimated_wait_time=38.5,
        ),
        QueueItem(
            department="General Medicine",
            doctor_id=doc_map.get("General Medicine"),
            patient_name="Anita Deshmukh",
            patients_waiting=8,
            patients_ahead=3,
            emergency_patients=0,
            current_status="Waiting",
            priority="Normal",
            estimated_wait_time=24.0,
        ),
        QueueItem(
            department="Orthopedics",
            doctor_id=doc_map.get("Orthopedics"),
            patient_name="Vikram Jadhav",
            patients_waiting=4,
            patients_ahead=1,
            emergency_patients=0,
            current_status="In Consultation",
            priority="Normal",
            estimated_wait_time=12.0,
        ),
        QueueItem(
            department="Pediatrics",
            doctor_id=doc_map.get("Pediatrics"),
            patient_name="Baby Aarav Shinde",
            patients_waiting=6,
            patients_ahead=2,
            emergency_patients=1,
            current_status="Waiting",
            priority="Emergency",
            estimated_wait_time=15.0,
        ),
    ]

    db.add_all(initial_queues)
    db.commit()
