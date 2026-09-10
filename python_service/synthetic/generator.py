import os
import json
import random
import time
from typing import Dict, Any, List

SERVICE_CATALOG = [
    {"type": "Oil Change", "baseDuration": 35, "skill": "General Maintenance", "partsCount": 2},
    {"type": "Brake Service", "baseDuration": 75, "skill": "Brakes & Suspension", "partsCount": 4},
    {"type": "Engine Diagnostics", "baseDuration": 90, "skill": "Engine & Diagnostics", "partsCount": 1},
    {"type": "Battery Replacement", "baseDuration": 25, "skill": "Electrical & AC", "partsCount": 1},
    {"type": "AC Service", "baseDuration": 60, "skill": "Electrical & AC", "partsCount": 3},
    {"type": "Wheel Alignment", "baseDuration": 45, "skill": "Brakes & Suspension", "partsCount": 0},
    {"type": "Suspension Repair", "baseDuration": 130, "skill": "Brakes & Suspension", "partsCount": 6},
    {"type": "Clutch Service", "baseDuration": 150, "skill": "Transmission & Drivetrain", "partsCount": 5},
    {"type": "General Inspection", "baseDuration": 40, "skill": "General Maintenance", "partsCount": 0},
    {"type": "Tyre Replacement", "baseDuration": 50, "skill": "General Maintenance", "partsCount": 4}
]

VEHICLE_TYPES = [
    {"category": "Hatchback", "durationMultiplier": 0.9},
    {"category": "Sedan", "durationMultiplier": 1.0},
    {"category": "SUV", "durationMultiplier": 1.2},
    {"category": "Luxury Sedan", "durationMultiplier": 1.35},
    {"category": "Commercial Van", "durationMultiplier": 1.4}
]

MECHANICS = [
    {"id": "SYNTH_MECH_01", "specialization": "Engine & Diagnostics", "experience": 8, "speed": 0.85},
    {"id": "SYNTH_MECH_02", "specialization": "Brakes & Suspension", "experience": 6, "speed": 0.90},
    {"id": "SYNTH_MECH_03", "specialization": "Electrical & AC", "experience": 5, "speed": 0.92},
    {"id": "SYNTH_MECH_04", "specialization": "Transmission & Drivetrain", "experience": 10, "speed": 0.80},
    {"id": "SYNTH_MECH_05", "specialization": "General Maintenance", "experience": 3, "speed": 1.05}
]

def generate_python_synthetic_dataset(count: int = 1000, seed: int = 42) -> Dict[str, Any]:
    """
    Generates realistic, correlated synthetic workshop data.
    Strictly isolated for DEV/TEST experimentation.
    """
    rng = random.Random(seed)
    records = []

    for i in range(count):
        service = rng.choice(SERVICE_CATALOG)
        vehicle = rng.choice(VEHICLE_TYPES)
        mech = rng.choice(MECHANICS)

        vehicle_age = rng.randint(1, 15)
        mileage = rng.randint(8000, 220000)
        day_of_week = rng.randint(1, 6)
        hour_of_day = rng.randint(8, 18)
        queue_depth = rng.randint(0, 7)
        priority = rng.choices(["NORMAL", "HIGH", "URGENT"], weights=[0.6, 0.3, 0.1])[0]

        is_skill_match = 1 if mech["specialization"] == service["skill"] else 0
        speed_factor = mech["speed"] if is_skill_match else mech["speed"] * 1.35
        wear_factor = 1.0 + (vehicle_age * 0.02)
        noise = rng.uniform(0.9, 1.15)

        actual_duration = max(15, round(service["baseDuration"] * vehicle["durationMultiplier"] * speed_factor * wear_factor * noise))
        is_anomaly = 1 if rng.random() < 0.04 else 0
        if is_anomaly:
            actual_duration = round(actual_duration * rng.uniform(1.8, 2.8))

        # Prediction-time features ONLY (no target leakage)
        features = {
            "service_type": service["type"],
            "skill_required": service["skill"],
            "vehicle_type": vehicle["category"],
            "vehicle_age": vehicle_age,
            "mileage": mileage,
            "day_of_week": day_of_week,
            "hour_of_day": hour_of_day,
            "queue_depth": queue_depth,
            "priority": priority,
            "mechanic_id": mech["id"],
            "mechanic_experience": mech["experience"],
            "is_skill_match": is_skill_match,
            "parts_count": service["partsCount"]
        }

        # Targets
        targets = {
            "actual_duration": actual_duration,
            "is_anomaly": is_anomaly,
            "optimal_mechanic_id": mech["id"]
        }

        records.append({
            "record_id": f"PY_SYNTH_{i+1:06d}",
            "features": features,
            "targets": targets
        })

    train_idx = int(count * 0.70)
    val_idx = int(count * 0.85)

    dataset_id = f"synth_py_ds_{int(time.time())}"
    return {
        "metadata": {
            "dataset_id": dataset_id,
            "dataset_version": f"synthetic_v{int(time.time())}",
            "data_source": "SYNTHETIC_DEV",
            "synthetic": True,
            "environment": os.getenv("NODE_ENV", "development"),
            "generator_version": "v1.4.0-py",
            "random_seed": seed,
            "total_records": count,
            "splits": {
                "train_records": train_idx,
                "val_records": val_idx - train_idx,
                "test_records": count - val_idx
            }
        },
        "splits": {
            "train": records[:train_idx],
            "validation": records[train_idx:val_idx],
            "test": records[val_idx:]
        }
    }
