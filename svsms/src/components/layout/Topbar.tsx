import React, { useEffect } from 'react';
import { Sun, Moon, User, Menu } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';

export const Topbar = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const toggleSidebar = useUIStore(state => state.toggleSidebar);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 md:px-6 backdrop-blur-md">
      <button
        onClick={toggleSidebar}
        className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex flex-1 items-center gap-4">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={`Current theme: ${theme}`}
        >
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
        <NotificationCenter />
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium leading-none">{user?.username}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</p>
          </div>
          <button onClick={logout} className="ml-2 h-8 w-8 rounded-full bg-gradient-to-tr from-destructive to-destructive/80 hover:opacity-90 flex items-center justify-center text-primary-foreground font-semibold shadow-sm cursor-pointer" title="Logout">
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
