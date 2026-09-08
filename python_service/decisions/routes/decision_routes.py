"""
FastAPI Decision Intelligence Router.
Provides pure scoring and recommendation generation endpoints.
Node.js owns authentication, database writes, and approval state machines.
"""
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from decisions.scoring.assignment_scorer import score_mechanic_assignment
from decisions.scoring.priority_scorer import score_job_priority
from decisions.scoring.slot_scorer import optimize_appointment_slots
from decisions.scoring.workload_action_scorer import evaluate_workload_decisions
from decisions.scoring.inventory_action_scorer import score_inventory_restock_decision
from decisions.recommendations.generator import generate_decision_package

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/decisions", tags=["decisions"])

# ── Request Models ────────────────────────────────────────────────────────────

class AssignmentScoringRequest(BaseModel):
    job_details: Dict[str, Any]
    candidate_mechanics: List[Dict[str, Any]]
    predicted_duration_mins: float = 60.0
    garage_id: Optional[str] = None

class PriorityScoringRequest(BaseModel):
    job_details: Dict[str, Any]
    hours_until_scheduled: Optional[float] = None
    customer_wait_hours: float = 0.0
    parts_available: bool = True
    predicted_duration_mins: float = 60.0
    is_vip_customer: bool = False

class SlotOptimizationRequest(BaseModel):
    service_type: str
    vehicle_type: str = "sedan"
    predicted_duration_mins: float = 60.0
    existing_appointments: List[Dict[str, Any]] = []
    operating_hours: Optional[Dict[str, Any]] = None
    target_date: Optional[str] = None

class WorkloadDecisionRequest(BaseModel):
    predicted_jobs: float
    active_mechanics: int
    avg_jobs_per_mechanic_day: float = 3.0
    pending_appointments: List[Dict[str, Any]] = []
    garage_id: Optional[str] = None

class InventoryDecisionRequest(BaseModel):
    part_details: Dict[str, Any]
    predicted_14d_demand: float
    current_stock: float
    reserved_quantity: float = 0.0
    reorder_level: float = 5.0
    unit_cost: float = 500.0
    supplier: str = "Primary Auto Supply Co."
    garage_id: Optional[str] = None

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/score/assignment")
def score_assignment(req: AssignmentScoringRequest) -> Dict[str, Any]:
    try:
        scored = score_mechanic_assignment(
            job_details=req.job_details,
            candidate_mechanics=req.candidate_mechanics,
            predicted_duration_mins=req.predicted_duration_mins,
            garage_id=req.garage_id
        )

        if not scored.get("success") or not scored.get("recommended_mechanic"):
            return scored

        # Wrap into standard decision package
        rec = scored["recommended_mechanic"]
        pkg = generate_decision_package(
            decision_type="MECHANIC_ASSIGNMENT",
            target_entity_type="job_card",
            target_entity_id=str(req.job_details.get("id")),
            garage_id=req.garage_id or "UNKNOWN",
            action_title=f"Assign Job #{req.job_details.get('id', '')} to {rec['name']}",
            recommendation_payload=scored,
            why_reasons=rec["reasoning"],
            impact_estimate=f"Allocates ~{round(req.predicted_duration_mins)}m repair window • Suitability {rec['suitability_score']}%",
            confidence_level=scored["confidence"],
            confidence_score=scored["confidence_score"],
            constraints_checked=scored["constraints_checked"],
            alternatives=scored["alternative_candidates"]
        )
        return {**scored, "decision_package": pkg}
    except Exception as e:
        logger.error("Mechanic assignment scoring error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score/priority")
def score_priority(req: PriorityScoringRequest) -> Dict[str, Any]:
    try:
        return score_job_priority(
            job_details=req.job_details,
            hours_until_scheduled=req.hours_until_scheduled,
            customer_wait_hours=req.customer_wait_hours,
            parts_available=req.parts_available,
            predicted_duration_mins=req.predicted_duration_mins,
            is_vip_customer=req.is_vip_customer
        )
    except Exception as e:
        logger.error("Priority scoring error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score/appointment-slots")
def score_appointment_slots(req: SlotOptimizationRequest) -> Dict[str, Any]:
    try:
        return optimize_appointment_slots(
            service_type=req.service_type,
            vehicle_type=req.vehicle_type,
            predicted_duration_mins=req.predicted_duration_mins,
            existing_appointments=req.existing_appointments,
            operating_hours=req.operating_hours,
            target_date=req.target_date
        )
    except Exception as e:
        logger.error("Slot optimization error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score/workload")
def score_workload(req: WorkloadDecisionRequest) -> Dict[str, Any]:
    try:
        scored = evaluate_workload_decisions(
            predicted_jobs=req.predicted_jobs,
            active_mechanics=req.active_mechanics,
            avg_jobs_per_mechanic_day=req.avg_jobs_per_mechanic_day,
            pending_appointments=req.pending_appointments,
            garage_id=req.garage_id
        )

        if scored["recommended_actions"]:
            top_action = scored["recommended_actions"][0]
            pkg = generate_decision_package(
                decision_type="WORKLOAD_REBALANCING",
                target_entity_type="garage",
                target_entity_id=str(req.garage_id or "GAR-001"),
                garage_id=req.garage_id or "GAR-001",
                action_title=top_action["title"],
                recommendation_payload=scored,
                why_reasons=[
                    f"Predicted daily job intake: {scored['predicted_jobs']} jobs",
                    f"Current workshop capacity: {scored['daily_capacity_jobs']} jobs ({scored['active_mechanics']} active mechanics)",
                    f"Projected utilization index: {scored['utilization_rate_pct']}%"
                ],
                impact_estimate=scored["expected_impact"],
                confidence_level=scored["confidence"],
                confidence_score=90.0 if scored["workload_risk_level"] == "HIGH" else 75.0,
                alternatives=scored["recommended_actions"][1:]
            )
            return {**scored, "decision_package": pkg}
        return scored
    except Exception as e:
        logger.error("Workload decision error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score/inventory-reorder")
def score_inventory_reorder(req: InventoryDecisionRequest) -> Dict[str, Any]:
    try:
        scored = score_inventory_restock_decision(
            part_details=req.part_details,
            predicted_14d_demand=req.predicted_14d_demand,
            current_stock=req.current_stock,
            reserved_quantity=req.reserved_quantity,
            reorder_level=req.reorder_level,
            unit_cost=req.unit_cost,
            supplier=req.supplier,
            garage_id=req.garage_id
        )

        if scored["action_required"]:
            pkg = generate_decision_package(
                decision_type="INVENTORY_REORDER",
                target_entity_type="inventory_part",
                target_entity_id=str(req.part_details.get("id")),
                garage_id=req.garage_id or "GAR-001",
                action_title=scored["action_title"],
                recommendation_payload=scored,
                why_reasons=scored["reasons"],
                impact_estimate=f"Replenishes stock by {scored['recommended_quantity']} units (~₹{int(scored['estimated_order_cost']):,}) to prevent job hold delays",
                confidence_level=scored["confidence"],
                confidence_score=88.0
            )
            return {**scored, "decision_package": pkg}
        return scored
    except Exception as e:
        logger.error("Inventory decision error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline/metadata")
def decision_pipeline_metadata() -> Dict[str, Any]:
    """Returns architecture pipeline metadata for Engineering Lab visualization."""
    return {
        "pipeline_stages": [
            {"stage": 1, "name": "Real Operational Data", "description": "MySQL source records: Job_Card, Appointment, Inventory, Mechanic_Profile"},
            {"stage": 2, "name": "Phase 7 Predictive Intelligence", "description": "Revenue, Workload, Demand, and Duration ML inference"},
            {"stage": 3, "name": "Decision Engine & Scoring", "description": "Multi-criteria optimization & ranking (OR-Tools, heuristics, priority matrix)"},
            {"stage": 4, "name": "Safety & Constraint Validator", "description": "Garage boundary check, availability verification, stale prediction protection"},
            {"stage": 5, "name": "Human-in-the-Loop Review", "description": "Manager / Owner review modal with Approve, Reject, or Modify options"},
            {"stage": 6, "name": "Atomic Transaction Execution", "description": "MySQL transaction commits changes + updates Decision_Audit log"},
            {"stage": 7, "name": "Outcome & Feedback Loop", "description": "Captures actual metrics vs predicted impact + reviewer feedback notes"}
        ],
        "decision_types": [
            "MECHANIC_ASSIGNMENT",
            "JOB_PRIORITIZATION",
            "APPOINTMENT_SCHEDULING",
            "WORKLOAD_REBALANCING",
            "INVENTORY_REORDER",
            "REVENUE_OPTIMIZATION"
        ],
        "governance_mode": "CONTROLLED_AUTONOMOUS_WITH_HUMAN_IN_THE_LOOP"
    }
