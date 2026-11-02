from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user (patient, receptionist, admin) and return JWT."""
    # Check if user with this email already exists
    existing = db.query(User).filter(User.email == user_data.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Validate role
    role = user_data.role.lower() if user_data.role else "patient"
    if role not in ["patient", "receptionist", "admin"]:
        role = "patient"

    # Validate language
    lang = user_data.language.lower() if user_data.language else "en"
    if lang not in ["en", "mr", "hi"]:
        lang = "en"

    # Hash password - never store plain text
    hashed_pwd = hash_password(user_data.password)

    new_user = User(
        name=user_data.name.strip(),
        email=user_data.email.lower().strip(),
        hashed_password=hashed_pwd,
        role=role,
        language=lang
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If user registered as patient, automatically create default linked patient profile
    if role == "patient":
        patient_record = Patient(
            user_id=new_user.id,
            name=new_user.name,
            age=30,  # default age, can be updated in dashboard
            gender="Not Specified",
            phone="Not Specified"
        )
        db.add(patient_record)
        db.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT token."""
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile of currently authenticated user."""
    return current_user
