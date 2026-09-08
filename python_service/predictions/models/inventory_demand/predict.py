"""
Inventory demand forecasting inference.
Produces per-part 14-day demand forecasts + stockout risk.
Connects to Phase 6 inventory stock levels.
"""
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from predictions.models.registry import load, status, INV_DEMAND_MODEL
from predictions.models.inventory_demand.features import (
    build_features, feature_matrix, FEATURE_NAMES, stockout_risk
)

logger = logging.getLogger(__name__)


def predict_inventory_demand(
    demand_df: pd.DataFrame,
    stock_df: pd.DataFrame,
    garage_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    demand_df: historical consumption (usage_date, weekly_quantity, part_id, part_name, garage_id)
    stock_df: current stock levels (part_id, part_name, garage_id, quantity_in_stock, reserved_quantity, reorder_level)
    """
    if demand_df.empty:
        return {
            "mode": "NO_DATA",
            "garage_id": garage_id,
            "message": "No historical consumption data available.",
            "predictions": [],
        }

    demand_df = demand_df.copy()
    demand_df["usage_date"] = pd.to_datetime(demand_df["usage_date"])
    model_status = status(INV_DEMAND_MODEL)

    results: List[Dict] = []
    parts = demand_df["part_id"].unique()

    for part_id in parts:
        part_df = demand_df[demand_df["part_id"] == part_id].sort_values("usage_date").reset_index(drop=True)
        part_name = str(part_df["part_name"].iloc[-1]) if "part_name" in part_df.columns else str(part_id)

        # Get current stock for this part
        stock_row = stock_df[stock_df["part_id"] == str(part_id)] if not stock_df.empty else pd.DataFrame()
        current_stock = float(stock_row["quantity_in_stock"].iloc[0]) if not stock_row.empty else 0.0
        reserved = float(stock_row["reserved_quantity"].iloc[0]) if not stock_row.empty else 0.0
        reorder_level = float(stock_row["reorder_level"].iloc[0]) if not stock_row.empty else 5.0

        # 14-day baseline (2 weeks of average weekly consumption)
        baseline_14d = float(part_df["weekly_quantity"].tail(4).mean()) * 2

        if len(part_df) < 4 or not model_status["trained"]:
            # Baseline for cold-start parts
            risk = stockout_risk(baseline_14d, current_stock, reserved)
            results.append(_format_result(
                part_id, part_name, garage_id, baseline_14d, current_stock,
                reserved, reorder_level, risk, "BASELINE", None
            ))
            continue

        try:
            model, meta = load(INV_DEMAND_MODEL)
            feat_df = build_features(part_df)
            feat_df = feat_df.dropna(subset=FEATURE_NAMES)
            if feat_df.empty:
                raise ValueError("No valid feature rows")
            last_row = feat_df.tail(1)
            X = feature_matrix(last_row).values
            pred_weekly = float(max(0, model.predict(X)[0]))
            pred_14d = pred_weekly * 2  # 2 weeks
            risk = stockout_risk(pred_14d, current_stock, reserved)
            results.append(_format_result(
                part_id, part_name, garage_id, pred_14d, current_stock,
                reserved, reorder_level, risk, "ML",
                meta.get("evaluation", {})
            ))
        except Exception as e:
            logger.warning("Part %s demand prediction failed: %s", part_id, e)
            risk = stockout_risk(baseline_14d, current_stock, reserved)
            results.append(_format_result(
                part_id, part_name, garage_id, baseline_14d, current_stock,
                reserved, reorder_level, risk, "BASELINE", None
            ))

    # Sort by stockout risk severity
    risk_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "HEALTHY": 3}
    results.sort(key=lambda r: risk_order.get(r["stockout_risk"], 4))

    return {
        "mode": "ML" if model_status["trained"] else "BASELINE",
        "garage_id": garage_id,
        "model_name": INV_DEMAND_MODEL,
        "model_status": model_status,
        "total_parts_analyzed": len(results),
        "critical_count": sum(1 for r in results if r["stockout_risk"] == "CRITICAL"),
        "high_risk_count": sum(1 for r in results if r["stockout_risk"] == "HIGH"),
        "predictions": results[:30],  # top 30
    }


def _format_result(
    part_id, part_name, garage_id, demand_14d, current_stock,
    reserved, reorder_level, risk, mode, evaluation
) -> Dict:
    available = max(0.0, current_stock - reserved)
    reorder_recommended = available <= reorder_level or risk in ("HIGH", "CRITICAL")
    return {
        "part_id": str(part_id),
        "part_name": part_name,
        "garage_id": garage_id,
        "mode": mode,
        "predicted_14d_demand": round(demand_14d, 1),
        "current_stock": round(current_stock, 0),
        "reserved_quantity": round(reserved, 0),
        "available_stock": round(available, 0),
        "reorder_level": round(reorder_level, 0),
        "stockout_risk": risk,
        "reorder_recommended": reorder_recommended,
        "note": "Limited data — using baseline" if mode == "BASELINE" else None,
    }
