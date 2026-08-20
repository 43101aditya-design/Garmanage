const { auth } = require('../config/firebase');
const { verifyToken } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

const loadUserAndMemberships = async (req, res, next, userData) => {
    try {
        let userRecords;
        if (userData.firebase_uid) {
            userRecords = await req.db.query('SELECT * FROM User_Account WHERE firebase_uid = ?', [userData.firebase_uid]);
            
            if (userRecords.length === 0) {
                if (req.originalUrl.includes('/auth/me') || req.originalUrl.includes('/auth/onboard')) {
                    req.firebaseUser = userData;
                    req.user = null;
                    return next();
                }
                return res.status(401).json({ error: 'Unauthorized: User not registered' });
            }
        } else if (userData.id) {
            userRecords = await req.db.query('SELECT * FROM User_Account WHERE id = ?', [userData.id]);
        }
        
        if (!userRecords || userRecords.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        
        const user = userRecords[0];
        
        const memberships = await req.db.query(`
            SELECT gm.garage_id, r.name AS role_name, gm.id AS membership_id 
            FROM Garage_Membership gm 
            JOIN Role r ON gm.role_id = r.id 
            WHERE gm.user_id = ? AND gm.status = 'ACTIVE'
        `, [user.id]);
        
        req.user = {
            id: user.id,
            firebase_uid: user.firebase_uid,
            name: user.name,
            email: user.email,
            role: user.role,
            customer_id: user.reference_id,
            memberships: memberships
        };
        
        next();
    } catch (error) {
        next(error);
    }
};

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        let decodedToken = null;
        let isFirebaseToken = false;
        
        try {
            decodedToken = await auth.verifyIdToken(token);
            isFirebaseToken = !!decodedToken;
        } catch (error) {
            isFirebaseToken = false;
        }
        
        if (!isFirebaseToken) {
            return verifyToken(req, res, (err) => {
                if (err) return next(err);
                loadUserAndMemberships(req, res, next, { id: req.user.id });
            });
        }
        
        const firebase_uid = decodedToken.uid;
        const email = decodedToken.email;
        const name = decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Unknown');
        
        await loadUserAndMemberships(req, res, next, { firebase_uid, email, name });
    } catch (error) {
        next(error);
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient system privileges' });
        }
        next();
    };
};

const requireGarageAccess = (req, res, next) => {
    const garageId = req.params.id || req.body.garage_id;
    if (!garageId) {
        return res.status(400).json({ error: 'Bad Request: Garage ID required' });
    }
    
    if (!req.user || !req.user.memberships) {
        return res.status(403).json({ error: 'Forbidden: No active memberships' });
    }
    
    const membership = req.user.memberships.find(m => m.garage_id === garageId);
    
    if (!membership) {
        return res.status(403).json({ error: 'Forbidden: No access to this garage' });
    }
    
    req.garageId = garageId;
    next();
};

module.exports = { requireAuth, requireRole, requireGarageAccess };
