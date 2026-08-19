import numpy as np
import pandas as pd

def run_anomaly_detection(db_conn):
    cursor = db_conn.cursor(dictionary=True)
    
    # Analyze recent invoices for abnormal discounts or totals
    query = """
        SELECT id, issue_date, total_amount, discount, created_by 
        FROM Invoice 
        ORDER BY issue_date DESC 
        LIMIT 100
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    
    if not rows or len(rows) < 10:
        # Provide a demo dataset to showcase the logic
        return {
            "status": "Simulation Dataset",
            "anomalies": [
                {
                    "invoice_id": "INV-SIM-001",
                    "manager_id": "M03",
                    "discount": 34.0,
                    "normal_range": "5-12%",
                    "severity": "HIGH",
                    "reason": "Discount rate is +22 percentage points above normal range."
                }
            ],
            "details": "Insufficient real data. Showing simulated anomaly."
        }
        
    df = pd.DataFrame(rows)
    df['total_amount'] = df['total_amount'].astype(float)
    df['discount'] = df['discount'].astype(float)
    
    # Calculate discount percentage (assuming total_amount is after discount, approx logic)
    # If discount is absolute, we compare absolute. Let's assume absolute for simplicity.
    mean_discount = df['discount'].mean()
    std_discount = df['discount'].std()
    
    anomalies = []
    
    for _, row in df.iterrows():
        # Domain aware threshold: discount > 5000 is always high
        # Statistical threshold: Z-score > 2.5
        is_domain_anomaly = row['discount'] > 5000
        is_stat_anomaly = False
        
        if std_discount > 0:
            z_score = (row['discount'] - mean_discount) / std_discount
            is_stat_anomaly = z_score > 2.5
            
        if is_domain_anomaly or is_stat_anomaly:
            severity = "CRITICAL" if is_domain_anomaly else "HIGH"
            reason = []
            if is_stat_anomaly:
                reason.append(f"Statistically abnormal (Z-score: {z_score:.2f})")
            if is_domain_anomaly:
                reason.append("Exceeds absolute domain limit of 5000")
                
            anomalies.append({
                "invoice_id": row['id'],
                "manager_id": row['created_by'] or "Unknown",
                "discount": row['discount'],
                "normal_mean": round(mean_discount, 2),
                "severity": severity,
                "reason": " | ".join(reason)
            })
            
    return {
        "status": "Real Data",
        "anomalies": anomalies,
        "details": f"Analyzed {len(df)} recent invoices."
    }
