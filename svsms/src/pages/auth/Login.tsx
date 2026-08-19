import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../api/services/authService';
import { Wrench, User, Shield, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async (role: 'admin' | 'manager' | 'mechanic') => {
    setLoading(true);
    try {
      const data = await AuthService.login({ email: `${role}@svsms.com`, role });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg border border-border/50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            SVSMS Platform
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a role to continue (Demo Mode)
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => handleDemoLogin('admin')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <Shield className="w-5 h-5 mr-2" />
            Login as Owner (Admin)
          </button>
          
          <button
            onClick={() => handleDemoLogin('manager')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <Briefcase className="w-5 h-5 mr-2" />
            Login as Manager
          </button>

          <button
            onClick={() => handleDemoLogin('mechanic')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <User className="w-5 h-5 mr-2" />
            Login as Mechanic
          </button>
        </div>
      </div>
    </div>
  );
};
