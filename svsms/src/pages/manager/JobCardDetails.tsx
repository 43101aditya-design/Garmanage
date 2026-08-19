import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Car, Wrench, User, FileText, CheckCircle, AlertCircle, Play, Pause, UserPlus, X } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { format } from 'date-fns';

export const JobCardDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [eligibleMechanics, setEligibleMechanics] = useState<any[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);

  const fetchJob = async () => {
    try {
      // Changed to use standard apiClient path
      const res = await apiClient.get(`/api/jobs/${id}`);
      setJob(res.data || res);
    } catch (error) {
      console.error('Failed to fetch job details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchJob();
  }, [id]);

  const handleStatusUpdate = async (status: string) => {
    try {
      await apiClient.patch(`/api/jobs/${id}/status`, { status });
      fetchJob();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    
    setAddingNote(true);
    try {
      await apiClient.post(`/api/jobs/${id}/notes`, { content: noteContent });
      setNoteContent('');
      fetchJob();
    } catch (error) {
      console.error('Failed to add note', error);
    } finally {
      setAddingNote(false);
    }
  };

  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    setLoadingMechanics(true);
    try {
      const res = await apiClient.get(`/api/jobs/${id}/eligible-mechanics`);
      setEligibleMechanics(res.data || []);
    } catch (error) {
      console.error('Failed to fetch eligible mechanics', error);
    } finally {
      setLoadingMechanics(false);
    }
  };

  const assignMechanic = async (mechanicId: string) => {
    try {
      await apiClient.post(`/api/jobs/${id}/assign`, { mechanic_id: mechanicId });
      setIsAssignModalOpen(false);
      fetchJob();
    } catch (error) {
      console.error('Failed to assign mechanic', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CREATED':
      case 'READY_FOR_ASSIGNMENT': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10 text-gray-500">Loading job details...</div>;
  }

  if (!job) {
    return <div className="text-center p-10">Job not found</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/manager/jobs')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Board
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Job #{job.id.substring(0, 8)}
          </h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
        </div>
        
        <div className="flex gap-2">
          {job.status === 'READY_FOR_ASSIGNMENT' && (
            <Button onClick={openAssignModal} className="bg-indigo-600 hover:bg-indigo-700">
              <UserPlus className="w-4 h-4 mr-2" /> Assign Mechanic
            </Button>
          )}
          {job.status !== 'IN_PROGRESS' && job.status !== 'COMPLETED' && job.status !== 'READY_FOR_ASSIGNMENT' && job.status !== 'CREATED' && (
            <Button onClick={() => handleStatusUpdate('IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4 mr-2" /> Start Work
            </Button>
          )}
          {job.status === 'IN_PROGRESS' && (
            <Button onClick={() => handleStatusUpdate('ON_HOLD')} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
              <Pause className="w-4 h-4 mr-2" /> Put on Hold
            </Button>
          )}
          {(job.status === 'IN_PROGRESS' || job.status === 'ON_HOLD') && (
            <Button onClick={() => handleStatusUpdate('COMPLETED')} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Completed
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-gray-500 flex items-center gap-1"><Car className="w-4 h-4"/> Vehicle</span>
                  <p className="font-medium">{job.vehicle?.brand} {job.vehicle?.model}</p>
                  <p className="text-sm text-gray-600">{job.vehicle?.registration_number}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-gray-500 flex items-center gap-1"><User className="w-4 h-4"/> Customer</span>
                  <p className="font-medium">{job.customer?.first_name} {job.customer?.last_name}</p>
                  <p className="text-sm text-gray-600">{job.customer?.phone}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2 flex items-center gap-2"><Wrench className="w-4 h-4"/> Service Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Service Type:</span>
                    <span className="font-medium capitalize">{job.service_request?.service_type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reported Issues:</span>
                    <span className="font-medium text-right max-w-xs">{job.service_request?.reported_issues || 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/> Time Estimates</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg text-blue-900 border border-blue-100">
                    <span className="block text-blue-600/80 mb-1">Complexity</span>
                    <span className="font-semibold">{job.complexity || 'STANDARD'}</span>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg text-indigo-900 border border-indigo-100">
                    <span className="block text-indigo-600/80 mb-1">Est. Duration</span>
                    <span className="font-semibold">{job.estimated_duration_mins ? `${job.estimated_duration_mins} mins` : 'N/A'}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg text-emerald-900 border border-emerald-100">
                    <span className="block text-emerald-600/80 mb-1">Expected Completion</span>
                    <span className="font-semibold">
                      {job.expected_completion ? format(new Date(job.expected_completion), 'MMM d, HH:mm') : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Job Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <Input
                  placeholder="Add a note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <Button type="submit" className="w-full" size="sm" disabled={addingNote || !noteContent.trim()}>
                  {addingNote ? 'Adding...' : 'Add Note'}
                </Button>
              </form>
              
              <div className="space-y-3 mt-6 max-h-96 overflow-y-auto">
                {(!job.notes || job.notes.length === 0) ? (
                  <p className="text-sm text-gray-500 text-center py-4">No notes added yet.</p>
                ) : (
                  job.notes.map((note: any) => (
                    <div key={note.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                      <p className="text-gray-800">{note.content}</p>
                      <div className="text-xs text-gray-400 mt-2 flex justify-between">
                        <span>{note.author?.first_name || 'User'}</span>
                        <span>{format(new Date(note.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign Mechanic</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {loadingMechanics ? (
              <div className="py-8 text-center text-gray-500">Finding eligible mechanics...</div>
            ) : eligibleMechanics.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No eligible mechanics found for this job.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {eligibleMechanics.map((mechanic) => (
                  <div key={mechanic.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-500 transition-colors">
                    <div>
                      <h4 className="font-medium text-slate-900">{mechanic.user?.full_name || 'Unknown Mechanic'}</h4>
                      <p className="text-sm text-slate-500">Workload: {mechanic.current_workload_mins || 0} mins</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant={mechanic.status === 'AVAILABLE' ? 'success' : 'warning'}>{mechanic.status}</Badge>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => assignMechanic(mechanic.id)}>
                      Assign
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
