import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Car } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

export const CustomerVehicles = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await apiClient.get('/api/customer/vehicles');
        // Handle array response directly or inside data field
        setVehicles(Array.isArray(res) ? res : res.data || []);
      } catch (error) {
        console.error('Failed to fetch vehicles', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
        <Button onClick={() => navigate('/customer/vehicles/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6 text-gray-500">Loading...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-10">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No vehicles found. Add your first vehicle to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </div>
                      <div className="text-sm text-gray-500">{vehicle.variant}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{vehicle.registration_number}</Badge>
                    </TableCell>
                    <TableCell>{vehicle.manufacturing_year}</TableCell>
                    <TableCell className="capitalize">{vehicle.vehicle_type?.toLowerCase()}</TableCell>
                    <TableCell className="capitalize">{vehicle.fuel_type?.toLowerCase()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/customer/vehicles/${vehicle.id}`)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
