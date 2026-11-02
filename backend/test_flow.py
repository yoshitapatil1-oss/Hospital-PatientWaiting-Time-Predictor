import httpx

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_PROXY_URL = "http://127.0.0.1:5173"

def main():
    with httpx.Client(timeout=10.0) as client:
        # 1. Register User
        print("=== STEP 1: REGISTER ===")
        reg_payload = {
            "name": "Aarti Shinde",
            "email": "aarti.shinde@example.com",
            "password": "Password@123",
            "role": "patient",
            "language": "mr"
        }
        res = client.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        # If user already registered from a previous run, that's fine
        if res.status_code == 201:
            print("Registered:", res.json()["user"])
            token = res.json()["access_token"]
        elif res.status_code == 400:
            print("User already exists, continuing to login...")
            login_res = client.post(f"{BASE_URL}/api/auth/login", json={
                "email": "aarti.shinde@example.com",
                "password": "Password@123"
            })
            assert login_res.status_code == 200
            token = login_res.json()["access_token"]
        else:
            raise Exception(f"Unexpected register response: {res.status_code} {res.text}")

        # 2. Login
        print("=== STEP 2: LOGIN ===")
        login_res = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aarti.shinde@example.com",
            "password": "Password@123"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        user = login_res.json()["user"]
        print(f"Login success! User: {user['name']} | Role: {user['role']} | Language: {user['language']}")

        # 3. /api/auth/me
        print("=== STEP 3: GET /api/auth/me WITH JWT ===")
        headers = {"Authorization": f"Bearer {token}"}
        me_res = client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        print(f"Verified JWT identity: {me_res.json()['name']} ({me_res.json()['email']})")

        # 4. Create Patient
        print("=== STEP 4: CREATE PATIENT IN SQLITE ===")
        patient_res = client.post(f"{BASE_URL}/api/patients", json={
            "name": "Sunil Gaikwad",
            "age": 52,
            "gender": "Male",
            "phone": "+91 9988776655"
        }, headers=headers)
        assert patient_res.status_code == 201
        patient = patient_res.json()
        print(f"Patient saved to SQLite: ID #{patient['id']} - {patient['name']} ({patient['age']} yrs)")

        # 5. Fetch Doctors
        print("=== STEP 5: FETCH DOCTORS FROM SQLITE ===")
        docs_res = client.get(f"{BASE_URL}/api/doctors")
        assert docs_res.status_code == 200
        doctors = docs_res.json()
        print(f"Found {len(doctors)} doctors in SQLite.")
        doctor = doctors[0]
        print(f"Selected Doctor: {doctor['name']} ({doctor['department']})")

        # 6. Book Appointment
        print("=== STEP 6: BOOK APPOINTMENT IN SQLITE ===")
        appt_res = client.post(f"{BASE_URL}/api/appointments", json={
            "patient_id": patient["id"],
            "doctor_id": doctor["id"],
            "appointment_date": "2026-10-22",
            "appointment_time": "11:30",
            "priority": "Urgent",
            "status": "Waiting"
        }, headers=headers)
        assert appt_res.status_code == 201
        appt = appt_res.json()
        print(f"Appointment saved in SQLite: ID #{appt['id']} | Date: {appt['appointment_date']} {appt['appointment_time']} | Priority: {appt['priority']} | Status: {appt['status']}")

        # 7. Query Appointments via Frontend Proxy
        print("=== STEP 7: QUERY VIA VITE FRONTEND PROXY ===")
        proxy_res = client.get(f"{FRONTEND_PROXY_URL}/api/appointments", headers=headers)
        assert proxy_res.status_code == 200
        appts = proxy_res.json()
        print(f"Frontend proxy successfully returned {len(appts)} appointments from SQLite.")

        # 8. Check Direct Database Persistence
        print("=== STEP 8: VERIFY SQLITE DATABASE PERSISTENCE ===")
        from app.database import SessionLocal
        from app.models.user import User
        from app.models.patient import Patient
        from app.models.doctor import Doctor
        from app.models.appointment import Appointment

        db = SessionLocal()
        user_cnt = db.query(User).count()
        pat_cnt = db.query(Patient).count()
        doc_cnt = db.query(Doctor).count()
        appt_cnt = db.query(Appointment).count()
        db.close()

        print(f"Direct SQLite Row Counts -> Users: {user_cnt}, Patients: {pat_cnt}, Doctors: {doc_cnt}, Appointments: {appt_cnt}")
        print("\n>>> ALL TESTS PASSED: Register -> Login -> JWT -> Dashboard -> Database Entry! <<<")

if __name__ == "__main__":
    main()
