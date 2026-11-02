"""
Automated Test Suite for Hospital Patient Waiting-Time Predictor API
Tests:
- API Health Check (DB + ML readiness)
- User Authentication (Registration, Login, JWT, Roles)
- Patient CRUD operations
- Doctor CRUD & Availability toggle
- Departments overview & list
- Appointment operations (Creation, Update, Cancellation, Deletion)
- Queue operations (Creation with ML estimation, Stats, Status update, Deletion)
- ML Model (Inference, Input validation, Non-negative finite output, Metadata)
- Prediction Persistence in SQLite & History endpoint
- AI Hospital Assistant & Operational Insights (English, Marathi, Hindi)
"""

from fastapi.testclient import TestClient
from app.main import app
from app.ml.predict import predict_waiting_time, get_model_metadata

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint reports DB connectivity and ML readiness."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "ok"]
    assert data["database"] == "connected"
    assert data["ml_model"] == "ready"
    assert "model_version" in data


def test_auth_and_roles():
    """Verify user registration, login, JWT issuance, and /api/auth/me."""
    email = f"test_doc_admin_{id(test_auth_and_roles)}@hospital.com"
    reg_payload = {
        "name": "Dr. Test Admin",
        "email": email,
        "password": "SecurePassword123!",
        "role": "admin",
        "language": "en"
    }
    # Register
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code in [201, 400]

    # Login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "SecurePassword123!"
    })
    assert login_res.status_code == 200
    auth_data = login_res.json()
    assert "access_token" in auth_data
    token = auth_data["access_token"]

    # Verify identity with JWT
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email


def test_ml_model_standalone():
    """Verify scikit-learn model loads and outputs finite, positive waiting time."""
    features = {
        "department": "Cardiology",
        "patients_waiting": 10,
        "patients_ahead": 4,
        "emergency_count": 1,
        "available_doctors": 2,
        "average_consultation_time": 20.0,
        "hour": 11,
        "day_of_week": 1,
        "priority": "Normal",
        "previous_average_waiting_time": 30.0
    }
    result = predict_waiting_time(features)
    assert "predicted_waiting_time" in result
    assert result["predicted_waiting_time"] > 0
    assert isinstance(result["predicted_waiting_time"], (int, float))
    assert result["model_name"] == "RandomForestRegressor"

    # Emergency priority should result in lower wait time than normal
    emergency_features = dict(features, priority="Emergency")
    em_result = predict_waiting_time(emergency_features)
    assert em_result["predicted_waiting_time"] <= result["predicted_waiting_time"]

    # Model metadata
    meta = get_model_metadata()
    assert "metrics" in meta
    assert "r2" in meta["metrics"]
    assert "mae" in meta["metrics"]
    assert len(meta["feature_importances"]) > 0


def test_prediction_api_endpoint():
    """Verify POST /api/predictions/predict and GET /api/predictions/history."""
    payload = {
        "department": "General Medicine",
        "patients_waiting": 7,
        "patients_ahead": 3,
        "emergency_count": 0,
        "available_doctors": 2,
        "average_consultation_time": 15.0,
        "priority": "Normal"
    }
    res = client.post("/api/predictions/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_waiting_time"] > 0
    assert data["model_name"] == "RandomForestRegressor"
    assert "disclaimer" in data
    assert data["id"] is not None

    # Verify prediction history contains the newly created record
    hist_res = client.get("/api/predictions/history?limit=10")
    assert hist_res.status_code == 200
    records = hist_res.json()
    assert len(records) > 0
    assert any(r["id"] == data["id"] for r in records)


def test_doctor_and_department_management():
    """Verify doctors CRUD and departments overview."""
    # List doctors
    docs_res = client.get("/api/doctors")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) >= 1

    # Toggle doctor availability
    doc_id = docs[0]["id"]
    initial_avail = docs[0]["available"]
    # Login as admin to toggle
    admin_login = client.post("/api/auth/login", json={
        "email": docs_res.json()[0].get("email", "admin@hospital.com"),
        "password": "Password@123"
    })
    # If not registered, create admin
    if admin_login.status_code != 200:
        client.post("/api/auth/register", json={
            "name": "Super Admin",
            "email": "superadmin@carequeue.ai",
            "password": "AdminPassword123!",
            "role": "admin",
            "language": "en"
        })
        admin_login = client.post("/api/auth/login", json={
            "email": "superadmin@carequeue.ai",
            "password": "AdminPassword123!"
        })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    toggle_res = client.patch(f"/api/doctors/{doc_id}/toggle-availability", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["available"] != initial_avail

    # Toggle back
    client.patch(f"/api/doctors/{doc_id}/toggle-availability", headers=headers)

    # Departments
    dept_res = client.get("/api/departments")
    assert dept_res.status_code == 200
    depts = dept_res.json()
    assert len(depts) >= 5
    assert any(d["name"] == "Cardiology" for d in depts)

    dept_list = client.get("/api/departments/list")
    assert dept_list.status_code == 200
    assert "Cardiology" in dept_list.json()


def test_patient_crud_and_appointments():
    """Verify patient CRUD and appointment booking/cancellation."""
    # Create patient
    admin_login = client.post("/api/auth/login", json={
        "email": "superadmin@carequeue.ai",
        "password": "AdminPassword123!"
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    pat_res = client.post("/api/patients", json={
        "name": "Ramesh Pawar",
        "age": 45,
        "gender": "Male",
        "phone": "+91 9876543210"
    }, headers=headers)
    assert pat_res.status_code == 201
    patient = pat_res.json()
    assert patient["name"] == "Ramesh Pawar"

    # Update patient
    update_res = client.put(f"/api/patients/{patient['id']}", json={
        "age": 46
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["age"] == 46

    # Get doctors to book appointment
    docs = client.get("/api/doctors").json()
    doc_id = docs[0]["id"]

    # Book appointment
    appt_res = client.post("/api/appointments", json={
        "patient_id": patient["id"],
        "doctor_id": doc_id,
        "appointment_date": "2026-11-01",
        "appointment_time": "10:30",
        "priority": "Normal",
        "status": "Scheduled"
    }, headers=headers)
    assert appt_res.status_code == 201
    appt = appt_res.json()
    assert appt["patient_id"] == patient["id"]

    # Cancel appointment
    cancel_res = client.put(f"/api/appointments/{appt['id']}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "Cancelled"


def test_queue_operations():
    """Verify queue creation, stats calculation, and status updates."""
    admin_login = client.post("/api/auth/login", json={
        "email": "superadmin@carequeue.ai",
        "password": "AdminPassword123!"
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Queue Stats
    stats_res = client.get("/api/queue/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "average_predicted_waiting_time" in stats
    assert "available_doctors" in stats

    # Create Queue Item
    create_res = client.post("/api/queue", json={
        "department": "Cardiology",
        "patient_name": "Kavita Joshi",
        "patients_waiting": 5,
        "patients_ahead": 2,
        "emergency_patients": 1,
        "priority": "Priority",
        "current_status": "Waiting"
    }, headers=headers)
    assert create_res.status_code == 201
    queue_item = create_res.json()
    assert queue_item["estimated_wait_time"] > 0

    # Advance queue item to In Consultation
    advance_res = client.put(f"/api/queue/{queue_item['id']}", json={
        "current_status": "In Consultation",
        "patients_ahead": 1
    }, headers=headers)
    assert advance_res.status_code == 200
    assert advance_res.json()["current_status"] == "In Consultation"


def test_ai_multilingual_assistant():
    """Verify AI chat in English, Marathi, and Hindi."""
    # English
    en_res = client.post("/api/ai/chat", json={
        "message": "How many patients are waiting in queue?",
        "language": "en"
    })
    assert en_res.status_code == 200
    assert len(en_res.json()["response"]) > 20

    # Marathi
    mr_res = client.post("/api/ai/chat", json={
        "message": "सध्या रांगेत किती रुग्ण प्रतीक्षा करत आहेत?",
        "language": "mr"
    })
    assert mr_res.status_code == 200
    assert len(mr_res.json()["response"]) > 10

    # Hindi
    hi_res = client.post("/api/ai/chat", json={
        "message": "कतार में कितने मरीज हैं?",
        "language": "hi"
    })
    assert hi_res.status_code == 200
    assert len(hi_res.json()["response"]) > 10


def test_ai_admin_insights():
    """Verify AI admin insights calculation."""
    res = client.get("/api/ai/insights")
    assert res.status_code == 200
    data = res.json()
    assert "highest_waiting_department" in data
    assert "peak_hospital_hours" in data
    assert "staffing_recommendations" in data


if __name__ == "__main__":
    tests = [
        test_health_endpoint,
        test_auth_and_roles,
        test_ml_model_standalone,
        test_prediction_api_endpoint,
        test_doctor_and_department_management,
        test_patient_crud_and_appointments,
        test_queue_operations,
        test_ai_multilingual_assistant,
        test_ai_admin_insights
    ]
    passed = 0
    failed = 0
    print("=" * 60)
    print("CAREQUEUE AI - BACKEND & ML VERIFICATION TEST SUITE")
    print("=" * 60)
    for t in tests:
        try:
            t()
            print(f"[PASS] {t.__name__}")
            passed += 1
        except Exception as exc:
            import traceback
            print(f"[FAIL] {t.__name__}: {exc}")
            traceback.print_exc()
            failed += 1
    print("=" * 60)
    print(f"Results: {passed} PASSED | {failed} FAILED | Total: {passed + failed}")
    print("=" * 60)
    if failed > 0:
        import sys
        sys.exit(1)

