import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/services/apiClient';
import toast from 'react-hot-toast';

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
  const garageId = selectedGarageId || user?.memberships?.[0]?.garage_id;

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
      toast.success('Request approved! User now has access.');
      fetchData();
      fetchMembers();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to approve');
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
      toast.error(e.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCode = async () => {
    setActionLoading('gen-code');
    try {
      const res = await apiClient.post(`/api/garages/${garageId}/generate-join-code`, {});
      setJoinCode(res.join_code);
      toast.success('New join code generated!');
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
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const TABS = [
    { key: 'requests', label: 'Join Requests', count: pendingReqs.length },
    { key: 'members', label: 'Active Members', count: members.length },
    { key: 'code', label: 'Join Code', count: null },
  ] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Access Management</h1>
        <p className="text-slate-400 text-sm mt-1">Manage who can join your garage and in what role.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`access-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-slate-700'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Pending Requests Tab */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {pendingReqs.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-slate-400">No pending join requests</p>
                </div>
              ) : (
                pendingReqs.map((req) => (
                  <div key={req.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                      {req.requester_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">{req.requester_name}</div>
                      <div className="text-xs text-slate-400">{req.requester_email}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full capitalize">{req.requested_role}</span>
                        {req.message && <span className="text-xs text-slate-500 italic truncate max-w-xs">"{req.message}"</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        id={`reject-req-${req.id}`}
                        onClick={() => handleReject(req.id)}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                      >
                        {actionLoading === req.id + '-reject' ? '...' : 'Reject'}
                      </button>
                      <button
                        id={`approve-req-${req.id}`}
                        onClick={() => handleApprove(req.id)}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                      >
                        {actionLoading === req.id ? '...' : '✓ Approve'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Members Tab */}
          {tab === 'members' && (
            <div className="space-y-2">
              {members.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-8 text-center">
                  <p className="text-slate-400">No members found</p>
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.membership_id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {m.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm">{m.name}</div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </div>
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full capitalize border border-violet-500/20">
                      {m.role_name}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Join Code Tab */}
          {tab === 'code' && (
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 text-center space-y-6">
              <div>
                <p className="text-slate-400 text-sm mb-1">Share this code with team members to join your garage</p>
                <p className="text-xs text-slate-500">Anyone with this code can request to join — you still need to approve them</p>
              </div>

              {joinCode ? (
                <div className="bg-slate-800/80 border border-violet-500/20 rounded-2xl p-6">
                  <div className="text-4xl font-mono font-bold text-violet-300 tracking-[0.3em] mb-4">{joinCode}</div>
                  <button id="copy-join-code-btn" onClick={handleCopy}
                    className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30'}`}>
                    {copied ? '✓ Copied!' : '📋 Copy Code'}
                  </button>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">No join code set yet</div>
              )}

              <button
                id="generate-join-code-btn"
                onClick={handleGenerateCode}
                disabled={actionLoading === 'gen-code'}
                className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === 'gen-code' ? 'Generating...' : '🔄 Generate New Code'}
              </button>
              <p className="text-xs text-slate-600">Generating a new code invalidates the old one</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
