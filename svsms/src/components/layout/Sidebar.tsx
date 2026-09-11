import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Wrench, FileText, 
  Settings, X, BarChart, Database, Map, Box, BrainCircuit, 
  ChevronLeft, ShieldAlert, ShieldCheck, Terminal, Network, Activity
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const roleNavs: Record<string, { name: string; href: string; icon: any }[]> = {
  owner: [
    { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
    { name: 'AI Decision Center', href: '/owner/decisions', icon: BrainCircuit },
    { name: 'Alert Center', href: '/owner/alerts', icon: ShieldAlert },
    { name: 'Advanced Analytics', href: '/owner/advanced-analytics', icon: BarChart },
    { name: 'Technical Ops', href: '/owner/technical-ops', icon: Settings },
    { name: 'My Garages', href: '/owner/garages', icon: Map },
    { name: 'Access Management', href: '/owner/access-management', icon: ShieldCheck },
    { name: 'Inventory & Parts', href: '/inventory', icon: Box },
    { name: 'Engineering Lab', href: '/engineering-lab', icon: Activity },
  ],
  manager: [
    { name: 'Dashboard', href: '/manager', icon: LayoutDashboard },
    { name: 'AI Decision Center', href: '/manager/decisions', icon: BrainCircuit },
    { name: 'Service Requests', href: '/manager/service-requests', icon: FileText },
    { name: 'Calendar', href: '/manager/calendar', icon: Calendar },
    { name: 'Workshop Board', href: '/manager/jobs', icon: Wrench },
    { name: 'Mechanics', href: '/manager/mechanics', icon: Users },
    { name: 'AI Assignment', href: '/manager/ai-assignment', icon: BrainCircuit },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Inventory & Parts', href: '/inventory', icon: Box },
    { name: 'Reports', href: '/reports', icon: FileText },
  ],
  mechanic: [
    { name: 'Dashboard', href: '/mechanic', icon: LayoutDashboard },
    { name: 'My Jobs', href: '/mechanic/jobs', icon: Wrench },
    { name: 'My Profile', href: '/mechanic/profile', icon: Users },
    { name: 'Parts Required', href: '/inventory', icon: Box },
  ],
  customer: [
    { name: 'Dashboard', href: '/customer', icon: LayoutDashboard },
    { name: 'Find / Saved Garages', href: '/customer/select-garage', icon: Map },
    { name: 'My Vehicles', href: '/customer/vehicles', icon: Box },
    { name: 'Service Requests', href: '/customer/service-requests', icon: FileText },
    { name: 'My Appointments', href: '/customer/appointments', icon: Calendar },
  ]
};

const dbmsNav = [
  { name: 'DB Explorer', href: '/db-explorer', icon: Database },
  { name: 'SQL Playground', href: '/sql-playground', icon: Terminal },
  { name: 'ER Diagram', href: '/er-diagram', icon: Network },
  { name: 'Database Stats', href: '/stats', icon: BarChart },
];

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const navItems = user?.role ? roleNavs[user.role] : [];

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden",
          isSidebarOpen ? "block" : "hidden"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Panel */}
      <aside className={cn(
        // Base styles
        "fixed inset-y-0 left-0 w-64 bg-card/95 backdrop-blur-md border-r border-border/80 text-foreground flex flex-col z-50 shadow-xl",
        // Mobile: slides in/out
        "transition-transform duration-300 ease-in-out",
        // Mobile behavior: hidden by default, slides in when open
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: always visible unless collapsed
        isSidebarCollapsed 
          ? "lg:-translate-x-full" 
          : "lg:translate-x-0"
      )}>
        {/* Header with logo and collapse button */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/80 shrink-0">
          <span className="text-lg font-bold text-white flex items-center gap-2 font-mono tracking-wider">
            <Wrench className="w-5 h-5 text-purple-400 animate-pulse" />
            GARMANAGE
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          </span>
          {/* Desktop collapse button */}
          <button 
            className="hidden lg:flex p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-purple-900/30 transition-colors"
            onClick={toggleSidebarCollapsed}
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {/* Mobile close button */}
          <button 
            className="lg:hidden p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-purple-900/30 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-6 custom-scrollbar">
          <div className="px-3">
            <h3 className="px-3 text-[10px] font-bold text-purple-300/80 uppercase tracking-widest mb-3 font-mono">
              Operational Workspace
            </h3>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href !== '/manager/jobs'}
                    className={({ isActive }) => cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-all duration-200 border-l-2",
                      isActive 
                        ? "bg-purple-500/15 text-white border-purple-500 font-semibold shadow-sm" 
                        : "text-purple-200/70 border-transparent hover:bg-purple-900/20 hover:text-white"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 flex-shrink-0 h-4.5 w-4.5 group-hover:scale-105 transition-transform text-purple-400" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {(user?.role === 'owner' || (user?.role as string) === 'admin') && (
            <div className="px-3">
              <div className="flex items-center justify-between px-3 mb-3">
                <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  DBMS Intelligence
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">MYSQL</span>
              </div>
              <nav className="space-y-1">
                {dbmsNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) => cn(
                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-all duration-200 border-l-2",
                        isActive 
                          ? "bg-purple-500/15 text-white border-purple-500 font-semibold shadow-sm" 
                          : "text-purple-200/70 border-transparent hover:bg-purple-900/20 hover:text-white"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-3 flex-shrink-0 h-4.5 w-4.5 group-hover:scale-105 transition-transform text-purple-400" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/80 bg-muted/20 shrink-0">
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-all duration-200 border-l-2",
              isActive 
                ? "bg-primary/10 text-primary border-primary" 
                : "text-muted-foreground border-transparent hover:bg-muted/40 hover:text-foreground"
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="mr-3 h-4.5 w-4.5 group-hover:rotate-45 transition-transform duration-300" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
};
