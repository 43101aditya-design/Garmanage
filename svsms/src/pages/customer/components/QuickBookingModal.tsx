import React, { useState, useEffect } from 'react';
import { 
  X, Wrench, Car, Calendar, Clock, AlertCircle, 
  CheckCircle2, ShieldCheck, MapPin, ChevronRight, 
  ChevronLeft, Sparkles, Loader2, Plus 
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { apiClient } from '../../../api/services/apiClient';
import { savedGarageService, CatalogService } from '../../../api/services/savedGarageService';
import { toast } from 'sonner';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  garage: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone?: string;
  } | null;
  onBookingSuccess?: () => void;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  garage,
  onBookingSuccess
}) => {
  const [step, setStep] = useState<number>(1);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Form state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedServiceName, setSelectedServiceName] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState<string>('10:00');
  const [priority, setPriority] = useState<string>('NORMAL');
  const [problemDescription, setProblemDescription] = useState<string>('');

  // Inline vehicle creation if customer has no vehicles
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    brand: '',
    model: '',
    manufacturing_year: new Date().getFullYear().toString(),
    registration_number: '',
    vehicle_type: 'CAR',
    fuel_type: 'PETROL'
  });
  const [addingVehicle, setAddingVehicle] = useState(false);

  useEffect(() => {
    if (!isOpen || !garage) return;

    let isMounted = true;
    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const [vehRes, srvRes] = await Promise.all([
          apiClient.get('/api/customer/vehicles'),
          savedGarageService.getServices().catch(() => [])
        ]);

        if (!isMounted) return;

        const vList = Array.isArray(vehRes) ? vehRes : vehRes?.data || [];
        setVehicles(vList);
        if (vList.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(vList[0].id);
        }

        const sList: CatalogService[] = Array.isArray(srvRes) ? srvRes : [];
        // Fallback default services if catalog is empty
        if (sList.length === 0) {
          const fallbackServices: CatalogService[] = [
            { id: 'srv-oil', name: 'Oil & Filter Change', description: 'Complete synthetic engine oil & filter replacement with 30-point inspection.', base_price: 49.99, estimated_duration_minutes: 45 },
            { id: 'srv-brake', name: 'Brake Pad Replacement', description: 'Front/Rear ceramic brake pad inspection & replacement.', base_price: 129.99, estimated_duration_minutes: 90 },
            { id: 'srv-diag', name: 'Computer Diagnostics', description: 'OBD-II comprehensive sensor & electronic system scan.', base_price: 69.99, estimated_duration_minutes: 30 },
            { id: 'srv-ac', name: 'AC Service & Recharge', description: 'Refrigerant recovery, vacuum leak test, and precision gas recharge.', base_price: 89.99, estimated_duration_minutes: 60 },
            { id: 'srv-general', name: 'Comprehensive Periodic Service', description: 'Full mechanical tune-up, fluid top-ups, belt checks, and road testing.', base_price: 199.99, estimated_duration_minutes: 120 }
          ];
          setServices(fallbackServices);
          setSelectedServiceId(fallbackServices[0].id);
          setSelectedServiceName(fallbackServices[0].name);
        } else {
          setServices(sList);
          setSelectedServiceId(sList[0].id);
          setSelectedServiceName(sList[0].name);
        }
      } catch (err) {
        console.error('Failed to load quick booking data', err);
        toast.error('Failed to load vehicles or services');
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, garage]);

  if (!isOpen || !garage) return null;

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.brand || !newVehicle.model || !newVehicle.registration_number) {
      toast.error('Please fill in Brand, Model, and License Plate');
      return;
    }

    setAddingVehicle(true);
    try {
      const res: any = await apiClient.post('/api/customer/vehicles', {
        ...newVehicle,
        manufacturing_year: parseInt(newVehicle.manufacturing_year, 10)
      });
      const createdId = res?.id || res?.data?.id;
      toast.success('Vehicle added successfully!');
      
      // Refresh vehicles
      const refreshed: any = await apiClient.get('/api/customer/vehicles');
      const vList = Array.isArray(refreshed) ? refreshed : refreshed?.data || [];
      setVehicles(vList);
      setSelectedVehicleId(createdId || (vList.length ? vList[vList.length - 1].id : ''));
      setShowAddVehicle(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedService = services.find(s => s.id === selectedServiceId) || services[0];

  const handleConfirmBooking = async () => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }
    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }

    setIsSubmitting(true);
    try {
      const serviceType = selectedService.name || 'General Service';
      const description = problemDescription.trim() 
        ? `${selectedService.description || serviceType} - Notes: ${problemDescription.trim()}`
        : (selectedService.description || serviceType);

      const res: any = await apiClient.post('/api/customer/service-requests', {
        vehicle_id: selectedVehicleId,
        garage_id: garage.id,
        service_type: serviceType,
        problem_description: description,
        priority: priority || 'NORMAL',
        preferred_date: preferredDate,
        preferred_time: preferredTime ? `${preferredTime}:00` : '10:00:00'
      });

      setBookingSuccess({
        request_number: res?.request_number || `SVSR-${new Date().getFullYear()}-CONFIRMED`,
        id: res?.id,
        garage_name: garage.name,
        service_type: serviceType,
        date: preferredDate,
        time: preferredTime
      });

      toast.success(`Service request booked at ${garage.name}!`);
      if (onBookingSuccess) onBookingSuccess();
    } catch (error: any) {
      console.error('Quick booking error', error);
      toast.error(error.message || 'Booking failed. Please check details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setBookingSuccess(null);
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Quick Service Booking
                <Badge variant="secondary" className="text-[10px] font-mono">FAVORITE GARAGE</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Direct fast-track reservation workflow</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Garage Info Banner (Locked Preselected Garage) */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground">Booking at: </span>
              <strong className="text-foreground font-semibold">{garage.name}</strong>
              <span className="text-muted-foreground ml-1.5 font-mono text-[11px]">({garage.city})</span>
            </div>
          </div>
          <Badge variant="success" className="text-[10px] font-medium tracking-wide">
            LOCKED PRESELECTED
          </Badge>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loadingInitial ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading vehicles and service catalog...</p>
            </div>
          ) : bookingSuccess ? (
            /* Booking Confirmation Screen */
            <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-extrabold text-foreground">Service Request Submitted!</h4>
                <p className="text-sm text-muted-foreground">
                  Your appointment request has been logged with <strong className="text-foreground">{bookingSuccess.garage_name}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-left space-y-2.5 max-w-md mx-auto text-xs">
                <div className="flex justify-between pb-2 border-b border-border/30">
                  <span className="text-muted-foreground">Request Number:</span>
                  <span className="font-mono font-bold text-primary">{bookingSuccess.request_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span className="font-medium text-foreground">{selectedVehicle ? `${selectedVehicle.brand || selectedVehicle.make} ${selectedVehicle.model}` : 'Vehicle'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-medium text-foreground">{bookingSuccess.service_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled Date:</span>
                  <span className="font-medium text-foreground">{bookingSuccess.date} at {bookingSuccess.time}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <Button onClick={handleResetAndClose} className="px-6 shadow-md shadow-primary/20">
                  View My Service Requests
                </Button>
              </div>
            </div>
          ) : (
            /* Multi-step booking form */
            <div className="space-y-6">
              
              {/* Stepper indicator */}
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</span>
                  <span className={`text-xs font-semibold ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>Vehicle & Service</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
                  <span className={`text-xs font-semibold ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>Date, Time & Notes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</span>
                  <span className={`text-xs font-semibold ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`}>Review & Confirm</span>
                </div>
              </div>

              {/* STEP 1: VEHICLE & SERVICE SELECTION */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  
                  {/* Vehicle Section */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-primary" /> Select Your Vehicle *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddVehicle(!showAddVehicle)}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3 h-3" /> {showAddVehicle ? 'Choose Existing' : 'Add New Vehicle'}
                      </button>
                    </div>

                    {showAddVehicle ? (
                      /* Quick Add Vehicle Form */
                      <form onSubmit={handleCreateVehicle} className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                        <p className="text-xs font-semibold text-primary">Register New Vehicle</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <Input
                            placeholder="Make (e.g. Honda)"
                            value={newVehicle.brand}
                            onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                            className="h-8 text-xs"
                            required
                          />
                          <Input
                            placeholder="Model (e.g. Civic)"
                            value={newVehicle.model}
                            onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                            className="h-8 text-xs"
                            required
                          />
                          <Input
                            placeholder="Plate No (e.g. ABC-123)"
                            value={newVehicle.registration_number}
                            onChange={(e) => setNewVehicle({ ...newVehicle, registration_number: e.target.value })}
                            className="h-8 text-xs"
                            required
                          />
                          <Input
                            type="number"
                            placeholder="Year"
                            value={newVehicle.manufacturing_year}
                            onChange={(e) => setNewVehicle({ ...newVehicle, manufacturing_year: e.target.value })}
                            className="h-8 text-xs"
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddVehicle(false)} className="text-xs h-7">
                            Cancel
                          </Button>
                          <Button type="submit" size="sm" disabled={addingVehicle} className="text-xs h-7">
                            {addingVehicle ? 'Saving...' : 'Save & Select'}
                          </Button>
                        </div>
                      </form>
                    ) : vehicles.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                        <p className="text-xs text-muted-foreground">No registered vehicles found in your account.</p>
                        <Button size="sm" onClick={() => setShowAddVehicle(true)} className="text-xs">
                          + Register Vehicle Now
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {vehicles.map((v) => {
                          const isSelected = selectedVehicleId === v.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => setSelectedVehicleId(v.id)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                                isSelected 
                                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary' 
                                  : 'border-border/60 hover:border-border hover:bg-muted/30'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Car className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs text-foreground truncate">
                                  {v.brand || v.make} {v.model}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {v.registration_number || v.license_plate} • {v.manufacturing_year || v.year}
                                </p>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Service Selection Section */}
                  <div className="space-y-2.5 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-primary" /> Select Required Service *
                    </label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {services.map((s) => {
                        const isSelected = selectedServiceId === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedServiceId(s.id);
                              setSelectedServiceName(s.name);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                                : 'border-border/60 hover:border-border hover:bg-muted/20'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-xs text-foreground flex items-center gap-2">
                                {s.name}
                                {s.estimated_duration_minutes && (
                                  <span className="text-[10px] font-normal text-muted-foreground flex items-center gap-0.5 font-mono">
                                    <Clock className="w-2.5 h-2.5" /> ~{s.estimated_duration_minutes}m
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{s.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-primary">
                                {Number(s.base_price) > 0 ? `$${Number(s.base_price).toFixed(2)}` : 'Custom Quote'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: DATE, TIME & DETAILS */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Preferred Date *
                      </label>
                      <Input
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="text-xs h-9"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Preferred Time *
                      </label>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="09:00">09:00 AM - Morning Slot</option>
                        <option value="10:30">10:30 AM - Late Morning</option>
                        <option value="12:00">12:00 PM - Noon Slot</option>
                        <option value="14:00">02:00 PM - Afternoon Slot</option>
                        <option value="15:30">03:30 PM - Late Afternoon</option>
                        <option value="17:00">05:00 PM - Evening Slot</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Priority Level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            priority === p 
                              ? p === 'URGENT' 
                                ? 'bg-red-500/20 border-red-500 text-red-600 font-bold' 
                                : 'bg-primary/20 border-primary text-primary font-bold'
                              : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Specific Symptoms or Notes (Optional)
                    </label>
                    <textarea
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      placeholder="e.g. Squeaking noise when braking at low speed, or check engine light on..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW & CONFIRM */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2.5 border-b border-border/30">
                      <span className="text-muted-foreground">Service Provider:</span>
                      <strong className="text-foreground font-semibold">{garage.name} ({garage.city})</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <strong className="text-foreground font-semibold">
                        {selectedVehicle ? `${selectedVehicle.brand || selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registration_number || selectedVehicle.license_plate})` : 'Not selected'}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Service:</span>
                      <strong className="text-foreground font-semibold">{selectedServiceName || selectedService?.name}</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Date & Slot:</span>
                      <strong className="text-foreground font-semibold">{preferredDate} at {preferredTime}</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge variant={priority === 'URGENT' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {priority}
                      </Badge>
                    </div>

                    {problemDescription && (
                      <div className="pt-2 border-t border-border/30">
                        <span className="text-muted-foreground block mb-0.5">Notes:</span>
                        <p className="text-foreground italic bg-background/50 p-2 rounded border border-border/30">{problemDescription}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2.5 border-t border-border/30 font-bold">
                      <span className="text-foreground">Estimated Base Cost:</span>
                      <span className="font-mono text-sm text-primary">
                        {Number(selectedService?.base_price) > 0 ? `$${Number(selectedService.base_price).toFixed(2)}` : 'Diagnostic Estimate'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Your service request will be reviewed by workshop managers and scheduled into their active bay system.</span>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-border/30">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(step - 1)}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAndClose}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (step === 1 && !selectedVehicleId) {
                        toast.error('Please select or add a vehicle');
                        return;
                      }
                      setStep(step + 1);
                    }}
                    className="text-xs shadow-md shadow-primary/20"
                  >
                    Next Step <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Confirming Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Confirm & Reserve Service
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
