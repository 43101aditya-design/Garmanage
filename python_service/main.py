import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection

from algorithms.mechanic_assignment import run_mechanic_assignment
from algorithms.revenue_forecast import run_revenue_forecast
from algorithms.anomaly_detection import run_anomaly_detection
from algorithms.inventory_prediction import run_inventory_prediction

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
def mechanic_assignment(data: dict, db=Depends(get_db)):
    return run_mechanic_assignment(db, data)

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

@app.get("/source-code/revenue-forecast")
def source_revenue_forecast():
    return get_safe_source("revenue_forecast.py")

@app.get("/source-code/anomaly-detection")
def source_anomaly_detection():
    return get_safe_source("anomaly_detection.py")

@app.get("/source-code/inventory-prediction")
def source_inventory_prediction():
    return get_safe_source("inventory_prediction.py")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
