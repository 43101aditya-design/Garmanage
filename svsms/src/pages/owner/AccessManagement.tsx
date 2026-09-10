import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, UserPlus, Users, Key, Copy, Check, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface JoinReq {
  id: string;
  requester_name: string;
  requester_email: string;
  requested_role: string;
  message: string | null;
  created_at: string;
}

interface Member {
  membership_id: string;
  user_id: string;
  name: string;
  email: string;
  role_name: string;
  joined_at: string;
}

export const AccessManagement = () => {
  const { user, selectedGarageId } = useAuthStore();
  const garageId = selectedGarageId || user?.memberships?.[0]?.garage_id || user?.garage_id;

  const [pendingReqs, setPendingReqs] = useState<JoinReq[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<'requests' | 'members' | 'code'>('requests');
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    if (!garageId) return;
    setLoading(true);
    try {
      const [reqsRes, codeRes] = await Promise.all([
        apiClient.get(`/api/garages/${garageId}/join-requests`),
        apiClient.get(`/api/garages/${garageId}/join-code`),
      ]);
      setPendingReqs(reqsRes.requests || []);
      setJoinCode(codeRes.join_code);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!garageId) return;
    try {
      const res = await apiClient.get(`/api/garages/${garageId}/members`);
      setMembers(res.members || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMembers();
  }, [garageId]);

  const handleApprove = async (reqId: string) => {
    setActionLoading(reqId);
    try {
      await apiClient.post(`/api/garages/${garageId}/join-requests/${reqId}/approve`, {});
      toast.success('Request approved! User now has access to the garage.');
      fetchData();
      fetchMembers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reqId: string) => {
    setActionLoading(reqId + '-reject');
    try {
      await apiClient.post(`/api/garages/${garageId}/join-requests/${reqId}/reject`, {});
      toast.success('Request rejected.');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCode = async () => {
    setActionLoading('gen-code');
    try {
      const res = await apiClient.post(`/api/garages/${garageId}/generate-join-code`, {});
      setJoinCode(res.join_code);
      toast.success('New garage join code generated!');
    } catch (e: any) {
      toast.error('Failed to generate code');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const TABS = [
    { key: 'requests', label: 'Join Requests', icon: UserPlus, count: pendingReqs.length },
    { key: 'members', label: 'Active Members', icon: Users, count: members.length },
    { key: 'code', label: 'Garage Join Code', icon: Key, count: null },
  ] as const;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Garage RBAC & Team Access
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">Access Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review join requests, manage active workforce permissions, and distribute team join codes.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-muted/60 p-1.5 rounded-xl border border-border/80 gap-1 shadow-sm max-w-md">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              id={`access-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                isActive
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>{t.label}</span>
              {t.count !== null && t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-mono">Loading access data...</p>
        </div>
      ) : (
        <>
          {/* Pending Requests Tab */}
          {tab === 'requests' && (
            <div className="space-y-4">
              {pendingReqs.length === 0 ? (
                <Card className="border-dashed bg-card/60">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">No Pending Join Requests</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      New mechanics or managers who enter your garage join code will appear here for your approval.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingReqs.map((req) => (
                  <Card key={req.id} className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {req.requester_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-foreground text-sm">{req.requester_name}</h4>
                            <Badge variant="outline" className="capitalize text-[10px] font-mono">
                              {req.requested_role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{req.requester_email}</p>
                          {req.message && (
                            <p className="text-xs text-foreground/80 italic mt-1.5 bg-muted/50 px-2.5 py-1 rounded-md border border-border/40">
                              "{req.message}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          id={`reject-req-${req.id}`}
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(req.id)}
                          disabled={!!actionLoading}
                          className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          id={`approve-req-${req.id}`}
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={!!actionLoading}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Members Tab */}
          {tab === 'members' && (
            <div className="space-y-3">
              {members.length === 0 ? (
                <Card className="border-dashed bg-card/60">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/50 mb-3" />
                    <h3 className="text-base font-bold text-foreground">No Team Members Found</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share your garage join code to recruit managers and mechanics.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members.map((m) => (
                    <Card key={m.membership_id} className="border-border">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                            {m.name?.[0]?.toUpperCase() || 'M'}
                          </div>
                          <div className="truncate">
                            <h4 className="font-semibold text-foreground text-sm truncate">{m.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          </div>
                        </div>
                        <Badge variant={m.role_name === 'owner' ? 'default' : 'secondary'} className="capitalize text-[10px] shrink-0 font-mono">
                          {m.role_name}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Join Code Tab */}
          {tab === 'code' && (
            <Card className="max-w-2xl border-border shadow-sm">
              <CardHeader className="text-center pb-3">
                <CardTitle className="text-lg font-bold text-foreground">Garage Team Join Code</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Share this 6-character code with your team. Users can enter this code during setup to join your garage.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6 pt-2 pb-6">
                {joinCode ? (
                  <div className="w-full max-w-sm bg-muted/50 border-2 border-primary/30 rounded-2xl p-6 text-center shadow-inner">
                    <span className="text-xs font-mono uppercase text-muted-foreground tracking-widest font-bold block mb-1">
                      Active Code
                    </span>
                    <div className="text-4xl font-mono font-extrabold text-primary tracking-[0.25em] my-3">
                      {joinCode}
                    </div>
                    <Button
                      id="copy-join-code-btn"
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="mt-2 text-xs font-semibold gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied to Clipboard' : 'Copy Join Code'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No join code set yet</div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <Button
                    id="generate-join-code-btn"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    disabled={actionLoading === 'gen-code'}
                    className="text-xs gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'gen-code' ? 'animate-spin' : ''}`} />
                    {actionLoading === 'gen-code' ? 'Generating...' : 'Generate New Join Code'}
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Generating a new code will immediately invalidate the previous code.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
