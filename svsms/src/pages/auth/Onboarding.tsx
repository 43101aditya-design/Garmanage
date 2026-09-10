import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/services/apiClient';
import toast from 'react-hot-toast';
import { 
  Building2, 
  Users, 
  Car, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Clock, 
  Copy, 
  ShieldCheck, 
  Sparkles,
  Wrench,
  UserCheck
} from 'lucide-react';

type Step = 'role' | 'form' | 'done';
type Intent = 'create_garage' | 'join_garage' | 'customer';

interface IntentConfig {
  icon: typeof Building2;
  emoji: string;
  badge: string;
  title: string;
  desc: string;
  badgeColor: string;
}

const INTENT_CONFIG: Record<Intent, IntentConfig> = {
  create_garage: {
    icon: Building2,
    emoji: '🏗️',
    badge: 'Owner Role',
    title: 'Create a Garage',
    desc: 'Create a new garage workspace and become its Owner with full administrative control.',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  join_garage: {
    icon: Users,
    emoji: '🔗',
    badge: 'Staff Role',
    title: 'Join a Garage',
    desc: 'Join an existing garage workspace as a Manager or Mechanic using an invite join code.',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  customer: {
    icon: Car,
    emoji: '🚗',
    badge: 'Customer Role',
    title: 'Continue as Customer',
    desc: 'Create your customer profile, manage your vehicles, save garages and book vehicle services.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const Onboarding = () => {
  const navigate = useNavigate();
  const { token, syncProfile, needsOnboarding, isAuthenticated, user, isLoading } = useAuthStore();
  const [step, setStep] = useState<Step>('role');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Garage creation form state
  const [garageName, setGarageName] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [garageCity, setGarageCity] = useState('');
  const [garageState, setGarageState] = useState('');
  const [garagePhone, setGaragePhone] = useState('');
  const [garageType, setGarageType] = useState('general');
  const [garageDescription, setGarageDescription] = useState('');

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState<'manager' | 'mechanic'>('mechanic');
  const [joinMessage, setJoinMessage] = useState('');

  // Customer form state
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerAddress, setCustomerAddress] = useState('');

  // Done state
  const [doneGarageName, setDoneGarageName] = useState('');
  const [doneJoinCode, setDoneJoinCode] = useState('');

  useEffect(() => {
    // If not authenticated, redirect to /login immediately
    if (!token && !isAuthenticated && !isLoading) {
      navigate('/login', { replace: true });
      return;
    }
    // If authenticated and onboarding already completed, redirect to active dashboard
    if (isAuthenticated && user && !needsOnboarding) {
      navigate('/', { replace: true });
    }
  }, [token, isAuthenticated, user, needsOnboarding, isLoading, navigate]);

  if (!token && !isAuthenticated && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  const handleCreateGarage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        garageDescription: garageDescription.trim() || undefined,
      });
      setDoneGarageName(res.garage?.name || garageName);
      setDoneJoinCode(res.garage?.join_code || '');
      await syncProfile();
      toast.success('Garage created successfully!');
      setStep('done');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create garage');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGarage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a valid garage join code');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/api/onboarding/join/request', {
        joinCode: joinCode.trim().toUpperCase(),
        requestedRole: joinRole,
        message: joinMessage.trim() || undefined,
      });
      await syncProfile();
      toast.success('Join request submitted for review!');
      setStep('done');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to submit join request');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSetup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!customerAddress.trim()) {
      toast.error('Address is required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/onboarding/customer/create', {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
      });
      await syncProfile();
      toast.success('Customer profile created!');
      navigate('/customer', { replace: true });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create customer profile');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = async () => {
    await syncProfile();
    navigate('/', { replace: true });
  };

  const handleCopyCode = () => {
    if (doneJoinCode) {
      navigator.clipboard.writeText(doneJoinCode);
      setCopiedCode(true);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const steps = ['Choose Role', 'Setup', 'Done'];
  const stepIndex = step === 'role' ? 0 : step === 'form' ? 1 : 2;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-primary-500/20">
              IG
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">IntelliGarage</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Welcome! 👋</h1>
          <p className="text-sm sm:text-base text-slate-600">Let's set up your account in a few quick steps.</p>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center gap-2 mb-8 px-2 sm:px-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div 
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                  i < stepIndex 
                    ? 'bg-primary-600 text-white' 
                    : i === stepIndex 
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${i === stepIndex ? 'text-primary-700' : 'text-slate-500'}`}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full ${i < stepIndex ? 'bg-primary-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: ROLE SELECTION */}
        {step === 'role' && (
          <div className="space-y-4">
            {(Object.entries(INTENT_CONFIG) as [Intent, IntentConfig][]).map(([key, cfg]) => {
              const IconComp = cfg.icon;
              return (
                <button
                  key={key}
                  id={`intent-${key}`}
                  onClick={() => {
                    setIntent(key);
                    setStep('form');
                  }}
                  disabled={loading}
                  className="w-full p-4 sm:p-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-primary-500 hover:shadow-sm flex items-center gap-4 text-left transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl group-hover:bg-primary-50 group-hover:border-primary-200 transition-colors flex-shrink-0">
                    <span>{cfg.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors text-base">
                        {cfg.title}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                        {cfg.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {cfg.desc}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2: SETUP FORM */}
        {step === 'form' && intent && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center text-xl">
                  {INTENT_CONFIG[intent].emoji}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{INTENT_CONFIG[intent].title}</h2>
                  <p className="text-xs text-slate-500">{INTENT_CONFIG[intent].badge}</p>
                </div>
              </div>
              <button 
                onClick={() => setStep('role')} 
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change
              </button>
            </div>

            {/* FORM A: CREATE GARAGE */}
            {intent === 'create_garage' && (
              <form onSubmit={handleCreateGarage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Garage Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="garage-name-input" 
                    value={garageName} 
                    onChange={e => setGarageName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                    placeholder="e.g. Apex Auto Care & Performance" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="garage-address-input" 
                    value={garageAddress} 
                    onChange={e => setGarageAddress(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                    placeholder="e.g. 104 Industrial Estate, Andheri East" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      City
                    </label>
                    <input 
                      value={garageCity} 
                      onChange={e => setGarageCity(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                      placeholder="Mumbai" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      State
                    </label>
                    <input 
                      value={garageState} 
                      onChange={e => setGarageState(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                      placeholder="Maharashtra" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone Number
                    </label>
                    <input 
                      value={garagePhone} 
                      onChange={e => setGaragePhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                      placeholder="+91 98765 43210" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Garage Type
                    </label>
                    <select 
                      value={garageType} 
                      onChange={e => setGarageType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                    >
                      <option value="general">Multi-Brand General</option>
                      <option value="two_wheeler">Two-Wheeler Specialist</option>
                      <option value="heavy_vehicle">Commercial / Heavy Vehicle</option>
                      <option value="luxury">Luxury / EV Performance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea 
                    value={garageDescription} 
                    onChange={e => setGarageDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm resize-none"
                    placeholder="Specialties, services offered, equipment..." 
                  />
                </div>

                <button 
                  id="create-garage-btn" 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base mt-2"
                >
                  {loading ? 'Creating Garage...' : '🏗️ Create Garage Workspace'}
                </button>
              </form>
            )}

            {/* FORM B: JOIN GARAGE */}
            {intent === 'join_garage' && (
              <form onSubmit={handleJoinGarage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Your Role <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="role-manager-btn"
                      onClick={() => setJoinRole('manager')}
                      className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        joinRole === 'manager'
                          ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>👔</span> Manager
                    </button>
                    <button
                      type="button"
                      id="role-mechanic-btn"
                      onClick={() => setJoinRole('mechanic')}
                      className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        joinRole === 'mechanic'
                          ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>🔧</span> Mechanic
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Garage Join Code <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="join-code-input" 
                    value={joinCode} 
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    required
                    maxLength={9}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all font-mono text-center text-lg tracking-widest uppercase font-bold"
                    placeholder="IG-XXXXXX" 
                  />
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    Ask the garage owner for their 6-character join code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Message / Note (Optional)
                  </label>
                  <textarea 
                    value={joinMessage} 
                    onChange={e => setJoinMessage(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm resize-none"
                    placeholder="Brief introduction or experience note for the owner..." 
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Approval Required:</strong> For garage security, your request will be reviewed by the garage owner before dashboard access is activated.
                  </span>
                </div>

                <button 
                  id="submit-join-btn" 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base mt-2"
                >
                  {loading ? 'Submitting Request...' : '🔗 Submit Join Request'}
                </button>
              </form>
            )}

            {/* FORM C: CUSTOMER SETUP */}
            {intent === 'customer' && (
              <form onSubmit={handleCustomerSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="customer-name-input" 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                    placeholder="e.g. Aditya Singh" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="customer-phone-input" 
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)}
                    required
                    type="tel"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                    placeholder="+91 98765 43210" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Street Address / City <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="customer-address-input" 
                    value={customerAddress} 
                    onChange={e => setCustomerAddress(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition-all text-sm"
                    placeholder="e.g. 402 Palm Heights, Powai, Mumbai" 
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-start gap-2.5">
                  <Car className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Your customer profile allows you to manage registered vehicles, explore verified garages, save favorites, and schedule service appointments seamlessly.
                  </span>
                </div>

                <button 
                  id="submit-customer-btn" 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base mt-2"
                >
                  {loading ? 'Setting up Profile...' : '🚗 Complete Customer Setup'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* STEP 3: DONE / CONFIRMATION */}
        {step === 'done' && (
          <div className="text-center space-y-6 py-4">
            {intent === 'create_garage' ? (
              <>
                <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center text-3xl mx-auto text-emerald-600">
                  🎉
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Garage Workspace Created!</h2>
                  <p className="text-sm text-slate-600">
                    Welcome to <strong className="text-slate-900">{doneGarageName}</strong>. You are now configured as the Owner.
                  </p>
                </div>

                {doneJoinCode && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Your Garage Join Code
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-mono font-bold text-primary-700 tracking-wider">
                        {doneJoinCode}
                      </span>
                      <button 
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                        title="Copy Join Code"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Share this code with your managers and mechanics to let them join.
                    </p>
                  </div>
                )}

                <button 
                  id="go-to-dashboard-btn" 
                  onClick={handleGoToDashboard}
                  className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  Go to Owner Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-sky-100 border border-sky-200 rounded-full flex items-center justify-center text-3xl mx-auto text-sky-600">
                  ⏳
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Join Request Submitted!</h2>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Your request to join as a <strong className="text-slate-900 capitalize">{joinRole}</strong> has been submitted.
                  </p>
                </div>

                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 text-left space-y-1.5 max-w-md mx-auto">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" /> What happens next:
                  </div>
                  <p className="text-sky-800">
                    The garage owner will receive your request and can approve or decline it from their Access Management dashboard. Once approved, your workspace dashboard will be unlocked automatically.
                  </p>
                </div>

                <button 
                  id="view-pending-btn" 
                  onClick={() => navigate('/pending-approval', { replace: true })}
                  className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  View Request Status <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
