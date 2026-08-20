import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Wrench, Car, Store, Users, Cpu, ShieldCheck, Activity } from 'lucide-react';
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

  const BrandingSection = () => (
    <div className="hidden lg:flex flex-col justify-center bg-blue-600 text-white p-12 lg:px-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
        <div className="w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
        <div className="w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Garmanage</h1>
        </div>

        <h2 className="text-4xl font-bold leading-tight">
          The Intelligent Workshop Platform
        </h2>
        
        <p className="text-lg text-blue-100 max-w-md leading-relaxed">
          Streamline your auto repair business, manage mechanics with AI, and provide a seamless customer experience all in one place.
        </p>

        <div className="space-y-6 pt-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/50 rounded-lg flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-blue-100" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI-Powered Assignment</h3>
              <p className="text-sm text-blue-200">Automatically match mechanics to jobs based on skill and availability.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/50 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-blue-100" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Real-time Analytics</h3>
              <p className="text-sm text-blue-200">Track workshop revenue, vehicle history, and team performance.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/50 rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-blue-100" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Secure & Reliable</h3>
              <p className="text-sm text-blue-200">End-to-end encrypted management for owners, managers, and customers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
      <BrandingSection />
      
      <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {needsOnboarding ? (
          <Card className="w-full max-w-lg shadow-xl border-gray-200">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Welcome to Garmanage!</CardTitle>
              <CardDescription className="text-md mt-2">To get started, tell us how you'll be using the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setSelectedRole('customer')}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center text-center ${selectedRole === 'customer' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 scale-[1.02]' : 'hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className={`p-3 rounded-full mb-3 ${selectedRole === 'customer' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    <Car className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Customer</h3>
                  <p className="text-xs text-gray-500 mt-1">Book & track vehicle service</p>
                </div>
                <div 
                  onClick={() => setSelectedRole('owner')}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center text-center ${selectedRole === 'owner' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 scale-[1.02]' : 'hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className={`p-3 rounded-full mb-3 ${selectedRole === 'owner' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    <Store className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Garage Owner</h3>
                  <p className="text-xs text-gray-500 mt-1">Start & manage your garage</p>
                </div>
                <div 
                  onClick={() => setSelectedRole('manager')}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center text-center ${selectedRole === 'manager' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 scale-[1.02]' : 'hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className={`p-3 rounded-full mb-3 ${selectedRole === 'manager' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Manager</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage workshop operations</p>
                </div>
                <div 
                  onClick={() => setSelectedRole('mechanic')}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center text-center ${selectedRole === 'mechanic' ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 scale-[1.02]' : 'hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className={`p-3 rounded-full mb-3 ${selectedRole === 'mechanic' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold">Mechanic</h3>
                  <p className="text-xs text-gray-500 mt-1">View jobs & perform service</p>
                </div>
              </div>
              
              <Button onClick={handleOnboard} className="w-full mt-6 h-12 text-lg" disabled={isLoading || !selectedRole}>
                {isLoading ? 'Setting up...' : 'Continue'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:hidden mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-900">Garmanage</h2>
              <p className="mt-2 text-gray-600">The Intelligent Workshop Platform</p>
            </div>
            
            <Card className="w-full shadow-xl border-gray-200">
              <CardHeader className="space-y-2 text-center pb-6 pt-8">
                <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
                <CardDescription className="text-base">Sign in to your account to continue</CardDescription>
              </CardHeader>
              <CardContent className="pb-8 px-8">
                <Button 
                  onClick={handleGoogleLogin} 
                  className="w-full h-14 text-base font-medium flex items-center justify-center gap-3 bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 shadow-sm transition-all" 
                  disabled={isLoading}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google logo" />
                  {isLoading ? 'Connecting...' : 'Continue with Google'}
                </Button>
                
                <div className="mt-8 text-center text-sm text-gray-500">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
