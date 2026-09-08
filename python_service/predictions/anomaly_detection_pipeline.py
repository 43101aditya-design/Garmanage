"""
Phase 8: Anomaly Detection Pipeline
Provides statistical/ML checks (IQR, Z-Score, Isolation Forest) on operational database data.
Python reads MySQL read-only. Express writes to MySQL.
"""
from __future__ import annotations

import logging
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# ── 1. INVOICE ANOMALIES (IQR & Z-Score) ──────────────────────────────────────
def detect_invoice_anomalies(db_conn) -> List[Dict[str, Any]]:
    cursor = db_conn.cursor(dictionary=True)
    anomalies = []
    try:
        query = """
            SELECT i.id, i.total_amount, i.discount, i.created_by,
                   a.garage_id, DATE(i.issue_date) AS invoice_date
            FROM Invoice i
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE i.status IN ('paid', 'partial')
              AND i.total_amount > 0
            ORDER BY i.issue_date DESC
            LIMIT 500
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        if not rows or len(rows) < 5:
            return []

        df = pd.DataFrame(rows)
        df["total_amount"] = df["total_amount"].astype(float)
        df["discount"] = df["discount"].astype(float)

        # Statistical baseline (IQR) for invoice amounts
        q1 = df["total_amount"].quantile(0.25)
        q3 = df["total_amount"].quantile(0.75)
        iqr = q3 - q1
        upper_bound = q3 + 2.0 * iqr

        # Statistical baseline (Mean & Std) for discount percentage
        df["discount_rate"] = df["discount"] / (df["total_amount"] + df["discount"]).clip(lower=1)
        mean_disc = df["discount_rate"].mean()
        std_disc = df["discount_rate"].std()

        for _, row in df.iterrows():
            is_amount_outlier = row["total_amount"] > upper_bound
            
            # Stat threshold: discount rate is > 2.5 std devs above mean or > 40% (deterministic limit)
            is_discount_outlier = False
            z_score = 0.0
            if std_disc > 0:
                z_score = (row["discount_rate"] - mean_disc) / std_disc
                is_discount_outlier = z_score > 2.5
            
            # Deterministic rule override: discount > 35% is always requires review
            is_deterministic_discount = row["discount_rate"] > 0.35

            if is_amount_outlier or is_discount_outlier or is_deterministic_discount:
                reasons = []
                severity = "MEDIUM"
                score = 0.5

                if is_amount_outlier:
                    reasons.append(f"Unusually high invoice amount: ₹{row['total_amount']:.2f} (upper limit: ₹{upper_bound:.2f})")
                    severity = "HIGH"
                    score = 0.8
                if is_discount_outlier:
                    reasons.append(f"Statistically abnormal discount percentage: {(row['discount_rate']*100):.1f}% (Z-score: {z_score:.2f})")
                if is_deterministic_discount:
                    reasons.append(f"Excessive discount percentage: {(row['discount_rate']*100):.1f}% (threshold: 35%)")
                    severity = "CRITICAL"
                    score = 0.95

                anomalies.append({
                    "garage_id": row["garage_id"],
                    "entity_type": "invoice",
                    "entity_id": str(row["id"]),
                    "algorithm": "IQR / Z-Score" if not is_deterministic_discount else "Rule",
                    "severity": severity,
                    "score": score,
                    "reason": " | ".join(reasons)
                })
    except Exception as e:
        logger.error("detect_invoice_anomalies failed: %s", e)
    finally:
        cursor.close()
    return anomalies


# ── 2. INVENTORY ANOMALIES (Z-Score on Weekly Consumption) ───────────────────
def detect_inventory_anomalies(db_conn) -> List[Dict[str, Any]]:
    cursor = db_conn.cursor(dictionary=True)
    anomalies = []
    try:
        # Load weekly part usage history
        query = """
            SELECT pu.inventory_item_id AS part_id, ii.name AS part_name, jc.garage_id,
                   SUM(pu.quantity) AS weekly_quantity, YEARWEEK(jc.created_at, 1) AS year_week
            FROM Parts_Used pu
            JOIN Job_Card jc ON pu.job_card_id = jc.id
            JOIN Inventory_Item ii ON pu.inventory_item_id = ii.id
            GROUP BY pu.inventory_item_id, jc.garage_id, YEARWEEK(jc.created_at, 1)
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        if not rows or len(rows) < 10:
            return []

        df = pd.DataFrame(rows)
        df["weekly_quantity"] = df["weekly_quantity"].astype(float)

        parts = df["part_id"].unique()
        for part_id in parts:
            part_df = df[df["part_id"] == part_id]
            mean_use = part_df["weekly_quantity"].mean()
            std_use = part_df["weekly_quantity"].std()

            if std_use == 0 or pd.isna(std_use):
                continue

            # Look at the most recent week for anomalies
            recent_row = part_df.sort_values("year_week").iloc[-1]
            z_score = (recent_row["weekly_quantity"] - mean_use) / std_use

            if z_score > 3.0:  # Spike is 3 standard deviations above mean
                anomalies.append({
                    "garage_id": recent_row["garage_id"],
                    "entity_type": "inventory",
                    "entity_id": str(part_id),
                    "algorithm": "Z-Score",
                    "severity": "HIGH" if z_score > 4.0 else "MEDIUM",
                    "score": min(0.99, round(z_score / 5.0, 2)),
                    "reason": f"Consumption spike: {recent_row['weekly_quantity']:.1f} used this week (historical weekly mean: {mean_use:.1f}, std: {std_use:.1f})"
                })
    except Exception as e:
        logger.error("detect_inventory_anomalies failed: %s", e)
    finally:
        cursor.close()
    return anomalies


# ── 3. REPAIR DURATION ANOMALIES (Median Outliers) ───────────────────────────
def detect_duration_anomalies(db_conn) -> List[Dict[str, Any]]:
    cursor = db_conn.cursor(dictionary=True)
    anomalies = []
    try:
        query = """
            SELECT jc.id AS job_id, jc.garage_id, sr.service_category AS service_type,
                   TIMESTAMPDIFF(MINUTE, jc.created_at, jc.updated_at) AS duration_minutes
            FROM Job_Card jc
            JOIN Service_Request sr ON jc.service_request_id = sr.id
            WHERE jc.status = 'Completed'
              AND jc.updated_at > jc.created_at
            ORDER BY jc.updated_at DESC
            LIMIT 300
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        if not rows or len(rows) < 10:
            return []

        df = pd.DataFrame(rows)
        df["duration_minutes"] = df["duration_minutes"].astype(float)

        # Baseline: Compute median duration per service category
        medians = df.groupby("service_type")["duration_minutes"].median()

        for _, row in df.iterrows():
            srv = row["service_type"]
            med = medians.get(srv, 120.0)
            duration = row["duration_minutes"]

            # Outlier check: job took more than 4 times the category median
            if duration > 4.0 * med and duration > 60.0:  # ignore trivial differences
                ratio = duration / med
                anomalies.append({
                    "garage_id": row["garage_id"],
                    "entity_type": "duration",
                    "entity_id": str(row["job_id"]),
                    "algorithm": "IQR / Median Outlier",
                    "severity": "CRITICAL" if ratio > 6.0 else "MEDIUM",
                    "score": min(0.99, round(ratio / 10.0, 2)),
                    "reason": f"Repair duration anomaly for {srv}: took {duration:.0f} mins (median category duration: {med:.0f} mins, ratio: {ratio:.1f}x)"
                })
    except Exception as e:
        logger.error("detect_duration_anomalies failed: %s", e)
    finally:
        cursor.close()
    return anomalies


# ── 4. CANCELLATION ANOMALIES (Customer/Garage cancellations check) ──────────
def detect_cancellation_anomalies(db_conn) -> List[Dict[str, Any]]:
    cursor = db_conn.cursor(dictionary=True)
    anomalies = []
    try:
        # Check if cancellation rates are abnormal at customer level
        query = """
            SELECT customer_id, garage_id,
                   COUNT(id) AS total_appts,
                   SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_appts
            FROM Appointment
            GROUP BY customer_id, garage_id
            HAVING total_appts >= 4 AND cancelled_appts >= 3
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        for row in rows:
            rate = float(row["cancelled_appts"]) / float(row["total_appts"])
            if rate > 0.6:  # Over 60% cancellation rate
                anomalies.append({
                    "garage_id": row["garage_id"],
                    "entity_type": "cancellation",
                    "entity_id": str(row["customer_id"]),
                    "algorithm": "Deterministic Rule",
                    "severity": "HIGH" if rate > 0.8 else "MEDIUM",
                    "score": round(rate, 2),
                    "reason": f"High customer cancellation rate detected: {(rate*100):.1f}% ({row['cancelled_appts']} cancelled out of {row['total_appts']} appointments)"
                })
    except Exception as e:
        logger.error("detect_cancellation_anomalies failed: %s", e)
    finally:
        cursor.close()
    return anomalies


# ── 5. GARAGE OPERATION ANOMALIES (Isolation Forest) ──────────────────────────
def detect_garage_anomalies(db_conn) -> List[Dict[str, Any]]:
    cursor = db_conn.cursor(dictionary=True)
    anomalies = []
    try:
        # Gather daily garage-level metrics
        query = """
            SELECT a.garage_id,
                   DATE(a.scheduled_date) AS op_date,
                   COUNT(a.id) AS jobs_count,
                   SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
                   COALESCE(SUM(i.total_amount), 0) AS daily_revenue
            FROM Appointment a
            LEFT JOIN Invoice i ON i.appointment_id = a.id
            WHERE a.scheduled_date IS NOT NULL
            GROUP BY a.garage_id, DATE(a.scheduled_date)
            ORDER BY op_date ASC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        if not rows or len(rows) < 20:
            return []

        df = pd.DataFrame(rows)
        df["jobs_count"] = df["jobs_count"].astype(float)
        df["cancelled_count"] = df["cancelled_count"].astype(float)
        df["daily_revenue"] = df["daily_revenue"].astype(float)

        # Feature matrix for Isolation Forest
        X = df[["jobs_count", "cancelled_count", "daily_revenue"]].values
        
        # Fit Isolation Forest
        clf = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
        preds = clf.fit_predict(X)
        scores = -clf.decision_function(X) # higher scores = more anomalous

        df["pred"] = preds
        df["score"] = scores

        # Filter detected outliers
        outliers = df[df["pred"] == -1]

        for _, row in outliers.iterrows():
            anomalies.append({
                "garage_id": row["garage_id"],
                "entity_type": "garage",
                "entity_id": str(row["op_date"]),
                "algorithm": "Isolation Forest",
                "severity": "HIGH" if row["score"] > 0.15 else "MEDIUM",
                "score": min(0.99, round(float(row["score"]) * 4.0, 2)),
                "reason": f"Operational outlier behavior on {row['op_date']}: daily revenue ₹{row['daily_revenue']:.2f}, jobs {row['jobs_count']:.0f}, cancellations {row['cancelled_count']:.0f}"
            })
    except Exception as e:
        logger.error("detect_garage_anomalies failed: %s", e)
    finally:
        cursor.close()
    return anomalies


# ── MAIN PIPELINE TRIGGER ─────────────────────────────────────────────────────
def run_all_detections(db_conn) -> List[Dict[str, Any]]:
    """Scan the database read-only and return all detected anomalies."""
    all_events = []
    all_events.extend(detect_invoice_anomalies(db_conn))
    all_events.extend(detect_inventory_anomalies(db_conn))
    all_events.extend(detect_duration_anomalies(db_conn))
    all_events.extend(detect_cancellation_anomalies(db_conn))
    all_events.extend(detect_garage_anomalies(db_conn))
    return all_events
