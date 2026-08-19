import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

// Layout
const AppLayout = lazy(() => import('../components/layout/AppLayout').then(m => ({ default: m.AppLayout })));

// Auth
const Login = lazy(() => import('../pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('../pages/auth/Register').then(m => ({ default: m.Register })));

// Roles
const OwnerDashboard = lazy(() => import('../pages/owner/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const GarageList = lazy(() => import('../pages/owner/GarageList').then(m => ({ default: m.GarageList })));
const GarageManage = lazy(() => import('../pages/owner/GarageManage').then(m => ({ default: m.GarageManage })));

const ManagerDashboard = lazy(() => import('../pages/manager/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const ManagerServiceRequests = lazy(() => import('../pages/manager/ManagerServiceRequests').then(m => ({ default: m.ManagerServiceRequests })));
const ManagerCalendar = lazy(() => import('../pages/manager/ManagerCalendar').then(m => ({ default: m.ManagerCalendar })));
const WorkshopBoard = lazy(() => import('../pages/manager/WorkshopBoard').then(m => ({ default: m.WorkshopBoard })));
const JobCardDetails = lazy(() => import('../pages/manager/JobCardDetails').then(m => ({ default: m.JobCardDetails })));
const ManagerWorkforce = lazy(() => import('../pages/manager/ManagerWorkforce').then(m => ({ default: m.ManagerWorkforce })));
const MechanicProfileView = lazy(() => import('../pages/manager/MechanicProfileView').then(m => ({ default: m.MechanicProfileView })));
const AIAssignmentDashboard = lazy(() => import('../pages/manager/AIAssignmentDashboard').then(m => ({ default: m.AIAssignmentDashboard })));

const MechanicDashboard = lazy(() => import('../pages/mechanic/MechanicDashboard').then(m => ({ default: m.MechanicDashboard })));
const MechanicProfile = lazy(() => import('../pages/mechanic/MechanicProfile').then(m => ({ default: m.MechanicProfile })));
const MechanicJobs = lazy(() => import('../pages/mechanic/MechanicJobs').then(m => ({ default: m.MechanicJobs })));
const MechanicJobDetails = lazy(() => import('../pages/mechanic/MechanicJobDetails').then(m => ({ default: m.MechanicJobDetails })));

const CustomerDashboard = lazy(() => import('../pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const GarageSelection = lazy(() => import('../pages/customer/GarageSelection').then(m => ({ default: m.GarageSelection })));
const CustomerVehicles = lazy(() => import('../pages/customer/CustomerVehicles').then(m => ({ default: m.CustomerVehicles })));
const CustomerVehicleForm = lazy(() => import('../pages/customer/CustomerVehicleForm').then(m => ({ default: m.CustomerVehicleForm })));
const ServiceRequests = lazy(() => import('../pages/customer/ServiceRequests').then(m => ({ default: m.ServiceRequests })));
const CreateServiceRequest = lazy(() => import('../pages/customer/CreateServiceRequest').then(m => ({ default: m.CreateServiceRequest })));
const CustomerAppointments = lazy(() => import('../pages/customer/CustomerAppointments').then(m => ({ default: m.CustomerAppointments })));

// Existing generic/shared pages
const Customers = lazy(() => import('../pages/entities/Customers').then(m => ({ default: m.Customers })));
const CalendarView = lazy(() => import('../pages/calendar/CalendarView').then(m => ({ default: m.CalendarView })));
const InventoryManagement = lazy(() => import('../pages/inventory/InventoryManagement').then(m => ({ default: m.InventoryManagement })));
const Reports = lazy(() => import('../pages/reports/Reports').then(m => ({ default: m.Reports })));
const Analytics = lazy(() => import('../pages/analytics/Analytics').then(m => ({ default: m.Analytics })));
const EngineeringLab = lazy(() => import('../pages/engineering/EngineeringLab').then(m => ({ default: m.EngineeringLab })));
const DatabaseExplorer = lazy(() => import('../pages/db/explorer/DatabaseExplorer').then(m => ({ default: m.DatabaseExplorer })));
const ERDiagram = lazy(() => import('../pages/db/er-diagram/ERDiagram').then(m => ({ default: m.ERDiagram })));
const SqlPlayground = lazy(() => import('../pages/db/monitor/SqlPlayground').then(m => ({ default: m.SqlPlayground })));
const DatabaseStats = lazy(() => import('../pages/db/stats/DatabaseStats').then(m => ({ default: m.DatabaseStats })));
const CustomerHistory = lazy(() => import('../pages/history/CustomerHistory').then(m => ({ default: m.CustomerHistory })));
const WorkflowTimeline = lazy(() => import('../pages/workflow/WorkflowTimeline').then(m => ({ default: m.WorkflowTimeline })));

// Index routing component
const IndexRedirect = () => {
  return <ProtectedRoute allowedRoles={['owner', 'manager', 'mechanic', 'customer']}><div/></ProtectedRoute>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <Register />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <AppLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <IndexRedirect /> },
      
      // Owner routes
      { path: 'owner', element: <ProtectedRoute allowedRoles={['owner']}><OwnerDashboard /></ProtectedRoute> },
      { path: 'owner/garages', element: <ProtectedRoute allowedRoles={['owner']}><GarageList /></ProtectedRoute> },
      { path: 'owner/garages/:id', element: <ProtectedRoute allowedRoles={['owner']}><GarageManage /></ProtectedRoute> },
      
      // Manager routes
      { path: 'manager', element: <ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute> },
      { path: 'manager/service-requests', element: <ProtectedRoute allowedRoles={['manager']}><ManagerServiceRequests /></ProtectedRoute> },
      { path: 'manager/calendar', element: <ProtectedRoute allowedRoles={['manager']}><ManagerCalendar /></ProtectedRoute> },
      { path: 'manager/jobs', element: <ProtectedRoute allowedRoles={['manager']}><WorkshopBoard /></ProtectedRoute> },
      { path: 'manager/jobs/:id', element: <ProtectedRoute allowedRoles={['manager']}><JobCardDetails /></ProtectedRoute> },
      { path: 'manager/mechanics', element: <ProtectedRoute allowedRoles={['manager']}><ManagerWorkforce /></ProtectedRoute> },
      { path: 'manager/mechanics/:id', element: <ProtectedRoute allowedRoles={['manager']}><MechanicProfileView /></ProtectedRoute> },
      { path: 'manager/ai-assignment', element: <ProtectedRoute allowedRoles={['manager']}><AIAssignmentDashboard /></ProtectedRoute> },
      
      // Mechanic routes
      { path: 'mechanic', element: <ProtectedRoute allowedRoles={['mechanic']}><MechanicDashboard /></ProtectedRoute> },
      { path: 'mechanic/profile', element: <ProtectedRoute allowedRoles={['mechanic']}><MechanicProfile /></ProtectedRoute> },
      { path: 'mechanic/jobs', element: <ProtectedRoute allowedRoles={['mechanic']}><MechanicJobs /></ProtectedRoute> },
      { path: 'mechanic/jobs/:id', element: <ProtectedRoute allowedRoles={['mechanic']}><MechanicJobDetails /></ProtectedRoute> },
      
      // Customer routes
      { path: 'customer', element: <ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute> },
      { path: 'customer/select-garage', element: <ProtectedRoute allowedRoles={['customer']}><GarageSelection /></ProtectedRoute> },
      { path: 'customer/vehicles', element: <ProtectedRoute allowedRoles={['customer']}><CustomerVehicles /></ProtectedRoute> },
      { path: 'customer/vehicles/new', element: <ProtectedRoute allowedRoles={['customer']}><CustomerVehicleForm /></ProtectedRoute> },
      { path: 'customer/vehicles/:id', element: <ProtectedRoute allowedRoles={['customer']}><CustomerVehicleForm /></ProtectedRoute> },
      { path: 'customer/service-requests', element: <ProtectedRoute allowedRoles={['customer']}><ServiceRequests /></ProtectedRoute> },
      { path: 'customer/service-requests/new', element: <ProtectedRoute allowedRoles={['customer']}><CreateServiceRequest /></ProtectedRoute> },
      { path: 'customer/appointments', element: <ProtectedRoute allowedRoles={['customer']}><CustomerAppointments /></ProtectedRoute> },
      
      // Shared existing routes (protected by default to authenticated users)
      { path: 'customers', element: <ProtectedRoute><Customers /></ProtectedRoute> },
      { path: 'appointments', element: <ProtectedRoute><CalendarView /></ProtectedRoute> },
      { path: 'inventory', element: <ProtectedRoute><InventoryManagement /></ProtectedRoute> },
      { path: 'reports', element: <ProtectedRoute><Reports /></ProtectedRoute> },
      { path: 'analytics', element: <ProtectedRoute><Analytics /></ProtectedRoute> },
      { path: 'engineering-lab', element: <ProtectedRoute><EngineeringLab /></ProtectedRoute> },
      { path: 'db-explorer', element: <ProtectedRoute><DatabaseExplorer /></ProtectedRoute> },
      { path: 'er-diagram', element: <ProtectedRoute><ERDiagram /></ProtectedRoute> },
      { path: 'sql-playground', element: <ProtectedRoute><SqlPlayground /></ProtectedRoute> },
      { path: 'stats', element: <ProtectedRoute><DatabaseStats /></ProtectedRoute> },
      { path: 'customer-history/:id', element: <ProtectedRoute><CustomerHistory /></ProtectedRoute> },
      { path: 'timeline', element: <ProtectedRoute><WorkflowTimeline /></ProtectedRoute> },
      
      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
