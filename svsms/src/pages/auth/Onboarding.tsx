import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/services/apiClient';
import toast from 'react-hot-toast';

type Step = 'role' | 'form' | 'done';
type Intent = 'create_garage' | 'join_garage' | 'customer' | 'mechanic';

interface Garage { id: string; name: string; city: string | null; }

const INTENT_CONFIG = {
  create_garage: {
    icon: '🏗️',
    title: 'Create a Garage',
    desc: 'Set up your garage workspace. You\'ll be the Owner with full admin access.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10 border-violet-500/30',
    label: 'text-violet-400',
  },
  join_garage: {
    icon: '🔗',
    title: 'Join a Garage',
    desc: 'Enter a join code to request access as a Manager or Mechanic.',
    color: 'from-cyan-500 to-blue-600',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    label: 'text-cyan-400',
  },
  customer: {
    icon: '🚗',
    title: 'Book Services',
    desc: 'Register as a customer to book vehicle service appointments.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    label: 'text-emerald-400',
  },
  mechanic: {
    icon: '🔧',
    title: 'I\'m a Mechanic',
    desc: 'Join an existing garage using a join code as a Mechanic.',
    color: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-500/10 border-orange-500/30',
    label: 'text-orange-400',
  },
};

export const Onboarding = () => {
  const navigate = useNavigate();
  const { token, syncProfile, needsOnboarding, isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState<Step>('role');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);

  // Garage creation form
  const [garageName, setGarageName] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [garageCity, setGarageCity] = useState('');
  const [garageState, setGarageState] = useState('');
  const [garagePhone, setGaragePhone] = useState('');
  const [garageType, setGarageType] = useState('general');

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState<'manager' | 'mechanic'>('mechanic');
  const [joinMessage, setJoinMessage] = useState('');

  // Done state
  const [doneGarageName, setDoneGarageName] = useState('');
  const [doneJoinCode, setDoneJoinCode] = useState('');

  useEffect(() => {
    if (isAuthenticated && user && !needsOnboarding) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, needsOnboarding, navigate]);

  const handleCreateGarage = async () => {
    if (!garageName.trim() || !garageAddress.trim()) {
      toast.error('Garage name and address are required');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/api/onboarding/garage/create', {
        garageName: garageName.trim(),
        garageAddress: garageAddress.trim(),
        garageCity: garageCity.trim() || undefined,
        garageState: garageState.trim() || undefined,
        garagePhone: garagePhone.trim() || undefined,
        garageType,
      });
      setDoneGarageName(res.garage.name);
      setDoneJoinCode(res.garage.join_code);
      await syncProfile();
      setStep('done');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create garage');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGarage = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a join code');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/api/onboarding/join/request', {
        joinCode: joinCode.trim().toUpperCase(),
        requestedRole: intent === 'mechanic' ? 'mechanic' : joinRole,
        message: joinMessage.trim() || undefined,
      });
      setStep('done');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit join request');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomer = async () => {
    setLoading(true);
    try {
      await apiClient.post('/api/onboarding/customer/create', {});
      await syncProfile();
      navigate('/customer', { replace: true });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = async () => {
    await syncProfile();
    navigate('/', { replace: true });
  };

  const steps = ['Choose Role', 'Setup', 'Done'];
  const stepIndex = step === 'role' ? 0 : step === 'form' ? 1 : 2;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-violet-500/30">G</div>
            <span className="text-2xl font-bold text-white">Garmanage</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome! 👋</h1>
          <p className="text-slate-400">Let's set up your account in a few quick steps.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 px-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${i < stepIndex ? 'bg-violet-500 text-white' : i === stepIndex ? 'bg-violet-500 text-white ring-4 ring-violet-500/30' : 'bg-slate-800 text-slate-500'}`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === stepIndex ? 'text-violet-400' : 'text-slate-500'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < stepIndex ? 'bg-violet-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Role Selection */}
        {step === 'role' && (
          <div className="space-y-3">
            {(Object.entries(INTENT_CONFIG) as [Intent, typeof INTENT_CONFIG.create_garage][]).map(([key, cfg]) => (
              <button
                key={key}
                id={`intent-${key}`}
                onClick={() => {
                  setIntent(key);
                  if (key === 'customer') {
                    handleCustomer();
                  } else {
                    setStep('form');
                  }
                }}
                disabled={loading}
                className={`w-full p-4 rounded-2xl border ${cfg.bg} flex items-center gap-4 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] group`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                  {cfg.icon}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold text-white group-hover:${cfg.label} transition-colors`}>{cfg.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{cfg.desc}</div>
                </div>
                <span className="text-slate-600 group-hover:text-slate-400 transition-colors">→</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 'form' && intent && (
          <div className="bg-slate-900/70 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${INTENT_CONFIG[intent].color} flex items-center justify-center text-xl`}>
                {INTENT_CONFIG[intent].icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{INTENT_CONFIG[intent].title}</h2>
                <button onClick={() => setStep('role')} className="text-xs text-slate-500 hover:text-slate-300">← Change</button>
              </div>
            </div>

            {intent === 'create_garage' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Garage Name *</label>
                  <input id="garage-name-input" value={garageName} onChange={e => setGarageName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="e.g. Singh Motors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Address *</label>
                  <input id="garage-address-input" value={garageAddress} onChange={e => setGarageAddress(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="123 Main Street" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                    <input value={garageCity} onChange={e => setGarageCity(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="Mumbai" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">State</label>
                    <input value={garageState} onChange={e => setGarageState(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="Maharashtra" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                    <input value={garagePhone} onChange={e => setGaragePhone(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="+91..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                    <select value={garageType} onChange={e => setGarageType(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors">
                      <option value="general">General</option>
                      <option value="two_wheeler">Two-Wheeler</option>
                      <option value="heavy_vehicle">Heavy Vehicle</option>
                      <option value="luxury">Luxury / EV</option>
                    </select>
                  </div>
                </div>
                <button id="create-garage-btn" onClick={handleCreateGarage} disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:from-violet-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-violet-500/30">
                  {loading ? 'Creating...' : '🏗️ Create Garage'}
                </button>
              </>
            )}

            {(intent === 'join_garage' || intent === 'mechanic') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Join Code *</label>
                  <input id="join-code-input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono text-lg tracking-widest text-center"
                    placeholder="IG-XXXXXX" maxLength={9} />
                  <p className="text-xs text-slate-500 mt-1 text-center">Get this code from the garage owner</p>
                </div>
                {intent === 'join_garage' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Joining as</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['manager', 'mechanic'] as const).map(r => (
                        <button key={r} onClick={() => setJoinRole(r)} id={`role-${r}-btn`}
                          className={`py-2.5 rounded-xl border font-medium text-sm capitalize transition-all ${joinRole === r ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                          {r === 'manager' ? '👔 Manager' : '🔧 Mechanic'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Message (optional)</label>
                  <textarea value={joinMessage} onChange={e => setJoinMessage(e.target.value)} rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                    placeholder="Brief introduction..." />
                </div>
                <button id="submit-join-btn" onClick={handleJoinGarage} disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-cyan-500/30">
                  {loading ? 'Sending...' : '🔗 Send Join Request'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 'done' && (
          <div className="bg-slate-900/70 backdrop-blur border border-slate-700/50 rounded-2xl p-8 text-center space-y-4">
            {intent === 'create_garage' ? (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">🎉</div>
                <h2 className="text-2xl font-bold text-white">Garage Created!</h2>
                <p className="text-slate-400">Welcome to <span className="text-emerald-400 font-semibold">{doneGarageName}</span>. You're now the Owner.</p>
                {doneJoinCode && (
                  <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-2">Your Garage Join Code — share with your team:</p>
                    <div className="text-2xl font-mono font-bold text-emerald-400 tracking-widest">{doneJoinCode}</div>
                  </div>
                )}
                <button id="go-to-dashboard-btn" onClick={handleGoToDashboard}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/30">
                  Go to Owner Dashboard →
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl shadow-amber-500/30">⏳</div>
                <h2 className="text-2xl font-bold text-white">Request Sent!</h2>
                <p className="text-slate-400">Your join request has been sent to the garage owner. You'll get access once they approve it.</p>
                <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
                  💡 Come back later to check your approval status
                </div>
                <button id="view-pending-btn" onClick={() => navigate('/pending-approval', { replace: true })}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:opacity-90 transition-all duration-200 shadow-lg shadow-amber-500/30">
                  View Request Status
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
