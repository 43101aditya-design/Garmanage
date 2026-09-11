import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Car, Calendar, ShieldCheck, MapPin, Phone, 
  Mail, Clock, ChevronRight, Wrench, Settings,
  Heart, Bookmark, Sparkles, Trash2, Plus, ArrowRight,
  Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { savedGarageService, SavedGarage } from '../../api/services/savedGarageService';
import { QuickBookingModal } from './components/QuickBookingModal';
import { toast } from 'sonner';

export const CustomerDashboard = () => {
  const { user } = useAuthStore();
  const { currentGarage, setCurrentGarage } = useGarageStore();
  const navigate = useNavigate();

  // Real backend data states
  const [savedGarages, setSavedGarages] = useState<SavedGarage[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(true);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  // Quick booking modal state
  const [quickBookingGarage, setQuickBookingGarage] = useState<any | null>(null);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState<boolean>(false);

  // Fetch all real customer data
  const fetchCustomerData = useCallback(async () => {
    try {
      const [savedRes, vehRes, apptRes, srvRes] = await Promise.all([
        savedGarageService.getSavedGarages().catch(() => []),
        apiClient.get('/api/customer/vehicles').catch(() => []),
        apiClient.get('/api/customer/appointments').catch(() => []),
        apiClient.get('/api/customer/service-requests').catch(() => [])
      ]);

      const sList = Array.isArray(savedRes) ? savedRes : [];
      setSavedGarages(sList);

      const vList = Array.isArray(vehRes) ? vehRes : vehRes?.data || [];
      setVehicles(vList);

      const aList = Array.isArray(apptRes) ? apptRes : apptRes?.data || [];
      setAppointments(aList);

      const rList = Array.isArray(srvRes) ? srvRes : srvRes?.data || [];
      setServiceRequests(rList);
    } catch (err) {
      console.error('Failed to load customer dashboard data', err);
    } finally {
      setLoadingSaved(false);
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  // Handle unsaving a garage
  const handleUnsave = async (e: React.MouseEvent, garageId: string, garageName: string) => {
    e.stopPropagation();
    setUnsavingId(garageId);
    try {
      await savedGarageService.unsaveGarage(garageId);
      setSavedGarages(prev => prev.filter(g => g.id !== garageId));
      toast.success(`Removed ${garageName} from your saved garages`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove saved garage');
    } finally {
      setUnsavingId(null);
    }
  };

  // Launch quick booking modal
  const handleOpenQuickBooking = (garage: any) => {
    setQuickBookingGarage({
      id: garage.id,
      name: garage.name,
      address: garage.address || '',
      city: garage.city || '',
      phone: garage.phone || ''
    });
    setIsQuickBookingOpen(true);
  };

  // Set garage as active provider
  const handleSetCurrentGarage = (garage: SavedGarage) => {
    setCurrentGarage(garage as any);
    toast.success(`Selected ${garage.name} as your active service center`);
  };

  // Compute active service ticket for progress tracking
  const activeServiceRequest = serviceRequests.find(sr => sr.status === 'SUBMITTED' || sr.status === 'UNDER_REVIEW' || sr.status === 'APPROVED' || sr.status === 'SCHEDULED') || serviceRequests[0];
  const activeAppointment = appointments.find(a => a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS') || appointments[0];

  const activeStatus = activeAppointment?.status || activeServiceRequest?.status || null;

  // Steps for progress tracker
  const steps = [
    { label: 'Vehicle Registered', desc: 'Ready in profile', done: vehicles.length > 0 },
    { label: 'Service Requested', desc: 'Ticket open', done: !!activeServiceRequest || !!activeAppointment },
    { label: 'Appointment Scheduled', desc: 'Bay reserved', done: activeStatus === 'SCHEDULED' || activeStatus === 'IN_PROGRESS' || activeStatus === 'COMPLETED' },
    { label: 'Repair in Progress', desc: 'Active in bay', done: activeStatus === 'IN_PROGRESS' || activeStatus === 'COMPLETED' },
    { label: 'Ready for Pickup', desc: 'Inspection done', done: activeStatus === 'COMPLETED' }
  ];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Customer Service Console
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
            Welcome, {user?.name || 'Customer'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your saved favorite garages, fast-track quick bookings, and track active vehicle maintenance.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate('/customer/vehicles/new')}>
            <Car className="w-4 h-4 mr-1.5" /> + Add Vehicle
          </Button>
          <Button variant="outline" onClick={() => navigate('/customer/select-garage')}>
            <Bookmark className="w-4 h-4 mr-1.5 text-primary" /> Find Garages
          </Button>
          <Button onClick={() => navigate('/customer/service-requests/new')} className="shadow-lg shadow-primary/20">
            <Wrench className="w-4 h-4 mr-1.5" /> Request Service
          </Button>
        </div>
      </div>

      {/* SAVED GARAGES (FAVORITES) SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Saved Garages & Favorites
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {savedGarages.length}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Your preferred service providers for instant 1-click booking
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-primary hover:underline"
            onClick={() => navigate('/customer/select-garage')}
          >
            Explore All Garages <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>

        {loadingSaved ? (
          <div className="p-10 rounded-2xl border border-border/40 bg-card flex justify-center items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading saved garages...</span>
          </div>
        ) : savedGarages.length === 0 ? (
          /* Rich Empty State */
          <Card className="border-dashed border-2 border-border/60 bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Heart className="w-7 h-7 text-red-500" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-foreground">No Saved Garages Yet</h3>
                <p className="text-xs text-muted-foreground">
                  Save your favorite garages to book services faster without searching every time.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/customer/select-garage')} 
                className="text-xs font-semibold shadow-md shadow-primary/20"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5" /> Find Garages
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Saved Garages Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedGarages.map((garage) => {
              const isSelected = currentGarage?.id === garage.id;
              const isUnsaving = unsavingId === garage.id;

              return (
                <Card 
                  key={garage.id} 
                  className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 flex flex-col justify-between ${
                    isSelected ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.02]' : 'border-border/60 bg-card'
                  }`}
                >
                  {/* Top Bar Decoration */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-primary to-indigo-500 opacity-80" />

                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {garage.name}
                          </CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          {garage.city || 'Downtown'}{garage.state ? `, ${garage.state}` : ''}
                        </p>
                      </div>

                      {/* Saved Heart indicator / Unsave button */}
                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <Badge variant="default" className="text-[10px] uppercase font-mono px-2 py-0.5">
                            Active
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleUnsave(e, garage.id, garage.name)}
                          disabled={isUnsaving}
                          title="Remove from saved garages"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                        >
                          {isUnsaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 pt-0 space-y-4 text-xs">
                    {/* Details Box */}
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                      <p className="text-[11px] text-muted-foreground truncate">
                        <strong className="text-foreground font-medium">Address:</strong> {garage.address}
                      </p>
                      {garage.phone && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3 text-primary shrink-0" /> {garage.phone}
                        </p>
                      )}
                      {garage.garage_type && (
                        <p className="text-[11px] text-muted-foreground capitalize">
                          <strong className="text-foreground font-medium">Specialty:</strong> {garage.garage_type} service
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleOpenQuickBooking(garage)}
                        className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Book Service
                      </Button>

                      {isSelected ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled
                          className="w-full text-xs font-medium cursor-default"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" /> Active Bay
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetCurrentGarage(garage)}
                          className="w-full text-xs font-medium hover:border-primary hover:text-primary"
                        >
                          Select Provider
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress Timeline Stepper */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/10 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold">Active Service Progress Tracker</CardTitle>
              <CardDescription className="text-xs">
                {activeServiceRequest 
                  ? `Tracking: ${activeServiceRequest.service_type} (${activeServiceRequest.request_number})`
                  : activeAppointment 
                    ? `Upcoming bay reservation: ${activeAppointment.service_type || 'Scheduled Service'}`
                    : 'No active service tickets logged'}
              </CardDescription>
            </div>
            {activeStatus && (
              <Badge variant={activeStatus === 'COMPLETED' ? 'success' : activeStatus === 'IN_PROGRESS' ? 'warning' : 'info'}>
                {activeStatus}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="relative flex flex-col md:flex-row md:justify-between gap-6 md:gap-4">
            <div className="hidden md:block absolute top-4 left-4 right-4 h-0.5 bg-border/40 z-0" />
            
            {steps.map((step, idx) => {
              const isActive = (idx === 0 && steps[0].done) ||
                (idx === 1 && (activeStatus === 'SUBMITTED' || activeStatus === 'UNDER_REVIEW')) ||
                (idx === 2 && activeStatus === 'SCHEDULED') ||
                (idx === 3 && activeStatus === 'IN_PROGRESS') ||
                (idx === 4 && activeStatus === 'COMPLETED');

              return (
                <div key={idx} className="flex md:flex-col md:items-center flex-1 relative z-10 gap-3 md:gap-0">
                  <div className="flex items-center md:justify-center md:w-full md:mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition-all duration-300 ${
                      step.done 
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_8px_rgba(168,85,247,0.35)]'
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
        
        {/* Selected Garage / Provider Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Selected Service Center</CardTitle>
            <CardDescription className="text-xs">Currently active workshop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentGarage ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1.5">
                  <p className="font-bold text-sm text-foreground">{currentGarage.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {currentGarage.address}, {currentGarage.city}
                  </p>
                  {currentGarage.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" /> {currentGarage.phone}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleOpenQuickBooking(currentGarage)}
                    size="sm"
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Quick Book
                  </Button>
                  <Button 
                    onClick={() => navigate('/customer/select-garage')} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>
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
                <CardDescription className="text-xs">Registered vehicles in your account</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs hover:text-primary" onClick={() => navigate('/customer/vehicles')}>
                Manage Fleet <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {vehicles.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <Car className="w-10 h-10 mx-auto opacity-20" />
                <p className="text-sm font-medium">No vehicles registered yet.</p>
                <Button className="mt-1 text-xs" size="sm" onClick={() => navigate('/customer/vehicles/new')}>
                  + Add Vehicle
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {vehicles.map(veh => (
                  <div key={veh.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                        <Car className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{veh.brand || veh.make} {veh.model}</h4>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Plate: {veh.registration_number || veh.license_plate} • Year: {veh.manufacturing_year || veh.year} • {veh.fuel_type || 'Petrol'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {veh.odometer ? `${veh.odometer.toLocaleString()} km` : 'Active'}
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
            <CardTitle className="text-base font-bold">Profile Info</CardTitle>
            <CardDescription className="text-xs">Account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{user?.phone || 'Contact verified'}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs mt-2" onClick={() => navigate('/customer/service-requests')}>
              <Wrench className="w-3.5 h-3.5 mr-1.5" /> View Service Requests ({serviceRequests.length})
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Appointments Schedule</CardTitle>
                <CardDescription className="text-xs">Confirmed service visits</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs hover:text-primary" onClick={() => navigate('/customer/appointments')}>
                Full Calendar <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {appointments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No scheduled appointments.</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate('/customer/service-requests/new')}>
                  Schedule an Appointment
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {appointments.slice(0, 3).map(app => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-muted/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 border border-indigo-500/20">
                        <Wrench className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground">{app.garage?.name || 'Service Garage'}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {app.appointment_date || app.scheduled_date} • {app.appointment_time || app.start_time || '10:00 AM'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      app.status === 'COMPLETED' ? 'success' :
                      app.status === 'IN_PROGRESS' ? 'warning' : 'info'
                    }>
                      {app.status || 'SCHEDULED'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Booking Modal */}
      <QuickBookingModal
        isOpen={isQuickBookingOpen}
        onClose={() => setIsQuickBookingOpen(false)}
        garage={quickBookingGarage}
        onBookingSuccess={() => {
          fetchCustomerData();
        }}
      />
    </div>
  );
};
