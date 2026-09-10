import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, Workspace } from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { 
  Building2, Users, Wrench, Car, Check, ArrowRight, 
  ShieldCheck, PlusCircle, RefreshCw, User, Mail, Phone, KeyRound,
  Sparkles, CheckCircle2, ChevronRight, Store, Send, X, ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../api/services/apiClient';
import { getDashboardRoute } from '../../permissions';

const ROLE_ICONS: Record<string, any> = {
  owner: Building2,
  manager: Users,
  mechanic: Wrench,
  customer: Car,
};

const ROLE_EMOJIS: Record<string, string> = {
  owner: '👑',
  manager: '👔',
  mechanic: '🔧',
  customer: '🚗',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  mechanic: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  customer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export const Settings = () => {
  const navigate = useNavigate();
  const { user, switchWorkspace, syncProfile } = useAuthStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Join Garage modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState<'manager' | 'mechanic'>('mechanic');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Ensure customer workspace is always represented in the list
  const baseWorkspaces: Workspace[] = user.availableWorkspaces ? [...user.availableWorkspaces] : [];
  const hasCustomer = baseWorkspaces.some(w => w.role === 'customer');
  if (!hasCustomer) {
    baseWorkspaces.unshift({
      id: 'customer_personal',
      type: 'customer',
      role: 'customer',
      name: 'Personal Customer Account',
      description: 'Manage personal vehicles & book service appointments at any garage'
    });
  }

  const handleSwitch = async (workspace: Workspace) => {
    const isCurrent = (user.role === workspace.role) && 
      (workspace.type === 'customer' || workspace.garage_id === (user.garage_id || user.memberships?.find(m => m.role_name === user.role)?.garage_id));

    if (isCurrent) {
      navigate(getDashboardRoute(workspace.role));
      return;
    }

    setSwitchingId(workspace.id);
    try {
      await switchWorkspace(workspace);
      toast.success(`Active workspace changed to ${workspace.name} (${workspace.role.toUpperCase()})`);
      navigate(getDashboardRoute(workspace.role));
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to switch workspace');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncProfile();
      toast.success('Workspaces & profile synchronized with database');
    } catch (e) {
      toast.error('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Please enter a valid join code');
      return;
    }
    setJoinSubmitting(true);
    try {
      await apiClient.post('/api/onboarding/join-request', {
        joinCode: joinCode.trim().toUpperCase(),
        requestedRole: joinRole,
        message: joinMessage.trim() || undefined
      });
      toast.success('Join request submitted! Garage owner will review your request.');
      setShowJoinModal(false);
      setJoinCode('');
      setJoinMessage('');
      await syncProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit join request');
    } finally {
      setJoinSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            Unified Account & Multi-Role System
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Account & Workspace Switcher
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Use one single Google Account to operate as an Owner, Manager, Mechanic, or personal Customer.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="flex items-center gap-2 self-start shrink-0 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sync Workspaces</span>
        </Button>
      </div>

      {/* Account Info Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-blue-500/5 to-emerald-500/10 border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center text-xl font-bold text-primary font-mono shrink-0">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">{user.name || 'User Account'}</h2>
                <Badge variant="outline" className={`capitalize font-mono text-[11px] ${ROLE_BADGE_STYLES[user.role]}`}>
                  Active: {user.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-mono text-muted-foreground uppercase block font-semibold">Available Portals</span>
              <span className="text-xs font-bold text-foreground font-mono">{baseWorkspaces.length} Workspaces Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authorized Workspaces Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Your Authorized Workspaces
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any workspace below to instantly transform your dashboard and interface.
            </p>
          </div>
          <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Database RBAC Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {baseWorkspaces.map((ws) => {
            const emoji = ROLE_EMOJIS[ws.role] || '🏠';
            const badgeStyle = ROLE_BADGE_STYLES[ws.role] || ROLE_BADGE_STYLES.customer;
            
            const isCurrent = (user.role === ws.role) && 
              (ws.type === 'customer' || ws.garage_id === (user.garage_id || user.memberships?.find(m => m.role_name === user.role)?.garage_id));

            return (
              <div
                key={ws.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isCurrent 
                    ? 'bg-card border-primary shadow-md ring-2 ring-primary/20' 
                    : 'bg-card border-border hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        <span>{emoji}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-foreground text-sm">
                            {ws.name}
                          </h4>
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle} uppercase font-mono mt-1`}>
                          {ws.role} Workspace
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    {ws.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground uppercase">
                    {ws.type === 'customer' ? 'Customer Portal' : 'Garage Console'}
                  </span>

                  <Button
                    size="sm"
                    variant={isCurrent ? "outline" : "default"}
                    onClick={() => handleSwitch(ws)}
                    disabled={switchingId === ws.id}
                    className={`text-xs h-8 px-3.5 font-semibold gap-1.5 ${isCurrent ? 'text-primary hover:text-primary' : ''}`}
                  >
                    {switchingId === ws.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Switching...</span>
                      </>
                    ) : isCurrent ? (
                      <>
                        <span>Go to Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Switch to {ws.role.toUpperCase()}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand Account Roles & Affiliations */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" />
            Expand Your Account Roles & Garages
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Join other automotive workshops with a join code, or register an additional garage branch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Join Another Garage
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Have a team join code from another workshop? Request Manager or Mechanic access.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJoinModal(true)}
                className="text-xs self-start gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enter Join Code</span>
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  Register Another Garage
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Expand your business and register a new garage location under your Owner portfolio.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/onboarding')}
                className="text-xs self-start gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Register Garage</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account & Technical Identity Details */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Authentication & Security Credentials
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Persistent profile verified by Firebase Auth and stored securely in MySQL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">User Name</span>
              <p className="text-xs font-semibold text-foreground truncate">{user.name || 'Not provided'}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Email Address</span>
              <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-0.5 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Firebase UID</span>
              <p className="text-xs font-mono text-muted-foreground truncate select-all">{user.firebase_uid || 'dev-session'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Join a Workshop</h3>
              </div>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  6-Digit Garage Join Code
                </label>
                <Input
                  placeholder="e.g. IG-ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={9}
                  className="font-mono text-center tracking-widest text-base font-bold uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Requested Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJoinRole('mechanic')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      joinRole === 'mechanic'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>🔧 Mechanic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinRole('manager')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      joinRole === 'manager'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>👔 Manager</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1.5">
                  Optional Note to Owner
                </label>
                <Input
                  placeholder="e.g. Experienced brake and transmission specialist"
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJoinModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={joinSubmitting}
                  className="text-xs gap-1.5"
                >
                  {joinSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Settings;
