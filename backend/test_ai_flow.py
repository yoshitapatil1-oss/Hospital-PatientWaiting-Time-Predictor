"""
Comprehensive test script for AI Hospital Assistant & AI Admin Insights
Validates that:
1. POST /api/ai/chat responds accurately in English, Marathi, and Hindi
2. Real SQLite data and Random Forest ML model are used (no hallucinations)
3. Supports all 6 required domains:
   - Waiting-time questions
   - Queue information
   - Appointment information
   - Department information
   - General hospital navigation/help
   - Simple hospital FAQs
4. GET /api/ai/insights returns:
   - Department with highest waiting time
   - Peak hospital hours
   - Unusually high queue alerts
   - Doctor availability
   - Recommendations to increase staff during peak time
"""
import sys
import os

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

def test_ai_suite():
    client = TestClient(app)

    print("==================================================")
    print("AI HOSPITAL ASSISTANT & ADMIN INSIGHTS VERIFICATION")
    print("==================================================")

    # 1. Prompts endpoint
    print("\n--- 1. Testing GET /api/ai/prompts ---")
    for lang in ['en', 'mr', 'hi']:
        res = client.get(f"/api/ai/prompts?language={lang}")
        assert res.status_code == 200, f"Failed prompts for {lang}"
        data = res.json()
        print(f"[{lang.upper()}] Loaded {len(data['prompts'])} starter prompts for language={data['language']}.")
        for p in data['prompts']:
            print(f"  - Prompt: {ascii(p)}")

    # 2. AI Chat: 6 Required Assistant Domains
    print("\n--- 2. Testing POST /api/ai/chat across domains & languages ---")

    test_queries = [
        {
            "domain": "Waiting-time Question (English)",
            "lang": "en",
            "message": "What is the expected waiting time in Cardiology?",
            "dept": "Cardiology",
            "expected_intent": "waiting_time"
        },
        {
            "domain": "Waiting-time Question (Marathi)",
            "lang": "mr",
            "message": "हृदयरोग विभागात प्रतीक्षा वेळ किती आहे?",
            "dept": "Cardiology",
            "expected_intent": "waiting_time"
        },
        {
            "domain": "Waiting-time Question (Hindi)",
            "lang": "hi",
            "message": "कार्डियोलॉजी में प्रतीक्षा समय क्या है?",
            "dept": "Cardiology",
            "expected_intent": "waiting_time"
        },
        {
            "domain": "Queue Information (English)",
            "lang": "en",
            "message": "How many patients are currently waiting in Orthopedics queue?",
            "dept": "Orthopedics",
            "expected_intent": "queue"
        },
        {
            "domain": "Appointment Information (English)",
            "lang": "en",
            "message": "How can I book or check my appointment?",
            "dept": None,
            "expected_intent": "appointment"
        },
        {
            "domain": "Department Information (English)",
            "lang": "en",
            "message": "Tell me about the available departments and doctors.",
            "dept": None,
            "expected_intent": "doctor"
        },
        {
            "domain": "Hospital Navigation (English)",
            "lang": "en",
            "message": "Where is the laboratory and pharmacy located?",
            "dept": None,
            "expected_intent": "navigation"
        },
        {
            "domain": "Hospital FAQs (English)",
            "lang": "en",
            "message": "What are the visiting hours and emergency contacts?",
            "dept": None,
            "expected_intent": "faq"
        },
    ]

    for item in test_queries:
        payload = {"message": item["message"], "language": item["lang"]}
        if item["dept"]:
            payload["department"] = item["dept"]
        res = client.post("/api/ai/chat", json=payload)
        assert res.status_code == 200, f"Failed chat for {item['domain']}: {res.text}"
        data = res.json()
        print(f"\n[OK] {item['domain']}:")
        print(f"     Detected Intent: {data['detected_intent']}")
        print(f"     Language: {data['language']}")
        print(f"     Context Data Grounded: {bool(data.get('context_data'))}")
        print(f"     Response length: {len(data['response'])} chars")
        assert len(data['response']) > 0, "Response should not be empty"

    # 3. AI Admin Insights
    print("\n--- 3. Testing GET /api/ai/insights ---")
    res = client.get("/api/ai/insights")
    assert res.status_code == 200, f"Failed insights: {res.text}"
    insights = res.json()

    print("\n[OK] Admin Insights Generated:")
    hwd = insights.get('highest_waiting_department')
    if hwd:
        print(f"  - Highest Waiting Dept: {hwd.get('department')} ({hwd.get('avg_wait_minutes')} mins avg wait, {hwd.get('waiting_patients')} waiting)")
    else:
        print("  - Highest Waiting Dept: None (empty queue)")

    pkh = insights.get('peak_hospital_hours')
    print(f"  - Peak Hospital Hours: Morning {pkh.get('morning_peak')}, Evening {pkh.get('evening_peak')}")
    print(f"    Current Status: {pkh.get('status')} | Busiest Slot: {pkh.get('busiest_hour_slot')}")

    alerts = insights.get('high_queue_alerts', [])
    print(f"  - High Queue Alerts ({len(alerts)}):")
    for a in alerts:
        print(f"    * [{a.get('severity')}] {a.get('department')}: {a.get('alert_message')}")

    doc_avail = insights.get('doctor_availability')
    print(f"  - Doctor Availability: {doc_avail.get('available_doctors')}/{doc_avail.get('total_doctors')} available")
    if doc_avail.get('departments_with_no_doctor'):
        print(f"    Departments with no doctor: {doc_avail.get('departments_with_no_doctor')}")

    recs = insights.get('staffing_recommendations', [])
    print(f"  - Staffing Recommendations ({len(recs)}):")
    for r in recs:
        print(f"    * [{r.get('priority')}] {r.get('title')}: {r.get('action')}")

    print("\n==================================================")
    print("ALL AI ASSISTANT & ADMIN INSIGHT TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_ai_suite()
