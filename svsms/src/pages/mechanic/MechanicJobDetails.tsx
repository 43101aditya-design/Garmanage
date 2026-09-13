import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Car,
  Wrench,
  CheckCircle,
  Play,
  Pause,
  AlertCircle,
  FileText,
  User,
  Phone,
  Send,
  RefreshCw,
  X,
  Calendar,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../api/services/apiClient';

export const MechanicJobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ETA update modal state
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [newEtaTime, setNewEtaTime] = useState('');
  const [etaReason, setEtaReason] = useState('');

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/api/jobs/${id}`);
      setJob(res.job || res);
      setNotes(res.notes || []);
    } catch (err: any) {
      console.error('Failed to load job details', err);
      setError(err.message || 'Job card not found or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (targetStatus: string) => {
    if (!id) return;
    setProcessing(true);
    setError(null);
    try {
      await apiClient.patch(`/api/jobs/${id}/status`, { status: targetStatus });
      await loadJobDetails();
    } catch (err: any) {
      console.error('Failed to update job status', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateETA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newEtaTime) return;
    setProcessing(true);
    setError(null);
    try {
      await apiClient.patch(`/api/jobs/${id}/eta`, {
        estimated_completion_at: new Date(newEtaTime).toISOString(),
        delay_reason: etaReason || 'Expected completion updated'
      });
      setShowEtaModal(false);
      setEtaReason('');
      await loadJobDetails();
    } catch (err: any) {
      console.error('Failed to update ETA', err);
      setError(err.message || 'Failed to update expected completion');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim()) return;
    setProcessing(true);
    try {
      await apiClient.post(`/api/jobs/${id}/notes`, { note: newNote.trim() });
      setNewNote('');
      await loadJobDetails();
    } catch (err: any) {
      console.error('Failed to add note', err);
      setError(err.message || 'Failed to add note');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CREATED':
      case 'READY_FOR_ASSIGNMENT':
        return 'secondary';
      case 'ASSIGNED':
      case 'ON_HOLD':
        return 'warning';
      case 'IN_PROGRESS':
        return 'default';
      case 'QUALITY_CHECK':
        return 'info';
      case 'READY_FOR_PICKUP':
      case 'COMPLETED':
      case 'CLOSED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">Loading job card details...</span>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="text-sm">{error}</div>
        </div>
        <Button variant="outline" onClick={() => navigate('/mechanic/jobs')} className="border-slate-700 text-slate-200">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Jobs
        </Button>
      </div>
    );
  }

  const currentStatus = (job?.status || 'CREATED').toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/mechanic/jobs')}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100 font-mono">
                {job.job_number || `Job #${job.id.substring(0, 8)}`}
              </h1>
              <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-300">
                {job.service_type || 'General Service'}
              </Badge>
              {job.delay_status && (
                <Badge 
                  variant={job.delay_status === 'DELAYED' ? 'destructive' : job.delay_status === 'AT_RISK' ? 'warning' : 'success'}
                  className="text-[10px] uppercase font-mono"
                >
                  {job.delay_status.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Created: {new Date(job.created_at).toLocaleString()}</span>
              {job.estimated_completion_at && (
                <span className="flex items-center gap-1 font-mono text-primary font-bold">
                  <Clock className="w-3.5 h-3.5" /> 
                  Target Ready: {new Date(job.estimated_completion_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* State Machine Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {currentStatus === 'ASSIGNED' && (
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
              disabled={processing}
            >
              <Play className="w-4 h-4 mr-1.5" /> Start Work
            </Button>
          )}

          {currentStatus === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outline"
                className="border-amber-600/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
                onClick={() => handleUpdateStatus('ON_HOLD')}
                disabled={processing}
              >
                <Pause className="w-4 h-4 mr-1.5" /> Put On Hold
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleUpdateStatus('QUALITY_CHECK')}
                disabled={processing}
              >
                <CheckSquare className="w-4 h-4 mr-1.5" /> Quality Check
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={processing}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" /> Complete
              </Button>
            </>
          )}

          {currentStatus === 'QUALITY_CHECK' && (
            <>
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300"
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={processing}
              >
                Return to Service
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => handleUpdateStatus('READY_FOR_PICKUP')}
                disabled={processing}
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" /> Ready for Pickup
              </Button>
            </>
          )}

          {currentStatus === 'READY_FOR_PICKUP' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={processing}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" /> Handover Complete
            </Button>
          )}

          {currentStatus === 'ON_HOLD' && (
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
              disabled={processing}
            >
              <Play className="w-4 h-4 mr-1.5" /> Resume Work
            </Button>
          )}

          {/* Adjust ETA Button */}
          {currentStatus !== 'COMPLETED' && currentStatus !== 'CLOSED' && currentStatus !== 'CANCELLED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewEtaTime(job.estimated_completion_at ? new Date(job.estimated_completion_at).toISOString().slice(0, 16) : '');
                setEtaReason(job.delay_reason || '');
                setShowEtaModal(true);
              }}
              disabled={processing}
              className="border-slate-700 text-slate-300 gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-primary" /> Adjust Target
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadJobDetails}
            disabled={processing}
            className="border-slate-700 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Adjust ETA Modal */}
      {showEtaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Update Expected Completion Time
              </h3>
              <button onClick={() => setShowEtaModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateETA} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Target Ready Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={newEtaTime}
                  onChange={(e) => setNewEtaTime(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Reason for Adjustment / Delay
                </label>
                <Input
                  type="text"
                  value={etaReason}
                  onChange={(e) => setEtaReason(e.target.value)}
                  placeholder="e.g. Additional brake pads needed, diagnosing sensor"
                  className="bg-slate-950 border-slate-800 text-slate-100 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowEtaModal(false)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" disabled={processing || !newEtaTime} className="bg-primary text-white">
                  Save Expected Time
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vehicle & Customer Info */}
        <div className="space-y-6 md:col-span-1">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" /> Vehicle Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-400">Make & Model</div>
                <div className="font-medium text-slate-100">
                  {job.make ? `${job.make} ${job.model || ''} (${job.year || 'N/A'})` : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">License Plate</div>
                <div className="font-mono font-medium text-slate-200">{job.license_plate || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">VIN</div>
                <div className="font-mono text-xs text-slate-400">{job.vin || 'N/A'}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-400">Name</div>
                <div className="font-medium text-slate-100">
                  {job.first_name ? `${job.first_name} ${job.last_name || ''}` : 'Customer'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Phone</div>
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {job.customer_phone || 'N/A'}
                </div>
              </div>
              {job.customer_email && (
                <div>
                  <div className="text-xs text-slate-400">Email</div>
                  <div className="text-slate-300 text-xs">{job.customer_email}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job Scope & Notes */}
        <div className="space-y-6 md:col-span-2">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> Service Scope & Problem Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 text-sm text-slate-200 leading-relaxed">
                {job.problem_description || 'No detailed problem description provided.'}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm pt-2">
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-xs text-slate-400">Priority</div>
                  <div className="font-semibold text-slate-100">{job.priority || 'NORMAL'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-xs text-slate-400">Complexity</div>
                  <div className="font-semibold text-slate-100">{job.complexity || 'MEDIUM'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-xs text-slate-400">Est. Duration</div>
                  <div className="font-semibold text-slate-100 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {job.estimated_duration_minutes ? `${job.estimated_duration_minutes}m` : '60m'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="text-xs text-slate-400">Actual Duration</div>
                  <div className="font-semibold text-slate-100">
                    {job.actual_duration_minutes ? `${job.actual_duration_minutes}m` : 'In Progress'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Notes & Timeline */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Service Notes & Work Log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {notes.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">No notes recorded yet.</div>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-sm space-y-1"
                    >
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="font-medium text-slate-300">
                          {n.author_name || 'Technician'} ({n.author_role || 'mechanic'})
                        </span>
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-slate-200 text-sm">{n.note}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add a technical note or inspection remark..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  disabled={processing}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={processing || !newNote.trim()}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Send className="w-4 h-4 mr-1.5" /> Add Note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
