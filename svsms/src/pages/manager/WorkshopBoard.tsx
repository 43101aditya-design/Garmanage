import React, { useEffect, useState } from 'react';
import { AlertTriangle, Car, Wrench, Clock, FileText } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export const WorkshopBoard = () => {
  const { currentGarage } = useGarageStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!currentGarage) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(`/api/manager/garages/${currentGarage.id}/jobs`);
        setJobs(Array.isArray(res) ? res : res.data || []);
      } catch (error) {
        console.error('Failed to fetch jobs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [currentGarage]);

  const columns = [
    { id: 'READY', title: 'Ready', statuses: ['CREATED', 'READY_FOR_ASSIGNMENT'] },
    { id: 'IN_PROGRESS', title: 'In Progress', statuses: ['IN_PROGRESS'] },
    { id: 'ON_HOLD', title: 'On Hold', statuses: ['ON_HOLD'] },
    { id: 'COMPLETED', title: 'Completed', statuses: ['COMPLETED'] }
  ];

  if (!currentGarage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <h2 className="text-xl font-bold">No Garage Selected</h2>
        <p className="text-gray-500 text-center max-w-md">
          Please select a garage from the dashboard to view the workshop board.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-10 text-gray-500">Loading workshop board...</div>;
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workshop Board</h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map(col => {
          const colJobs = jobs.filter(job => col.statuses.includes(job.status?.toUpperCase()));
          
          return (
            <div key={col.id} className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4 flex flex-col h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">{col.title}</h3>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                  {colJobs.length}
                </span>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto">
                {colJobs.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    No jobs
                  </div>
                ) : (
                  colJobs.map(job => (
                    <Link key={job.id} to={`/manager/jobs/${job.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-indigo-500">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-mono text-gray-500">#{job.id.substring(0, 8)}</span>
                            {job.expected_completion && (
                              <div className="flex items-center text-xs text-orange-600 gap-1 bg-orange-50 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                {format(new Date(job.expected_completion), 'HH:mm')}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-sm text-gray-900 line-clamp-1">
                                {job.vehicle?.brand} {job.vehicle?.model}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                {job.vehicle?.registration_number}
                              </span>
                            </div>
                          </div>
                          
                          <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-600 capitalize">
                              {job.service_request?.service_type?.replace('_', ' ') || 'General Service'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
