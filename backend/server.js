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
// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
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


app.get('/api/auth/me', require('./middleware/firebaseAuth').requireAuth, (req, res) => { 
    if (!req.user && req.firebaseUser) {
        return res.status(404).json({ error: 'User not registered', requiresOnboarding: true, firebaseUser: req.firebaseUser });
    }
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: req.user }); 
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
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack,
        _sqlLogs: req.sqlLogs || []
    });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
