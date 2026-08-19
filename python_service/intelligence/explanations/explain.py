"""Deterministic, evidence-only recommendation explanations."""
from __future__ import annotations

from typing import Any, Dict, List


def build_explanation(job: Dict[str, Any], selected: Dict[str, Any], alternatives: List[Dict[str, Any]]) -> Dict[str, Any]:
    reasons: List[str] = []
    unavailable: List[str] = []
    if selected.get("skill_match") is True:
        reasons.append("Matches every recorded mandatory skill for this job.")
    elif selected.get("skill_match") is None:
        unavailable.append("No job-to-skill requirement records are available, so skill matching is neutral.")
    proficiency = selected.get("proficiency_score")
    if proficiency is not None and float(proficiency) >= 0.75:
        reasons.append("Has advanced or expert proficiency in the recorded matching skills.")
    experience = selected.get("experience_years")
    if experience is not None and float(experience) > 0:
        reasons.append(f"Has {int(float(experience))} years of recorded experience.")
    if selected.get("availability_known") and selected.get("availability_score", 0) >= 1:
        reasons.append("Is scheduled as available for the requested service window.")
    elif not selected.get("availability_known"):
        unavailable.append("The requested service window is incomplete, so time-window availability is not scored as confirmed.")
    workload = selected.get("workload_minutes")
    if workload is not None:
        reasons.append(f"Has {int(float(workload))} assigned workload minutes before this assignment.")
    completed = selected.get("historical_completed_jobs")
    success = selected.get("historical_success_rate")
    if completed and success is not None:
        reasons.append(f"Historical on-time completion rate is {round(float(success) * 100)}% across {int(completed)} completed jobs.")

    tradeoffs: List[str] = []
    if alternatives:
        runner_up = alternatives[0]
        if float(runner_up.get("proficiency_score") or 0) > float(selected.get("proficiency_score") or 0) and float(runner_up.get("workload_minutes") or 0) > float(selected.get("workload_minutes") or 0):
            tradeoffs.append("A more proficient alternative has a higher current workload.")
        elif float(runner_up.get("workload_minutes") or 0) < float(selected.get("workload_minutes") or 0):
            tradeoffs.append("A lower-workload alternative has a lower overall suitability score.")
    return {"reasons": reasons, "tradeoffs": tradeoffs, "unavailable_features": unavailable}
