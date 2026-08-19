import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Wrench, Calendar, Settings, Database, Activity, GitBranch, PieChart, Package, History, FileText, Banknote, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = () => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const role = user?.role || 'customer';

  // Navigation configurations based on role
  const roleNavs = {
    admin: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Managers', href: '/managers', icon: ShieldAlert },
      { name: 'Branches', href: '/branches', icon: GitBranch },
      { name: 'Workshop', href: '/mechanics', icon: Wrench },
      { name: 'Jobs', href: '/appointments', icon: Calendar },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Finance', href: '/finance', icon: Banknote },
      { name: 'Analytics', href: '/analytics', icon: Activity },
      { name: 'Inventory', href: '/inventory', icon: Package },
      { name: 'Approvals', href: '/approvals', icon: FileText },
      { name: 'Engineering Lab', href: '/engineering-lab', icon: Cpu },
      { name: 'Audit Logs', href: '/audit-logs', icon: Database },
    ],
    manager: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Service Requests', href: '/requests', icon: FileText },
      { name: 'Jobs', href: '/appointments', icon: Calendar },
      { name: 'Mechanics', href: '/mechanics', icon: Wrench },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Inventory', href: '/inventory', icon: Package },
      { name: 'Billing', href: '/finance', icon: Banknote },
      { name: 'Reports', href: '/reports', icon: PieChart },
    ],
    mechanic: [
      { name: 'My Jobs', href: '/', icon: Calendar },
      { name: 'Today\'s Work', href: '/appointments', icon: Wrench },
      { name: 'Job History', href: '/history', icon: History },
      { name: 'Parts Used', href: '/inventory', icon: Package },
    ],
    customer: [
      { name: 'Vehicles', href: '/', icon: Wrench },
      { name: 'Service Requests', href: '/appointments', icon: Calendar },
      { name: 'History', href: '/history', icon: History },
      { name: 'Invoices', href: '/finance', icon: FileText },
    ]
  };

  const dbmsLinks = [
    { name: 'DB Explorer', href: '/db-explorer', icon: Database },
    { name: 'ER Diagram', href: '/er-diagram', icon: GitBranch },
    { name: 'SQL Playground', href: '/sql-playground', icon: Activity },
  ];

  const currentNav = roleNavs[role] || roleNavs.customer;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
          <Wrench className="h-5 w-5" />
          <span>SVSMS SaaS</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <nav className="space-y-1 px-3">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {role.toUpperCase()} MENU
          </div>
          {currentNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.name}
              </NavLink>
            );
          })}

          <div className="mt-8 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            DBMS Project
          </div>
          {dbmsLinks.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-border/50">
        <NavLink
          to="/settings"
          className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
          Settings
        </NavLink>
      </div>
    </div>
  );
};
