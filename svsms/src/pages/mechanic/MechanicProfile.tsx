import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const MechanicProfile = () => {
  const { user } = useAuthStore();
  const primaryMembership = user?.memberships?.[0];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="font-semibold text-gray-500">Name:</span>
            <p className="text-lg">{user?.name}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Email:</span>
            <p className="text-lg">{user?.email}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Role:</span>
            <p className="text-lg capitalize">{user?.role}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Status:</span>
            <div className="mt-1">
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {primaryMembership && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Garage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{primaryMembership.garage_id}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6 flex items-center justify-center min-h-[100px]">
          <p className="text-lg text-blue-800 font-semibold">Job assignments coming in Phase 4</p>
        </CardContent>
      </Card>
    </div>
  );
};
