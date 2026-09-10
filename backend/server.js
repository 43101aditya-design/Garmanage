const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { sqlLoggerMiddleware, responseInterceptor } = require('./middleware/sqlLogger');

const app = express();
app.set('trust proxy', 1);

const { helmetConfig, globalLimiter } = require('./middleware/securityMiddleware');

// Middlewares
app.use(helmetConfig);
app.use(globalLimiter);
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(morgan('dev'));

// Custom DB Logging Middlewares
app.use(sqlLoggerMiddleware);
app.use(responseInterceptor);

// Basic Route for testing
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'SVSMS Backend is running' });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const garageRoutes = require('./routes/garageRoutes');
const memberRoutes = require('./routes/memberRoutes');
const userRoutes = require('./routes/userRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const searchRoutes = require('./routes/searchRoutes');
const backupRoutes = require('./routes/backupRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dbExplorerRoutes = require('./routes/dbExplorerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const mechanicRoutes = require('./routes/mechanicRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const branchRoutes = require('./routes/branchRoutes');
const managerRoutes = require('./routes/managerRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const engineeringRoutes = require('./routes/engineeringRoutes');
const customerVehicleRoutes = require('./routes/customerVehicleRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const managerRequestRoutes = require('./routes/managerRequestRoutes');
const jobRoutes = require('./routes/jobRoutes');
const managerJobRoutes = require('./routes/managerJobRoutes');
const managerAppointmentRoutes = require('./routes/managerAppointmentRoutes');
const customerAppointmentRoutes = require('./routes/customerAppointmentRoutes');
const workforceRoutes = require('./routes/workforceRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const aiAssignmentRoutes = require('./routes/aiAssignmentRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const decisionRoutes = require('./routes/decisionRoutes');
const digitalTwinRoutes = require('./routes/digitalTwinRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const benchmarkRoutes = require('./routes/benchmarkRoutes');
const benchmarkController = require('./controllers/benchmarkController');
const onboardingRoutes = require('./routes/onboardingRoutes');
const savedGarageRoutes = require('./routes/savedGarageRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
// Mount Routes
app.get('/health', benchmarkController.checkHealth);
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/benchmarks', benchmarkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/db-explorer', dbExplorerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/engineering', engineeringRoutes);
app.use('/api/garages', garageRoutes);
app.use('/api/garages', memberRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/customer/saved-garages', savedGarageRoutes);
app.use('/api/customer/vehicles', customerVehicleRoutes);
app.use('/api/customer/service-requests', serviceRequestRoutes);
app.use('/api/customer/appointments', customerAppointmentRoutes);
app.use('/api/garages/:id/service-requests', managerRequestRoutes);
app.use('/api/garages/:id/jobs', managerJobRoutes);
app.use('/api/garages/:id/appointments', managerAppointmentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', workforceRoutes);
app.use('/api', assignmentRoutes);
app.use('/api/ai', aiAssignmentRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/digital-twin', digitalTwinRoutes);


app.get('/api/auth/me', require('./middleware/firebaseAuth').requireAuth, async (req, res) => { 
    if (!req.user && req.firebaseUser) {
        // Double check if account exists in User_Account or Customer by firebase_uid or email
        try {
            const [userRows] = await req.db.query(
                'SELECT * FROM User_Account WHERE firebase_uid = ? OR email = ?',
                [req.firebaseUser.firebase_uid, req.firebaseUser.email]
            );

            if (userRows.length > 0 && userRows[0].onboarding_state === 'ACTIVE') {
                const user = userRows[0];
                if (!user.firebase_uid && req.firebaseUser.firebase_uid) {
                    await req.db.query('UPDATE User_Account SET firebase_uid = ? WHERE id = ?', [req.firebaseUser.firebase_uid, user.id]);
                }

                const [memberships] = await req.db.query(`
                    SELECT gm.garage_id, g.name AS garage_name, g.city AS garage_city, r.name AS role_name, gm.id AS membership_id 
                    FROM Garage_Membership gm 
                    JOIN Role r ON gm.role_id = r.id 
                    JOIN Garage g ON gm.garage_id = g.id
                    WHERE gm.user_id = ? AND gm.status = 'ACTIVE'
                `, [user.id]);

                const [customerRows] = await req.db.query(
                    'SELECT id, first_name, last_name, email, phone, address FROM Customer WHERE id = ? OR email = ?',
                    [user.reference_id || '', user.email]
                );
                const customerProfile = customerRows.length > 0 ? customerRows[0] : null;

                const availableWorkspaces = [];
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

                let activeWorkspace = null;
                if (user.role === 'customer') {
                    activeWorkspace = { id: 'customer_personal', type: 'customer', role: 'customer', name: 'Personal Customer Account' };
                } else {
                    const matched = memberships.find(m => m.role_name === user.role) || memberships[0];
                    if (matched) {
                        activeWorkspace = {
                            id: matched.membership_id,
                            type: 'garage',
                            role: matched.role_name,
                            garage_id: matched.garage_id,
                            garage_name: matched.garage_name,
                            name: matched.garage_name
                        };
                    }
                }

                return res.json({
                    user: {
                        id: user.id,
                        firebase_uid: user.firebase_uid || req.firebaseUser.firebase_uid,
                        name: user.name,
                        email: user.email,
                        phone: user.phone || (customerProfile ? customerProfile.phone : undefined),
                        role: user.role,
                        customer_id: user.reference_id || (customerProfile ? customerProfile.id : null),
                        onboarding_state: 'ACTIVE',
                        memberships,
                        availableWorkspaces,
                        activeWorkspace,
                        pendingRequests: []
                    }
                });
            }

            if (userRows.length > 0) {
                const userId = userRows[0].id;
                const [pending] = await req.db.query(
                    `SELECT gjr.id, gjr.requested_role, gjr.status, g.name AS garage_name
                     FROM Garage_Join_Request gjr JOIN Garage g ON gjr.garage_id = g.id
                     WHERE gjr.requester_id = ? AND gjr.status = 'PENDING'`, [userId]
                );
                return res.status(404).json({ 
                    error: 'User not registered', 
                    requiresOnboarding: userRows[0].onboarding_state !== 'PENDING_APPROVAL', 
                    onboarding_state: userRows[0].onboarding_state || 'ONBOARDING',
                    pendingRequests: pending,
                    firebaseUser: req.firebaseUser 
                });
            }
        } catch(e) { console.error('[/api/auth/me]', e); }
        return res.status(404).json({ error: 'User not registered', requiresOnboarding: true, onboarding_state: 'ONBOARDING', pendingRequests: [], firebaseUser: req.firebaseUser });
    }

    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Return enriched profile with onboarding_state, availableWorkspaces, and pending requests
    try {
        const [pendingRows] = await req.db.query(
            `SELECT gjr.id, gjr.requested_role, gjr.status, g.name AS garage_name
             FROM Garage_Join_Request gjr JOIN Garage g ON gjr.garage_id = g.id
             WHERE gjr.requester_id = ? AND gjr.status = 'PENDING'`, [req.user.id]
        );
        const [uaRows] = await req.db.query('SELECT onboarding_state FROM User_Account WHERE id = ?', [req.user.id]);
        const onboarding_state = uaRows.length > 0 ? uaRows[0].onboarding_state : 'ACTIVE';
        res.json({ user: { ...req.user, onboarding_state, pendingRequests: pendingRows } });
    } catch(e) {
        console.error('[/api/auth/me enriched]', e);
        res.json({ user: req.user });
    }
});

// POST /api/auth/switch-workspace
app.post(['/api/auth/switch-workspace', '/api/session/switch-workspace'], require('./middleware/firebaseAuth').requireAuth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const { role, garageId } = req.body;
    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    const allowedRoles = ['customer', 'owner', 'manager', 'mechanic'];
    const normRole = role.toLowerCase().trim();
    if (!allowedRoles.includes(normRole)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        if (normRole === 'customer') {
            const [custRows] = await req.db.query(
                'SELECT id FROM Customer WHERE id = ? OR email = ?',
                [req.user.customer_id || '', req.user.email]
            );

            let customerId = req.user.customer_id;
            if (custRows.length > 0) {
                customerId = custRows[0].id;
            } else {
                customerId = require('uuid').v4();
                const [first, ...rest] = (req.user.name || 'Customer').split(' ');
                await req.db.query(
                    'INSERT INTO Customer (id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)',
                    [customerId, first, rest.join(' ') || '', req.user.email, req.user.phone || '']
                );
            }

            await req.db.query(
                'UPDATE User_Account SET role = ?, reference_id = ? WHERE id = ?',
                ['customer', customerId, req.user.id]
            );

            const activeWorkspace = {
                id: 'customer_personal',
                type: 'customer',
                role: 'customer',
                name: 'Personal Customer Account',
                description: 'Manage vehicles & book services'
            };

            return res.json({
                success: true,
                role: 'customer',
                customer_id: customerId,
                activeWorkspace,
                user: {
                    ...req.user,
                    role: 'customer',
                    customer_id: customerId,
                    activeWorkspace
                }
            });
        }

        // For garage workspaces:
        if (!garageId) {
            return res.status(400).json({ error: 'garageId is required for garage workspaces' });
        }

        const [memberships] = await req.db.query(`
            SELECT gm.id AS membership_id, gm.garage_id, g.name AS garage_name, r.name AS role_name
            FROM Garage_Membership gm
            JOIN Role r ON gm.role_id = r.id
            JOIN Garage g ON gm.garage_id = g.id
            WHERE gm.user_id = ? AND gm.garage_id = ? AND r.name = ? AND gm.status = 'ACTIVE'
        `, [req.user.id, garageId, normRole]);

        if (memberships.length === 0) {
            return res.status(403).json({
                error: `Unauthorized: You do not possess an active ${normRole} membership for this garage.`
            });
        }

        const activeMembership = memberships[0];

        await req.db.query(
            'UPDATE User_Account SET role = ? WHERE id = ?',
            [normRole, req.user.id]
        );

        const activeWorkspace = {
            id: activeMembership.membership_id,
            type: 'garage',
            role: normRole,
            garage_id: activeMembership.garage_id,
            garage_name: activeMembership.garage_name,
            name: activeMembership.garage_name,
            description: `${normRole.charAt(0).toUpperCase() + normRole.slice(1)} Workspace`
        };

        return res.json({
            success: true,
            role: normRole,
            garageId: activeMembership.garage_id,
            activeWorkspace,
            user: {
                ...req.user,
                role: normRole,
                selectedGarageId: activeMembership.garage_id,
                activeWorkspace
            }
        });
    } catch (e) {
        console.error('[/api/auth/switch-workspace]', e);
        res.status(500).json({ error: 'Failed to switch workspace' });
    }
});

app.post('/api/auth/onboard', require('./middleware/firebaseAuth').requireAuth, async (req, res) => {
    if (req.user) {
        return res.status(400).json({ error: 'User already registered' });
    }
    if (!req.firebaseUser) {
        return res.status(401).json({ error: 'Valid Firebase token required for onboarding' });
    }

    const { role } = req.body;
    const allowedRoles = ['customer', 'owner', 'manager', 'mechanic'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    try {
        const newId = require('uuid').v4();
        const refId = require('uuid').v4();
        const [firstName, ...lastNames] = (req.firebaseUser.name || '').split(' ');
        
        if (role === 'customer') {
            await req.db.query('INSERT INTO Customer (id, first_name, last_name, email) VALUES (?, ?, ?, ?)', [refId, firstName || 'Unknown', lastNames.join(' ') || '', req.firebaseUser.email]);
        } else if (role === 'owner') {
            await req.db.query('INSERT INTO Owner (id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)', [refId, firstName || 'Unknown', lastNames.join(' ') || '', req.firebaseUser.email, null]);
        } else if (role === 'manager') {
            await req.db.query('INSERT INTO Manager (id, first_name, last_name, email, user_account_id) VALUES (?, ?, ?, ?, ?)', [refId, firstName || 'Unknown', lastNames.join(' ') || '', req.firebaseUser.email, newId]);
        } else if (role === 'mechanic') {
            await req.db.query('INSERT INTO Mechanic (id, first_name, last_name, email) VALUES (?, ?, ?, ?)', [refId, firstName || 'Unknown', lastNames.join(' ') || '', req.firebaseUser.email]);
        }

        await req.db.query(
            'INSERT INTO User_Account (id, firebase_uid, name, email, role, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
            [newId, req.firebaseUser.firebase_uid, req.firebaseUser.name, req.firebaseUser.email, role, refId]
        );
        
        const [userRecords] = await req.db.query('SELECT * FROM User_Account WHERE id = ?', [newId]);
        const user = userRecords[0];

        res.json({ 
            user: {
                id: user.id,
                firebase_uid: user.firebase_uid,
                name: user.name,
                email: user.email,
                role: user.role,
                customer_id: user.reference_id,
                memberships: []
            } 
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to onboard user' });
    }
});


// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack || err.message || err);
    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
    
    res.status(statusCode).json({
        error: isProduction && statusCode === 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
        ...(isProduction ? {} : { stack: err.stack, _sqlLogs: req.sqlLogs || [] })
    });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
