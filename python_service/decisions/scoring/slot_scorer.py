"""
Smart Appointment Scheduling Slot Optimizer.
Computes optimal booking windows minimizing workshop queue congestion and mechanic conflicts.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

def optimize_appointment_slots(
    service_type: str,
    vehicle_type: str,
    predicted_duration_mins: float,
    existing_appointments: List[Dict[str, Any]],
    operating_hours: Dict[str, Any] = None,
    target_date: Optional[str] = None,
    max_slots: int = 4
) -> Dict[str, Any]:
    """
    Evaluates potential time slots across operational hours (default 9:00 AM - 6:00 PM)
    and scores slots based on bay concurrency, mechanic availability, and predicted duration.
    """
    if operating_hours is None:
        operating_hours = {"start_hour": 9, "end_hour": 18, "slot_interval_mins": 60, "max_concurrent_bays": 4}

    start_hour = operating_hours.get("start_hour", 9)
    end_hour = operating_hours.get("end_hour", 18)
    interval = operating_hours.get("slot_interval_mins", 60)
    max_bays = operating_hours.get("max_concurrent_bays", 4)

    # Base date to inspect (tomorrow or specified target_date)
    if target_date:
        try:
            base_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except Exception:
            base_date = (datetime.now() + timedelta(days=1)).date()
    else:
        base_date = (datetime.now() + timedelta(days=1)).date()

    date_str = str(base_date)
    candidate_slots = []

    # Map existing appointments for the day
    day_appts = [
        a for a in existing_appointments
        if str(a.get("scheduled_date", "")).startswith(date_str)
    ]

    current_hour = start_hour
    current_min = 0

    while current_hour < end_hour:
        slot_time_str = f"{current_hour:02d}:{current_min:02d}"
        slot_datetime_str = f"{date_str} {slot_time_str}"
        slot_end_hour = current_hour + int((current_min + predicted_duration_mins) // 60)
        slot_end_min = int((current_min + predicted_duration_mins) % 60)

        # Count concurrent jobs running in this window
        overlapping = 0
        for appt in day_appts:
            appt_time = str(appt.get("scheduled_date", "")).replace("T", " ")
            if appt_time:
                try:
                    appt_dt = datetime.strptime(appt_time[:16], "%Y-%m-%d %H:%M")
                    # Assume average 60m duration if not specified
                    appt_dur = float(appt.get("estimated_duration_minutes", 60))
                    appt_end = appt_dt + timedelta(minutes=appt_dur)
                    slot_start = datetime.strptime(slot_datetime_str, "%Y-%m-%d %H:%M")
                    slot_end = slot_start + timedelta(minutes=predicted_duration_mins)

                    if not (slot_end <= appt_dt or slot_start >= appt_end):
                        overlapping += 1
                except Exception:
                    overlapping += 1

        capacity_remaining = max(0, max_bays - overlapping)
        
        # Calculate slot score (0 to 100)
        if capacity_remaining == 0:
            slot_score = 10.0 # Full bay constraint
        else:
            # Prefer morning / mid-afternoon slots with highest spare bay capacity
            capacity_factor = (capacity_remaining / max_bays) * 70.0
            time_pref = 30.0 if 10 <= current_hour <= 15 else 20.0
            slot_score = capacity_factor + time_pref

        # Formulate reasoning
        reasons = []
        if capacity_remaining >= 2:
            reasons.append(f"Optimal bay availability ({capacity_remaining} of {max_bays} bays open)")
        elif capacity_remaining == 1:
            reasons.append(f"Single open bay remaining ({overlapping} active bookings)")
        else:
            reasons.append("High bay congestion during this window")

        reasons.append(f"Predicted job window: {round(predicted_duration_mins)}m (Ends ~{slot_end_hour:02d}:{slot_end_min:02d})")

        candidate_slots.append({
            "date": date_str,
            "start_time": slot_time_str,
            "formatted_slot": f"{date_str} at {slot_time_str}",
            "capacity_remaining": capacity_remaining,
            "overlapping_jobs": overlapping,
            "suitability_score": round(slot_score, 1),
            "reasons": reasons
        })

        # Advance to next interval
        current_min += interval
        if current_min >= 60:
            current_hour += current_min // 60
            current_min = current_min % 60

    # Sort slots by score descending
    candidate_slots.sort(key=lambda x: x["suitability_score"], reverse=True)
    recommended_slot = candidate_slots[0] if candidate_slots else None
    alternatives = candidate_slots[1:max_slots] if len(candidate_slots) > 1 else []

    return {
        "success": True,
        "target_date": date_str,
        "service_type": service_type,
        "predicted_duration_mins": predicted_duration_mins,
        "recommended_slot": recommended_slot,
        "alternative_slots": alternatives,
        "all_evaluated_slots": candidate_slots
    }
