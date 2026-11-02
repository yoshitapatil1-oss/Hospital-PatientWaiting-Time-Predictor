from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIAdminInsightsResponse,
)
from app.services.auth import get_optional_current_user
from app.services.ai_assistant import process_ai_chat
from app.services.ai_insights import generate_admin_insights

router = APIRouter(prefix="/api/ai", tags=["AI Hospital Assistant & Insights"])


@router.post("/chat", response_model=AIChatResponse)
def ai_chat(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    AI Hospital Assistant grounded in live SQLite data and Random Forest predictions.
    Supports English, Marathi (mr), and Hindi (hi).
    """
    if not req.message or not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )

    result = process_ai_chat(
        db=db,
        message=req.message.strip(),
        language=req.language or "en",
        current_user=current_user
    )

    return AIChatResponse(
        response=result["response"],
        detected_intent=result["detected_intent"],
        language=result["language"],
        context_data=result.get("context_data"),
        suggested_questions=result.get("suggested_questions")
    )


@router.get("/insights", response_model=AIAdminInsightsResponse)
def get_admin_insights(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    AI Admin Operational Insights:
    - Department with highest waiting time (using RF predictions and queue times)
    - Peak hospital hours
    - Unusually high queue alerts
    - Doctor availability and bottleneck analysis
    - Concrete staffing and resource recommendations
    """
    insights = generate_admin_insights(db)
    return AIAdminInsightsResponse(**insights)


@router.get("/prompts")
def get_sample_prompts(language: str = "en") -> Any:
    """Return quick starter prompts organized by category and language."""
    prompts = {
        "en": [
            "What is the estimated waiting time for Cardiology?",
            "How many patients are currently waiting in the queue?",
            "Which doctors are available right now?",
            "Where is the 24/7 Pharmacy located?",
            "How do I book an appointment?",
            "What are the hospital visiting hours?"
        ],
        "mr": [
            "कार्डिओलॉजीसाठी अंदाजित प्रतीक्षा वेळ किती आहे?",
            "सध्या रांगेत किती रुग्ण प्रतीक्षा करत आहेत?",
            "सध्या कोणते डॉक्टर उपलब्ध आहेत?",
            "२४ तास फार्मसी कुठे आहे?",
            "नवीन अपॉइंटमेंट कशी बुक करावी?",
            "रुग्णालयाच्या भेटीची वेळ काय आहे?"
        ],
        "hi": [
            "कार्डियोलॉजी के लिए अनुमानित प्रतीक्षा समय क्या है?",
            "कतार में वर्तमान में कितने मरीज प्रतीक्षा कर रहे हैं?",
            "अभी कौन से डॉक्टर ड्यूटी पर उपलब्ध हैं?",
            "24 घंटे फार्मेसी किस मंजिल पर है?",
            "अपॉइंटमेंट कैसे बुक करें?",
            "मरीजों से मिलने का समय क्या है?"
        ]
    }
    lang_key = language if language in prompts else "en"
    return {"language": lang_key, "prompts": prompts[lang_key]}
