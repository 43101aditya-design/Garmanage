import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ROLE_CONFIG = {
  owner: { icon: '👑', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-500/10 border-violet-500/30', path: '/owner' },
  manager: { icon: '👔', color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-500/10 border-blue-500/30', path: '/manager' },
  mechanic: { icon: '🔧', color: 'from-orange-500 to-amber-600', bg: 'bg-orange-500/10 border-orange-500/30', path: '/mechanic/jobs' },
  customer: { icon: '🚗', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10 border-emerald-500/30', path: '/customer' },
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-cyan-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-violet-500/30">G</div>
            <span className="text-2xl font-bold text-white">Garmanage</span>
          </div>
          <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 border border-slate-600">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-xl font-bold text-white">Welcome back, {user.name?.split(' ')[0]}!</h1>
          <p className="text-slate-400 text-sm mt-1">You have access to multiple workspaces. Select one to continue.</p>
        </div>

        <div className="space-y-3">
          {memberships.length === 0 ? (
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6 text-center">
              <p className="text-slate-400 mb-4">No active garage memberships found.</p>
              <button onClick={() => navigate('/onboarding')} className="text-violet-400 hover:text-violet-300 text-sm font-medium">
                → Join or Create a Garage
              </button>
            </div>
          ) : (
            memberships.map((m) => {
              const cfg = ROLE_CONFIG[m.role_name as keyof typeof ROLE_CONFIG];
              return (
                <button
                  key={m.membership_id}
                  id={`select-garage-${m.garage_id}`}
                  onClick={() => handleSelect(m.garage_id, m.role_name)}
                  className={`w-full p-4 rounded-2xl border ${cfg?.bg || 'bg-slate-800 border-slate-700'} flex items-center gap-4 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-lg group`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg?.color || 'from-slate-600 to-slate-700'} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                    {cfg?.icon || '🏠'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">Garage ID: {m.garage_id.slice(0, 8)}...</div>
                    <div className="text-xs text-slate-400 capitalize mt-0.5">Role: {m.role_name}</div>
                  </div>
                  <span className="text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/onboarding')} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            + Join another garage
          </button>
        </div>
      </div>
    </div>
  );
};
