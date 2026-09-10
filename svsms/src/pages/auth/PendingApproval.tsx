import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, JoinRequest } from '../../store/authStore';
import { apiClient } from '../../api/services/apiClient';
import toast from 'react-hot-toast';
import { Clock, CheckCircle2, XCircle, Ban, RefreshCw, ArrowRight, LogOut, ShieldAlert } from 'lucide-react';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Pending Review' },
  APPROVED: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: XCircle, label: 'Rejected' },
  CANCELLED: { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: Ban, label: 'Cancelled' },
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
      // If any is approved, sync and redirect to designated workspace
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

          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 text-amber-600">
            ⏳
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Awaiting Approval</h1>
          <p className="text-sm text-slate-600">
            The garage owner needs to approve your staff join request before you can access the platform dashboard.
          </p>
        </div>

        {/* Requests List Card */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-3 mb-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Your Active Requests
            </h2>
            <button 
              onClick={fetchStatus} 
              className="text-xs font-medium text-slate-500 hover:text-primary-700 transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              <p>No active join requests found.</p>
              <button 
                onClick={() => navigate('/onboarding')} 
                className="text-primary-600 hover:text-primary-700 font-semibold text-xs mt-2 inline-flex items-center gap-1"
              >
                Submit a new request <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            requests.map((req) => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              const IconComp = cfg.icon;
              return (
                <div key={req.id} className={`p-4 rounded-xl border ${cfg.bg} flex items-start justify-between gap-3`}>
                  <div className="flex items-start gap-3">
                    <IconComp className={`w-5 h-5 ${cfg.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{req.garage_name}</div>
                      <div className="text-xs text-slate-500 capitalize">
                        Role requested: <strong className="text-slate-700">{req.requested_role}</strong>
                      </div>
                      <div className={`text-xs font-semibold mt-1 ${cfg.color}`}>{cfg.label}</div>
                    </div>
                  </div>
                  {req.status === 'PENDING' && (
                    <button
                      id={`cancel-req-${req.id}`}
                      onClick={() => handleCancel(req.id)}
                      disabled={cancelling === req.id}
                      className="text-xs text-rose-600 hover:text-rose-700 border border-rose-200 bg-white rounded-lg px-2.5 py-1 hover:bg-rose-50 transition-all disabled:opacity-50 font-medium"
                    >
                      {cancelling === req.id ? '...' : 'Cancel'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            id="submit-new-request-btn"
            onClick={() => navigate('/onboarding')}
            className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all text-sm font-semibold shadow-sm flex items-center justify-center gap-1.5"
          >
            + Submit Another Garage Request
          </button>
          <button
            onClick={logout}
            className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Status auto-refreshes every 30 seconds · <span className="text-amber-500">●</span> Waiting for owner review
        </p>

      </div>
    </div>
  );
};
