import os
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection

from algorithms.mechanic_assignment import run_mechanic_assignment
from algorithms.revenue_forecast import run_revenue_forecast
from algorithms.anomaly_detection import run_anomaly_detection
from algorithms.inventory_prediction import run_inventory_prediction
from intelligence.core import recommend
from intelligence.ranking.ranker import ranker
from intelligence.training.train import train

app = FastAPI(title="Engineering Intelligence Lab API")

# Allow Node.js backend (or React directly if needed for proxy testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    try:
        yield conn
    finally:
        conn.close()

@app.get("/api/health")
def health_check(db=Depends(get_db)):
    try:
        # Check DB by running a simple query
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        return {"status": "ok", "db": "connected", "python": "online"}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "python": "online", "detail": str(e)}

@app.post("/api/simulation/mechanic-assignment")
def mechanic_assignment(data: dict):
    # Simulation is deliberately isolated: the adapter constructs a scenario and
    # invokes the same pure core used by production; it does not read MySQL.
    return run_mechanic_assignment(data)

@app.post("/api/intelligence/recommendations")
def assignment_recommendations(data: Dict[str, Any]):
    """Structured, mutation-free inference endpoint called by the Node gateway."""
    if not data.get("jobs") or not isinstance(data.get("candidates_by_job"), dict):
        raise HTTPException(status_code=422, detail="jobs and candidates_by_job are required structured inputs")
    return recommend(data)

@app.get("/api/intelligence/model/status")
def assignment_model_status():
    return ranker.status()

@app.get("/api/intelligence/model/evaluation")
def assignment_model_evaluation():
    status = ranker.status()
    return {"model_version": status["model_version"], "mode": status["mode"], "evaluation": status.get("evaluation"), "message": None if status["trained"] else "Insufficient historical data — using cold-start ranking."}

@app.post("/api/intelligence/model/train")
def train_assignment_model(data: Dict[str, Any]):
    # Kept separate from inference. Node supplies vetted historical snapshots;
    # Python still has no production database mutation privileges.
    rows = data.get("rows")
    if not isinstance(rows, list):
        raise HTTPException(status_code=422, detail="rows must be a list of assignment-time feature snapshots")
    return train(rows)

@app.get("/api/simulation/revenue-forecast")
def revenue_forecast(db=Depends(get_db)):
    return run_revenue_forecast(db)

@app.get("/api/simulation/workload-prediction")
def workload_prediction(db=Depends(get_db)):
    # Workload prediction logic
    pass

@app.get("/api/simulation/anomaly-detection")
def anomaly_detection(db=Depends(get_db)):
    return run_anomaly_detection(db)

@app.get("/api/simulation/inventory-prediction")
def inventory_prediction(db=Depends(get_db)):
    return run_inventory_prediction(db)

# Safe endpoints to fetch source code
def get_safe_source(filename: str):
    filepath = os.path.join(os.path.dirname(__file__), "algorithms", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    with open(filepath, "r") as f:
        return {"source": f.read()}

@app.get("/source-code/mechanic-assignment")
def source_mechanic_assignment():
    return get_safe_source("mechanic_assignment.py")

@app.get("/source-code/assignment-features")
def source_assignment_features():
    return get_safe_intelligence_source("features/assignment_features.py")

@app.get("/source-code/assignment-ranking")
def source_assignment_ranking():
    return get_safe_intelligence_source("ranking/ranker.py")

@app.get("/source-code/assignment-optimization")
def source_assignment_optimization():
    return get_safe_intelligence_source("optimization/assignment_optimizer.py")

@app.get("/source-code/assignment-explanations")
def source_assignment_explanations():
    return get_safe_intelligence_source("explanations/explain.py")

@app.get("/source-code/revenue-forecast")
def source_revenue_forecast():
    return get_safe_source("revenue_forecast.py")

@app.get("/source-code/anomaly-detection")
def source_anomaly_detection():
    return get_safe_source("anomaly_detection.py")

@app.get("/source-code/inventory-prediction")
def source_inventory_prediction():
    return get_safe_source("inventory_prediction.py")

def get_safe_intelligence_source(relative_filename: str):
    base = os.path.join(os.path.dirname(__file__), "intelligence")
    filepath = os.path.abspath(os.path.join(base, relative_filename))
    if not filepath.startswith(os.path.abspath(base) + os.sep) or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    with open(filepath, "r") as f:
        return {"source": f.read()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
