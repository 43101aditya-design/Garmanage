import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

export const GarageSelection = () => {
  const { garages, fetchGarages, setCurrentGarage, currentGarage } = useGarageStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const activeGarages = garages.filter(g => g.status === 'ACTIVE');
  const filteredGarages = activeGarages.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.city && g.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (garage: any) => {
    setCurrentGarage(garage);
    toast.success(`Selected ${garage.name} as your service provider`);
    navigate('/customer');
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <h1 className="text-3xl font-bold">Select Service Provider</h1>
        <Input 
          placeholder="Search by name or city..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGarages.map((garage) => (
          <Card key={garage.id} className={currentGarage?.id === garage.id ? "border-blue-500 shadow-md" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{garage.name}</CardTitle>
                {currentGarage?.id === garage.id && <Badge variant="default">Current</Badge>}
              </div>
              <p className="text-sm text-gray-500">{garage.city}, {garage.state}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p className="font-semibold">Address:</p>
                <p className="text-gray-600">{garage.address}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold">Contact:</p>
                <p className="text-gray-600">{garage.phone}</p>
              </div>
              <Button 
                className="w-full" 
                variant={currentGarage?.id === garage.id ? "secondary" : "default"}
                onClick={() => handleSelect(garage)}
                disabled={currentGarage?.id === garage.id}
              >
                {currentGarage?.id === garage.id ? 'Selected' : 'Select Provider'}
              </Button>
            </CardContent>
          </Card>
        ))}
        {filteredGarages.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            No service providers found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};
