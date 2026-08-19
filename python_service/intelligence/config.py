"""Central, versioned configuration for the assignment intelligence core."""

MODEL_VERSION = "xgb_assignment_v1"
MIN_TRAINING_ROWS = 30
MAX_WORKLOAD_MINUTES = 480

# These weights are only used in COLD_START mode. They intentionally remain
# central and human-reviewable rather than being hidden across the codebase.
COLD_START_WEIGHTS = {
    "skill_match": 0.30,
    "proficiency_score": 0.20,
    "experience_years": 0.12,
    "availability_score": 0.18,
    "workload_headroom": 0.15,
    "historical_success_rate": 0.05,
}

# CP-SAT maximises suitability first, with a small, explicit workload-balancing
# deduction. Scores are scaled to integer coefficients for OR-Tools.
OPTIMIZATION = {"suitability_scale": 10_000, "workload_penalty_per_minute": 1}
