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

app.get('/api/auth/me', require('./middleware/firebaseAuth').requireAuth, (req, res) => { res.json({ user: req.user }); });

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
