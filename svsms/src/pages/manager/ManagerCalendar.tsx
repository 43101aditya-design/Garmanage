import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, Car, User, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';

export const ManagerCalendar = () => {
  const { currentGarage } = useGarageStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    if (!currentGarage) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(`/api/manager/garages/${currentGarage.id}/appointments`);
      setAppointments(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error('Failed to fetch appointments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentGarage]);

  const handleCreateJobCard = async (id: string) => {
    try {
      await apiClient.post(`/api/jobs`, {
        appointment_id: id,
        garage_id: currentGarage?.id
      });
      fetchAppointments();
    } catch (error) {
      console.error('Failed to create job card', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NO_SHOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentGarage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <h2 className="text-xl font-bold">No Garage Selected</h2>
        <p className="text-gray-500 text-center max-w-md">
          Please select a garage from the dashboard to view the calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar & Appointments</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-6 text-gray-500">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CalendarIcon className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500">No appointments scheduled for this garage.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((apt) => (
            <Card key={apt.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    {apt.scheduled_date ? format(new Date(apt.scheduled_date), 'MMM d, yyyy') : 'No Date'}
                  </CardTitle>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                    {apt.status || 'SCHEDULED'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-2 gap-2">
                  <Clock className="w-4 h-4" />
                  {apt.start_time} - {apt.end_time}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">
                      {apt.customer?.first_name} {apt.customer?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {apt.vehicle?.brand} {apt.vehicle?.model} ({apt.vehicle?.registration_number})
                    </span>
                  </div>
                </div>

                {apt.status === 'SCHEDULED' && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => handleCreateJobCard(apt.id)}
                  >
                    Create Job Card
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
