const db = require('../config/db');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

// 1. GET /health - Check system health (Express & MySQL)
exports.checkHealth = async (req, res) => {
    try {
        // Query to check database connection
        await db.execute('SELECT 1');
        
        // Try checking python status if online
        let pythonStatus = 'offline';
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 1000); // 1 sec timeout
            
            const pyRes = await fetch(`${PYTHON_SERVICE_URL}/api/health`, { signal: controller.signal });
            clearTimeout(id);
            if (pyRes.ok) {
                pythonStatus = 'online';
            }
        } catch (e) {
            // FastAPI is offline
        }

        res.json({
            status: 'healthy',
            database: 'connected',
            python_service: pythonStatus,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('Health probe failed:', e);
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: e.message,
            timestamp: new Date().toISOString()
        });
    }
};

// 2. GET /api/benchmarks/history - Fetch previous experiment results
exports.getBenchmarkHistory = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM AI_Experiment_Log 
             ORDER BY created_at DESC 
             LIMIT 30`
        );
        
        // Parse JSON fields
        const parsed = rows.map(row => ({
            id: row.id,
            experiment_name: row.experiment_name,
            model_name: row.model_name,
            dataset_name: row.dataset_name,
            parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
            metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
            created_at: row.created_at
        }));

        res.json(parsed);
    } catch (e) {
        console.error('Failed to fetch benchmark history:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. POST /api/benchmarks/run - Trigger benchmark run on Python FastAPI
exports.runBenchmarks = async (req, res) => {
    try {
        console.log('Triggering python benchmark runner...');
        const response = await fetch(`${PYTHON_SERVICE_URL}/api/benchmarks/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Python service returned HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Fetch newly added logs to return to client
        const [newLogs] = await db.execute(
            `SELECT * FROM AI_Experiment_Log 
             ORDER BY created_at DESC 
             LIMIT 3`
        );

        const parsed = newLogs.map(row => ({
            id: row.id,
            experiment_name: row.experiment_name,
            model_name: row.model_name,
            dataset_name: row.dataset_name,
            parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
            metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
            created_at: row.created_at
        }));

        res.json({
            message: 'Benchmarks executed and logged successfully.',
            status: 'success',
            experiments: parsed
        });
    } catch (e) {
        console.error('Benchmark execution failed:', e);
        res.status(500).json({ error: 'Failed to run benchmarks: Python service might be offline or database write blocked.' });
    }
};
