import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Car, Wrench, CheckCircle, XCircle, Play, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../api/services/apiClient';

export const MechanicJobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/assignments/${id}`);
      setAssignment(res.data);
    } catch (error) {
      console.error('Failed to load assignment details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptReject = async (status: 'ACCEPTED' | 'REJECTED') => {
    setProcessing(true);
    try {
      await apiClient.patch(`/api/assignments/${id}/accept`, { status });
      loadAssignment();
    } catch (error) {
      console.error(`Failed to ${status} assignment`, error);
    } finally {
      setProcessing(false);
    }
  };

  const handleJobStatus = async (status: string) => {
    setProcessing(true);
    try {
      await apiClient.patch(`/api/jobs/${assignment.job_id}/status`, { status });
      loadAssignment();
    } catch (error) {
      console.error('Failed to update job status', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading details...</div>;
  }

  if (!assignment) {
    return <div className="p-8 text-center text-red-500">Assignment not found.</div>;
  }

  const job = assignment.job;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/mechanic/jobs')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Job #{job?.id?.substring(0, 8)}
          </h1>
          <Badge variant={assignment.status === 'PENDING' ? 'warning' : 'default'}>
            Assignment: {assignment.status}
          </Badge>
          <Badge variant="secondary">
            Job: {job?.status}
          </Badge>
        </div>

        <div className="flex gap-2">
          {assignment.status === 'PENDING' && (
            <>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleAcceptReject('REJECTED')}
                disabled={processing}
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleAcceptReject('ACCEPTED')}
                disabled={processing}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Accept
              </Button>
            </>
          )}

          {assignment.status === 'ACCEPTED' && job?.status !== 'COMPLETED' && (
            <>
              {(job?.status === 'READY_FOR_ASSIGNMENT' || job?.status === 'ON_HOLD') && (
                <Button onClick={() => handleJobStatus('IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700" disabled={processing}>
                  <Play className="w-4 h-4 mr-2" /> Start Work
                </Button>
              )}
              {job?.status === 'IN_PROGRESS' && (
                <Button onClick={() => handleJobStatus('ON_HOLD')} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" disabled={processing}>
                  <Pause className="w-4 h-4 mr-2" /> Pause Work
                </Button>
              )}
              {job?.status === 'IN_PROGRESS' && (
                <Button onClick={() => handleJobStatus('COMPLETED')} className="bg-green-600 hover:bg-green-700" disabled={processing}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-sm text-gray-500 flex items-center gap-1"><Car className="w-4 h-4"/> Vehicle</span>
              <p className="font-medium">{job?.vehicle?.brand} {job?.vehicle?.model}</p>
              <p className="text-sm text-gray-600">{job?.vehicle?.registration_number}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2 flex items-center gap-2"><Wrench className="w-4 h-4"/> Service Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Service Type:</span>
                <span className="font-medium capitalize">{job?.service_request?.service_type?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reported Issues:</span>
                <span className="font-medium text-right max-w-xs">{job?.service_request?.reported_issues || 'None'}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/> Time Estimates</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-900 border border-blue-100">
                <span className="block text-blue-600/80 mb-1">Complexity</span>
                <span className="font-semibold">{job?.complexity || 'STANDARD'}</span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg text-indigo-900 border border-indigo-100">
                <span className="block text-indigo-600/80 mb-1">Est. Duration</span>
                <span className="font-semibold">{job?.estimated_duration_mins ? `${job?.estimated_duration_mins} mins` : 'N/A'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
