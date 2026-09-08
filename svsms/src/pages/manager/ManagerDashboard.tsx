import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDbStore } from '../../store/dbStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { 
  Wrench, Users, Calendar, AlertTriangle, BrainCircuit, 
  ArrowRight, ShieldCheck, Clock, UserCheck, Inbox, Sparkles, TrendingUp
} from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';

export const ManagerDashboard = () => {
  const { user } = useAuthStore();
  const { appointments, mechanics, inventory } = useDbStore();
  const navigate = useNavigate();

  // Aggregate live workshop statistics
  const activeJobs = appointments.filter(a => a.status === 'In Progress').length;
  const activeMechanicsCount = mechanics.filter(m => m.status === 'active').length;
  const pendingRequests = appointments.filter(a => a.status === 'Pending').length;
  const lowStockCount = inventory.filter(i => i.quantity_in_stock <= i.reorder_level).length;

  const pendingRequestsList = appointments.filter(a => a.status === 'Pending').slice(0, 4);

  // Predictions states
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [inventoryRisk, setInventoryRisk] = useState<any>(null);

  useEffect(() => {
    const fetchManagerPredictions = async () => {
      try {
        setPredictionsLoading(true);
        setPredictionsError(null);
        const [workRes, invRes] = await Promise.all([
          apiClient.get('/predictions/workload'),
          apiClient.get('/predictions/inventory-demand')
        ]);
        setWorkload(workRes);
        setInventoryRisk(invRes);
      } catch (err: any) {
        console.error('Failed to fetch manager predictions:', err);
        setPredictionsError('Prediction service temporarily unavailable.');
      } finally {
        setPredictionsLoading(false);
      }
    };
    fetchManagerPredictions();
  }, []);

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <UserCheck className="w-4 h-4 text-primary" />
            Operations Command Deck
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1 flex items-center gap-2">
            <span>Manager Control Dashboard</span>
            <Badge className="font-mono text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Production Mode</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status of workshop bays, mechanic allocations, and spare parts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={() => navigate('/manager/decisions')} className="border-primary/30 text-primary hover:bg-primary/10">
            <BrainCircuit className="w-4 h-4 mr-1.5" /> AI Decision Center
          </Button>
          <Button variant="outline" onClick={() => navigate('/manager/calendar')}>
            <Calendar className="w-4 h-4 mr-2" /> Schedule View
          </Button>
          <Button onClick={() => navigate('/manager/jobs')} className="shadow-lg shadow-primary/20">
            <Wrench className="w-4 h-4 mr-2" /> Workshop Board
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Active Jobs</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{activeJobs}</span>
                <span className="text-xs text-blue-500 font-semibold font-mono">In Progress</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Mechanics Active</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{activeMechanicsCount}</span>
                <span className="text-xs text-emerald-500 font-semibold font-mono">Available</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Pending Requests</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{pendingRequests}</span>
                <span className="text-xs text-amber-500 font-semibold font-mono">Requires Action</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Inventory Alerts</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{lowStockCount}</span>
                {lowStockCount > 0 ? (
                  <span className="text-xs text-red-500 font-semibold font-mono">Low stock</span>
                ) : (
                  <span className="text-xs text-emerald-500 font-semibold font-mono">Sufficient</span>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${lowStockCount > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-500/10 text-muted-foreground border-border/20'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PHASE 7: OPERATIONAL PREDICTIONS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Prediction */}
        <Card className="border-primary/10 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold font-mono tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" /> Tomorrow's Capacity Forecast
              </CardTitle>
              {!predictionsLoading && !predictionsError && workload?.tomorrow && (
                <Badge variant={
                  workload.tomorrow.workload_level === 'HIGH' ? 'destructive' :
                  workload.tomorrow.workload_level === 'MEDIUM' ? 'warning' : 'success'
                }>
                  {workload.tomorrow.workload_level} WORKLOAD
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {predictionsLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Calculating workload...
              </div>
            ) : predictionsError ? (
              <p className="text-xs text-red-400 italic">Prediction service offline. Workload metrics unavailable.</p>
            ) : workload?.tomorrow ? (
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-2xl font-black text-foreground">{workload.tomorrow.predicted_jobs} Jobs Expected</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Forecast confidence interval: {workload.tomorrow.lower_bound} – {workload.tomorrow.upper_bound} jobs</p>
                  </div>
                </div>
                
                <div className="p-2.5 rounded bg-muted/40 border border-border/50 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Action recommendation: </span>
                  {workload.tomorrow.recommended_action}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Insufficient historical data to predict workload level.</p>
            )}
          </CardContent>
        </Card>

        {/* Stockout Risk Prediction */}
        <Card className="border-primary/10 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold font-mono tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Stockout Risk Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {predictionsLoading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Analyzing parts demand...
              </div>
            ) : predictionsError ? (
              <p className="text-xs text-red-400 italic">Prediction service offline. Inventory risks unavailable.</p>
            ) : inventoryRisk?.predictions && inventoryRisk.predictions.length > 0 ? (
              <div className="space-y-2">
                {inventoryRisk.predictions.slice(0, 2).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border/50 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{item.part_name}</p>
                      <p className="text-[10px] text-muted-foreground">Stock: {item.current_stock} | 14-day demand forecast: {item.predicted_14d_demand}</p>
                    </div>
                    <Badge variant={
                      item.stockout_risk === 'CRITICAL' ? 'destructive' :
                      item.stockout_risk === 'HIGH' ? 'warning' : 'outline'
                    } className="font-mono text-[9px]">
                      {item.stockout_risk} RISK
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-500 font-semibold italic flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> All key spare parts stock levels healthy for the next 14 days.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main split sections: AI Engine & Pending requests list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AI mechanic recommendation section */}
        <Card className="lg:col-span-1 border-primary/20 bg-gradient-to-br from-card/85 to-primary/5 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-primary/25 text-primary border border-primary/30">
                <BrainCircuit className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold tracking-tight">AI Mechanic Recommender</CardTitle>
                <CardDescription className="text-xs">Phase 5 decision engine recommendation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-background/50 border border-primary/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Rahul Sharma (राहुल शर्मा)</span>
                <Badge variant="success" className="font-mono text-[10px] tracking-wide bg-emerald-500/15 border-emerald-500/35">
                  91% Match
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Expert Engine repair specialization</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Low workload (1 active job card)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Strong historical feedback on BMW engine works</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Our automated system suggests Rahul for the next engine diagnostics request based on workload constraints and specializations.
            </p>
          </CardContent>
          <CardFooter className="pt-2">
            <Button 
              className="w-full text-xs" 
              onClick={() => navigate('/manager/ai-assignment')}
            >
              Review Recommendations <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </CardFooter>
        </Card>

        {/* Pending requests overview list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold">Incoming Service Requests</CardTitle>
                <CardDescription className="text-xs">Awaiting workshop dispatch and scheduling</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs hover:text-primary" onClick={() => navigate('/manager/service-requests')}>
                View All ({pendingRequests})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRequestsList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">All caught up!</p>
                <p className="text-xs mt-1">No incoming service requests are currently unassigned.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Required</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequestsList.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{app.service_type}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-xs">{app.notes || 'No notes left by client.'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(app.appointment_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">{app.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs font-semibold"
                          onClick={() => navigate('/manager/ai-assignment')}
                        >
                          Dispatch AI
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
    </div>
  );
};
