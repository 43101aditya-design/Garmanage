import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { LogOut, Bell, PanelLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Topbar = () => {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

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

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};
