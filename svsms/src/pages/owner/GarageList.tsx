import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarageStore } from '../../store/garageStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

export const GarageList = () => {
  const { garages, fetchGarages } = useGarageStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const filteredGarages = garages.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.city && g.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Garage Management</h1>
        <Button onClick={() => navigate('/owner/garages/new')}>+ Add Garage</Button>
      </div>

      <div className="flex items-center space-x-2">
        <Input 
          placeholder="Search garages..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGarages.map((garage) => (
              <TableRow key={garage.id}>
                <TableCell className="font-medium">{garage.name}</TableCell>
                <TableCell>{garage.city}, {garage.state}</TableCell>
                <TableCell>{garage.phone}</TableCell>
                <TableCell>
                  <Badge variant={garage.status === 'ACTIVE' ? 'success' : garage.status === 'INACTIVE' ? 'secondary' : 'destructive'}>
                    {garage.status}
                  </Badge>
                </TableCell>
                <TableCell>{garage.member_count || 0}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/owner/garages/${garage.id}`)}>
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
