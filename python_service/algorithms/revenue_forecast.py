import pandas as pd

def run_revenue_forecast(db_conn):
    cursor = db_conn.cursor(dictionary=True)
    
    # Fetch historical revenue grouped by month
    query = """
        SELECT DATE_FORMAT(issue_date, '%Y-%m') as month, SUM(total_amount) as revenue
        FROM Invoice
        WHERE status IN ('paid', 'partial')
        GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
        ORDER BY month ASC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    
    if len(rows) < 3:
        # Return simulation dataset if not enough real data
        return {
            "status": "Simulation Dataset",
            "historical": [
                {"month": "2026-05", "revenue": 620000},
                {"month": "2026-06", "revenue": 680000},
                {"month": "2026-07", "revenue": 740000},
                {"month": "2026-08", "revenue": 810000}
            ],
            "forecast": {
                "month": "2026-09",
                "revenue": 870000,
                "model_used": "Linear Trend Projection"
            }
        }
        
    df = pd.DataFrame(rows)
    df['revenue'] = df['revenue'].astype(float)
    
    # Simple Moving Average for next month
    if len(df) >= 3:
        forecast_val = df['revenue'].tail(3).mean()
        # Add slight positive trend heuristic
        forecast_val = forecast_val * 1.05 
    else:
        forecast_val = df['revenue'].mean()
        
    # Generate next month label
    last_month = pd.to_datetime(df['month'].iloc[-1])
    next_month = last_month + pd.DateOffset(months=1)
    
    return {
        "status": "Real Data",
        "historical": df.to_dict(orient="records"),
        "forecast": {
            "month": next_month.strftime('%Y-%m'),
            "revenue": round(forecast_val, 2),
            "model_used": "3-Month Moving Average with Trend Adjustment"
        }
    }
