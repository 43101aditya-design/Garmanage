"""
Centralized read-only data loaders for training and inference.
Python NEVER mutates any MySQL data through these functions.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import pandas as pd

logger = logging.getLogger(__name__)


def load_revenue_data(db_conn, garage_id: Optional[str] = None) -> pd.DataFrame:
    """
    Load daily revenue data from Invoice table for model training/inference.
    Optionally filtered to a specific garage.
    """
    cursor = db_conn.cursor(dictionary=True)
    try:
        if garage_id:
            query = """
                SELECT
                    DATE(i.issue_date)             AS invoice_date,
                    g.id                           AS garage_id,
                    SUM(i.total_amount)            AS daily_revenue,
                    COUNT(i.id)                    AS invoice_count,
                    AVG(i.total_amount)            AS avg_invoice_value,
                    COUNT(DISTINCT i.appointment_id) AS completed_jobs
                FROM Invoice i
                JOIN Appointment a ON i.appointment_id = a.id
                JOIN Garage g ON a.garage_id = g.id
                WHERE i.status IN ('paid', 'partial')
                  AND i.total_amount > 0
                  AND g.id = %s
                GROUP BY DATE(i.issue_date), g.id
                ORDER BY invoice_date ASC
            """
            cursor.execute(query, (garage_id,))
        else:
            query = """
                SELECT
                    DATE(i.issue_date)             AS invoice_date,
                    g.id                           AS garage_id,
                    SUM(i.total_amount)            AS daily_revenue,
                    COUNT(i.id)                    AS invoice_count,
                    AVG(i.total_amount)            AS avg_invoice_value,
                    COUNT(DISTINCT i.appointment_id) AS completed_jobs
                FROM Invoice i
                JOIN Appointment a ON i.appointment_id = a.id
                JOIN Garage g ON a.garage_id = g.id
                WHERE i.status IN ('paid', 'partial')
                  AND i.total_amount > 0
                GROUP BY DATE(i.issue_date), g.id
                ORDER BY invoice_date ASC
            """
            cursor.execute(query)
        rows = cursor.fetchall()
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        logger.error("load_revenue_data failed: %s", e)
        return pd.DataFrame()
    finally:
        cursor.close()


def load_workload_data(db_conn, garage_id: Optional[str] = None) -> pd.DataFrame:
    """
    Load daily job / service request volume for workload forecasting.
    """
    cursor = db_conn.cursor(dictionary=True)
    try:
        base_cond = "AND a.garage_id = %s" if garage_id else ""
        params = (garage_id,) if garage_id else ()
        query = f"""
            SELECT
                DATE(a.scheduled_date)  AS job_date,
                a.garage_id,
                COUNT(a.id)             AS job_count,
                SUM(CASE WHEN a.status = 'Pending'     THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN a.status = 'In Progress' THEN 1 ELSE 0 END) AS active_count,
                SUM(CASE WHEN a.status = 'Completed'   THEN 1 ELSE 0 END) AS completed_count
            FROM Appointment a
            WHERE a.scheduled_date IS NOT NULL
              {base_cond}
            GROUP BY DATE(a.scheduled_date), a.garage_id
            ORDER BY job_date ASC
        """
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        logger.error("load_workload_data failed: %s", e)
        return pd.DataFrame()
    finally:
        cursor.close()


def load_inventory_demand_data(db_conn, garage_id: Optional[str] = None, part_id: Optional[str] = None) -> pd.DataFrame:
    """
    Load weekly part consumption data for inventory demand forecasting.
    Falls back to Parts_Used joined with Job_Card, or inventory_movements if available.
    """
    cursor = db_conn.cursor(dictionary=True)
    try:
        conds = ["pu.quantity > 0"]
        params: list = []
        if garage_id:
            conds.append("jc.garage_id = %s")
            params.append(garage_id)
        if part_id:
            conds.append("pu.inventory_item_id = %s")
            params.append(part_id)
        where = "WHERE " + " AND ".join(conds) if conds else ""
        query = f"""
            SELECT
                YEARWEEK(jc.created_at, 1)    AS year_week,
                DATE(jc.created_at)            AS usage_date,
                jc.garage_id,
                pu.inventory_item_id           AS part_id,
                ii.name                        AS part_name,
                SUM(pu.quantity)               AS weekly_quantity
            FROM Parts_Used pu
            JOIN Job_Card jc     ON pu.job_card_id = jc.id
            JOIN Inventory_Item ii ON pu.inventory_item_id = ii.id
            {where}
            GROUP BY YEARWEEK(jc.created_at, 1), jc.garage_id, pu.inventory_item_id
            ORDER BY usage_date ASC
        """
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        logger.error("load_inventory_demand_data failed: %s", e)
        return pd.DataFrame()
    finally:
        cursor.close()


def load_duration_data(db_conn, garage_id: Optional[str] = None) -> pd.DataFrame:
    """
    Load completed job durations for service duration prediction.
    """
    cursor = db_conn.cursor(dictionary=True)
    try:
        base_cond = "AND jc.garage_id = %s" if garage_id else ""
        params = (garage_id,) if garage_id else ()
        query = f"""
            SELECT
                jc.id                                           AS job_id,
                jc.garage_id,
                sr.service_category                             AS service_type,
                v.vehicle_type,
                v.make,
                v.model,
                sr.issue_description                            AS issue_category,
                jc.mechanic_id,
                TIMESTAMPDIFF(MINUTE, jc.created_at, jc.updated_at) AS duration_minutes,
                COUNT(pu.id)                                    AS parts_count
            FROM Job_Card jc
            JOIN Service_Request sr ON jc.service_request_id = sr.id
            JOIN Vehicle v          ON sr.vehicle_id = v.id
            LEFT JOIN Parts_Used pu ON pu.job_card_id = jc.id
            WHERE jc.status = 'Completed'
              AND jc.updated_at > jc.created_at
              AND TIMESTAMPDIFF(MINUTE, jc.created_at, jc.updated_at) BETWEEN 10 AND 1440
              {base_cond}
            GROUP BY jc.id
            ORDER BY jc.created_at ASC
        """
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        logger.error("load_duration_data failed: %s", e)
        return pd.DataFrame()
    finally:
        cursor.close()


def load_current_inventory(db_conn, garage_id: Optional[str] = None) -> pd.DataFrame:
    """Load current stock levels for inventory risk calculation."""
    cursor = db_conn.cursor(dictionary=True)
    try:
        cond = "WHERE gi.garage_id = %s" if garage_id else ""
        params = (garage_id,) if garage_id else ()
        query = f"""
            SELECT
                ii.id          AS part_id,
                ii.name        AS part_name,
                ii.part_number,
                gi.garage_id,
                gi.quantity_in_stock,
                COALESCE(gi.reserved_quantity, 0) AS reserved_quantity,
                COALESCE(ii.reorder_level, 5)     AS reorder_level,
                COALESCE(ii.unit_cost, 0)         AS unit_cost
            FROM garage_inventory gi
            JOIN Inventory_Item ii ON gi.part_id = ii.id
            {cond}
        """
        cursor.execute(query, params)
        rows = cursor.fetchall()
        if rows:
            return pd.DataFrame(rows)
        # Fallback: try the older Inventory_Item table directly
        fallback_cond = "WHERE id IS NOT NULL"
        cursor.execute(f"""
            SELECT id AS part_id, name AS part_name, part_number,
                   stock_quantity AS quantity_in_stock, 0 AS reserved_quantity,
                   COALESCE(reorder_level, 5) AS reorder_level,
                   COALESCE(unit_cost, 0) AS unit_cost
            FROM Inventory_Item {fallback_cond}
        """)
        rows = cursor.fetchall()
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        logger.error("load_current_inventory failed: %s", e)
        return pd.DataFrame()
    finally:
        cursor.close()


def load_mechanic_performance(db_conn) -> pd.DataFrame:
    """Load mechanic historical performance stats for duration prediction."""
    cursor = db_conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                jc.mechanic_id,
                COUNT(jc.id)                                               AS total_jobs,
                AVG(TIMESTAMPDIFF(MINUTE, jc.created_at, jc.updated_at))  AS avg_duration_minutes,
                SUM(CASE WHEN jc.status = 'Completed' THEN 1 ELSE 0 END) /
                    NULLIF(COUNT(jc.id), 0)                                AS completion_rate
            FROM Job_Card jc
            WHERE jc.status = 'Completed'
              AND jc.updated_at > jc.created_at
            GROUP BY jc.mechanic_id
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        return pd.DataFrame(rows) if rows else pd.DataFrame()
    except Exception as e:
        logger.error("load_mechanic_performance failed: %s", e)
        return pd.DataFrame()
    finally:
        cursor.close()
