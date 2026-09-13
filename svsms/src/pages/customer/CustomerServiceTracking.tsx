import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle2, Clock, AlertTriangle, ArrowLeft, RefreshCw, 
  Wrench, Car, MapPin, ShieldCheck, UserCheck, Calendar,
  AlertCircle, ChevronRight, Sparkles, Check, Info, Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiClient } from '../../api/services/apiClient';
import { formatDate } from '../../utils/format';

interface TimelineStage {
  key: string;
  label: string;
  description: string;
  state: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  timestamp: string | null;
}

interface StatusHistoryItem {
  id: string;
  previous_status: string | null;
  new_status: string;
  stage_label: string;
  changed_at: string;
  reason: string | null;
  estimated_completion_at: string | null;
}

interface TrackingData {
  job_id?: string;
  job_number?: string;
  appointment_id?: string;
  current_status: string;
  current_stage_label: string;
  next_stage: string;
  progress_percent: number;
  delay_status: 'ON_TIME' | 'AT_RISK' | 'DELAYED' | 'COMPLETED' | 'CANCELLED';
  is_delayed: boolean;
  delay_reason: string | null;
  estimated_completion_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_updated: string | null;
  scheduled_time?: string;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year?: number;
    license_plate: string;
  };
  service?: {
    type: string;
    description: string;
    priority: string;
    complexity?: string;
    estimated_duration_minutes?: number;
  };
  garage: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone?: string;
  };
  mechanic?: {
    name: string;
    certified: boolean;
  } | null;
  timeline: TimelineStage[];
  history: StatusHistoryItem[];
}

export const CustomerServiceTracking = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState<number>(0);

  const fetchTracking = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const endpoint = id 
        ? `/api/jobs/customer/tracking/${id}`
        : `/api/jobs/customer/active-tracking`;

      const res: any = await apiClient.get(endpoint);
      if (res && res.tracking) {
        setData(res.tracking);
      } else if (res && res.active === false) {
        setData(null);
      } else {
        setError('No tracking record available for this vehicle.');
      }
      setLastRefreshedAt(new Date());
      setSecondsSinceRefresh(0);
    } catch (err: any) {
      console.error('Failed to fetch tracking details:', err);
      if (!isSilent) {
        setError(err.message || 'Unable to load service status. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  // Real-time controlled polling (every 20s when window has focus)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTracking(true);
      }
    }, 20000);

    const timerInterval = setInterval(() => {
      setSecondsSinceRefresh(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [fetchTracking]);

  // Format friendly ETA
  const formatETA = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Being Calculated';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Being Calculated';

      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();

      const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
      if (isToday) return `Today, ${timeStr}`;
      if (isTomorrow) return `Tomorrow, ${timeStr}`;
      return `${formatDate(d)}, ${timeStr}`;
    } catch {
      return 'Being Calculated';
    }
  };

  // Format human elapsed time
  const formatTimeAgo = (seconds: number) => {
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  // Helper description of current stage
  const getCurrentStageExplanation = (stageKey: string) => {
    switch (stageKey) {
      case 'CONFIRMED':
        return 'Your appointment is confirmed and reserved in the workshop bay schedule. The intake team will inspect your car upon arrival.';
      case 'CREATED':
        return 'Your vehicle has arrived at the service center and intake check-in is complete. Technicians are preparing for diagnostics.';
      case 'READY_FOR_ASSIGNMENT':
        return 'Initial diagnostics and vehicle inspection have completed. A dedicated certified technician is being assigned.';
      case 'ASSIGNED':
        return 'A certified technician has been assigned to your vehicle and is reviewing parts and work order instructions.';
      case 'IN_PROGRESS':
        return 'Your vehicle is currently in the workshop service bay undergoing active maintenance and repairs.';
      case 'QUALITY_CHECK':
        return 'Service work is finished! A quality supervisor is currently road-testing and performing safety checklist verification.';
      case 'READY_FOR_PICKUP':
        return 'All service and quality checks are complete! Your vehicle has been cleaned and is ready for pickup at the workshop.';
      case 'COMPLETED':
        return 'Service completed and vehicle handed over. Thank you for choosing IntelliGarage!';
      case 'ON_HOLD':
        return 'Service is temporarily paused pending additional parts or customer authorization. Workshop staff will contact you.';
      default:
        return 'Service is currently progressing according to schedule.';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/60 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted/60 rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
          </div>
        </div>
        <Card className="p-8">
          <div className="space-y-6">
            <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
            <div className="h-24 w-full bg-muted/30 rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
              <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
              <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 text-center">
        <Card className="p-10 border-border/60">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">No Active Tracking Found</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {error || 'You do not have any active service jobs currently in progress. You can book an appointment or view past service history.'}
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Button variant="outline" onClick={() => navigate('/customer/appointments')}>
              <Calendar className="w-4 h-4 mr-1.5" /> My Appointments
            </Button>
            <Button onClick={() => fetchTracking(false)}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCompleted = data.current_status === 'COMPLETED' || data.current_status === 'CLOSED';
  const isDelayed = data.delay_status === 'DELAYED';
  const isAtRisk = data.delay_status === 'AT_RISK';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Top Navigation & Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/customer/dashboard')}
            className="rounded-lg h-9 px-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Service Tracking
              </h1>
              {data.job_number && (
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {data.job_number}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live updates direct from workshop bay records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <span className="text-[11px] font-mono text-muted-foreground">
            Updated {formatTimeAgo(secondsSinceRefresh)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTracking(true)}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Delay Alert Banner (if delayed or ETA adjusted) */}
      {isDelayed && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3.5 text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm flex items-center gap-2">
              Estimated Completion Delayed
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                Delayed
              </Badge>
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              {data.delay_reason 
                ? `Reason: ${data.delay_reason}` 
                : 'Service is taking slightly longer than initial estimates due to extensive vehicle diagnostics. Our workshop team is actively working to finish as soon as possible.'}
            </p>
            {data.estimated_completion_at && (
              <p className="text-xs font-mono font-semibold pt-1">
                New Expected Ready Time: {formatETA(data.estimated_completion_at)}
              </p>
            )}
          </div>
        </div>
      )}

      {isAtRisk && !isDelayed && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-600 dark:text-amber-400">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-sm flex items-center gap-2">
              Service Approaching Estimated Time Window
              <Badge variant="warning" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                At Risk
              </Badge>
            </h4>
            <p className="text-xs opacity-90">
              Work is nearing the scheduled completion target. Final tests are in progress.
            </p>
          </div>
        </div>
      )}

      {/* Hero Overview Card */}
      <Card className="overflow-hidden border-border/60 shadow-lg">
        <div className="bg-gradient-to-r from-primary/10 via-background to-primary/5 p-5 sm:p-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Vehicle & Service Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold bg-background/80">
                  <Car className="w-3.5 h-3.5 mr-1 text-primary" />
                  {data.vehicle.brand} {data.vehicle.model} {data.vehicle.year ? `(${data.vehicle.year})` : ''}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground font-bold px-2 py-0.5 bg-muted/60 rounded">
                  {data.vehicle.license_plate}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-foreground">
                {data.service?.type || 'Vehicle Service'}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                {data.garage.name} • {data.garage.city}
                {data.garage.phone && (
                  <span className="flex items-center gap-1 text-primary font-medium ml-2">
                    <Phone className="w-3 h-3" /> {data.garage.phone}
                  </span>
                )}
              </p>
            </div>

            {/* Expected Ready Time Block */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm shrink-0">
              <div className={`p-3 rounded-xl ${
                isCompleted 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : isDelayed 
                    ? 'bg-red-500/10 text-red-500' 
                    : isAtRisk 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-primary/10 text-primary'
              }`}>
                {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {isCompleted ? 'Completed At' : 'Expected Ready Time'}
                </span>
                <span className="text-lg sm:text-xl font-extrabold font-mono text-foreground">
                  {isCompleted && data.completed_at 
                    ? formatETA(data.completed_at)
                    : formatETA(data.estimated_completion_at)}
                </span>
                <div className="mt-1">
                  <Badge 
                    variant={isCompleted ? 'success' : isDelayed ? 'destructive' : isAtRisk ? 'warning' : 'info'}
                    className="text-[10px] uppercase font-mono tracking-wider font-bold"
                  >
                    {data.delay_status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Current State Summary Banner */}
        <div className="bg-muted/30 px-6 py-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Current Stage:</span>
            <span className="font-bold text-foreground text-sm">{data.current_stage_label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Next Action:</span>
            <span>{data.next_stage}</span>
          </div>
        </div>

        {/* Real-World Stepper Timeline */}
        <CardContent className="p-6 sm:p-8">
          <div className="relative">
            
            {/* Desktop Horizontal Line */}
            <div className="hidden md:block absolute top-4 left-8 right-8 h-1 bg-muted rounded-full z-0 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, data.progress_percent))}%` }}
              />
            </div>

            {/* Stages */}
            <div className="space-y-6 md:space-y-0 md:flex md:justify-between relative z-10">
              {data.timeline.map((step, idx) => {
                const isStepCompleted = step.state === 'COMPLETED';
                const isStepCurrent = step.state === 'CURRENT';

                return (
                  <div key={step.key} className="flex md:flex-col md:items-center flex-1 gap-4 md:gap-2">
                    
                    {/* Step Node */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-xs font-bold shrink-0 transition-all duration-300 ${
                      isStepCompleted 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                        : isStepCurrent 
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 ring-4 ring-primary/20 scale-110'
                          : 'bg-card text-muted-foreground border-border/80'
                    }`}>
                      {isStepCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isStepCurrent ? (
                        <Sparkles className="w-4 h-4 animate-spin duration-3000" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Step Text Info */}
                    <div className="md:text-center space-y-0.5">
                      <p className={`text-xs font-bold ${
                        isStepCurrent 
                          ? 'text-primary' 
                          : isStepCompleted 
                            ? 'text-foreground font-semibold' 
                            : 'text-muted-foreground font-normal'
                      }`}>
                        {step.label}
                      </p>
                      
                      {step.timestamp ? (
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {formatETA(step.timestamp)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/60 hidden md:block">
                          {step.description}
                        </p>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Customer Explanation Cards (What's happening right now & next) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Right Now */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 bg-muted/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Info className="w-4 h-4 text-primary" />
              What is happening right now?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-1">
              {data.current_stage_label}
            </p>
            {getCurrentStageExplanation(data.current_status)}
          </CardContent>
        </Card>

        {/* What Happens Next */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 bg-muted/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <ChevronRight className="w-4 h-4 text-primary" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-1">
              {data.next_stage}
            </p>
            {isCompleted ? (
              <span>Your service cycle is complete. Thank you for booking with IntelliGarage!</span>
            ) : (
              <span>Once the current milestone passes workshop standards, the team advances directly into the next phase and your timeline updates in real-time.</span>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Customer-Safe Mechanic Card (if assigned) */}
      {data.mechanic && (
        <Card className="border-border/60">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Assigned Certified Technician
                </span>
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  {data.mechanic.name}
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified Mechanic
                  </Badge>
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground hidden sm:block">
              Dedicated technical inspection & repair
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auditable Status History Log */}
      {data.history && data.history.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Auditable Service History Log
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Chronological records logged directly by the workshop state machine
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {data.history.length} events
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/30">
            {data.history.map((h, i) => (
              <div key={h.id || i} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/10 transition-colors text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">
                      {h.stage_label || h.new_status}
                    </span>
                    {h.stage_label === 'ETA Updated' && (
                      <Badge variant="warning" className="text-[9px] py-0 font-mono">
                        ETA ADJUSTED
                      </Badge>
                    )}
                  </div>
                  {h.reason && (
                    <p className="text-muted-foreground text-xs">{h.reason}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-muted-foreground block text-[11px]">
                    {formatETA(h.changed_at)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Helpful Customer Contact Section */}
      <div className="text-center pt-2 text-xs text-muted-foreground">
        Have questions about this repair? Contact <strong className="text-foreground">{data.garage.name}</strong> directly at <span className="font-mono text-primary font-bold">{data.garage.phone || 'the workshop'}</span>.
      </div>

    </div>
  );
};
