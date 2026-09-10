import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { 
  LogOut, Bell, PanelLeft, ChevronRight, Database, 
  Terminal, Network, BarChart, ChevronDown 
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const Topbar = () => {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-card/95 backdrop-blur-md border-b border-border/80 flex items-center justify-between px-4 md:px-6 z-30 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger / open sidebar */}
        <button
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          onClick={toggleSidebar}
          aria-label="Open Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Desktop: expand sidebar when collapsed */}
        {isSidebarCollapsed && (
          <button
            className="hidden lg:flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            onClick={toggleSidebarCollapsed}
            aria-label="Expand Sidebar"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
            {user?.role?.toUpperCase() ?? 'GUEST'}
          </span>
          <span className="text-sm font-semibold text-foreground leading-tight">
            {user?.name ?? 'Workshop Console'}
          </span>
        </div>
      </div>

      {/* Right Actions: Database Quick Access, Notifications, Logout */}
      <div className="flex items-center gap-2.5">
        
        {/* Quick Database Tools Dropdown in Topbar */}
        <div className="relative">
          <button
            onClick={() => setDbDropdownOpen(!dbDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all shadow-sm"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Database Tools</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", dbDropdownOpen ? "rotate-180" : "")} />
          </button>

          {dbDropdownOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setDbDropdownOpen(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-border/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
                  <span>MySQL DBMS Console</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <NavLink
                  to="/db-explorer"
                  onClick={() => setDbDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-muted/70 hover:text-primary transition-colors font-medium"
                >
                  <Database className="w-4 h-4 text-primary" />
                  <span>DB Explorer</span>
                </NavLink>

                <NavLink
                  to="/sql-playground"
                  onClick={() => setDbDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-muted/70 hover:text-primary transition-colors font-medium"
                >
                  <Terminal className="w-4 h-4 text-primary" />
                  <span>SQL Playground</span>
                </NavLink>

                <NavLink
                  to="/er-diagram"
                  onClick={() => setDbDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-muted/70 hover:text-primary transition-colors font-medium"
                >
                  <Network className="w-4 h-4 text-primary" />
                  <span>ER Diagram</span>
                </NavLink>

                <NavLink
                  to="/stats"
                  onClick={() => setDbDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-muted/70 hover:text-primary transition-colors font-medium"
                >
                  <BarChart className="w-4 h-4 text-primary" />
                  <span>Database Stats</span>
                </NavLink>
              </div>
            </>
          )}
        </div>

        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors relative" aria-label="Notifications">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive flex items-center gap-1.5 text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};
