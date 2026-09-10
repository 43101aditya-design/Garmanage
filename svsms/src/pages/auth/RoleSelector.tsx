import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Building2, Users, Wrench, Car, ArrowRight, PlusCircle } from 'lucide-react';

const ROLE_CONFIG: Record<string, { icon: any; emoji: string; badge: string; badgeColor: string; path: string }> = {
  owner: { icon: Building2, emoji: '👑', badge: 'Owner', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', path: '/owner' },
  manager: { icon: Users, emoji: '👔', badge: 'Manager', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200', path: '/manager' },
  mechanic: { icon: Wrench, emoji: '🔧', badge: 'Mechanic', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200', path: '/mechanic/jobs' },
  customer: { icon: Car, emoji: '🚗', badge: 'Customer', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', path: '/customer' },
};

export const RoleSelector = () => {
  const navigate = useNavigate();
  const { user, setSelectedGarage } = useAuthStore();

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const memberships = user.memberships || [];

  const handleSelect = (garageId: string, roleName: string) => {
    setSelectedGarage(garageId);
    const cfg = ROLE_CONFIG[roleName as keyof typeof ROLE_CONFIG];
    navigate(cfg?.path || '/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-primary-500/20">
              IG
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">IntelliGarage</span>
          </div>

          <div className="w-14 h-14 bg-primary-50 border border-primary-200 rounded-full flex items-center justify-center text-xl font-bold text-primary-700 mx-auto mb-3">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome back, {user.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-slate-600">
            You have access to multiple garage workspaces. Choose one to launch your workspace.
          </p>
        </div>

        {/* Memberships List */}
        <div className="space-y-3 mb-6">
          {memberships.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-slate-600 text-sm mb-3">No active garage memberships found.</p>
              <button 
                onClick={() => navigate('/onboarding')} 
                className="text-primary-600 hover:text-primary-700 text-sm font-semibold inline-flex items-center gap-1"
              >
                Join or Create a Garage <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            memberships.map((m) => {
              const cfg = ROLE_CONFIG[m.role_name as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.owner;
              return (
                <button
                  key={m.membership_id}
                  id={`select-garage-${m.garage_id}`}
                  onClick={() => handleSelect(m.garage_id, m.role_name)}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-primary-500 hover:shadow-sm flex items-center gap-4 text-left transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl group-hover:bg-primary-50 group-hover:border-primary-200 transition-colors flex-shrink-0">
                    <span>{cfg.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors text-sm sm:text-base">
                        Garage ID: {m.garage_id.slice(0, 8)}...
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                        {cfg.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      Active Role: <strong className="text-slate-700">{m.role_name}</strong>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="text-center">
          <button 
            onClick={() => navigate('/onboarding')} 
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Join another garage or create a new workspace
          </button>
        </div>

      </div>
    </div>
  );
};
