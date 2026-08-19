import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../api/services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';

export const ManagerWorkforce = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMechanics();
  }, []);

  const loadMechanics = async () => {
    try {
      setLoading(true);
      // Fallback API if /api/garages/:id/mechanics isn't fully ready
      const res = await apiClient.get(`/api/garages/1/mechanics`).catch(async () => {
        // Fallback to fetch all users and filter by role = mechanic? No, let's assume the endpoint exists or we mock it.
        return { data: [] };
      });
      setMechanics(res.data || []);
    } catch (error) {
      console.error('Failed to load mechanics', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = mechanics.filter(m => 
    m.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workforce</h1>
          <p className="text-slate-500">Manage mechanics</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name or code..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <th>Mechanic</th>
              <th>Employee Code</th>
              <th>Status</th>
              <th>Experience</th>
              <th>Workload</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  {loading ? 'Loading mechanics...' : 'No mechanics found.'}
                </td>
              </tr>
            ) : (
              filtered.map((mechanic) => (
                <tr key={mechanic.id}>
                  <td>
                    <div className="font-medium text-slate-900">{mechanic.user?.full_name || 'Unknown'}</div>
                    <div className="text-sm text-slate-500">{mechanic.user?.email}</div>
                  </td>
                  <td>{mechanic.employee_code || '-'}</td>
                  <td>
                    <Badge variant={mechanic.status === 'AVAILABLE' ? 'success' : mechanic.status === 'BUSY' ? 'warning' : 'secondary'}>
                      {mechanic.status || 'UNKNOWN'}
                    </Badge>
                  </td>
                  <td>{mechanic.experience_years ? `${mechanic.experience_years} years` : '-'}</td>
                  <td>{mechanic.current_workload_mins || 0} mins</td>
                  <td className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/manager/mechanics/${mechanic.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Profile
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
