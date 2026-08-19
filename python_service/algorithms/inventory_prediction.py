def run_inventory_prediction(db_conn):
    cursor = db_conn.cursor(dictionary=True)
    
    query = """
        SELECT id, name, part_number, stock_quantity, reorder_level 
        FROM Inventory_Item
    """
    cursor.execute(query)
    items = cursor.fetchall()
    
    # Get recent consumption (parts used in last 30 days)
    consumption_query = """
        SELECT i.id, SUM(pu.quantity) as used_30d
        FROM Inventory_Item i
        JOIN Parts_Used pu ON i.id = pu.inventory_item_id
        JOIN Job_Card jc ON pu.job_card_id = jc.id
        WHERE jc.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY i.id
    """
    cursor.execute(consumption_query)
    consumption = {row['id']: int(row['used_30d']) for row in cursor.fetchall()}
    cursor.close()
    
    predictions = []
    
    for item in items:
        used_30d = consumption.get(item['id'], 0)
        weekly_use = used_30d / 4.0 if used_30d > 0 else 0
        stock = int(item['stock_quantity'] or 0)
        
        if weekly_use > 0:
            days_remaining = int((stock / (used_30d / 30.0)))
        else:
            days_remaining = 999 # Safe
            
        status = "HEALTHY"
        if days_remaining <= 7 or stock <= int(item['reorder_level'] or 5):
            status = "⚠ REORDER SOON"
        elif days_remaining <= 2:
            status = "CRITICAL"
            
        predictions.append({
            "item_name": item['name'],
            "part_number": item['part_number'],
            "current_stock": stock,
            "average_weekly_use": round(weekly_use, 1),
            "predicted_depletion_days": days_remaining,
            "status": status
        })
        
    if not predictions:
        return {
            "status": "Simulation Dataset",
            "predictions": [
                {
                    "item_name": "Brake Pads",
                    "part_number": "BP-101",
                    "current_stock": 18,
                    "average_weekly_use": 12,
                    "predicted_depletion_days": 9,
                    "status": "⚠ REORDER SOON"
                }
            ]
        }
        
    # Sort so urgent items appear first
    predictions.sort(key=lambda x: x['predicted_depletion_days'])
    
    return {
        "status": "Real Data",
        "predictions": predictions[:20] # Top 20 items
    }
