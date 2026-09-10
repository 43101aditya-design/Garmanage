import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, Workspace } from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Building2, Users, Wrench, Car, Check, ArrowRight, 
  ShieldCheck, PlusCircle, RefreshCw, User, Mail, Phone, KeyRound 
} from 'lucide-react';
import { toast } from 'sonner';
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

const ROLE_COLORS: Record<string, { badge: string; border: string }> = {
  owner: { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-300' },
  manager: { badge: 'bg-sky-50 text-sky-700 border-sky-200', border: 'border-sky-300' },
  mechanic: { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-300' },
  customer: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-300' },
};

export const Settings = () => {
  const navigate = useNavigate();
  const { user, switchWorkspace, syncProfile } = useAuthStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const availableWorkspaces: Workspace[] = user.availableWorkspaces || [
    {
      id: 'default',
      type: user.role === 'customer' ? 'customer' : 'garage',
      role: user.role,
      name: user.role === 'customer' ? 'Personal Customer Account' : 'Current Garage Workspace',
      description: `${user.role.toUpperCase()} Workspace`
    }
  ];

  const handleSwitch = async (workspace: Workspace) => {
    // If already active workspace, navigate to its dashboard
    const isCurrent = (user.role === workspace.role) && 
      (workspace.type === 'customer' || workspace.garage_id === user.memberships?.find(m => m.role_name === user.role)?.garage_id);

    if (isCurrent) {
      navigate(getDashboardRoute(workspace.role));
      return;
    }

    setSwitchingId(workspace.id);
    try {
      await switchWorkspace(workspace);
      toast.success(`Switched to ${workspace.name} (${workspace.role.toUpperCase()})`);
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
      toast.success('Profile and workspaces refreshed from database');
    } catch (e) {
      toast.error('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your authenticated identity, database profile, and switch between authorized workspaces.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Workspaces</span>
        </Button>
      </div>

      {/* Profile & Identity Card */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <span>Profile & Verified Identity</span>
          </CardTitle>
          <CardDescription>
            Account credentials stored in the IntelliGarage MySQL database linked with your Firebase UID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Full Name
              </span>
              <p className="text-sm font-semibold text-foreground">{user.name || 'Not provided'}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
              </span>
              <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone Number
              </span>
              <p className="text-sm font-semibold text-foreground">{user.phone || '—'}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-1 md:col-span-2 lg:col-span-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> Verified Firebase UID
              </span>
              <p className="text-xs font-mono text-muted-foreground select-all break-all">{user.firebase_uid || 'dev-authenticated'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles & Workspaces Section */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Authorized Roles & Workspaces</span>
              </CardTitle>
              <CardDescription>
                Switch between your personal customer account and active garage memberships.
              </CardDescription>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Database RBAC Enforced
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableWorkspaces.map((ws) => {
              const IconComp = ROLE_ICONS[ws.role] || Building2;
              const emoji = ROLE_EMOJIS[ws.role] || '🏠';
              const colorCfg = ROLE_COLORS[ws.role] || ROLE_COLORS.customer;
              
              // Check if currently active
              const isCurrent = (user.role === ws.role) && 
                (ws.type === 'customer' || ws.garage_id === user.memberships?.find(m => m.role_name === user.role)?.garage_id);

              return (
                <div
                  key={ws.id}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isCurrent 
                      ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20' 
                      : 'bg-card border-border hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center text-xl flex-shrink-0">
                      <span>{emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground text-sm truncate">
                          {ws.name}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorCfg.badge} uppercase`}>
                          {ws.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {ws.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    {isCurrent ? (
                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-primary" /> Active Workspace
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Authorized Access</span>
                    )}

                    <Button
                      size="sm"
                      variant={isCurrent ? "secondary" : "default"}
                      onClick={() => handleSwitch(ws)}
                      disabled={switchingId === ws.id}
                      className="text-xs h-8 px-3 flex items-center gap-1.5"
                    >
                      {switchingId === ws.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Switching...</span>
                        </>
                      ) : isCurrent ? (
                        <>
                          <span>Go to Dashboard</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>Switch Role</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground block">
                Need to join another garage workspace?
              </span>
              <p className="text-xs text-muted-foreground">
                Enter a join code as a manager or mechanic, or register a new garage workspace.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Join or Create Garage</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default Settings;
