const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const db = require('../config/db');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

// Health check for Engineering Lab
router.get('/health', verifyToken, requireRole(['admin', 'manager', 'owner']), async (req, res) => {
    try {
        // Check MySQL from Node
        const [rows] = await db.query('SELECT 1');
        const mysqlStatus = rows ? 'Connected' : 'Error';
        
        // Check Python API
        let pythonStatus = 'Offline';
        try {
            const pyRes = await fetch(`${PYTHON_API_URL}/api/health`);
            if (pyRes.ok) pythonStatus = 'Online';
        } catch (e) {
            pythonStatus = 'Offline';
        }

        res.json({
            node: 'Healthy',
            mysql: mysqlStatus,
            python: pythonStatus
        });
    } catch (error) {
        res.status(500).json({ error: 'Health check failed', details: error.message });
    }
});

// Proxy GET requests to Python
const proxyGet = (path) => async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_API_URL}${path}`);
        if (!response.ok) throw new Error(`Python API responded with status: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to communicate with Python Engine', details: error.message });
    }
};

// Proxy POST requests to Python
const proxyPost = (path) => async (req, res) => {
    try {
        const response = await fetch(`${PYTHON_API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        if (!response.ok) throw new Error(`Python API responded with status: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to communicate with Python Engine', details: error.message });
    }
};

// Simulations
router.post('/simulation/mechanic-assignment', verifyToken, requireRole(['admin', 'manager', 'owner']), proxyPost('/api/simulation/mechanic-assignment'));
router.get('/simulation/revenue-forecast', verifyToken, requireRole(['admin', 'owner']), proxyGet('/api/simulation/revenue-forecast'));
router.get('/simulation/anomaly-detection', verifyToken, requireRole(['admin', 'owner']), proxyGet('/api/simulation/anomaly-detection'));
router.get('/simulation/inventory-prediction', verifyToken, requireRole(['admin', 'manager', 'owner']), proxyGet('/api/simulation/inventory-prediction'));

// Safe Source Code endpoints (whitelisted by Python service)
router.get('/source-code/:algorithm', verifyToken, requireRole(['admin', 'owner']), async (req, res) => {
    const validAlgorithms = ['mechanic-assignment', 'assignment-features', 'assignment-candidate-filter', 'assignment-ranking', 'assignment-optimization', 'assignment-explanations', 'revenue-forecast', 'anomaly-detection', 'inventory-prediction'];
    if (!validAlgorithms.includes(req.params.algorithm)) {
        return res.status(403).json({ error: 'Unauthorized algorithm request' });
    }
    
    try {
        const response = await fetch(`${PYTHON_API_URL}/source-code/${req.params.algorithm}`);
        if (!response.ok) throw new Error(`Python API responded with status: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch source code from Python Engine', details: error.message });
    }
});

module.exports = router;
