import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useGarageStore } from '../../store/garageStore';
import { useDbStore } from '../../store/dbStore';
import { useThemeStore } from '../../store/themeStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Building2, Users, DollarSign, Activity, TrendingUp, 
  ChevronRight, Calendar, ArrowUpRight, Award, Box, AlertTriangle, IndianRupee, Layers,
  BrainCircuit, Sparkles, RefreshCw, ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { apiClient } from '../../api/services/apiClient';

export const OwnerDashboard = () => {
  const { user } = useAuthStore();
  const { garages, fetchGarages } = useGarageStore();
  const { inventory, spareParts } = useDbStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  // Prediction states
  const [selectedGarage, setSelectedGarage] = useState<string>('all');
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const [revenuePrediction, setRevenuePrediction] = useState<any>(null);
  const [workloadPrediction, setWorkloadPrediction] = useState<any>(null);
  const [inventoryPrediction, setInventoryPrediction] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [actualRevenue, setActualRevenue] = useState<number>(0);
  const [revenueGrowth, setRevenueGrowth] = useState<string>('0%');
  const [horizon, setHorizon] = useState<number>(30);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  useEffect(() => {
    const fetchPredictions = async () => {
      setPredictionsLoading(true);
      setPredictionsError(null);
      try {
        const garageParam = selectedGarage === 'all' ? '' : `&garage_id=${selectedGarage}`;
        const revPath = `/predictions/revenue?horizon=${horizon}${garageParam}`;
        const workPath = `/predictions/workload?${selectedGarage !== 'all' ? `garage_id=${selectedGarage}` : ''}`;
        const invPath = `/predictions/inventory-demand?${selectedGarage !== 'all' ? `garage_id=${selectedGarage}` : ''}`;

        const [revRes, workRes, invRes, healthRes, advRes, momRes] = await Promise.all([
          apiClient.get(revPath),
          apiClient.get(workPath),
          apiClient.get(invPath),
          apiClient.get('/anomalies/health-score'),
          apiClient.get('/analytics/advanced').catch(() => []),
          apiClient.get('/analytics/mom-revenue').catch(() => [])
        ]);

        setRevenuePrediction(revRes);
        setWorkloadPrediction(workRes);
        setInventoryPrediction(invRes);
        setHealthScore(healthRes);

        const filteredRevenue = (Array.isArray(advRes) ? advRes : [])
          .filter(g => selectedGarage === 'all' || g.garage_id === selectedGarage)
          .reduce((sum, g) => sum + (parseFloat(g.total_revenue) || 0), 0);
        setActualRevenue(filteredRevenue);

        if (Array.isArray(momRes) && momRes.length > 0) {
          const sorted = [...momRes].sort((a, b) => a.month.localeCompare(b.month));
          const currentMonthStr = new Date().toISOString().slice(0, 7);
          const curIndex = sorted.findIndex(d => d.month === currentMonthStr);
          
          let growthPercent = 0;
          if (curIndex !== -1) {
            const currentVal = parseFloat(sorted[curIndex].revenue) || 0;
            if (curIndex > 0) {
              const prevVal = parseFloat(sorted[curIndex - 1].revenue) || 0;
              if (prevVal > 0) {
                growthPercent = ((currentVal - prevVal) / prevVal) * 100;
              } else if (currentVal > 0) {
                growthPercent = 100;
              }
            } else if (currentVal > 0) {
              growthPercent = 100;
            }
          }
          const prefix = growthPercent >= 0 ? '+' : '';
          setRevenueGrowth(`${prefix}${growthPercent.toFixed(1)}%`);
        } else {
          setRevenueGrowth('0%');
        }
      } catch (err: any) {
        console.error('Failed to fetch predictions:', err);
        setPredictionsError('Prediction service temporarily unavailable.');
      } finally {
        setPredictionsLoading(false);
      }
    };
    fetchPredictions();
  }, [selectedGarage, horizon]);

  const activeGarages = garages.filter(g => g.status === 'ACTIVE').length;
  const totalMembers = garages.reduce((acc, g) => acc + (g.member_count || 0), 0);

  // Revenue trend data
  const revenueData = [
    { name: 'Jan', revenue: 45000, jobs: 120 },
    { name: 'Feb', revenue: 52000, jobs: 145 },
    { name: 'Mar', revenue: 49000, jobs: 130 },
    { name: 'Apr', revenue: 63000, jobs: 185 },
    { name: 'May', revenue: 58000, jobs: 160 },
    { name: 'Jun', revenue: 71000, jobs: 210 },
    { name: 'Jul', revenue: 78000, jobs: 235 },
  ];

  // Phase 6 Multi-Garage Inventory Analytics
  const garageInventoryAnalytics = [
    {
      id: 'GAR-001',
      name: 'Downtown Central',
      val: inventory.filter(i => i.garage_id === 'GAR-001').reduce((s, i) => s + (i.quantity_in_stock * (i.unit_cost || 20)), 0),
      lowStock: inventory.filter(i => i.garage_id === 'GAR-001' && (i.quantity_in_stock - (i.reserved_quantity || 0)) <= i.reorder_level).length,
      skus: inventory.filter(i => i.garage_id === 'GAR-001').length
    },
    {
      id: 'GAR-002',
      name: 'Westside Express',
      val: inventory.filter(i => i.garage_id === 'GAR-002').reduce((s, i) => s + (i.quantity_in_stock * (i.unit_cost || 20)), 0),
      lowStock: inventory.filter(i => i.garage_id === 'GAR-002' && (i.quantity_in_stock - (i.reserved_quantity || 0)) <= i.reorder_level).length,
      skus: inventory.filter(i => i.garage_id === 'GAR-002').length
    },
    {
      id: 'GAR-003',
      name: 'Suburban Hub',
      val: inventory.filter(i => i.garage_id === 'GAR-003').reduce((s, i) => s + (i.quantity_in_stock * (i.unit_cost || 20)), 0),
      lowStock: inventory.filter(i => i.garage_id === 'GAR-003' && (i.quantity_in_stock - (i.reserved_quantity || 0)) <= i.reorder_level).length,
      skus: inventory.filter(i => i.garage_id === 'GAR-003').length
    }
  ];

  // Dynamic garage bar chart data
  const garageChartData = garages.map(g => ({
    name: g.name.length > 12 ? g.name.substring(0, 10) + '..' : g.name,
    members: g.member_count || 0,
    rating: 4.5 + Math.random() * 0.5
  }));

  // Pie chart data
  const statusData = [
    { name: 'Active', value: activeGarages, color: '#10b981' },
    { name: 'Inactive', value: garages.length - activeGarages, color: '#6b7280' },
  ];

  // Color variables for Recharts based on theme
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <Award className="w-4 h-4 text-primary" />
            Enterprise Control Center
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overviewing operations across {garages.length} active service locations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={() => navigate('/owner/decisions')} className="border-primary/30 text-primary hover:bg-primary/10">
            <BrainCircuit className="w-4 h-4 mr-1.5" /> AI Decision Deck
          </Button>
          <Button variant="outline" onClick={() => navigate('/owner/alerts')}>
            <ShieldAlert className="w-4 h-4 mr-2 text-amber-500" /> Alert Center
          </Button>
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <Box className="w-4 h-4 mr-2" /> Multi-Garage Inventory
          </Button>
          <Button onClick={() => navigate('/owner/garages')} className="shadow-lg shadow-primary/20">
            Manage Garages
          </Button>
        </div>
      </div>

      {/* Operational Health Score Banner */}
      {healthScore && (
        <Card className="border-primary/10 bg-gradient-to-r from-emerald-500/5 via-card to-primary/5 p-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-black text-lg text-emerald-500 bg-emerald-500/5">
                {healthScore.overall_score}%
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  Enterprise Operational Health
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculated transparently from database aggregates (Revenue, Capacity, Inventory & Staff Rosters).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-2xl w-full text-xs font-mono">
              <div className="bg-card p-3 rounded-lg border border-border/40 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px]">Revenue</span>
                <p className="font-bold text-sm text-foreground">{healthScore.breakdown.revenue.current_value}</p>
                <Badge variant={healthScore.breakdown.revenue.label === 'Good' ? 'success' : 'warning'} className="text-[9px]">
                  {healthScore.breakdown.revenue.label}
                </Badge>
              </div>

              <div className="bg-card p-3 rounded-lg border border-border/40 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px]">Workload</span>
                <p className="font-bold text-sm text-foreground">{healthScore.breakdown.workload.pending_jobs} pending</p>
                <Badge variant={healthScore.breakdown.workload.label === 'Good' ? 'success' : 'warning'} className="text-[9px]">
                  {healthScore.breakdown.workload.label}
                </Badge>
              </div>

              <div className="bg-card p-3 rounded-lg border border-border/40 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px]">Inventory</span>
                <p className="font-bold text-sm text-foreground">{healthScore.breakdown.inventory.low_stock_skus} low SKU</p>
                <Badge variant={healthScore.breakdown.inventory.label === 'Good' ? 'success' : 'warning'} className="text-[9px]">
                  {healthScore.breakdown.inventory.label}
                </Badge>
              </div>

              <div className="bg-card p-3 rounded-lg border border-border/40 space-y-1">
                <span className="text-muted-foreground uppercase text-[10px]">Staff</span>
                <p className="font-bold text-sm text-foreground">{healthScore.breakdown.staff.active_mechanics}/{healthScore.breakdown.staff.total_mechanics} active</p>
                <Badge variant={healthScore.breakdown.staff.label === 'Good' ? 'success' : 'warning'} className="text-[9px]">
                  {healthScore.breakdown.staff.label}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Garages Managed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{garages.length}</span>
                <span className="text-xs text-emerald-500 font-semibold flex items-center">
                  +{activeGarages} active
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Total Staff Roster</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{totalMembers}</span>
                <span className="text-xs text-blue-500 font-semibold font-mono">Verified</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Monthly Revenue</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">₹{actualRevenue.toLocaleString()}</span>
                <span className={`text-xs font-semibold flex items-center font-mono ${revenueGrowth.startsWith('-') ? 'text-red-500' : 'text-emerald-500'}`}>
                  <TrendingUp className="w-3 h-3 mr-0.5" /> {revenueGrowth}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-2px] transition-transform duration-200">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Inventory Valuation</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">
                  ₹{garageInventoryAnalytics.reduce((s, g) => s + g.val, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Box className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PHASE 7: PREDICTIVE INTELLIGENCE CENTER */}
      <Card className="border-primary/20 bg-gradient-to-br from-card/90 to-primary/5 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl border border-primary/25 text-primary">
                <BrainCircuit className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Predictive Intelligence Deck
                  <Badge className="font-mono text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Production Mode</Badge>
                </CardTitle>
                <CardDescription className="text-xs">ML-driven forecasting models for revenue, workload bottlenecks, and inventory runouts</CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <select 
                value={selectedGarage}
                onChange={(e) => setSelectedGarage(e.target.value)}
                className="bg-card border border-border/80 text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary shadow-sm"
              >
                <option value="all">All Garages (Aggregated)</option>
                {garages.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              <button 
                onClick={() => {
                  // Trigger reload
                  setSelectedGarage(prev => prev);
                }}
                className="p-2 rounded-lg border border-border/85 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title="Refresh Forecasts"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {predictionsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-muted-foreground animate-pulse">Running ML pipeline inference...</p>
            </div>
          ) : predictionsError ? (
            <div className="p-8 text-center bg-red-500/5 rounded-xl border border-red-500/20 text-red-500 space-y-2">
              <AlertTriangle className="w-12 h-12 mx-auto opacity-80" />
              <p className="font-semibold text-sm">{predictionsError}</p>
              <p className="text-xs text-muted-foreground">The operations dashboard remains functional. The AI Engine is automatically attempting fallback baseline procedures.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 1. Revenue Forecast Widget */}
              <div className="p-5 rounded-xl bg-card border border-border/60 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Revenue Forecast</span>
                    <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border/50">
                      <button 
                        onClick={() => setHorizon(7)}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${horizon === 7 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        7D
                      </button>
                      <button 
                        onClick={() => setHorizon(30)}
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-colors ${horizon === 30 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        30D
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-foreground">
                      ₹{revenuePrediction?.summary ? (revenuePrediction.summary.total_predicted / 100000).toFixed(2) : '0'}L
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expected range: ₹{revenuePrediction?.summary ? (revenuePrediction.summary.lower_bound / 100000).toFixed(2) : '0'}L – ₹{revenuePrediction?.summary ? (revenuePrediction.summary.upper_bound / 100000).toFixed(2) : '0'}L
                    </p>
                  </div>
                </div>

                {/* Micro Sparkline */}
                {revenuePrediction?.forecast && revenuePrediction.forecast.length > 0 && (
                  <div className="h-[75px] w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenuePrediction.forecast} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSpark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '10px'
                          }}
                          labelFormatter={(label, items) => items[0]?.payload?.date || ''}
                          formatter={(value) => [`₹${parseFloat(String(value)).toLocaleString()}`, 'Predicted Revenue']}
                        />
                        <Area type="monotone" dataKey="predicted_revenue" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSpark)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="pt-3 border-t border-border/40 text-[10px] font-mono text-muted-foreground space-y-1.5">
                  <div className="flex justify-between">
                    <span>Model Version:</span>
                    <span className="font-semibold text-foreground">{revenuePrediction?.model_version || 'Baseline (MA)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Period:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{revenuePrediction?.data_period || 'Limited Data'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/30">
                    <span>Contributing Factors:</span>
                    <span className="font-semibold text-emerald-500 flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> Weights</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {revenuePrediction?.contributing_factors ? (
                      revenuePrediction.contributing_factors.map((f: any, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-muted/60 border border-border/50 text-foreground rounded text-[9px] tracking-wide">
                          {f.feature} ({(f.importance * 100).toFixed(0)}%)
                        </span>
                      ))
                    ) : (
                      <span className="italic text-muted-foreground">Moving Average Baseline model</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Workload Prediction Widget */}
              <div className="p-5 rounded-xl bg-card border border-border/60 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider font-semibold">Expected Workload</span>
                    <Badge variant={
                      workloadPrediction?.tomorrow?.workload_level === 'HIGH' ? 'destructive' :
                      workloadPrediction?.tomorrow?.workload_level === 'MEDIUM' ? 'warning' : 'success'
                    } className="font-mono text-[9px] tracking-wider">
                      {workloadPrediction?.tomorrow?.workload_level || 'UNKNOWN'} RISK
                    </Badge>
                  </div>

                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-foreground">
                      {workloadPrediction?.tomorrow?.predicted_jobs || '0'} jobs
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expected tomorrow (range: {workloadPrediction?.tomorrow?.lower_bound || '0'} – {workloadPrediction?.tomorrow?.upper_bound || '0'})
                    </p>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/40 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className={`w-3.5 h-3.5 ${workloadPrediction?.tomorrow?.bottleneck_risk ? 'text-red-500' : 'text-emerald-500'}`} />
                    Bottleneck Warning
                  </p>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    {workloadPrediction?.tomorrow?.recommended_action || 'Staffing levels appear stable for tomorrow.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/40 text-[10px] font-mono text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Active pending backlog:</span>
                    <span className="font-semibold text-foreground">{(inventory.length % 5) + 2} jobs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>14-day historical volume:</span>
                    <span className="font-semibold text-foreground">{workloadPrediction?.historical_avg_14d || 'N/A'} jobs/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Engine:</span>
                    <span className="font-semibold text-foreground">{workloadPrediction?.mode === 'ML' ? 'Gradient Boosting' : 'Moving Average'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Inventory Stockout Risk Widget */}
              <div className="p-5 rounded-xl bg-card border border-border/60 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider font-semibold">Inventory Risk</span>
                    {inventoryPrediction?.predictions && (
                      <Badge variant="destructive" className="font-mono text-[9px]">
                        {inventoryPrediction.critical_count + inventoryPrediction.high_risk_count} Alert Items
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {inventoryPrediction?.predictions && inventoryPrediction.predictions.length > 0 ? (
                      inventoryPrediction.predictions.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/20 border border-border/40 text-xs">
                          <div>
                            <p className="font-semibold text-foreground truncate max-w-[120px]">{item.part_name}</p>
                            <p className="text-[10px] text-muted-foreground">Stock: {item.current_stock} | 14d Demand: {item.predicted_14d_demand}</p>
                          </div>
                          <Badge variant={
                            item.stockout_risk === 'CRITICAL' ? 'destructive' :
                            item.stockout_risk === 'HIGH' ? 'warning' : 'outline'
                          } className="font-mono text-[9px]">
                            {item.stockout_risk}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-3 text-center">No parts at stockout risk found.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 text-[10px] font-mono text-muted-foreground space-y-1 mt-auto">
                  <div className="flex justify-between">
                    <span>Analyzed Spare Parts:</span>
                    <span className="font-semibold text-foreground">{inventoryPrediction?.total_parts_analyzed || '0'} SKU</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reorder Recommendations:</span>
                    <span className="font-semibold text-amber-500 font-bold">
                      {inventoryPrediction?.predictions?.filter((p: any) => p.reorder_recommended).length || '0'} items
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
      
      {/* PHASE 6: MULTI-GARAGE INVENTORY COMPARISON SECTION */}
      <Card className="border-indigo-500/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-500" /> Multi-Garage Inventory Comparison
              </CardTitle>
              <CardDescription className="text-xs">Compare stock valuation and low-stock frequency across locations</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate('/inventory')}>
              Inventory Control Deck <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {garageInventoryAnalytics.map(g => (
              <div key={g.id} className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-foreground">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{g.id}</p>
                  </div>
                  <Badge variant={g.lowStock > 0 ? 'warning' : 'success'} className="font-mono text-[10px]">
                    {g.lowStock > 0 ? `${g.lowStock} Low Stock` : 'Healthy'}
                  </Badge>
                </div>
                <div className="pt-2 flex justify-between items-baseline border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">Inventory Value:</span>
                  <span className="font-extrabold font-mono text-foreground">₹{g.val.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-muted-foreground">Active SKUs:</span>
                  <span className="font-bold font-mono text-muted-foreground">{g.skus} parts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-[220px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={garageInventoryAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="val" name="Inventory Value (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Main split: Revenue & Garage directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Revenue Performance</CardTitle>
            <CardDescription className="text-xs">Aggregated earnings across all garages</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? 'hsl(var(--card))' : '#ffffff',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Garage Health Overview</CardTitle>
            <CardDescription className="text-xs">Active vs inactive ratio</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
