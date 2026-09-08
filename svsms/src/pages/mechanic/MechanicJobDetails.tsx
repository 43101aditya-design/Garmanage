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
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
        return 'warning';
      case 'IN_PROGRESS':
        return 'default';
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
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Created: {new Date(job.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* State Machine Action Controls */}
        <div className="flex items-center gap-2">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={processing}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" /> Complete Service
              </Button>
            </>
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
