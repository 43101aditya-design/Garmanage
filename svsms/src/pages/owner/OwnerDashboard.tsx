import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const OwnerDashboard = () => {
  const { user } = useAuthStore();
  const { garages, fetchGarages } = useGarageStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const activeGarages = garages.filter(g => g.status === 'ACTIVE').length;
  const totalMembers = garages.reduce((acc, g) => acc + (g.member_count || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
        <Button onClick={() => navigate('/owner/garages/new')}>+ Add Service Provider</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Garages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{garages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Garages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeGarages}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalMembers}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Garages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {garages.map(garage => (
            <Card key={garage.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{garage.name}</CardTitle>
                  <Badge variant={garage.status === 'ACTIVE' ? 'success' : garage.status === 'INACTIVE' ? 'secondary' : 'destructive'}>
                    {garage.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{garage.city}, {garage.state}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Members: {garage.member_count || 0}</p>
                <Button className="mt-4 w-full" variant="outline" onClick={() => navigate(`/owner/garages/${garage.id}`)}>
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
