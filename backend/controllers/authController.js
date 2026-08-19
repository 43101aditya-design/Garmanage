const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } = require('../middleware/authMiddleware');

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const [users] = await req.db.query('SELECT * FROM User_Account WHERE username = ? AND is_active = TRUE AND deleted_at IS NULL', [username]);
        
        if (users.length === 0) {
            await logActivity(req.db, null, req.ip, req.headers['user-agent'], 'failed');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await logActivity(req.db, user.id, req.ip, req.headers['user-agent'], 'failed');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Fetch branch_id if user is manager or mechanic
        let branch_id = null;
        if (user.role === 'manager') {
            const [mgrs] = await req.db.query('SELECT branch_id FROM Manager WHERE user_account_id = ? AND deleted_at IS NULL', [user.id]);
            if (mgrs.length > 0) branch_id = mgrs[0].branch_id;
        } else if (user.role === 'mechanic' && user.reference_id) {
            const [mechs] = await req.db.query('SELECT branch_id FROM Mechanic WHERE id = ? AND deleted_at IS NULL', [user.reference_id]);
            if (mechs.length > 0) branch_id = mechs[0].branch_id;
        }

        // Generate tokens
        const accessToken = jwt.sign(
            { id: user.id, role: user.role, reference_id: user.reference_id, branch_id }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        const refreshToken = uuidv4(); // Store opaque token in DB for refresh

        // Update last login & refresh token
        await req.db.query(
            'UPDATE User_Account SET refresh_token = ?, last_login = NOW() WHERE id = ?',
            [refreshToken, user.id]
        );

        // Log success
        await logActivity(req.db, user.id, req.ip, req.headers['user-agent'], 'success');

        res.json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                reference_id: user.reference_id,
                branch_id
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        next(error);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const [users] = await req.db.query('SELECT * FROM User_Account WHERE refresh_token = ? AND is_active = TRUE AND deleted_at IS NULL', [refreshToken]);
        
        if (users.length === 0) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }

        const user = users[0];

        // Fetch branch_id if user is manager or mechanic
        let branch_id = null;
        if (user.role === 'manager') {
            const [mgrs] = await req.db.query('SELECT branch_id FROM Manager WHERE user_account_id = ? AND deleted_at IS NULL', [user.id]);
            if (mgrs.length > 0) branch_id = mgrs[0].branch_id;
        } else if (user.role === 'mechanic' && user.reference_id) {
            const [mechs] = await req.db.query('SELECT branch_id FROM Mechanic WHERE id = ? AND deleted_at IS NULL', [user.reference_id]);
            if (mechs.length > 0) branch_id = mechs[0].branch_id;
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { id: user.id, role: user.role, reference_id: user.reference_id, branch_id }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Optional: Rotate refresh token here
        const newRefreshToken = uuidv4();
        await req.db.query('UPDATE User_Account SET refresh_token = ? WHERE id = ?', [newRefreshToken, user.id]);

        res.json({
            accessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Invalidate refresh token
        await req.db.query('UPDATE User_Account SET refresh_token = NULL WHERE id = ?', [userId]);
        
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// Helper for Audit logging
const logActivity = async (db, userId, ip, userAgent, status) => {
    try {
        const id = uuidv4();
        // Since the DB table might not exist in testing, we use a try/catch specifically for this
        await db.query(
            'INSERT INTO Login_History (id, user_id, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?)',
            [id, userId || 'unknown', ip, userAgent, status]
        );
    } catch (e) {
        console.log('Login History log failed (Table might not exist)', e.message);
    }
};

module.exports = {
    login,
    refresh,
    logout
};
