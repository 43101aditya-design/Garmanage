import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { useGarageStore } from '../../store/garageStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export const CreateServiceRequest = () => {
  const navigate = useNavigate();
  const { currentGarage } = useGarageStore();
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    service_type: 'PERIODIC_SERVICE',
    problem_description: '',
    priority: 'NORMAL',
    preferred_date: '',
    preferred_time: ''
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await apiClient.get('/api/customer/vehicles');
        const v = Array.isArray(res) ? res : res.data || [];
        setVehicles(v);
        if (v.length > 0) {
          setFormData(prev => ({ ...prev, vehicle_id: v[0].id }));
        }
      } catch (error) {
        console.error('Failed to fetch vehicles', error);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGarage) {
      alert('Please select a garage first.');
      return;
    }
    
    setLoading(true);
    try {
      await apiClient.post('/api/customer/service-requests', {
        ...formData,
        garage_id: currentGarage.id
      });
      navigate('/customer/service-requests');
    } catch (error) {
      console.error('Failed to create request', error);
      alert('Failed to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentGarage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <h2 className="text-xl font-bold">No Garage Selected</h2>
        <p className="text-gray-500 text-center max-w-md">
          You need to select a garage before you can create a service request.
        </p>
        <Button onClick={() => navigate('/customer/select-garage')}>
          Select Garage
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customer/service-requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details - {currentGarage.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingVehicles ? (
            <div className="p-4 text-center text-gray-500">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500 mb-4">You have no registered vehicles.</p>
              <Button onClick={() => navigate('/customer/vehicles/new')}>
                Add Vehicle First
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Select Vehicle *</label>
                  <select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" disabled>Select a vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.brand} {v.model} ({v.registration_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Service Type *</label>
                  <select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PERIODIC_SERVICE">Periodic Service</option>
                    <option value="ENGINE">Engine</option>
                    <option value="BRAKE">Brake</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="AC">AC</option>
                    <option value="TYRE">Tyre</option>
                    <option value="BATTERY">Battery</option>
                    <option value="DIAGNOSTICS">Diagnostics</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Priority *</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date (Optional)</label><Input
                  name="preferred_date"
                  type="date"
                  value={formData.preferred_date}
                  onChange={handleChange}
                /></div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time (Optional)</label><Input
                  name="preferred_time"
                  type="time"
                  value={formData.preferred_time}
                  onChange={handleChange}
                /></div>
                
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Problem Description *</label>
                  <textarea
                    name="problem_description"
                    value={formData.problem_description}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Describe the issue you are experiencing..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate('/customer/service-requests')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
