from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.prediction import PredictionRecord
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    PredictionHistoryItem,
    ModelMetadataResponse
)
from app.ml.predict import predict_waiting_time, get_model_metadata

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.post("/predict", response_model=PredictionResponse)
def predict_patient_wait_time(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """Predict patient waiting time using RandomForestRegressor and persist in SQLite."""
    try:
        now = datetime.utcnow()
        hour = request.hour if request.hour is not None else now.hour
        day_of_week = request.day_of_week if request.day_of_week is not None else now.weekday()

        # Prepare feature payload for the ML pipeline
        ml_features = {
            "department": request.department,
            "patients_waiting": request.patients_waiting,
            "patients_ahead": request.patients_ahead,
            "emergency_count": request.emergency_count,
            "available_doctors": request.available_doctors,
            "average_consultation_time": request.average_consultation_time,
            "hour": hour,
            "day_of_week": day_of_week,
            "priority": request.priority,
            "previous_average_waiting_time": request.previous_average_waiting_time or 25.0,
        }

        # 1. Real inference from trained Random Forest Regressor
        ml_result = predict_waiting_time(ml_features)
        predicted_time = ml_result["predicted_waiting_time"]

        # 2. Look up patient and doctor details if IDs provided
        doctor_name: Optional[str] = None
        if request.doctor_id:
            doc = db.query(Doctor).filter(Doctor.id == request.doctor_id).first()
            if doc:
                doctor_name = doc.name

        # 3. Save prediction entry into SQLite database
        record = PredictionRecord(
            patient_id=request.patient_id,
            doctor_id=request.doctor_id,
            department=request.department,
            patients_waiting=request.patients_waiting,
            patients_ahead=request.patients_ahead,
            emergency_count=request.emergency_count,
            available_doctors=request.available_doctors,
            average_consultation_time=request.average_consultation_time,
            priority=request.priority,
            predicted_waiting_time=predicted_time,
            prediction_unit="minutes",
            model_name=ml_result.get("model_name", "RandomForestRegressor"),
            model_version=ml_result.get("model_version", "1.0.0"),
            created_at=now
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return {
            "id": record.id,
            "predicted_waiting_time": predicted_time,
            "prediction_unit": "minutes",
            "model_name": ml_result.get("model_name", "RandomForestRegressor"),
            "model_version": ml_result.get("model_version", "1.0.0"),
            "queue_size": request.patients_waiting,
            "patients_ahead": request.patients_ahead,
            "selected_doctor": doctor_name or f"Dept: {request.department}",
            "estimated_consultation_time": request.average_consultation_time,
            "prediction_timestamp": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "inputs": ml_features,
            "metrics": ml_result.get("metrics", {}),
            "disclaimer": "Notice: Estimated waiting time based on queue dynamics. Model trained on simulated hospital OPD queue data. For informational purposes only; do not use for emergency triage or clinical diagnosis."
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(exc)}"
        )


@router.get("/history", response_model=List[PredictionHistoryItem])
def get_prediction_history(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve saved prediction history directly from SQLite."""
    records = (
        db.query(PredictionRecord)
        .options(
            joinedload(PredictionRecord.patient),
            joinedload(PredictionRecord.doctor)
        )
        .order_by(PredictionRecord.id.desc())
        .limit(limit)
        .all()
    )

    history = []
    for r in records:
        history.append({
            "id": r.id,
            "patient_id": r.patient_id,
            "patient_name": r.patient.name if r.patient else "Walk-in Patient",
            "doctor_id": r.doctor_id,
            "doctor_name": r.doctor.name if r.doctor else "On-Duty Doctor",
            "department": r.department,
            "patients_waiting": r.patients_waiting,
            "patients_ahead": r.patients_ahead,
            "emergency_count": r.emergency_count,
            "available_doctors": r.available_doctors,
            "average_consultation_time": r.average_consultation_time,
            "priority": r.priority,
            "predicted_waiting_time": r.predicted_waiting_time,
            "prediction_unit": r.prediction_unit,
            "created_at": r.created_at
        })
    return history


@router.get("/model-info", response_model=ModelMetadataResponse)
def get_prediction_model_info():
    """Retrieve Random Forest Regressor metrics (MAE, RMSE, R2) and feature importances."""
    try:
        return get_model_metadata()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load model metadata: {str(exc)}"
        )
