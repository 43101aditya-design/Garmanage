import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, Workspace } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { 
  LogOut, Bell, PanelLeft, ChevronRight, Database, 
  Terminal, Network, BarChart, ChevronDown, 
  Briefcase, Check, Sparkles, Building2, UserCircle, Settings as SettingsIcon, Loader2
} from 'lucide-react';
import { cn } from '../../utils/cn';

export const Topbar = () => {
  const { user, logout, switchWorkspace, isLoading } = useAuthStore();
  const { toggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();

  const handleSwitch = async (ws: Workspace) => {
    if (ws.role === user?.role && (ws.garage_id === user?.garage_id || (!ws.garage_id && !user?.garage_id))) {
      setWorkspaceDropdownOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchWorkspace(ws);
      setWorkspaceDropdownOpen(false);
      if (ws.role === 'customer') navigate('/customer');
      else if (ws.role === 'owner') navigate('/owner');
      else if (ws.role === 'manager') navigate('/manager');
      else if (ws.role === 'mechanic') navigate('/mechanic');
    } catch (err) {
      console.error('Workspace switch error:', err);
    } finally {
      setSwitching(false);
    }
  };

  const currentRole = user?.role?.toUpperCase() ?? 'GUEST';
  const hasMultipleWorkspaces = (user?.availableWorkspaces?.length ?? 0) > 1;

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

        {/* Workspace pill / Selector */}
        <div className="relative">
          <button
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/80 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs font-mono">
              {currentRole[0]}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
                  {currentRole}
                </span>
                {hasMultipleWorkspaces && (
                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                    {user?.availableWorkspaces?.length} Workspaces
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground leading-tight truncate max-w-[140px] sm:max-w-[200px]">
                {user?.garage_name ? user.garage_name : (user?.role === 'customer' ? 'Personal Account' : (user?.name || 'Workspace'))}
              </span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground ml-1 transition-transform", workspaceDropdownOpen ? "rotate-180" : "")} />
          </button>

          {workspaceDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setWorkspaceDropdownOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-border/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
                  <span>Authorized Workspaces</span>
                  <Briefcase className="w-3 h-3 text-primary" />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                  {user?.availableWorkspaces && user.availableWorkspaces.length > 0 ? (
                    user.availableWorkspaces.map((ws, idx) => {
                      const isSelected = ws.role === user.role && (ws.garage_id === user.garage_id || (!ws.garage_id && !user.garage_id));
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSwitch(ws)}
                          disabled={switching}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all border",
                            isSelected 
                              ? "bg-primary/10 border-primary/40 text-foreground font-semibold" 
                              : "border-transparent hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {ws.role === 'customer' ? (
                              <UserCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="font-medium text-foreground truncate">{ws.name || (ws.role === 'customer' ? 'Personal Account' : ws.garage_name || ws.role)}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-mono">{ws.role} • {ws.type}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{user?.role?.toUpperCase()} Workspace</p>
                      <p className="text-[10px]">Active context</p>
                    </div>
                  )}
                </div>

                <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-2">
                  <NavLink
                    to="/settings"
                    onClick={() => setWorkspaceDropdownOpen(false)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium px-2 py-1 rounded"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    <span>Workspace Settings</span>
                  </NavLink>
                  {switching && (
                    <span className="flex items-center gap-1 text-[11px] text-primary font-mono animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" /> Switching...
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Actions: Database Quick Access, Notifications, Settings, Logout */}
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

        <NavLink 
          to="/settings" 
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          title="Account & Workspace Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="w-4.5 h-4.5" />
        </NavLink>

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
