import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Wrench, FileText, 
  Settings, X, BarChart, Database, Map, Box, BrainCircuit
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const roleNavs: Record<string, { name: string; href: string; icon: any }[]> = {
  owner: [
    { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
    { name: 'My Garages', href: '/owner/garages', icon: Map },
    { name: 'Analytics', href: '/analytics', icon: BarChart },
    { name: 'Inventory', href: '/inventory', icon: Box },
    { name: 'Engineering Lab', href: '/engineering-lab', icon: Database },
  ],
  manager: [
    { name: 'Dashboard', href: '/manager', icon: LayoutDashboard },
    { name: 'Service Requests', href: '/manager/service-requests', icon: FileText },
    { name: 'Calendar', href: '/manager/calendar', icon: Calendar },
    { name: 'Workshop Board', href: '/manager/jobs', icon: Wrench },
    { name: 'Mechanics', href: '/manager/mechanics', icon: Users },
    { name: 'AI Assignment', href: '/manager/ai-assignment', icon: BrainCircuit },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Inventory', href: '/inventory', icon: Box },
    { name: 'Reports', href: '/reports', icon: FileText },
  ],
  mechanic: [
    { name: 'Dashboard', href: '/mechanic', icon: LayoutDashboard },
    { name: 'My Jobs', href: '/mechanic/jobs', icon: Wrench },
    { name: 'My Profile', href: '/mechanic/profile', icon: Users },
    { name: 'Parts Used', href: '/inventory', icon: Box },
  ],
  customer: [
    { name: 'Dashboard', href: '/customer', icon: LayoutDashboard },
    { name: 'Select Garage', href: '/customer/select-garage', icon: Map },
    { name: 'My Vehicles', href: '/customer/vehicles', icon: Box },
    { name: 'Service Requests', href: '/customer/service-requests', icon: FileText },
    { name: 'My Appointments', href: '/customer/appointments', icon: Calendar },
  ]
};

const devNav = [
  { name: 'DB Explorer', href: '/db-explorer', icon: Database },
  { name: 'ER Diagram', href: '/er-diagram', icon: Database },
  { name: 'SQL Playground', href: '/sql-playground', icon: Database },
];

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const navItems = user?.role ? roleNavs[user.role] : [];

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-gray-900/50 z-40 lg:hidden",
          isSidebarOpen ? "block" : "hidden"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <div className={cn(
        "fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col z-50 transform transition-transform duration-200 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-500" />
            Garmanage
          </span>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
                    isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-slate-800 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 px-3">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              DBMS Project
            </h3>
            <nav className="space-y-1">
              {devNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) => cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
                      isActive ? "bg-slate-800 text-blue-400" : "text-gray-400 hover:bg-slate-800 hover:text-white"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md group",
              isActive ? "bg-slate-800 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-white"
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </NavLink>
        </div>
      </div>
    </>
  );
};
