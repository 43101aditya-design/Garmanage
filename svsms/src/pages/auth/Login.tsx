import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Wrench, Car, Store, Users, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const navigate = useNavigate();
  const { googleLogin, onboard, isLoading, isAuthenticated, needsOnboarding, user } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string>('');

  if (isAuthenticated && user) {
    if (user.role === 'owner') return <Navigate to="/owner" replace />;
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    if (user.role === 'mechanic') return <Navigate to="/mechanic/jobs" replace />;
    if (user.role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  const handleOnboard = async () => {
    if (!selectedRole) return toast.error('Please select a role first');
    try {
      await onboard(selectedRole);
      toast.success('Successfully registered!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set up account');
    }
  };

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Welcome to Garmanage!</CardTitle>
            <CardDescription>To get started, tell us how you'll be using the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setSelectedRole('customer')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'customer' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-300'}`}
              >
                <Car className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold">Customer</h3>
                <p className="text-xs text-gray-500">I want to book vehicle service</p>
              </div>
              <div 
                onClick={() => setSelectedRole('owner')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'owner' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-300'}`}
              >
                <Store className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold">Garage Owner</h3>
                <p className="text-xs text-gray-500">I want to start and manage my garage</p>
              </div>
              <div 
                onClick={() => setSelectedRole('manager')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'manager' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-300'}`}
              >
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold">Manager</h3>
                <p className="text-xs text-gray-500">I have an invite to manage a garage</p>
              </div>
              <div 
                onClick={() => setSelectedRole('mechanic')}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'mechanic' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-300'}`}
              >
                <Wrench className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold">Mechanic</h3>
                <p className="text-xs text-gray-500">I have an invite to work at a garage</p>
              </div>
            </div>
            
            <Button onClick={handleOnboard} className="w-full mt-6" disabled={isLoading || !selectedRole}>
              {isLoading ? 'Setting up...' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Garmanage</CardTitle>
          <CardDescription>Sign in to your account or get started</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleLogin} className="w-full h-12 text-md flex items-center gap-3 bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 shadow-sm" disabled={isLoading}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
