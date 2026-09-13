import { useAuthStore } from '../store/authStore';
import React, { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, useRouteError } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { getDashboardRoute } from '../permissions';
import { RefreshCw } from 'lucide-react';

// Auto-recovery wrapper for dynamic imports when a new version has been deployed
function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const isChunkError =
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.name === 'ChunkLoadError' ||
        err?.message?.includes('dynamically imported module') ||
        err?.message?.includes('Loading chunk');

      if (isChunkError) {
        console.warn('[Router] Stale chunk detected after new deployment. Auto-reloading page...', err);
        const lastReload = sessionStorage.getItem('last_chunk_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
          sessionStorage.setItem('last_chunk_reload', now.toString());
          window.location.reload();
          return new Promise(() => {}); // prevent render crash during reload
        }
      }
      throw err;
    }
  });
}

// User-friendly error boundary for unhandled route errors with automatic reload on chunk mismatch
export const RootErrorBoundary = () => {
  const error: any = useRouteError();
  const isChunkError =
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Loading chunk');

  useEffect(() => {
    if (isChunkError) {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem('last_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }, [isChunkError]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center text-slate-100">
      <div className="max-w-md space-y-4 rounded-2xl bg-slate-800/90 p-8 shadow-2xl border border-slate-700">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
          <RefreshCw className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-xl font-bold">App Update Available</h2>
        <p className="text-sm text-slate-400">
          A new version of Garmanage has been deployed. Refreshing your application to load the latest features...
        </p>
        <button
          onClick={() => {
            sessionStorage.removeItem('last_chunk_reload');
            window.location.reload();
          }}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-500"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
};

// Layout
const AppLayout = safeLazy(() => import('../components/layout/AppLayout').then(m => ({ default: m.AppLayout })));

// Auth
const Login = safeLazy(() => import('../pages/auth/Login').then(m => ({ default: m.Login })));
const Register = safeLazy(() => import('../pages/auth/Register').then(m => ({ default: m.Register })));
const Onboarding = safeLazy(() => import('../pages/auth/Onboarding').then(m => ({ default: m.Onboarding })));
const PendingApproval = safeLazy(() => import('../pages/auth/PendingApproval').then(m => ({ default: m.PendingApproval })));
const RoleSelector = safeLazy(() => import('../pages/auth/RoleSelector').then(m => ({ default: m.RoleSelector })));

// Roles
const OwnerDashboard = safeLazy(() => import('../pages/owner/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const GarageList = safeLazy(() => import('../pages/owner/GarageList').then(m => ({ default: m.GarageList })));
const GarageManage = safeLazy(() => import('../pages/owner/GarageManage').then(m => ({ default: m.GarageManage })));
const TechnicalDashboard = safeLazy(() => import('../pages/owner/TechnicalDashboard').then(m => ({ default: m.TechnicalDashboard })));
const AccessManagement = safeLazy(() => import('../pages/owner/AccessManagement').then(m => ({ default: m.AccessManagement })));
const OwnerDecisionCenter = safeLazy(() => import('../pages/owner/OwnerDecisionCenter').then(m => ({ default: m.OwnerDecisionCenter })));

const ManagerDashboard = safeLazy(() => import('../pages/manager/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const DecisionCenter = safeLazy(() => import('../pages/manager/DecisionCenter').then(m => ({ default: m.DecisionCenter })));
const ManagerServiceRequests = safeLazy(() => import('../pages/manager/ManagerServiceRequests').then(m => ({ default: m.ManagerServiceRequests })));
const ManagerCalendar = safeLazy(() => import('../pages/manager/ManagerCalendar').then(m => ({ default: m.ManagerCalendar })));
const WorkshopBoard = safeLazy(() => import('../pages/manager/WorkshopBoard').then(m => ({ default: m.WorkshopBoard })));
const JobCardDetails = safeLazy(() => import('../pages/manager/JobCardDetails').then(m => ({ default: m.JobCardDetails })));
const ManagerWorkforce = safeLazy(() => import('../pages/manager/ManagerWorkforce').then(m => ({ default: m.ManagerWorkforce })));
const MechanicProfileView = safeLazy(() => import('../pages/manager/MechanicProfileView').then(m => ({ default: m.MechanicProfileView })));
const AIAssignmentDashboard = safeLazy(() => import('../pages/manager/AIAssignmentDashboard').then(m => ({ default: m.AIAssignmentDashboard })));

const MechanicDashboard = safeLazy(() => import('../pages/mechanic/MechanicDashboard').then(m => ({ default: m.MechanicDashboard })));
const MechanicProfile = safeLazy(() => import('../pages/mechanic/MechanicProfile').then(m => ({ default: m.MechanicProfile })));
const MechanicJobs = safeLazy(() => import('../pages/mechanic/MechanicJobs').then(m => ({ default: m.MechanicJobs })));
const MechanicJobDetails = safeLazy(() => import('../pages/mechanic/MechanicJobDetails').then(m => ({ default: m.MechanicJobDetails })));

const CustomerDashboard = safeLazy(() => import('../pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const GarageSelection = safeLazy(() => import('../pages/customer/GarageSelection').then(m => ({ default: m.GarageSelection })));
const CustomerVehicles = safeLazy(() => import('../pages/customer/CustomerVehicles').then(m => ({ default: m.CustomerVehicles })));
const CustomerVehicleForm = safeLazy(() => import('../pages/customer/CustomerVehicleForm').then(m => ({ default: m.CustomerVehicleForm })));
const ServiceRequests = safeLazy(() => import('../pages/customer/ServiceRequests').then(m => ({ default: m.ServiceRequests })));
const CreateServiceRequest = safeLazy(() => import('../pages/customer/CreateServiceRequest').then(m => ({ default: m.CreateServiceRequest })));
const CustomerAppointments = safeLazy(() => import('../pages/customer/CustomerAppointments').then(m => ({ default: m.CustomerAppointments })));
const CustomerServiceTracking = safeLazy(() => import('../pages/customer/CustomerServiceTracking').then(m => ({ default: m.CustomerServiceTracking })));

// Existing generic/shared pages
const Customers = safeLazy(() => import('../pages/entities/Customers').then(m => ({ default: m.Customers })));
const CalendarView = safeLazy(() => import('../pages/calendar/CalendarView').then(m => ({ default: m.CalendarView })));
const InventoryManagement = safeLazy(() => import('../pages/inventory/InventoryManagement').then(m => ({ default: m.InventoryManagement })));
const Reports = safeLazy(() => import('../pages/reports/Reports').then(m => ({ default: m.Reports })));
const Analytics = safeLazy(() => import('../pages/analytics/Analytics').then(m => ({ default: m.Analytics })));
const EngineeringLab = safeLazy(() => import('../pages/engineering/EngineeringLab').then(m => ({ default: m.EngineeringLab })));
const DatabaseExplorer = safeLazy(() => import('../pages/db/explorer/DatabaseExplorer').then(m => ({ default: m.DatabaseExplorer })));
const ERDiagram = safeLazy(() => import('../pages/db/er-diagram/ERDiagram').then(m => ({ default: m.ERDiagram })));
const SqlPlayground = safeLazy(() => import('../pages/db/monitor/SqlPlayground').then(m => ({ default: m.SqlPlayground })));
const DatabaseStats = safeLazy(() => import('../pages/db/stats/DatabaseStats').then(m => ({ default: m.DatabaseStats })));
const CustomerHistory = safeLazy(() => import('../pages/history/CustomerHistory').then(m => ({ default: m.CustomerHistory })));
const WorkflowTimeline = safeLazy(() => import('../pages/workflow/WorkflowTimeline').then(m => ({ default: m.WorkflowTimeline })));
const Settings = safeLazy(() => import('../pages/settings/Settings').then(m => ({ default: m.Settings })));

// Index routing component: smoothly routes to the user's dashboard if logged in
const IndexRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">Loading your profile...</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const target = getDashboardRoute(user.role);
  return <Navigate to={target} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    errorElement: <RootErrorBoundary />,
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/onboarding',
    errorElement: <RootErrorBoundary />,
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <Onboarding />
      </Suspense>
    ),
  },
  {
    path: '/pending-approval',
    errorElement: <RootErrorBoundary />,
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <PendingApproval />
      </Suspense>
    ),
  },
  {
    path: '/select-role',
    errorElement: <RootErrorBoundary />,
    element: (
      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <RoleSelector />
      </Suspense>
    ),
  },
  
  {
    path: '/',
    errorElement: <RootErrorBoundary />,
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
      { path: 'owner/decisions', element: <ProtectedRoute allowedRoles={['owner']}><OwnerDecisionCenter /></ProtectedRoute> },
      { path: 'owner/technical-ops', element: <ProtectedRoute allowedRoles={['owner']}><TechnicalDashboard /></ProtectedRoute> },
      { path: 'owner/access-management', element: <ProtectedRoute allowedRoles={['owner']}><AccessManagement /></ProtectedRoute> },
      
      // Manager routes
      { path: 'manager', element: <ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute> },
      { path: 'manager/decisions', element: <ProtectedRoute allowedRoles={['manager']}><DecisionCenter /></ProtectedRoute> },
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
      { path: 'customer/tracking', element: <ProtectedRoute allowedRoles={['customer']}><CustomerServiceTracking /></ProtectedRoute> },
      { path: 'customer/tracking/:id', element: <ProtectedRoute allowedRoles={['customer']}><CustomerServiceTracking /></ProtectedRoute> },
      
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
      { path: 'settings', element: <ProtectedRoute><Settings /></ProtectedRoute> },
      
      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
