"""Hospital Patient Waiting-Time Predictor
Random Forest Regressor Training Pipeline

Steps:
1. Dataset generation / loading (realistic hospital queue dynamics)
2. Data preprocessing & Feature encoding (OneHotEncoder + StandardScaler/passthrough)
3. Train/Test split (80/20)
4. RandomForestRegressor training
5. Model evaluation (MAE, RMSE, R²)
6. Feature importance extraction
7. Model serialization with joblib to backend/app/ml/waiting_model.pkl
"""

import os
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
ML_DIR = Path(__file__).resolve().parent
DATA_DIR.mkdir(parents=True, exist_ok=True)
ML_DIR.mkdir(parents=True, exist_ok=True)

DATASET_PATH = DATA_DIR / "hospital_waiting_times.csv"
MODEL_PATH = ML_DIR / "waiting_model.pkl"

DEPARTMENTS = [
    "General Medicine",
    "Cardiology",
    "Orthopedics",
    "Pediatrics",
    "Emergency Care",
    "Neurology",
    "Dermatology",
]

PRIORITIES = ["Normal", "Urgent", "Emergency"]


def generate_realistic_dataset(n_samples: int = 6000, random_seed: int = 42) -> pd.DataFrame:
    """Generate a realistic dataset representing hospital OPD & ER queue dynamics."""
    np.random.seed(random_seed)

    records = []

    for _ in range(n_samples):
        department = np.random.choice(
            DEPARTMENTS,
            p=[0.25, 0.15, 0.15, 0.15, 0.15, 0.08, 0.07]
        )

        # Department-specific base consultation time (minutes)
        dept_time_map = {
            "Emergency Care": (8, 15),
            "General Medicine": (10, 18),
            "Pediatrics": (12, 20),
            "Dermatology": (10, 16),
            "Orthopedics": (15, 25),
            "Cardiology": (18, 30),
            "Neurology": (20, 35),
        }
        min_t, max_t = dept_time_map[department]
        avg_consultation_time = int(np.random.uniform(min_t, max_t))

        # Available doctors on duty (1 to 5)
        if department in ["General Medicine", "Emergency Care"]:
            available_doctors = int(np.random.choice([2, 3, 4, 5], p=[0.2, 0.4, 0.3, 0.1]))
        else:
            available_doctors = int(np.random.choice([1, 2, 3], p=[0.45, 0.45, 0.1]))

        # Operating hour (8 AM to 21 PM)
        hour = int(np.random.choice(range(8, 22)))
        day_of_week = int(np.random.choice(range(0, 7)))  # 0=Monday, 6=Sunday

        # Queue volume depends on hour and day
        # Peak rush: 9-12 AM and 16-19 PM
        is_morning_peak = 9 <= hour <= 12
        is_evening_peak = 16 <= hour <= 19
        is_monday = day_of_week == 0

        queue_lambda = 10
        if is_morning_peak:
            queue_lambda += 14
        if is_evening_peak:
            queue_lambda += 8
        if is_monday:
            queue_lambda += 5

        patients_waiting = max(0, int(np.random.poisson(lam=queue_lambda)))
        patients_ahead = int(np.random.uniform(0, max(1, patients_waiting)))

        # Emergency triage cases currently in queue
        if department == "Emergency Care":
            emergency_count = int(np.random.choice([0, 1, 2, 3, 4, 5], p=[0.2, 0.3, 0.25, 0.15, 0.07, 0.03]))
        else:
            emergency_count = int(np.random.choice([0, 1, 2], p=[0.80, 0.16, 0.04]))

        # Patient's own triage priority
        priority = np.random.choice(PRIORITIES, p=[0.72, 0.22, 0.06])

        # Historical rolling average wait time for context
        hist_base = 25.0 + (queue_lambda * 1.5)
        previous_average_waiting_time = round(float(np.random.normal(hist_base, 6.0)), 1)
        previous_average_waiting_time = max(5.0, previous_average_waiting_time)

        # Real queueing physics target calculation:
        # 1. Base queue throughput = (patients_ahead * avg_consultation_time) / available_doctors
        raw_queue_wait = (patients_ahead * avg_consultation_time) / max(1, available_doctors)

        # 2. Emergency triage cases preempt normal patients
        emergency_delay = emergency_count * (avg_consultation_time * 0.85)

        # 3. Peak congestion slowdown (staff fatigue / handoffs)
        surge_mult = 1.0
        if is_morning_peak:
            surge_mult = 1.18
        elif is_evening_peak:
            surge_mult = 1.10

        if is_monday:
            surge_mult *= 1.08

        # 4. Priority impact
        if priority == "Emergency":
            # Emergency cases are immediately triaged; wait is minimal
            target_wait = max(1.0, np.random.exponential(scale=3.5) + (emergency_count * 2.0))
        elif priority == "Urgent":
            # Urgent cases are fast-tracked ahead of normal queue
            target_wait = (raw_queue_wait * 0.40) + (emergency_delay * 0.5) + np.random.normal(3.0, 1.5)
            target_wait = max(3.0, target_wait * surge_mult)
        else:  # Normal priority
            target_wait = (raw_queue_wait * 1.0) + emergency_delay + (previous_average_waiting_time * 0.12)
            # Add realistic clinical variability
            noise = np.random.normal(0, 3.2)
            target_wait = max(2.0, (target_wait + noise) * surge_mult)

        records.append({
            "department": department,
            "patients_waiting": patients_waiting,
            "patients_ahead": patients_ahead,
            "emergency_count": emergency_count,
            "available_doctors": available_doctors,
            "average_consultation_time": avg_consultation_time,
            "hour": hour,
            "day_of_week": day_of_week,
            "priority": priority,
            "previous_average_waiting_time": previous_average_waiting_time,
            "waiting_time_minutes": round(float(target_wait), 1),
        })

    df = pd.DataFrame(records)
    return df


def train_and_evaluate():
    """Execute complete ML pipeline: dataset -> preprocessing -> training -> evaluation -> saved model."""
    print("\n=======================================================")
    print("  HOSPITAL PATIENT WAITING-TIME PREDICTOR - ML ENGINE  ")
    print("=======================================================\n")

    # Step 1: Dataset Generation / Loading
    print(">>> STEP 1: DATASET GENERATION")
    df = generate_realistic_dataset(n_samples=7500, random_seed=42)
    df.to_csv(DATASET_PATH, index=False)
    print(f"  - Generated realistic hospital dataset: {len(df):,} records")
    print(f"  - Saved dataset to: {DATASET_PATH}")
    print(f"  - Target variable: 'waiting_time_minutes' (Mean: {df['waiting_time_minutes'].mean():.2f} min, Std: {df['waiting_time_minutes'].std():.2f} min)")

    # Step 2: Feature Selection & Preprocessing Pipeline
    print("\n>>> STEP 2: PREPROCESSING & FEATURE ENCODING")
    categorical_cols = ["department", "priority"]
    numerical_cols = [
        "patients_waiting",
        "patients_ahead",
        "emergency_count",
        "available_doctors",
        "average_consultation_time",
        "hour",
        "day_of_week",
        "previous_average_waiting_time",
    ]
    feature_cols = categorical_cols + numerical_cols

    X = df[feature_cols]
    y = df["waiting_time_minutes"]

    print(f"  - Categorical features ({len(categorical_cols)}): {categorical_cols}")
    print(f"  - Numerical features ({len(numerical_cols)}): {numerical_cols}")

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
            ("num", "passthrough", numerical_cols),
        ]
    )

    # Step 3: Train / Test Split
    print("\n>>> STEP 3: TRAIN / TEST SPLIT")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"  - Training samples: {len(X_train):,} (80%)")
    print(f"  - Testing samples:  {len(X_test):,} (20%)")

    # Step 4: Random Forest Regressor Training
    print("\n>>> STEP 4: MODEL TRAINING (RandomForestRegressor)")
    rf_regressor = RandomForestRegressor(
        n_estimators=120,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", rf_regressor)
    ])

    start_time = datetime.now()
    pipeline.fit(X_train, y_train)
    duration = (datetime.now() - start_time).total_seconds()
    print(f"  - Random Forest trained successfully in {duration:.2f} seconds!")

    # Step 5: Model Evaluation
    print("\n>>> STEP 5: MODEL EVALUATION ON UNSEEN TEST SET")
    y_pred = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"  - Mean Absolute Error (MAE):    {mae:.2f} minutes")
    print(f"  - Root Mean Squared Error (RMSE): {rmse:.2f} minutes")
    print(f"  - Coefficient of Determination (R2 Score): {r2:.4f} ({r2*100:.1f}% variance explained)")

    # Step 6: Feature Importances
    print("\n>>> STEP 6: FEATURE IMPORTANCE ANALYSIS")
    cat_feature_names = (
        pipeline.named_steps["preprocessor"]
        .named_transformers_["cat"]
        .get_feature_names_out(categorical_cols)
        .tolist()
    )
    all_feature_names = cat_feature_names + numerical_cols
    raw_importances = pipeline.named_steps["regressor"].feature_importances_

    feature_importances = [
        {"feature": name, "importance": round(float(imp), 4), "percentage": round(float(imp) * 100, 2)}
        for name, imp in sorted(zip(all_feature_names, raw_importances), key=lambda x: x[1], reverse=True)
    ]

    print("  Top Influential Factors:")
    for idx, item in enumerate(feature_importances[:8], 1):
        print(f"    {idx}. {item['feature']:<30} {item['percentage']:>6.2f}%")

    # Step 7: Model Serialization
    print("\n>>> STEP 7: SAVING TRAINED MODEL")
    model_payload = {
        "pipeline": pipeline,
        "feature_cols": feature_cols,
        "categorical_cols": categorical_cols,
        "numerical_cols": numerical_cols,
        "metrics": {
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "r2": round(float(r2), 4),
        },
        "feature_importances": feature_importances,
        "model_name": "RandomForestRegressor",
        "model_version": "1.0.0",
        "trained_at": datetime.utcnow().isoformat(),
        "n_samples": len(df),
    }

    joblib.dump(model_payload, MODEL_PATH)
    file_size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
    print(f"  - Model serialized to: {MODEL_PATH}")
    print(f"  - File size: {file_size_mb:.2f} MB")
    print("\n[SUCCESS] Dataset -> Preprocessing -> Training -> Evaluation -> Saved Model completed!\n")

    return model_payload


if __name__ == "__main__":
    train_and_evaluate()
