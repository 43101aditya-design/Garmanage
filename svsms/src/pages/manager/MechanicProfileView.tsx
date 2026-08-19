import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Star, Clock, Wrench } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../api/services/apiClient';

export const MechanicProfileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mechanic, setMechanic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMechanic();
    }
  }, [id]);

  const loadMechanic = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/mechanics/${id}`);
      setMechanic(res.data);
    } catch (error) {
      console.error('Failed to load mechanic details', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!mechanic) {
    return <div className="p-8 text-center text-red-500">Mechanic not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/manager/mechanics')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Mechanic Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{mechanic.user?.full_name || 'No Name'}</h2>
            <p className="text-sm text-slate-500">{mechanic.employee_code}</p>
          </div>
          <Badge variant={mechanic.status === 'AVAILABLE' ? 'success' : mechanic.status === 'BUSY' ? 'warning' : 'secondary'}>
            {mechanic.status || 'UNKNOWN'}
          </Badge>
          <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2 text-left">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Experience</span>
              <span className="text-sm font-medium">{mechanic.experience_years} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Workload</span>
              <span className="text-sm font-medium">{mechanic.current_workload_mins || 0} mins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Specialization</span>
              <span className="text-sm font-medium">{mechanic.specialization || 'General'}</span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-blue-500" />
              Skills & Certifications
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {mechanic.skills && mechanic.skills.length > 0 ? (
                    mechanic.skills.map((skill: any, i: number) => (
                      <Badge key={i} variant="secondary">{skill.name || skill}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No skills listed</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Certifications</h4>
                <ul className="list-disc list-inside text-sm text-slate-600">
                  {mechanic.certifications && mechanic.certifications.length > 0 ? (
                    mechanic.certifications.map((cert: string, i: number) => (
                      <li key={i}>{cert}</li>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No certifications listed</span>
                  )}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-500" />
              Active Jobs
            </h3>
            <div className="space-y-3">
              {/* This would fetch mechanic's active assignments, for now rendering empty or mock state */}
              <div className="text-sm text-gray-500 text-center py-4">
                No active jobs at the moment.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
