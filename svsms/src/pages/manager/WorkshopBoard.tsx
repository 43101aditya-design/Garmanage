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
    { id: 'INTAKE', title: 'Intake & Inspection', statuses: ['CREATED', 'READY_FOR_ASSIGNMENT'] },
    { id: 'ASSIGNED', title: 'Assigned', statuses: ['ASSIGNED'] },
    { id: 'IN_PROGRESS', title: 'In Progress', statuses: ['IN_PROGRESS'] },
    { id: 'QUALITY_CHECK', title: 'Quality Check', statuses: ['QUALITY_CHECK'] },
    { id: 'READY_FOR_PICKUP', title: 'Ready for Pickup', statuses: ['READY_FOR_PICKUP'] },
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshop Operational Board</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time status tracking across service bays</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colJobs = jobs.filter(job => col.statuses.includes(job.status?.toUpperCase()));
          
          return (
            <div key={col.id} className="flex-1 min-w-[280px] bg-gray-50 rounded-lg p-3.5 flex flex-col h-full border border-gray-200/70">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-700">{col.title}</h3>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
                  {colJobs.length}
                </span>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {colJobs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    No active jobs
                  </div>
                ) : (
                  colJobs.map(job => (
                    <Link key={job.id} to={`/manager/jobs/${job.id}`}>
                      <Card className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
                        job.delay_status === 'DELAYED' 
                          ? 'border-l-red-500 border-red-200' 
                          : job.delay_status === 'AT_RISK' 
                            ? 'border-l-amber-500 border-amber-200' 
                            : 'border-l-indigo-500'
                      }`}>
                        <CardContent className="p-3.5 space-y-2.5">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-mono font-bold text-gray-600">
                              {job.job_number || `#${job.id.substring(0, 8)}`}
                            </span>
                            {job.delay_status && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                job.delay_status === 'DELAYED' 
                                  ? 'bg-red-100 text-red-700' 
                                  : job.delay_status === 'AT_RISK' 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {job.delay_status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-semibold text-sm text-gray-900 line-clamp-1">
                                {job.make || job.vehicle?.brand} {job.model || job.vehicle?.model}
                              </span>
                            </div>
                            {(job.license_plate || job.vehicle?.license_plate) && (
                              <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                {job.license_plate || job.vehicle?.license_plate}
                              </span>
                            )}
                          </div>

                          {job.mechanic_name && (
                            <div className="text-[11px] text-gray-500 font-medium">
                              Tech: <span className="text-gray-800 font-semibold">{job.mechanic_name}</span>
                            </div>
                          )}

                          {job.estimated_completion_at && (
                            <div className={`flex items-center text-[11px] gap-1 px-2 py-1 rounded font-mono font-medium ${
                              job.delay_status === 'DELAYED' 
                                ? 'bg-red-50 text-red-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Ready: {format(new Date(job.estimated_completion_at), 'MMM d, HH:mm')}</span>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                            <span className="capitalize line-clamp-1">
                              {job.service_type || 'General Service'}
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
