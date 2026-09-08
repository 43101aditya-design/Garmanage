import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Eye, Wrench, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';

interface MechanicJob {
  id: string;
  job_number: string;
  service_type: string;
  problem_description?: string;
  priority: string;
  status: string;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  make?: string;
  model?: string;
  license_plate?: string;
  first_name?: string;
  last_name?: string;
  customer_phone?: string;
  created_at: string;
}

export const MechanicJobs = () => {
  const [jobs, setJobs] = useState<MechanicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/jobs/mechanic');
      const list = Array.isArray(res) ? res : res.jobs || res.data || [];
      setJobs(list);
    } catch (err: any) {
      console.error('Failed to load mechanic jobs', err);
      setError(err.message || 'Failed to load assigned jobs');
    } finally {
      setLoading(false);
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

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
      case 'HIGH':
        return 'destructive';
      case 'NORMAL':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" /> My Assigned Jobs
          </h1>
          <p className="text-slate-400 text-sm">
            Active service assignments and vehicle inspection tasks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadJobs}
          disabled={loading}
          className="border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-950/40 border border-red-800 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="flex-1 text-sm">{error}</div>
          <Button variant="outline" size="sm" onClick={loadJobs} className="border-red-800 text-red-200">
            Retry
          </Button>
        </div>
      )}

      <Card className="p-6 bg-slate-900/90 border-slate-800">
        <Table>
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-left text-xs uppercase tracking-wider">
              <th className="py-3 px-4">Job #</th>
              <th className="py-3 px-4">Vehicle</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Service Type</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Loading your assigned jobs...</span>
                  </div>
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="w-8 h-8 text-slate-600" />
                    <span className="text-base font-medium text-slate-300">No jobs assigned</span>
                    <span className="text-xs text-slate-500">
                      You currently have no pending or in-progress service jobs.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-200 text-sm">
                    {job.job_number || `#${job.id.substring(0, 8)}`}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-sm">
                    <div className="font-medium">{job.make ? `${job.make} ${job.model}` : 'Vehicle'}</div>
                    <div className="text-xs text-slate-500">{job.license_plate || 'No plate'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-sm">
                    <div>{job.first_name ? `${job.first_name} ${job.last_name || ''}` : 'Customer'}</div>
                    <div className="text-xs text-slate-500">{job.customer_phone || ''}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-sm">{job.service_type || 'General Service'}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={getPriorityBadgeVariant(job.priority)}>{job.priority || 'NORMAL'}</Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={getStatusBadgeVariant(job.status)}>{job.status || 'ASSIGNED'}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/mechanic/jobs/${job.id}`)}
                      className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};
