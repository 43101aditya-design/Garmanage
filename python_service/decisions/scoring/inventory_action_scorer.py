"""
Inventory Restock Decision Scorer.
Translates Phase 7 14-day demand predictions & stockout risks into concrete purchase/transfer action proposals.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

def score_inventory_restock_decision(
    part_details: Dict[str, Any],
    predicted_14d_demand: float,
    current_stock: float,
    reserved_quantity: float,
    reorder_level: float = 5.0,
    unit_cost: float = 500.0,
    supplier: str = "Primary Auto Supply Co.",
    garage_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes recommended purchase order quantity and decision action.
    """
    available_stock = max(0.0, current_stock - reserved_quantity)
    net_deficit = predicted_14d_demand - available_stock

    if net_deficit > 0:
        # Buffer recommendation: coverage for demand + safety stock (reorder_level)
        recommended_qty = int(max(5, round(net_deficit + reorder_level)))
        stockout_risk = "CRITICAL" if available_stock == 0 else "HIGH" if available_stock < (predicted_14d_demand * 0.5) else "MEDIUM"
        action_required = True
    elif available_stock <= reorder_level:
        recommended_qty = int(max(5, round(reorder_level * 2 - available_stock)))
        stockout_risk = "MEDIUM"
        action_required = True
    else:
        recommended_qty = 0
        stockout_risk = "HEALTHY"
        action_required = False

    reasons = [
        f"Current available stock: {int(available_stock)} units ({int(reserved_quantity)} currently reserved for ongoing jobs)",
        f"Predicted 14-day consumption: {round(predicted_14d_demand, 1)} units",
        f"Reorder safety threshold: {int(reorder_level)} units"
    ]

    if action_required:
        action_title = f"Initiate Restock Order for {recommended_qty} units of {part_details.get('name', 'Spare Part')}"
        reasons.append(f"Stock deficit of ~{round(max(0, net_deficit), 1)} units projected within 14 days")
    else:
        action_title = f"Maintain stock levels for {part_details.get('name', 'Spare Part')} — coverage is optimal."

    estimated_order_cost = recommended_qty * unit_cost

    return {
        "part_id": part_details.get("id"),
        "part_name": part_details.get("name", "Spare Part"),
        "part_number": part_details.get("part_number", "N/A"),
        "garage_id": garage_id,
        "action_required": action_required,
        "stockout_risk": stockout_risk,
        "recommended_quantity": recommended_qty,
        "estimated_order_cost": estimated_order_cost,
        "supplier": supplier,
        "action_title": action_title,
        "reasons": reasons,
        "confidence": "HIGH_CONFIDENCE" if predicted_14d_demand > 0 else "MEDIUM_CONFIDENCE"
    }
