"""Prediction service utilizing trained RandomForestRegressor pipeline."""

from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "waiting_model.pkl"

_cached_model_payload: Optional[Dict[str, Any]] = None


def load_model_payload() -> Dict[str, Any]:
    """Load and cache the trained ML model bundle."""
    global _cached_model_payload
    if _cached_model_payload is None:
        if not MODEL_PATH.exists():
            # If not yet trained, trigger training
            from app.ml.train_model import train_and_evaluate
            _cached_model_payload = train_and_evaluate()
        else:
            _cached_model_payload = joblib.load(MODEL_PATH)
    return _cached_model_payload


def predict_waiting_time(features: Dict[str, Any]) -> Dict[str, Any]:
    """Predict waiting time in minutes using the scikit-learn RandomForestRegressor."""
    payload = load_model_payload()
    pipeline = payload["pipeline"]

    # Extract & sanitize input features
    row = {
        "department": str(features.get("department", "General Medicine")),
        "patients_waiting": max(0, int(features.get("patients_waiting", 0))),
        "patients_ahead": max(0, int(features.get("patients_ahead", 0))),
        "emergency_count": max(0, int(features.get("emergency_count", 0))),
        "available_doctors": max(1, int(features.get("available_doctors", 1))),
        "average_consultation_time": max(5, float(features.get("average_consultation_time", 15))),
        "hour": min(23, max(0, int(features.get("hour", 10)))),
        "day_of_week": min(6, max(0, int(features.get("day_of_week", 1)))),
        "priority": str(features.get("priority", "Normal")),
        "previous_average_waiting_time": max(0.0, float(features.get("previous_average_waiting_time", 25.0))),
    }

    # Ensure patients_ahead does not exceed patients_waiting
    if row["patients_ahead"] > row["patients_waiting"]:
        row["patients_waiting"] = row["patients_ahead"]

    input_df = pd.DataFrame([row])

    # Run inference through trained scikit-learn pipeline
    raw_prediction = pipeline.predict(input_df)[0]
    predicted_minutes = round(max(1.0, float(raw_prediction)), 1)

    return {
        "predicted_waiting_time": predicted_minutes,
        "prediction_unit": "minutes",
        "model_name": payload.get("model_name", "RandomForestRegressor"),
        "model_version": payload.get("model_version", "1.0.0"),
        "inputs": row,
        "metrics": payload.get("metrics", {}),
    }


def get_model_metadata() -> Dict[str, Any]:
    """Return model evaluation metrics, training info, and feature importances."""
    payload = load_model_payload()
    return {
        "model_name": payload.get("model_name", "RandomForestRegressor"),
        "model_version": payload.get("model_version", "1.0.0"),
        "trained_at": payload.get("trained_at"),
        "metrics": payload.get("metrics", {}),
        "feature_importances": payload.get("feature_importances", []),
        "features": payload.get("feature_cols", []),
        "disclaimer": "Notice: Model trained on synthetic OPD queue dynamics representing hospital patient flow. Predictions are advisory estimates and not validated on real clinical triage operations."
    }

