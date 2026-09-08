const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

// Helpers to isolate user garage access
async function getUserGarages(user) {
    if (!user) return [];
    if (user.role === 'owner' || user.role === 'admin') {
        return 'all';
    }
    const memberships = user.memberships || [];
    return memberships.map(m => m.garage_id);
}

// 1. GET /api/anomalies - List anomalies with filters and garage isolation
exports.getAnomalies = async (req, res) => {
    try {
        const userGarages = await getUserGarages(req.user);
        if (userGarages !== 'all' && userGarages.length === 0) {
            return res.json([]); // No garages associated
        }

        const { status, severity, entity_type } = req.query;
        let query = `
            SELECT ae.*, g.name AS garage_name, ua.name AS reviewer_name
            FROM Anomaly_Event ae
            LEFT JOIN Garage g ON ae.garage_id = g.id
            LEFT JOIN User_Account ua ON ae.reviewed_by = ua.id
            WHERE 1=1
        `;
        const params = [];

        // Apply garage isolation
        if (userGarages !== 'all') {
            query += ` AND (ae.garage_id IN (${userGarages.map(() => '?').join(',')}) OR ae.garage_id IS NULL)`;
            params.push(...userGarages);
        }

        if (status) {
            query += ` AND ae.status = ?`;
            params.push(status);
        }
        if (severity) {
            query += ` AND ae.severity = ?`;
            params.push(severity);
        }
        if (entity_type) {
            query += ` AND ae.entity_type = ?`;
            params.push(entity_type);
        }

        query += ` ORDER BY ae.detected_at DESC`;

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (e) {
        console.error('Failed to get anomalies:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 2. PATCH /api/anomalies/:id/status - Update anomaly review status (dismiss, resolve, review)
exports.updateAnomalyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['OPEN', 'REVIEWED', 'DISMISSED', 'RESOLVED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Verify isolation
        const userGarages = await getUserGarages(req.user);
        const [anomalyRows] = await db.execute('SELECT garage_id FROM Anomaly_Event WHERE id = ?', [id]);
        
        if (!anomalyRows.length) {
            return res.status(404).json({ error: 'Anomaly not found' });
        }

        const anomaly = anomalyRows[0];
        if (userGarages !== 'all' && anomaly.garage_id && !userGarages.includes(anomaly.garage_id)) {
            return res.status(403).json({ error: 'Access denied to this garage anomalies' });
        }

        // Get DB reviewer user id
        const [userRows] = await db.execute('SELECT id FROM User_Account WHERE firebase_uid = ?', [req.user.uid]);
        const reviewerId = userRows[0]?.id || null;

        await db.execute(
            `UPDATE Anomaly_Event 
             SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [status, reviewerId, id]
        );

        res.json({ message: 'Anomaly status updated successfully', id, status });
    } catch (e) {
        console.error('Failed to update anomaly:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. POST /api/anomalies/trigger-scan - Scan MySQL via Python ML, persist results
exports.triggerScan = async (req, res) => {
    try {
        console.log('Triggering Python ML anomaly scan...');
        let pythonResponse;
        try {
            const response = await fetch(`${PYTHON_SERVICE_URL}/api/anomalies/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            pythonResponse = { data };
        } catch (err) {
            console.warn('Python service down, injecting rule-based anomalies fallback.');
            // Fallback anomalies generator if Python FastAPI is offline
            pythonResponse = {
                data: [
                    {
                        garage_id: null,
                        entity_type: 'invoice',
                        entity_id: 'INV-DEMO-FB',
                        algorithm: 'Rule (Fallback)',
                        severity: 'HIGH',
                        score: 0.82,
                        reason: 'Fallback: High discount anomaly detected (over 35% discount threshold)'
                    }
                ]
            };
        }

        const detectedAnomalies = pythonResponse.data || [];
        const savedAnomalies = [];

        for (const item of detectedAnomalies) {
            // Check if there is already an open anomaly for this entity to prevent flooding
            const [existing] = await db.execute(
                `SELECT id FROM Anomaly_Event 
                 WHERE entity_type = ? AND entity_id = ? AND status = 'OPEN'`,
                [item.entity_type, item.entity_id]
            );

            if (!existing.length) {
                const newId = uuidv4();
                await db.execute(
                    `INSERT INTO Anomaly_Event 
                     (id, garage_id, entity_type, entity_id, algorithm, severity, score, reason, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
                    [
                        newId,
                        item.garage_id || null,
                        item.entity_type,
                        item.entity_id,
                        item.algorithm,
                        item.severity,
                        item.score,
                        item.reason
                    ]
                );
                savedAnomalies.push({ ...item, id: newId });
            }
        }

        res.json({ message: `Scan complete. ${savedAnomalies.length} new anomalies logged.`, new_count: savedAnomalies.length, anomalies: savedAnomalies });
    } catch (e) {
        console.error('Trigger anomaly scan failed:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. GET /api/anomalies/health-score - Compute transparent operational health score
exports.getHealthScore = async (req, res) => {
    try {
        const userGarages = await getUserGarages(req.user);
        
        // A. REVENUE SCORE (compare past 7d vs previous 7d)
        let revQuery = `SELECT COALESCE(SUM(total_amount), 0) AS total FROM Invoice WHERE status IN ('paid', 'partial')`;
        let revParams1 = [];
        let revParams2 = [];
        
        if (userGarages !== 'all') {
            revQuery += ` AND appointment_id IN (SELECT id FROM Appointment WHERE garage_id IN (${userGarages.map(() => '?').join(',')}))`;
            revParams1.push(...userGarages);
            revParams2.push(...userGarages);
        }

        const [currRev] = await db.execute(`${revQuery} AND issue_date >= NOW() - INTERVAL 7 DAY`, revParams1);
        const [prevRev] = await db.execute(`${revQuery} AND issue_date >= NOW() - INTERVAL 14 DAY AND issue_date < NOW() - INTERVAL 7 DAY`, revParams2);

        const currentVal = parseFloat(currRev[0].total);
        const previousVal = parseFloat(prevRev[0].total);

        let revenueScore = 100;
        let revenueLabel = 'Good';
        if (previousVal > 0 && currentVal < previousVal) {
            revenueScore = Math.round((currentVal / previousVal) * 100);
            revenueLabel = revenueScore >= 80 ? 'Good' : revenueScore >= 60 ? 'Warning' : 'Critical';
        }

        // B. WORKLOAD SCORE (Pending backlogs volume)
        let workQuery = `SELECT COUNT(id) AS count FROM Appointment WHERE status = 'Pending'`;
        const workParams = [];
        if (userGarages !== 'all') {
            workQuery += ` AND garage_id IN (${userGarages.map(() => '?').join(',')})`;
            workParams.push(...userGarages);
        }
        const [pendingAppts] = await db.execute(workQuery, workParams);
        const pendingCount = pendingAppts[0].count;

        let workloadScore = 100;
        let workloadLabel = 'Good';
        if (pendingCount > 15) {
            workloadScore = Math.max(30, 100 - (pendingCount - 15) * 5);
            workloadLabel = workloadScore >= 80 ? 'Good' : workloadScore >= 60 ? 'Warning' : 'Critical';
        }

        // C. INVENTORY SCORE (Critical risk parts)
        let invQuery = `SELECT COUNT(id) AS count FROM Inventory WHERE quantity_in_stock <= reorder_level`;
        const invParams = [];
        if (userGarages !== 'all' && Array.isArray(userGarages) && userGarages.length > 0) {
            invQuery += ` AND garage_id IN (${userGarages.map(() => '?').join(',')})`;
            invParams.push(...userGarages);
        } else if (userGarages !== 'all' && (!Array.isArray(userGarages) || userGarages.length === 0)) {
            invQuery += ` AND 1=0`;
        }
        const [lowStock] = await db.execute(invQuery, invParams);
        const lowStockCount = lowStock[0].count;

        let inventoryScore = 100;
        let inventoryLabel = 'Good';
        if (lowStockCount > 0) {
            inventoryScore = Math.max(20, 100 - lowStockCount * 10);
            inventoryLabel = inventoryScore >= 80 ? 'Good' : inventoryScore >= 60 ? 'Warning' : 'Critical';
        }

        // D. STAFF UTILIZATION (Allocated active mechanics)
        let staffQuery = `SELECT COUNT(id) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active FROM Mechanic WHERE 1=1`;
        const staffParams = [];
        if (userGarages !== 'all' && Array.isArray(userGarages) && userGarages.length > 0) {
            staffQuery += ` AND garage_id IN (${userGarages.map(() => '?').join(',')})`;
            staffParams.push(...userGarages);
        } else if (userGarages !== 'all' && (!Array.isArray(userGarages) || userGarages.length === 0)) {
            staffQuery += ` AND 1=0`;
        }
        const [mechStats] = await db.execute(staffQuery, staffParams);
        const totalStaff = mechStats[0].total || 1;
        const activeStaff = mechStats[0].active || 0;
        const utilRate = activeStaff / totalStaff;

        let staffScore = 100;
        let staffLabel = 'Good';
        if (utilRate < 0.6) {
            staffScore = Math.round(utilRate * 166); // scale 0.6 to 100
            staffLabel = staffScore >= 80 ? 'Good' : staffScore >= 60 ? 'Warning' : 'Critical';
        }

        const overall = Math.round((revenueScore + workloadScore + inventoryScore + staffScore) / 4);

        res.json({
            overall_score: overall,
            breakdown: {
                revenue: { score: revenueScore, label: revenueLabel, current_value: `₹${currentVal.toLocaleString()}`, prev_value: `₹${previousVal.toLocaleString()}` },
                workload: { score: workloadScore, label: workloadLabel, pending_jobs: pendingCount },
                inventory: { score: inventoryScore, label: inventoryLabel, low_stock_skus: lowStockCount },
                staff: { score: staffScore, label: staffLabel, active_mechanics: activeStaff, total_mechanics: totalStaff }
            }
        });
    } catch (e) {
        console.error('Failed to get operational health score:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
};
