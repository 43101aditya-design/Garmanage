const { auth } = require('../config/firebase');
const { verifyToken } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const loadUserAndMemberships = async (req, res, next, userData) => {
    try {
        req.firebaseUser = userData;
        let rows = [];
        
        if (userData.firebase_uid) {
            // 1. Look up user by their Firebase UID
            const [uidRecords] = await req.db.query('SELECT * FROM User_Account WHERE firebase_uid = ?', [userData.firebase_uid]);
            rows = uidRecords;
            
            // 2. If not found by UID, check if there's a pre-existing email account with the same email
            if (rows.length === 0 && userData.email) {
                const [emailRecords] = await req.db.query('SELECT * FROM User_Account WHERE email = ?', [userData.email]);
                if (emailRecords.length > 0) {
                    const existingUser = emailRecords[0];
                    // Link the accounts by updating the firebase_uid field to avoid duplicates
                    await req.db.query('UPDATE User_Account SET firebase_uid = ? WHERE id = ?', [userData.firebase_uid, existingUser.id]);
                    console.log(`[AUTH] Linked Firebase UID ${userData.firebase_uid} to pre-existing email user ID: ${existingUser.id}`);
                    
                    const [updatedRecords] = await req.db.query('SELECT * FROM User_Account WHERE id = ?', [existingUser.id]);
                    rows = updatedRecords;
                }
            }
            
            // 3. If still not found in User_Account, check if there is a Customer record with this email
            if (rows.length === 0 && userData.email) {
                const [custRecords] = await req.db.query('SELECT * FROM Customer WHERE email = ?', [userData.email]);
                if (custRecords.length > 0) {
                    const cust = custRecords[0];
                    const newUserId = require('uuid').v4();
                    const baseUsername = userData.email.split('@')[0];
                    const username = `${baseUsername}_${Math.random().toString(36).substring(2, 7)}`;
                    await req.db.query(
                        `INSERT INTO User_Account (id, firebase_uid, name, email, role, reference_id, onboarding_state, username, password_hash)
                         VALUES (?, ?, ?, ?, 'customer', ?, 'ACTIVE', ?, 'firebase_auth')`,
                        [newUserId, userData.firebase_uid, `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || userData.name || 'Customer', userData.email, cust.id, username]
                    );
                    const [createdRows] = await req.db.query('SELECT * FROM User_Account WHERE id = ?', [newUserId]);
                    rows = createdRows;
                }
            }
            
            // 4. If still not found in the DB, delegate to the onboarding check
            if (rows.length === 0) {
                const isOnboardingRoute = req.originalUrl.includes('/auth/me') || req.originalUrl.includes('/auth/onboard') || req.originalUrl.includes('/onboarding/');
                if (isOnboardingRoute) {
                    req.firebaseUser = userData;
                    req.user = null;
                    return next();
                }
                return res.status(401).json({ error: 'Unauthorized: User not registered' });
            }
        } else if (userData.id) {
            const [idRecords] = await req.db.query('SELECT * FROM User_Account WHERE id = ?', [userData.id]);
            rows = idRecords;
        }
        
        if (!rows || rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        
        const user = rows[0];
        
        // Destructure active memberships with Garage details
        const [memberships] = await req.db.query(`
            SELECT gm.garage_id, g.name AS garage_name, g.city AS garage_city, r.name AS role_name, gm.id AS membership_id 
            FROM Garage_Membership gm 
            JOIN Role r ON gm.role_id = r.id 
            JOIN Garage g ON gm.garage_id = g.id
            WHERE gm.user_id = ? AND gm.status = 'ACTIVE'
        `, [user.id]);
        
        // Check customer profile
        const [customerRows] = await req.db.query(`
            SELECT id, first_name, last_name, email, phone, address 
            FROM Customer 
            WHERE id = ? OR email = ?
        `, [user.reference_id || '', user.email]);
        const customerProfile = customerRows.length > 0 ? customerRows[0] : null;

        // Build list of all available workspaces authorized for this user
        const availableWorkspaces = [];
        // Every user account legitimately has access to their personal customer workspace for personal vehicles & service bookings
        availableWorkspaces.push({
            id: 'customer_personal',
            type: 'customer',
            role: 'customer',
            name: 'Personal Customer Account',
            description: 'Manage personal vehicles & book service appointments'
        });
        for (const m of memberships) {
            availableWorkspaces.push({
                id: m.membership_id,
                type: 'garage',
                role: m.role_name,
                garage_id: m.garage_id,
                garage_name: m.garage_name,
                name: m.garage_name,
                description: `${m.role_name.charAt(0).toUpperCase() + m.role_name.slice(1)} Workspace (${m.garage_city || 'General'})`
            });
        }

        // Determine current active workspace
        let activeWorkspace = null;
        if (user.role === 'customer') {
            activeWorkspace = {
                id: 'customer_personal',
                type: 'customer',
                role: 'customer',
                name: 'Personal Customer Account',
                description: 'Manage vehicles & book service appointments'
            };
        } else {
            const matched = memberships.find(m => m.role_name === user.role) || memberships[0];
            if (matched) {
                activeWorkspace = {
                    id: matched.membership_id,
                    type: 'garage',
                    role: matched.role_name,
                    garage_id: matched.garage_id,
                    garage_name: matched.garage_name,
                    name: matched.garage_name,
                    description: `${matched.role_name.charAt(0).toUpperCase() + matched.role_name.slice(1)} Workspace`
                };
            }
        }
        
        req.user = {
            id: user.id,
            firebase_uid: user.firebase_uid,
            name: user.name,
            email: user.email,
            phone: user.phone || (customerProfile ? customerProfile.phone : undefined),
            role: user.role,
            customer_id: user.reference_id || (customerProfile ? customerProfile.id : null),
            memberships: memberships,
            availableWorkspaces: availableWorkspaces,
            activeWorkspace: activeWorkspace
        };
        
        next();
    } catch (error) {
        next(error);
    }
};

const requireAuth = async (req, res, next) => {
    try {
        // Inject db pool if not already injected by middleware
        if (!req.db) req.db = db;

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
            
            await loadUserAndMemberships(req, res, next, { id });
            return;
        }
        
        // Decode token to see if it belongs to Firebase
        const decoded = jwt.decode(token);
        const isFirebaseToken = decoded && decoded.iss && decoded.iss.startsWith('https://securetoken.google.com/');
        
        if (isFirebaseToken) {
            try {
                let decodedToken = null;
                
                if (auth.isMock) {
                    // Cryptographically verify Google token without service account key using Google public certs
                    try {
                        const jwtDecoded = jwt.decode(token, { complete: true });
                        if (jwtDecoded && jwtDecoded.header && jwtDecoded.header.kid) {
                            const certsResponse = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
                            if (certsResponse.ok) {
                                const certs = await certsResponse.json();
                                const cert = certs[jwtDecoded.header.kid];
                                if (cert) {
                                    const projectId = 'dbms-3ea01';
                                    const verified = jwt.verify(token, cert, {
                                        audience: projectId,
                                        issuer: `https://securetoken.google.com/${projectId}`,
                                        algorithms: ['RS256']
                                    });
                                    decodedToken = {
                                        uid: verified.sub,
                                        email: verified.email,
                                        name: verified.name || (verified.email ? verified.email.split('@')[0] : 'Unknown')
                                    };
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[AUTH] Public key token verification failed:', e.message);
                    }
                } else {
                    const verified = await auth.verifyIdToken(token);
                    if (verified) {
                        decodedToken = {
                            uid: verified.uid,
                            email: verified.email,
                            name: verified.name || (verified.email ? verified.email.split('@')[0] : 'Unknown')
                        };
                    }
                }
                
                if (!decodedToken) {
                    return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
                }
                
                const firebase_uid = decodedToken.uid;
                const email = decodedToken.email;
                const name = decodedToken.name;
                
                await loadUserAndMemberships(req, res, next, { firebase_uid, email, name });
            } catch (error) {
                console.error('[AUTH] Firebase Token Verification Failed:', error.message);
                return res.status(401).json({ error: `Unauthorized: Firebase token validation failed: ${error.message}` });
            }
        } else {
            // Fallback to SVSMS standard local JWT verification
            return verifyToken(req, res, (err) => {
                if (err) return next(err);
                loadUserAndMemberships(req, res, next, { id: req.user.id });
            });
        }
    } catch (error) {
        next(error);
    }
};

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
