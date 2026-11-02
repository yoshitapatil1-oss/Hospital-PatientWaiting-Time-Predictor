from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint that verifies database connectivity and ML model readiness."""
    db_status = "error"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:
        db_status = f"failed: {exc}"

    ml_status = "error"
    model_name = "Unknown"
    model_version = "Unknown"
    try:
        from app.ml.predict import load_model_payload
        payload = load_model_payload()
        if payload and "pipeline" in payload:
            ml_status = "ready"
            model_name = payload.get("model_name", "RandomForestRegressor")
            model_version = payload.get("model_version", "1.0.0")
        else:
            ml_status = "not_loaded"
    except Exception as exc:
        ml_status = f"failed: {exc}"

    overall_status = "healthy" if db_status == "connected" and ml_status == "ready" else "degraded"

    return {
        "status": overall_status,
        "service": "Hospital Patient Waiting-Time Predictor API",
        "database": db_status,
        "ml_model": ml_status,
        "model_name": model_name,
        "model_version": model_version,
        "version": "1.0.0"
    }

