const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'svsms-super-secret-key-2026';
const JWT_EXPIRES_IN = '1h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Dev Token Bypass in development/test
    if (token.startsWith('dev-token') && process.env.NODE_ENV !== 'production') {
        const role = token.split('-')[2] || 'owner';
        let id = 'admin-uuid-1';
        if (role === 'manager') id = '75accc6d-2146-42fe-a1b9-3a744d9c4167';
        if (role === 'mechanic') id = 'ef002b07-5614-4ec2-a8fe-9a933e13f6fc';
        if (role === 'customer') id = 'customer-uuid-1';
        req.user = { id, role };
        return next();
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. Attach user to request object
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Role-Based Access Control Middleware (Case-Normalized)
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'Unauthorized: Not authenticated' });
        }
        const userRole = (req.user.role || '').toUpperCase();
        const allowedRoles = roles.map(r => (r || '').toUpperCase());
        
        const hasRole = allowedRoles.includes(userRole) || 
                       (allowedRoles.includes('ADMIN') && userRole === 'OWNER') ||
                       (allowedRoles.includes('OWNER') && userRole === 'ADMIN');
                       
        if (!hasRole) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    requireRole,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN
};
