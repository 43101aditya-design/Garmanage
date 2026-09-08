"""
Phase 8 Decision Engine Integration Adapter.
Provides clean architectural interface for Phase 8 Autonomous Decision Intelligence.
Maintains full operational independence if Phase 8 is in progress.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class Phase8DecisionAdapter:
    """
    Bridge between Phase 9 Digital Twin simulations and Phase 8 Controlled Autonomous Operations.
    """

    @staticmethod
    def bridge_simulation_to_decision_payload(
        scenario_type: str,
        sim_metrics: Dict[str, Any],
        bottleneck: Dict[str, Any],
        recommendation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Formats simulation and optimization outputs into Phase 8 Decision Audit structure.
        """
        confidence = 92.0 if recommendation.get("is_feasible") else 60.0
        
        return {
            "integration_status": "INTEGRATION_READY",
            "decision_type": "WORKLOAD_REBALANCING" if "SURGE" in scenario_type or "DEMAND" in scenario_type else "MECHANIC_ASSIGNMENT",
            "target_entity_type": "garage",
            "proposed_action": recommendation.get("title", "Optimal Queue Sequencing"),
            "confidence_score": confidence,
            "confidence_level": "HIGH_CONFIDENCE" if confidence >= 85.0 else "MEDIUM_CONFIDENCE",
            "rationale": [
                f"Identified primary bottleneck: {bottleneck.get('title')}",
                f"Simulated outcome: Utilization {sim_metrics.get('utilization_pct')}% vs SLA compliance {sim_metrics.get('sla_compliance_pct')}%",
                f"Projected wait time impact: ~{sim_metrics.get('avg_wait_mins')} minutes",
                f"Remediation action: {recommendation.get('description', '')}"
            ],
            "projected_outcomes": {
                "resulting_utilization_pct": recommendation.get("metrics", {}).get("utilization_pct", sim_metrics.get("utilization_pct")),
                "resulting_avg_wait_mins": recommendation.get("metrics", {}).get("avg_wait_mins", sim_metrics.get("avg_wait_mins")),
                "prevented_sla_breaches": sim_metrics.get("sla_violations_count", 0),
                "currency": "INR",
                "realized_revenue_inr": sim_metrics.get("financial_impact", {}).get("realized_revenue_inr", 0.0)
            },
            "governance_note": "Requires human manager or owner sign-off prior to production execution."
        }
