import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Eye, Clock, Calendar, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { useAuthStore } from '../../store/authStore';

export const MechanicJobs = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      // Depending on API, could be /api/mechanics/:id/assignments or /api/assignments?mechanic_id=...
      const res = await apiClient.get('/api/mechanics/assignments');
      setAssignments(res.data || []);
    } catch (error) {
      console.error('Failed to load assignments', error);
      // Fallback or mock data for testing
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'warning';
      case 'ACCEPTED': return 'success';
      case 'IN_PROGRESS': return 'default';
      case 'COMPLETED': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Jobs</h1>
          <p className="text-slate-500">View and manage your assigned jobs</p>
        </div>
      </div>

      <Card className="p-6">
        <Table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Vehicle</th>
              <th>Assigned Date</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">Loading jobs...</td></tr>
            ) : assignments.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">No jobs assigned.</td></tr>
            ) : (
              assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="font-medium text-slate-900">#{assignment.job_id.substring(0, 8)}</td>
                  <td>{assignment.job?.vehicle?.brand} {assignment.job?.vehicle?.model}</td>
                  <td>{new Date(assignment.assigned_at).toLocaleDateString()}</td>
                  <td>
                    <Badge variant={getStatusColor(assignment.status)}>{assignment.status}</Badge>
                  </td>
                  <td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/mechanic/jobs/${assignment.id}`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
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
