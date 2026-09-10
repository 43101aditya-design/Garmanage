import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Wrench, Car, Store, Users, Cpu, ShieldCheck, Activity, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

import { getDashboardRoute } from '../../permissions';

export const Login = () => {
  const navigate = useNavigate();
  const { googleLogin, handleRedirectResult, devLogin, isLoading, isAuthenticated, needsOnboarding, onboardingState, pendingRequests, user } = useAuthStore();
  const [redirectLoading, setRedirectLoading] = useState(false);

  // On mount: check if we just came back from Google redirect
  useEffect(() => {
    (async () => {
      try {
        setRedirectLoading(true);
        await handleRedirectResult();
      } catch (err: any) {
        toast.error(err.message || 'Google sign-in failed after redirect.');
      } finally {
        setRedirectLoading(false);
      }
    })();
  }, []);

  // Handle all post-auth redirect states
  if (isAuthenticated) {
    if (needsOnboarding) {
      if (onboardingState === 'PENDING_APPROVAL' || (pendingRequests && pendingRequests.length > 0)) {
        return <Navigate to="/pending-approval" replace />;
      }
      return <Navigate to="/onboarding" replace />;
    }

    if (user) {
      // Multi-garage: let user pick workspace
      if (user.memberships && user.memberships.length > 1) {
        return <Navigate to="/select-role" replace />;
      }
      const targetRoute = getDashboardRoute(user.role);
      return <Navigate to={targetRoute} replace />;
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  const handleDevLogin = (role: 'owner' | 'manager' | 'mechanic' | 'customer') => {
    devLogin(role);
    toast.success(`Logged in as ${role} (demo mode)`);
  };

  const BrandingSection = () => (
    <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-500 text-white p-12 lg:px-20 relative overflow-hidden">
      {/* Decorative Yellow & White Glows */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
        <div className="w-96 h-96 bg-yellow-400 opacity-20 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
        <div className="w-80 h-80 bg-white opacity-20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 space-y-8">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 flex items-center justify-center shadow-lg">
            <Wrench className="w-8 h-8 text-yellow-300" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">Garmanage</h1>
        </div>

        <h2 className="text-4xl font-bold leading-tight text-white drop-shadow-sm">
          The Intelligent Workshop Platform
        </h2>
        
        <p className="text-lg text-emerald-50 max-w-md leading-relaxed font-medium drop-shadow-sm">
          Streamline your auto repair business, manage mechanics with AI, and provide a seamless customer experience all in one place.
        </p>

        <div className="space-y-6 pt-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Cpu className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">AI-Powered Assignment</h3>
              <p className="text-sm text-emerald-50/90 font-medium">Automatically match mechanics to jobs based on skill and availability.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Real-time Analytics</h3>
              <p className="text-sm text-emerald-50/90 font-medium">Track workshop revenue, vehicle history, and team performance.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Secure & Reliable</h3>
              <p className="text-sm text-emerald-50/90 font-medium">End-to-end encrypted management for owners, managers, and customers.</p>
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
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
              <Wrench className="w-8 h-8 text-yellow-300" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Garmanage</h2>
            <p className="mt-2 text-gray-600 font-medium">The Intelligent Workshop Platform</p>
          </div>
          
          <Card className="w-full shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="space-y-2 text-center pb-6 pt-8">
              <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">Welcome Back</CardTitle>
              <CardDescription className="text-base font-medium text-gray-600">Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent className="pb-8 px-8">
              <Button 
                onClick={handleGoogleLogin} 
                className="w-full h-14 text-base font-bold flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 hover:text-blue-700 shadow-md transition-all rounded-xl" 
                disabled={isLoading || redirectLoading}
              >
                {redirectLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Checking Google sign-in…
                  </>
                ) : isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Redirecting to Google…
                  </>
                ) : (
                  <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google logo" />
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="mt-8 text-center text-sm font-medium text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </div>
            </CardContent>
          </Card>

          {/* Demo Login Panel (Visible only in Development / Test environments) */}
          {!import.meta.env.PROD && (
            <Card className="w-full shadow-lg border border-amber-200 bg-amber-50/80">
              <CardHeader className="pb-2 pt-4 px-6">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-sm font-bold text-amber-800">Demo / Dev Mode (Local Only)</CardTitle>
                </div>
                <CardDescription className="text-xs text-amber-700">Instant login without Google. For development and testing only.</CardDescription>
              </CardHeader>
              <CardContent className="pb-5 px-6">
                <div className="grid grid-cols-2 gap-2">
                  {(['owner', 'manager', 'mechanic', 'customer'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleDevLogin(role)}
                      className="py-2 px-3 text-xs font-semibold rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 transition-colors capitalize flex items-center gap-1.5 justify-center"
                    >
                      {role === 'owner' && <Store className="w-3 h-3" />}
                      {role === 'manager' && <Users className="w-3 h-3" />}
                      {role === 'mechanic' && <Wrench className="w-3 h-3" />}
                      {role === 'customer' && <Car className="w-3 h-3" />}
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
