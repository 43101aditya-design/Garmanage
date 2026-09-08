import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, JoinRequest } from '../../store/authStore';
import { apiClient } from '../../api/services/apiClient';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  PENDING: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: '⏳', label: 'Pending Review' },
  APPROVED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '✅', label: 'Approved' },
  REJECTED: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '❌', label: 'Rejected' },
  CANCELLED: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: '🚫', label: 'Cancelled' },
};

export const PendingApproval = () => {
  const navigate = useNavigate();
  const { syncProfile, logout } = useAuthStore();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/api/onboarding/join/status');
      setRequests(res.requests || []);
      // If all approved, sync and redirect
      const approved = (res.requests || []).filter((r: JoinRequest) => r.status === 'APPROVED');
      if (approved.length > 0) {
        await syncProfile();
        navigate('/', { replace: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (requestId: string) => {
    setCancelling(requestId);
    try {
      await apiClient.post('/api/onboarding/join/cancel', { requestId });
      toast.success('Request cancelled');
      fetchStatus();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-bold text-white">G</div>
            <span className="text-2xl font-bold text-white">Garmanage</span>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-amber-500/20">⏳</div>
          <h1 className="text-2xl font-bold text-white">Awaiting Approval</h1>
          <p className="text-slate-400 mt-2 text-sm">The garage owner needs to approve your request before you can access the platform.</p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Your Join Requests</h2>
            <button onClick={fetchStatus} className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <span className={loading ? 'animate-spin' : ''}>↻</span> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No requests found.</p>
              <button onClick={() => navigate('/onboarding')} className="text-violet-400 hover:text-violet-300 text-sm mt-2">
                Submit a new request →
              </button>
            </div>
          ) : (
            requests.map((req) => {
              const cfg = STATUS_CONFIG[req.status];
              return (
                <div key={req.id} className={`p-4 rounded-xl border ${cfg.bg} flex items-start justify-between gap-3`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cfg.icon}</span>
                    <div>
                      <div className="font-semibold text-white text-sm">{req.garage_name}</div>
                      <div className="text-xs text-slate-400 capitalize">Role requested: {req.requested_role}</div>
                      <div className={`text-xs font-medium mt-0.5 ${cfg.color}`}>{cfg.label}</div>
                    </div>
                  </div>
                  {req.status === 'PENDING' && (
                    <button
                      id={`cancel-req-${req.id}`}
                      onClick={() => handleCancel(req.id)}
                      disabled={cancelling === req.id}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {cancelling === req.id ? '...' : 'Cancel'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 space-y-2">
          <button
            id="submit-new-request-btn"
            onClick={() => navigate('/onboarding')}
            className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-sm font-medium"
          >
            + Submit Another Request
          </button>
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            Sign out
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Auto-refreshes every 30 seconds · <span className="text-amber-500">●</span> Waiting
        </p>
      </div>
    </div>
  );
};
