import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/auth/Login';

// Lazy loaded modules
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const Customers = lazy(() => import('../pages/entities/Customers').then(m => ({ default: m.Customers })));
const DatabaseExplorer = lazy(() => import('../pages/db/explorer/DatabaseExplorer').then(m => ({ default: m.DatabaseExplorer })));
const ERDiagram = lazy(() => import('../pages/db/er-diagram/ERDiagram').then(m => ({ default: m.ERDiagram })));
const SqlPlayground = lazy(() => import('../pages/db/monitor/SqlPlayground').then(m => ({ default: m.SqlPlayground })));
const DatabaseStats = lazy(() => import('../pages/db/stats/DatabaseStats').then(m => ({ default: m.DatabaseStats })));

// Phase 4 New Modules
const Analytics = lazy(() => import('../pages/analytics/Analytics').then(m => ({ default: m.Analytics })));
const Reports = lazy(() => import('../pages/reports/Reports').then(m => ({ default: m.Reports })));
const CalendarView = lazy(() => import('../pages/calendar/CalendarView').then(m => ({ default: m.CalendarView })));
const CustomerHistory = lazy(() => import('../pages/history/CustomerHistory').then(m => ({ default: m.CustomerHistory })));
const MechanicDashboard = lazy(() => import('../pages/mechanic/MechanicDashboard').then(m => ({ default: m.MechanicDashboard })));
const InventoryManagement = lazy(() => import('../pages/inventory/InventoryManagement').then(m => ({ default: m.InventoryManagement })));
const WorkflowTimeline = lazy(() => import('../pages/workflow/WorkflowTimeline').then(m => ({ default: m.WorkflowTimeline })));
const EngineeringLab = lazy(() => import('../pages/engineering/EngineeringLab').then(m => ({ default: m.EngineeringLab })));

// Suspense wrapper
const Loadable = (Component: React.ComponentType) => (props: any) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-full w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }>
    <Component {...props} />
  </Suspense>
);



export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: '/', element: Loadable(Dashboard)({}) },
      { path: '/customers', element: Loadable(Customers)({}) },
      { path: '/mechanics', element: Loadable(MechanicDashboard)({}) },
      { path: '/appointments', element: Loadable(CalendarView)({}) },
      { path: '/inventory', element: Loadable(InventoryManagement)({}) },
      { path: '/reports', element: Loadable(Reports)({}) },
      { path: '/analytics', element: Loadable(Analytics)({}) },
      { path: '/timeline', element: Loadable(WorkflowTimeline)({}) },
      { path: '/customer-history/:id', element: Loadable(CustomerHistory)({}) },
      
      { path: '/engineering-lab', element: Loadable(EngineeringLab)({}) },
      
      // DBMS Specific Routes
      { path: '/db-explorer', element: Loadable(DatabaseExplorer)({}) },
      { path: '/er-diagram', element: Loadable(ERDiagram)({}) },
      { path: '/sql-playground', element: Loadable(SqlPlayground)({}) },
      { path: '/stats', element: Loadable(DatabaseStats)({}) },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
