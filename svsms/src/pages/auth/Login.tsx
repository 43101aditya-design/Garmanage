import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../api/services/authService';
import { Wrench, User, Shield, Briefcase, Lock, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const Login = () => {
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      toast.error('Credentials required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await AuthService.login({ username, password });
      login(data.user, data.token);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'manager' | 'mechanic') => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthService.login({ email: `${role}@svsms.com`, role });
      login(data.user, data.token);
      toast.success(`Logged in as Demo ${role.toUpperCase()}`);
      navigate('/');
    } catch (err: any) {
      const msg = err.message || 'Demo login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 p-8 bg-card rounded-2xl shadow-xl border border-border">
        
        {/* Branding & Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
            Garmanage Platform
          </h2>
          <p className="text-sm text-textSecondary">
            Workshop Management SaaS & Intelligence Lab
          </p>
        </div>

        {/* Inline Error Alert */}
        {error && (
          <div className="flex items-center space-x-2 bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Regular Credentials Login Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-3 w-5 h-5 text-textSecondary" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-textSecondary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background hover:bg-primary-hover font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-textSecondary text-xs uppercase tracking-widest font-semibold">Or Quick Access Demo</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleDemoLogin('admin')}
            disabled={loading}
            className="flex flex-col items-center justify-center p-3 border border-border rounded-xl bg-background hover:bg-hover hover:border-primary/50 transition-all text-xs font-medium space-y-2 text-foreground"
          >
            <Shield className="w-5 h-5 text-primary" />
            <span>Owner</span>
          </button>
          
          <button
            onClick={() => handleDemoLogin('manager')}
            disabled={loading}
            className="flex flex-col items-center justify-center p-3 border border-border rounded-xl bg-background hover:bg-hover hover:border-primary/50 transition-all text-xs font-medium space-y-2 text-foreground"
          >
            <Briefcase className="w-5 h-5 text-blue-500" />
            <span>Manager</span>
          </button>

          <button
            onClick={() => handleDemoLogin('mechanic')}
            disabled={loading}
            className="flex flex-col items-center justify-center p-3 border border-border rounded-xl bg-background hover:bg-hover hover:border-primary/50 transition-all text-xs font-medium space-y-2 text-foreground"
          >
            <User className="w-5 h-5 text-emerald-500" />
            <span>Mechanic</span>
          </button>
        </div>
      </div>
    </div>
  );
};
