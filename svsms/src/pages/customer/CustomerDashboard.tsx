import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';
import { useDbStore } from '../../store/dbStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Car, Calendar, ShieldCheck, MapPin, Phone, 
  Mail, Clock, ChevronRight, Wrench, Settings
} from 'lucide-react';

export const CustomerDashboard = () => {
  const { user } = useAuthStore();
  const { currentGarage } = useGarageStore();
  const { customers, vehicles, appointments } = useDbStore();
  const navigate = useNavigate();

  // Find corresponding customer and their fleet/appointments
  const customer = customers.find(c => c.email.toLowerCase() === user?.email.toLowerCase()) || customers[0];
  const myVehicles = customer ? vehicles.filter(v => v.customer_id === customer.id) : [];
  const myAppointments = customer ? appointments.filter(a => a.customer_id === customer.id) : [];
  
  // Get active service or last appointment for status timeline
  const activeService = myAppointments.find(a => a.status === 'In Progress' || a.status === 'Pending') || myAppointments[0];

  // Define steps for timeline tracking
  const steps = [
    { label: 'Vehicle Registered', desc: 'Added to profile', done: myVehicles.length > 0 },
    { label: 'Service Requested', desc: 'Ticket open', done: !!activeService },
    { label: 'Appointment Scheduled', desc: 'Bay reserved', done: activeService && (activeService.status === 'Pending' || activeService.status === 'In Progress' || activeService.status === 'Completed') },
    { label: 'Repair in Progress', desc: 'Bays active', done: activeService && (activeService.status === 'In Progress' || activeService.status === 'Completed') },
    { label: 'Ready for Pickup', desc: 'QC completed', done: activeService && activeService.status === 'Completed' }
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Customer Service Console
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
            Welcome, {user?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track active service tickets, book appointments, and oversee your vehicles.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/customer/vehicles/new')}>
            + Add Vehicle
          </Button>
          <Button onClick={() => navigate('/customer/service-requests/new')} className="shadow-lg shadow-primary/20">
            Request Service
          </Button>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/10 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold">Active Service Progress Tracker</CardTitle>
              <CardDescription className="text-xs">
                {activeService ? `Currently tracking: ${activeService.service_type}` : 'No active service logs'}
              </CardDescription>
            </div>
            {activeService && (
              <Badge variant={activeService.status === 'Completed' ? 'success' : activeService.status === 'In Progress' ? 'warning' : 'info'}>
                {activeService.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="relative flex flex-col md:flex-row md:justify-between gap-6 md:gap-4">
            {/* Horizontal Line for MD+ screen */}
            <div className="hidden md:block absolute top-4 left-4 right-4 h-0.5 bg-border/40 z-0" />
            
            {steps.map((step, idx) => {
              const isActive = activeService && (
                (idx === 0 && steps[0].done) ||
                (idx === 1 && activeService.status === 'Pending') ||
                (idx === 2 && activeService.status === 'Pending') ||
                (idx === 3 && activeService.status === 'In Progress') ||
                (idx === 4 && activeService.status === 'Completed')
              );

              return (
                <div key={idx} className="flex md:flex-col md:items-center flex-1 relative z-10 gap-3 md:gap-0">
                  <div className="flex items-center md:justify-center md:w-full md:mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition-all duration-300 ${
                      step.done 
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_8px_rgba(59,130,246,0.35)]'
                        : isActive 
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500 animate-pulse'
                          : 'bg-card text-muted-foreground border-border/80'
                    }`}>
                      {idx + 1}
                    </div>
                  </div>
                  <div className="md:text-center">
                    <p className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Grid splits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Selected garage/provider details */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Garage Information</CardTitle>
            <CardDescription className="text-xs">Your chosen service center</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentGarage ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-muted/30 border border-border/30 space-y-1">
                  <p className="font-bold text-sm text-foreground">{currentGarage.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {currentGarage.address}, {currentGarage.city}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> {currentGarage.phone}
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/customer/select-garage')} 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                >
                  Change Garage Location
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-muted-foreground">Select a service garage to view booking availability.</p>
                <Button onClick={() => navigate('/customer/select-garage')} size="sm" className="w-full">
                  Select Garage
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet listing */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">My Fleet</CardTitle>
                <CardDescription className="text-xs">Registered vehicles details</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs hover:text-primary" onClick={() => navigate('/customer/vehicles')}>
                Manage Fleet <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {myVehicles.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No vehicles registered yet.</p>
                <Button className="mt-3 text-xs" size="sm" onClick={() => navigate('/customer/vehicles/new')}>
                  Add Vehicle
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {myVehicles.map(veh => (
                  <div key={veh.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                        <Car className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{veh.make} {veh.model}</h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Plate: {veh.license_plate} • Year: {veh.year}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {veh.mileage?.toLocaleString()} mi
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Info and recent appointments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Profile Settings</CardTitle>
            <CardDescription className="text-xs">Manage personal notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>{customer?.phone || 'No phone registered'}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={() => navigate('/settings')}>
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Edit Profile Details
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Appointments Schedule</CardTitle>
                <CardDescription className="text-xs">Upcoming or history records</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs hover:text-primary" onClick={() => navigate('/customer/appointments')}>
                Full Calendar <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {myAppointments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No scheduled appointments.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {myAppointments.slice(0, 3).map(app => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 border border-indigo-500/20">
                        <Wrench className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{app.service_type}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {new Date(app.appointment_date).toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      app.status === 'Completed' ? 'success' :
                      app.status === 'In Progress' ? 'warning' : 'info'
                    }>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
