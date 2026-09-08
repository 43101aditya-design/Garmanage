"""
FastAPI prediction routes — all 4 prediction models.
Python reads MySQL read-only. Node.js is the auth boundary.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import get_db_connection
from predictions.data_loader import (
    load_revenue_data,
    load_workload_data,
    load_inventory_demand_data,
    load_current_inventory,
    load_mechanic_performance,
    load_duration_data,
)
from predictions.models.revenue.predict import predict_revenue
from predictions.models.revenue.train import train_revenue_model
from predictions.models.workload.predict import predict_workload
from predictions.models.workload.train import train_workload_model
from predictions.models.inventory_demand.predict import predict_inventory_demand
from predictions.models.inventory_demand.train import train_inventory_demand_model
from predictions.models.duration.predict import predict_duration
from predictions.models.duration.train import train_duration_model
from predictions.models.registry import all_model_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


def get_db():
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        yield conn
    finally:
        conn.close()


# ── Revenue Forecast ─────────────────────────────────────────────────────────

@router.get("/revenue")
def revenue_forecast(
    horizon: int = Query(default=7, ge=1, le=90),
    garage_id: Optional[str] = Query(default=None),
    db=Depends(get_db),
) -> Dict[str, Any]:
    """
    Produce a revenue forecast for the next `horizon` days.
    garage_id is supplied by Node.js from the authenticated JWT — not trusted from client.
    """
    try:
        df = load_revenue_data(db, garage_id=garage_id)
        return predict_revenue(df, horizon=horizon, garage_id=garage_id)
    except Exception as e:
        logger.error("Revenue forecast error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Workload Forecast ─────────────────────────────────────────────────────────

@router.get("/workload")
def workload_forecast(
    garage_id: Optional[str] = Query(default=None),
    db=Depends(get_db),
) -> Dict[str, Any]:
    try:
        df = load_workload_data(db, garage_id=garage_id)
        return predict_workload(df, garage_id=garage_id)
    except Exception as e:
        logger.error("Workload forecast error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Inventory Demand Forecast ─────────────────────────────────────────────────

@router.get("/inventory-demand")
def inventory_demand_forecast(
    garage_id: Optional[str] = Query(default=None),
    part_id:   Optional[str] = Query(default=None),
    db=Depends(get_db),
) -> Dict[str, Any]:
    try:
        demand_df = load_inventory_demand_data(db, garage_id=garage_id, part_id=part_id)
        stock_df  = load_current_inventory(db, garage_id=garage_id)
        return predict_inventory_demand(demand_df, stock_df, garage_id=garage_id)
    except Exception as e:
        logger.error("Inventory demand forecast error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Service Duration Prediction ───────────────────────────────────────────────

class DurationRequest(BaseModel):
    service_type:  str
    vehicle_type:  str = "sedan"
    mechanic_id:   Optional[str] = None
    parts_count:   int = 0
    garage_id:     Optional[str] = None


@router.post("/service-duration")
def service_duration_prediction(
    body: DurationRequest,
    db=Depends(get_db),
) -> Dict[str, Any]:
    try:
        mech_perf = load_mechanic_performance(db)
        return predict_duration(
            service_type=body.service_type,
            vehicle_type=body.vehicle_type,
            mechanic_id=body.mechanic_id,
            parts_count=body.parts_count,
            mech_perf_df=mech_perf,
            garage_id=body.garage_id,
        )
    except Exception as e:
        logger.error("Duration prediction error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ── Model Registry Status ─────────────────────────────────────────────────────

@router.get("/models/status")
def models_status() -> Dict[str, Any]:
    return all_model_status()


# ── Training Endpoints (triggered by Owner/Admin via Node.js) ─────────────────

class TrainingRequest(BaseModel):
    garage_id: Optional[str] = None


@router.post("/train/revenue")
def train_revenue(body: TrainingRequest, db=Depends(get_db)) -> Dict[str, Any]:
    df = load_revenue_data(db, garage_id=body.garage_id)
    return train_revenue_model(df)


@router.post("/train/workload")
def train_workload(body: TrainingRequest, db=Depends(get_db)) -> Dict[str, Any]:
    df = load_workload_data(db, garage_id=body.garage_id)
    return train_workload_model(df)


@router.post("/train/inventory-demand")
def train_inventory_demand(body: TrainingRequest, db=Depends(get_db)) -> Dict[str, Any]:
    df = load_inventory_demand_data(db, garage_id=body.garage_id)
    return train_inventory_demand_model(df)


@router.post("/train/duration")
def train_duration(body: TrainingRequest, db=Depends(get_db)) -> Dict[str, Any]:
    df = load_duration_data(db, garage_id=body.garage_id)
    mech_perf = load_mechanic_performance(db)
    return train_duration_model(df, mech_perf)


# ── Pipeline metadata endpoint (for Engineering Lab) ─────────────────────────

@router.get("/pipeline/metadata")
def pipeline_metadata() -> Dict[str, Any]:
    """Returns model registry + pipeline description for Engineering Lab visualization."""
    return {
        "pipeline_stages": [
            {"stage": 1, "name": "MySQL Source",          "description": "Historical operational data (Invoice, Appointment, Job_Card, Parts_Used)"},
            {"stage": 2, "name": "Data Quality Check",    "description": "Missing values, negatives, duplicates, outliers removed"},
            {"stage": 3, "name": "Feature Engineering",   "description": "Lag features, rolling averages, calendar encodings"},
            {"stage": 4, "name": "Model Inference",       "description": "GradientBoostingRegressor (scikit-learn) or baseline fallback"},
            {"stage": 5, "name": "Evaluation",            "description": "MAE, RMSE, MAPE vs 7/14-day moving average baseline"},
            {"stage": 6, "name": "Prediction Output",     "description": "Forecast with confidence bounds + contributing factors"},
        ],
        "models": all_model_status(),
        "production_vs_simulation": {
            "production": "Uses real MySQL data from the operational database",
            "simulation": "Uses controlled hypothetical inputs — never overwrites production data",
        },
    }
