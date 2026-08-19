import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export const CustomerVehicleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    manufacturing_year: '',
    registration_number: '',
    vehicle_type: 'CAR',
    variant: '',
    fuel_type: 'PETROL',
    odometer: '',
    vin: ''
  });

  useEffect(() => {
    if (isEditing && id) {
      const fetchVehicle = async () => {
        try {
          const res = await apiClient.get(`/api/customer/vehicles/${id}`);
          const vehicle = res.data || res;
          setFormData({
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            manufacturing_year: vehicle.manufacturing_year?.toString() || '',
            registration_number: vehicle.registration_number || '',
            vehicle_type: vehicle.vehicle_type || 'CAR',
            variant: vehicle.variant || '',
            fuel_type: vehicle.fuel_type || 'PETROL',
            odometer: vehicle.odometer?.toString() || '',
            vin: vehicle.vin || ''
          });
        } catch (error) {
          console.error('Failed to fetch vehicle', error);
        }
      };
      fetchVehicle();
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        manufacturing_year: formData.manufacturing_year ? parseInt(formData.manufacturing_year, 10) : undefined,
        odometer: formData.odometer ? parseInt(formData.odometer, 10) : undefined
      };

      if (isEditing) {
        await apiClient.put(`/api/customer/vehicles/${id}`, payload);
      } else {
        await apiClient.post('/api/customer/vehicles', payload);
      }
      navigate('/customer/vehicles');
    } catch (error) {
      console.error('Failed to save vehicle', error);
      alert('Failed to save vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customer/vehicles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Brand / Make</label><Input
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                placeholder="e.g. Toyota"
              /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Model</label><Input
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                placeholder="e.g. Camry"
              /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing Year</label><Input
                name="manufacturing_year"
                type="number"
                value={formData.manufacturing_year}
                onChange={handleChange}
                required
                placeholder="e.g. 2021"
              /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label><Input
                name="registration_number"
                value={formData.registration_number}
                onChange={handleChange}
                required
                placeholder="e.g. AB12CD3456"
              /></div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CAR">Car</option>
                  <option value="MOTORCYCLE">Motorcycle</option>
                  <option value="SUV">SUV</option>
                  <option value="VAN">Van</option>
                  <option value="TRUCK">Truck</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Variant / Trim (Optional)</label><Input
                name="variant"
                value={formData.variant}
                onChange={handleChange}
                placeholder="e.g. XLE"
              /></div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                <select
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Odometer (km)</label><Input
                name="odometer"
                type="number"
                value={formData.odometer}
                onChange={handleChange}
                placeholder="e.g. 15000"
              /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">VIN (Optional)</label><Input
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                placeholder="Vehicle Identification Number"
              /></div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/customer/vehicles')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Vehicle'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
