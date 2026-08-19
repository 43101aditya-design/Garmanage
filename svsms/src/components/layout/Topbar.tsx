import React from 'react';
import { Menu, Bell, Search, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useGarageStore } from '../../store/garageStore';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const Topbar = () => {
  const { user, logout } = useAuthStore();
  const { setSidebarOpen } = useUIStore();
  const { currentGarage } = useGarageStore();

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-6 z-10 sticky top-0">
      <div className="flex items-center flex-1">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden sm:flex max-w-md w-full items-center relative space-x-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
          {currentGarage && (
            <Badge variant="secondary" className="whitespace-nowrap hidden md:inline-flex">
              {currentGarage.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-400 hover:text-gray-500 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <button 
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
