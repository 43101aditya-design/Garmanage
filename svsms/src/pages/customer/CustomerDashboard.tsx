import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const CustomerDashboard = () => {
  const { user } = useAuthStore();
  const { currentGarage } = useGarageStore();
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><span className="font-semibold">Email:</span> {user?.email}</p>
            {user?.phone && <p><span className="font-semibold">Phone:</span> {user?.phone}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected Service Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentGarage ? (
              <>
                <div>
                  <p className="font-bold text-lg">{currentGarage.name}</p>
                  <p className="text-gray-600">{currentGarage.address}, {currentGarage.city}</p>
                  <p className="text-gray-600">{currentGarage.phone}</p>
                </div>
                <Button onClick={() => navigate('/customer/select-garage')} variant="outline">
                  Change Provider
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-500 mb-4">No service provider selected yet.</p>
                <Button onClick={() => navigate('/customer/select-garage')}>
                  Select Service Provider
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6 flex items-center justify-center min-h-[150px]">
          <p className="text-xl text-blue-800 font-semibold">Vehicle registration coming in Phase 2</p>
        </CardContent>
      </Card>
    </div>
  );
};
