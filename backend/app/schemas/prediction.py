from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    patient_id: Optional[int] = Field(default=None, description="Optional ID of patient from SQLite")
    doctor_id: Optional[int] = Field(default=None, description="Optional ID of doctor from SQLite")
    department: str = Field(default="General Medicine", description="Hospital department")
    patients_waiting: int = Field(default=8, ge=0, description="Total patients currently in queue")
    patients_ahead: int = Field(default=4, ge=0, description="Number of patients ahead in queue")
    emergency_count: int = Field(default=0, ge=0, description="Count of emergency triage patients")
    available_doctors: int = Field(default=2, ge=1, description="Number of available doctors on duty")
    average_consultation_time: float = Field(default=15.0, ge=1.0, description="Average consultation time in minutes")
    hour: Optional[int] = Field(default=None, ge=0, le=23, description="Hour of the day (0-23)")
    day_of_week: Optional[int] = Field(default=None, ge=0, le=6, description="Day of the week (0=Mon, 6=Sun)")
    priority: str = Field(default="Normal", description="Patient triage priority (Normal, Urgent, Emergency)")
    previous_average_waiting_time: Optional[float] = Field(default=25.0, ge=0.0, description="Historical average wait time")


class PredictionResponse(BaseModel):
    id: Optional[int] = None
    predicted_waiting_time: float
    prediction_unit: str = "minutes"
    model_name: str
    model_version: str
    queue_size: int
    patients_ahead: int
    selected_doctor: Optional[str] = None
    estimated_consultation_time: float
    prediction_timestamp: str
    inputs: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    disclaimer: Optional[str] = "Notice: Estimated waiting time based on queue dynamics. Model trained on simulated hospital OPD queue data. For informational purposes only; do not use for emergency triage or clinical diagnosis."



class PredictionHistoryItem(BaseModel):
    id: int
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    department: str
    patients_waiting: int
    patients_ahead: int
    emergency_count: int
    available_doctors: int
    average_consultation_time: float
    priority: str
    predicted_waiting_time: float
    prediction_unit: str
    created_at: datetime

    class Config:
        from_attributes = True


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    percentage: float


class ModelMetadataResponse(BaseModel):
    model_name: str
    model_version: str
    trained_at: Optional[str] = None
    metrics: Dict[str, Any]
    feature_importances: List[FeatureImportanceItem]
    features: List[str]
    disclaimer: Optional[str] = "Notice: Model trained on synthetic OPD queue dynamics representing hospital patient flow. Predictions are advisory estimates and not validated on real clinical triage operations."

