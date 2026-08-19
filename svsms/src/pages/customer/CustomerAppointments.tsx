import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Car, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';

export const CustomerAppointments = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await apiClient.get('/api/customer/appointments');
        setAppointments(Array.isArray(res) ? res : res.data || []);
      } catch (error) {
        console.error('Failed to fetch appointments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await apiClient.patch(`/api/appointments/${id}/cancel`);
      // Update local state or refetch
      setAppointments(appointments.map(apt => 
        apt.id === id ? { ...apt, status: 'CANCELLED' } : apt
      ));
    } catch (error) {
      console.error('Failed to cancel appointment', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10 text-gray-500">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Yet</h3>
            <p className="text-gray-500 max-w-sm text-center">
              You haven't scheduled any service appointments yet. Create a service request to get started.
            </p>
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
                    {apt.scheduled_date ? format(new Date(apt.scheduled_date), 'MMM d, yyyy') : 'Pending Date'}
                  </CardTitle>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                    {apt.status || 'SCHEDULED'}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-2 gap-2 font-medium">
                  <Clock className="w-4 h-4" />
                  {apt.start_time} - {apt.end_time}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900 block">{apt.garage?.name}</span>
                      <span className="text-gray-500">{apt.garage?.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 font-medium">
                      {apt.vehicle?.brand} {apt.vehicle?.model}
                    </span>
                  </div>
                </div>

                {apt.status === 'SCHEDULED' && (
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleCancel(apt.id)}
                  >
                    Cancel Appointment
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
