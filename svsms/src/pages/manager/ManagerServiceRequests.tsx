import React, { useEffect, useState } from 'react';
import { FileText, AlertTriangle, X } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { format } from 'date-fns';

export const ManagerServiceRequests = () => {
  const { currentGarage } = useGarageStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [scheduleData, setScheduleData] = useState({ date: '', startTime: '', endTime: '' });

  const fetchRequests = async () => {
    if (!currentGarage) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(`/api/garages/${currentGarage.id}/service-requests`);
      setRequests(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error('Failed to fetch service requests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentGarage]);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.patch(`/api/manager/garages/${currentGarage?.id}/service-requests/${id}/approve`);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Failed to approve request', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.patch(`/api/manager/garages/${currentGarage?.id}/service-requests/${id}/reject`, {
        reason: rejectReason
      });
      setSelectedRequest(null);
      setRejectReason('');
      fetchRequests();
    } catch (error) {
      console.error('Failed to reject request', error);
    }
  };

  const handleSchedule = async (id: string) => {
    try {
      await apiClient.post(`/api/appointments`, {
        service_request_id: id,
        garage_id: currentGarage?.id,
        scheduled_date: scheduleData.date,
        start_time: scheduleData.startTime,
        end_time: scheduleData.endTime
      });
      setSelectedRequest(null);
      setScheduleData({ date: '', startTime: '', endTime: '' });
      fetchRequests();
    } catch (error) {
      console.error('Failed to schedule request', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-indigo-100 text-indigo-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'SCHEDULED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentGarage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <h2 className="text-xl font-bold">No Garage Selected</h2>
        <p className="text-gray-500 text-center max-w-md">
          Please select a garage from the dashboard to view its service requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Service Request Queue</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentGarage.name} - Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6 text-gray-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No service requests found for this garage.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium text-sm text-gray-900">
                      #{request.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      {request.customer?.first_name} {request.customer?.last_name}
                      <div className="text-xs text-gray-500">{request.customer?.email}</div>
                    </TableCell>
                    <TableCell>
                      {request.vehicle?.brand} {request.vehicle?.model}
                      <div className="text-xs text-gray-500">{request.vehicle?.registration_number}</div>
                    </TableCell>
                    <TableCell className="capitalize">{request.service_type?.toLowerCase().replace('_', ' ')}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                        {request.priority || 'NORMAL'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.created_at ? format(new Date(request.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status || 'PENDING'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Review Request #{selectedRequest.id.substring(0, 8)}</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Details</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Customer:</span> {selectedRequest.customer?.first_name} {selectedRequest.customer?.last_name}</p>
                  <p><span className="text-gray-500">Vehicle:</span> {selectedRequest.vehicle?.brand} {selectedRequest.vehicle?.model} ({selectedRequest.vehicle?.registration_number})</p>
                  <p><span className="text-gray-500">Type:</span> {selectedRequest.service_type}</p>
                  <p><span className="text-gray-500">Status:</span> {selectedRequest.status}</p>
                  <p><span className="text-gray-500">Issues:</span> {selectedRequest.reported_issues}</p>
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button onClick={() => handleApprove(selectedRequest.id)} className="flex-1">
                      Approve
                    </Button>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <Input 
                      placeholder="Reason for rejection" 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button variant="destructive" onClick={() => handleReject(selectedRequest.id)} className="w-full">
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'APPROVED' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Schedule Appointment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium mb-1 block">Date</label>
                      <Input 
                        type="date"
                        value={scheduleData.date}
                        onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Start Time</label>
                      <Input 
                        type="time"
                        value={scheduleData.startTime}
                        onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">End Time</label>
                      <Input 
                        type="time"
                        value={scheduleData.endTime}
                        onChange={(e) => setScheduleData({ ...scheduleData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSchedule(selectedRequest.id)} 
                    className="w-full"
                    disabled={!scheduleData.date || !scheduleData.startTime || !scheduleData.endTime}
                  >
                    Schedule
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
