import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Activity, 
  BrainCircuit, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Sliders, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Clock, 
  Box, 
  ArrowRight, 
  BarChart2, 
  Zap, 
  History, 
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { digitalTwinService } from '../../../api/services/digitalTwinService';
import { SimulationResult, ComparisonResult, SensitivityResult } from '../../../types/digitalTwin';
import { useGarageStore } from '../../../store/garageStore';

export const DigitalTwinStudio: React.FC = () => {
  const { currentGarage } = useGarageStore();
  const garageId = currentGarage?.id || 'GAR-MAIN-001';

  // State
  const [activeView, setActiveView] = useState<'single' | 'compare' | 'sensitivity' | 'history'>('single');
  const [scenarioType, setScenarioType] = useState('JOB_SURGE');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [sensitivityResult, setSensitivityResult] = useState<SensitivityResult | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Scenario parameters
  const [params, setParams] = useState<Record<string, any>>({
    surge_job_count: 10,
    unavailable_hours: 4.0,
    increase_percentage: 30.0,
    mechanic_count: 1,
    reduction_percentage: 20.0,
    delta_hours: -2.0,
    priority_job_count: 2
  });

  // Objective weights
  const [weights, setWeights] = useState({
    waiting_time: 40,
    throughput: 30,
    workload_balance: 20,
    inventory_risk: 10
  });

  // Sensitivity sweep selection
  const [sweepType, setSweepType] = useState('DEMAND_VARIATION');

  // Load snapshot on initial mount or garage change
  useEffect(() => {
    loadCurrentSnapshot();
    loadHistory();
  }, [garageId]);

  const loadCurrentSnapshot = async () => {
    try {
      const snap = await digitalTwinService.getSnapshot(garageId);
      setSnapshot(snap);
    } catch (e) {
      console.warn('Could not load live snapshot, using offline defaults:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const hist = await digitalTwinService.getHistory(garageId);
      setHistoryList(hist?.history || []);
    } catch (e) {
      console.warn('Could not fetch simulation history:', e);
    }
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    setResult(null);
    try {
      const weightDecimals = {
        waiting_time: weights.waiting_time / 100,
        throughput: weights.throughput / 100,
        workload_balance: weights.workload_balance / 100,
        inventory_risk: weights.inventory_risk / 100
      };

      const res = await digitalTwinService.simulate({
        garage_id: garageId,
        scenario_type: scenarioType,
        parameters: params,
        objective_weights: weightDecimals,
        save_to_history: true
      });
      setResult(res);
      loadHistory();
    } catch (e: any) {
      console.error('Simulation execution failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    setLoading(true);
    try {
      const compScenarios = [
        { name: 'Scenario A: +30% Demand Surge', scenario_type: 'DEMAND_INCREASE', parameters: { increase_percentage: 30 } },
        { name: 'Scenario B: Add 1 Float Technician', scenario_type: 'ADDITIONAL_MECHANIC', parameters: { mechanic_count: 1 } },
        { name: 'Scenario C: Add Float Tech + Extend Shift 2h', scenario_type: 'CUSTOM_COMPOSITE', parameters: { mechanic_delta: 1, delta_hours: 2 } },
      ];
      const res = await digitalTwinService.compare({
        garage_id: garageId,
        scenarios: compScenarios,
        objective_weights: {
          waiting_time: weights.waiting_time / 100,
          throughput: weights.throughput / 100,
          workload_balance: weights.workload_balance / 100,
          inventory_risk: weights.inventory_risk / 100
        }
      });
      setComparisonResult(res);
    } catch (e) {
      console.error('Comparison failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSensitivity = async () => {
    setLoading(true);
    try {
      const res = await digitalTwinService.sensitivity({
        garage_id: garageId,
        sweep_type: sweepType
      });
      setSensitivityResult(res);
    } catch (e) {
      console.error('Sensitivity sweep failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      
      {/* Top Banner: Isolation Guarantee & Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card/60 border-2 border-amber-500/30 p-4 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">Digital Twin Operations & What-If Studio</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> READ-ONLY SIMULATION MODE
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ZERO PROD MUTATION
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate operational perturbations, solve multi-objective OR-Tools optimizations, and analyze capacity sensitivity in complete read-only isolation.
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex bg-muted/30 p-1 rounded-lg border border-border/60 text-xs font-mono">
          {[
            { id: 'single', label: 'What-If Simulation', icon: Play },
            { id: 'compare', label: 'Multi-Scenario Matrix', icon: Layers },
            { id: 'sensitivity', label: 'Capacity Sensitivity', icon: BarChart2 },
            { id: 'history', label: 'Simulation Runs', icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all font-semibold cursor-pointer ${
                activeView === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: SINGLE WHAT-IF SIMULATION */}
      {activeView === 'single' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column: Controls & Scenario Builder (4 cols) */}
          <div className="xl:col-span-4 flex flex-col space-y-5">
            
            {/* Scenario Builder Card */}
            <div className="bg-card/60 border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Scenario Builder</h3>
                </div>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">PHASE 9</span>
              </div>

              {/* Scenario Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase">Hypothetical Perturbation</label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium"
                >
                  <option value="JOB_SURGE">Direct Job Surge (+10, +20, +50 Jobs)</option>
                  <option value="DEMAND_INCREASE">Demand Increase (+10%, +30%, +50%)</option>
                  <option value="MECHANIC_UNAVAILABLE">Mechanic Absence / Unavailability (-N Hours)</option>
                  <option value="ADDITIONAL_MECHANIC">Workforce Expansion (+N Technicians)</option>
                  <option value="INVENTORY_REDUCTION">Inventory Stockout (-20% Spare Parts)</option>
                  <option value="WORKING_HOURS_CHANGE">Operating Hours Shift (+/- Shift Hours)</option>
                  <option value="HIGH_PRIORITY_INJECTION">Critical Priority Job Injection</option>
                  <option value="CUSTOM_COMPOSITE">Custom Composite Parameters</option>
                </select>
              </div>

              {/* Dynamic Parameter Controls based on selected scenario */}
              <div className="bg-background/80 p-3 rounded-lg border border-border/60 space-y-3 text-xs">
                {scenarioType === 'JOB_SURGE' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Surge Work Orders</span>
                      <strong className="text-foreground">+{params.surge_job_count} jobs</strong>
                    </div>
                    <input 
                      type="range" min="5" max="50" step="5"
                      value={params.surge_job_count}
                      onChange={(e) => setParams({ ...params, surge_job_count: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {scenarioType === 'DEMAND_INCREASE' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Demand Surge Percentage</span>
                      <strong className="text-foreground">+{params.increase_percentage}%</strong>
                    </div>
                    <input 
                      type="range" min="10" max="100" step="10"
                      value={params.increase_percentage}
                      onChange={(e) => setParams({ ...params, increase_percentage: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {scenarioType === 'MECHANIC_UNAVAILABLE' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Unavailable Duration</span>
                      <strong className="text-foreground">{params.unavailable_hours} hours</strong>
                    </div>
                    <input 
                      type="range" min="1" max="8" step="1"
                      value={params.unavailable_hours}
                      onChange={(e) => setParams({ ...params, unavailable_hours: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {scenarioType === 'ADDITIONAL_MECHANIC' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Add Float Technicians</span>
                      <strong className="text-foreground">+{params.mechanic_count} mechanics</strong>
                    </div>
                    <input 
                      type="range" min="1" max="4" step="1"
                      value={params.mechanic_count}
                      onChange={(e) => setParams({ ...params, mechanic_count: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {scenarioType === 'INVENTORY_REDUCTION' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Stock Reduction</span>
                      <strong className="text-foreground">-{params.reduction_percentage}%</strong>
                    </div>
                    <input 
                      type="range" min="10" max="80" step="10"
                      value={params.reduction_percentage}
                      onChange={(e) => setParams({ ...params, reduction_percentage: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {scenarioType === 'WORKING_HOURS_CHANGE' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Shift Adjustment</span>
                      <strong className="text-foreground">{params.delta_hours > 0 ? `+${params.delta_hours}` : params.delta_hours} hours</strong>
                    </div>
                    <input 
                      type="range" min="-4" max="4" step="1"
                      value={params.delta_hours}
                      onChange={(e) => setParams({ ...params, delta_hours: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}

                {scenarioType === 'HIGH_PRIORITY_INJECTION' && (
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Emergency Work Orders</span>
                      <strong className="text-foreground">{params.priority_job_count} jobs</strong>
                    </div>
                    <input 
                      type="range" min="1" max="5" step="1"
                      value={params.priority_job_count}
                      onChange={(e) => setParams({ ...params, priority_job_count: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
              </div>

              {/* Multi-Objective Weight Sliders */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-muted-foreground uppercase">Optimization Weights</span>
                  <span className="text-[10px] text-primary font-mono font-bold">Total: 100%</span>
                </div>
                
                <div className="space-y-2 text-[11px] font-mono">
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-0.5">
                      <span>Customer Wait Time:</span>
                      <strong className="text-foreground">{weights.waiting_time}%</strong>
                    </div>
                    <input 
                      type="range" min="10" max="70" step="5"
                      value={weights.waiting_time}
                      onChange={(e) => setWeights({ ...weights, waiting_time: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-muted rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-0.5">
                      <span>Bay Throughput:</span>
                      <strong className="text-foreground">{weights.throughput}%</strong>
                    </div>
                    <input 
                      type="range" min="10" max="70" step="5"
                      value={weights.throughput}
                      onChange={(e) => setWeights({ ...weights, throughput: Number(e.target.value) })}
                      className="w-full accent-emerald-500 h-1.5 bg-muted rounded"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-muted-foreground mb-0.5">
                      <span>Workload Balance:</span>
                      <strong className="text-foreground">{weights.workload_balance}%</strong>
                    </div>
                    <input 
                      type="range" min="5" max="50" step="5"
                      value={weights.workload_balance}
                      onChange={(e) => setWeights({ ...weights, workload_balance: Number(e.target.value) })}
                      className="w-full accent-amber-500 h-1.5 bg-muted rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleRunSimulation}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>EXECUTE SIMULATION</span>
                  </>
                )}
              </button>
            </div>

            {/* Current Snapshot Summary */}
            {snapshot && (
              <div className="bg-card/40 border border-border/60 rounded-xl p-4 text-xs font-mono space-y-2">
                <div className="flex justify-between items-center text-muted-foreground pb-2 border-b border-border/40">
                  <span className="font-bold text-foreground">Current Snapshot</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">READ-ONLY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Technicians:</span>
                  <strong className="text-foreground">{snapshot.mechanics?.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queued & Active Jobs:</span>
                  <strong className="text-foreground">{snapshot.jobs?.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracked Inventory Items:</span>
                  <strong className="text-foreground">{snapshot.inventory?.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operating Window:</span>
                  <strong className="text-foreground">{snapshot.garage?.operating_hours?.total_hours || 10}h / day</strong>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: 3-Panel Results & Diagnostic Traces (8 cols) */}
          <div className="xl:col-span-8 flex flex-col space-y-6">
            
            {!result && !loading && (
              <div className="bg-card/30 border border-border/60 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[450px]">
                <BrainCircuit className="w-12 h-12 text-primary/40" />
                <h4 className="text-base font-bold text-foreground">Awaiting Simulation Execution</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  Configure your hypothetical scenario parameters on the left and click <strong>Execute Simulation</strong> to simulate queue dynamics and solve multi-objective CP-SAT recommendations.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-card/30 border border-border/60 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[450px]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-mono text-primary font-semibold animate-pulse">Running In-Memory Digital Twin Sandbox...</p>
                <span className="text-xs text-muted-foreground">Evaluating OR-Tools CP-SAT constraints & queuing dynamics</span>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* 3-Panel Comparison: Baseline vs Simulated vs Recommended */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Panel 1: BASELINE */}
                  <div className="bg-card border border-border/80 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          BASELINE
                        </span>
                        <span className="text-xs font-bold text-emerald-400">NOMINAL</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-2">Workshop Baseline</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Historical standard capacity</p>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Active Work Orders:</span>
                        <strong className="text-foreground">{result.baseline.metrics.active_jobs}</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Utilization:</span>
                        <strong className="text-emerald-400">{result.baseline.metrics.utilization_pct}%</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Avg Wait Time:</span>
                        <strong className="text-foreground">~{result.baseline.metrics.avg_wait_mins}m</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Throughput:</span>
                        <strong className="text-foreground">{result.baseline.metrics.jobs_completed_projected} jobs/day</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Projected Revenue:</span>
                        <strong className="text-emerald-400">{result.baseline.metrics.financial_impact.formatted_realized_inr}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2: SIMULATED SCENARIO */}
                  <div className="bg-card border border-amber-500/40 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-sm shadow-amber-500/5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                          SIMULATED
                        </span>
                        <span className={`text-xs font-bold ${result.simulated.risk_level === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                          {result.simulated.risk_level} RISK
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-2">{result.scenario_name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Projected perturbation impact</p>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Simulated Load:</span>
                        <strong className="text-amber-400">{result.simulated.metrics.active_jobs}</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Projected Utilization:</span>
                        <strong className={result.simulated.metrics.utilization_pct > 85 ? 'text-red-400 font-bold' : 'text-amber-400'}>
                          {result.simulated.metrics.utilization_pct}%
                        </strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Projected Wait Time:</span>
                        <strong className="text-red-400">~{result.simulated.metrics.avg_wait_mins}m</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">SLA Breaches:</span>
                        <strong className="text-red-400">{result.simulated.metrics.sla_violations_count}</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Delayed Revenue:</span>
                        <strong className="text-red-400">{result.simulated.metrics.financial_impact.formatted_delayed_inr}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: RECOMMENDED CONFIGURATION */}
                  <div className="bg-card border border-primary/50 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-md shadow-primary/10">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> OR-TOOLS OPTIMAL
                        </span>
                        <span className="text-xs font-mono text-primary font-bold">
                          Score: {result.recommended.composite_score}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-2">{result.recommended.action}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{result.recommended.description}</p>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Solver Engine:</span>
                        <strong className="text-primary">{result.recommended.solver_engine}</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Restored Utilization:</span>
                        <strong className="text-emerald-400">{result.recommended.projected_metrics?.utilization_pct || result.simulated.metrics.utilization_pct}%</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Restored Wait Time:</span>
                        <strong className="text-emerald-400">~{result.recommended.projected_metrics?.avg_wait_mins || result.simulated.metrics.avg_wait_mins}m</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Restored Throughput:</span>
                        <strong className="text-emerald-400">{result.recommended.projected_metrics?.jobs_completed_projected || result.simulated.metrics.jobs_completed_projected} jobs</strong>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-background border border-border/40">
                        <span className="text-muted-foreground">Realized INR:</span>
                        <strong className="text-emerald-400">{result.recommended.projected_metrics?.financial_impact?.formatted_realized_inr || result.simulated.metrics.financial_impact.formatted_realized_inr}</strong>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottleneck Discovery Card */}
                {result.bottleneck && (
                  <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start justify-between gap-4 ${
                    result.bottleneck.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/40 text-red-400' :
                    result.bottleneck.severity === 'HIGH' ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' :
                    'bg-card border-border/80 text-foreground'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{result.bottleneck.title}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-background/60 font-bold">
                            {result.bottleneck.severity} SEVERITY
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{result.bottleneck.root_cause}</p>
                        <p className="text-xs font-medium text-foreground mt-2">
                          <strong>Recommended Action:</strong> {result.bottleneck.remediation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phase 8 Decision Intelligence Bridge Handover Card */}
                {result.phase8_decision_bridge && (
                  <div className="p-4 rounded-xl bg-card/60 border border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-mono text-primary font-bold">
                        <Zap className="w-4 h-4" />
                        <span>PHASE 8 DECISION INTELLIGENCE INTEGRATION HANDOVER</span>
                      </div>
                      <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">
                        {result.phase8_decision_bridge.integration_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Proposed Action: <strong className="text-foreground">{result.phase8_decision_bridge.proposed_action}</strong></p>
                        <p className="text-muted-foreground">Confidence Score: <strong className="text-emerald-400">{result.phase8_decision_bridge.confidence_score}% ({result.phase8_decision_bridge.confidence_level})</strong></p>
                      </div>
                      <div className="text-[11px] text-muted-foreground italic">
                        "{result.phase8_decision_bridge.governance_note}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Step-by-Step Execution Trace */}
                <div className="bg-background border border-border/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-foreground">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>SIMULATION EXECUTION TRACE</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{result.execution_time_ms}ms execution time</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto font-mono text-[11px] text-muted-foreground space-y-1 custom-scrollbar">
                    {result.execution_trace.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <span className="text-primary font-semibold">[{idx + 1}]</span>
                        <span className="text-foreground/90">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MULTI-SCENARIO COMPARISON MATRIX */}
      {activeView === 'compare' && (
        <div className="bg-card/50 border border-border/80 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Multi-Scenario Comparative Ranking Matrix</h3>
              <p className="text-xs text-muted-foreground">Compare 3 distinct hypothetical scenarios against the baseline snapshot and rank them via Pareto objective scoring.</p>
            </div>
            <button
              onClick={handleRunComparison}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>RUN COMPARATIVE MATRIX</span>
            </button>
          </div>

          {comparisonResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {comparisonResult.ranked_scenarios.map((scn) => (
                  <div key={scn.scenario_index} className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 ${
                    scn.rank === 1 ? 'bg-primary/5 border-primary/50 shadow-md' : 'bg-card border-border/60'
                  }`}>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded">
                          RANK #{scn.rank}
                        </span>
                        <span className="text-xs font-mono font-bold text-primary">
                          Score: {scn.composite_score}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground mt-2">{scn.scenario_name}</h4>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wait Time:</span>
                        <strong className="text-foreground">~{scn.metrics.avg_wait_mins}m ({scn.delta_vs_baseline.wait_time_delta_mins > 0 ? `+${scn.delta_vs_baseline.wait_time_delta_mins}` : scn.delta_vs_baseline.wait_time_delta_mins}m)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Utilization:</span>
                        <strong className="text-foreground">{scn.metrics.utilization_pct}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Throughput:</span>
                        <strong className="text-foreground">{scn.metrics.jobs_completed_projected} jobs</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Realized INR:</span>
                        <strong className="text-emerald-400">{scn.metrics.financial_impact.formatted_realized_inr}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                      Optimal Action: <strong className="text-foreground">{scn.recommendation.title}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!comparisonResult && (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Click <strong>Run Comparative Matrix</strong> to evaluate and rank the 3 scenarios.
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: SENSITIVITY ANALYSIS */}
      {activeView === 'sensitivity' && (
        <div className="bg-card/50 border border-border/80 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Capacity & Workload Sensitivity Sweeps</h3>
              <p className="text-xs text-muted-foreground">Sweep parameters to discover operational inflection points and saturation cliffs.</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={sweepType}
                onChange={(e) => setSweepType(e.target.value)}
                className="bg-background border border-border text-foreground rounded-lg px-3 py-1.5 text-xs font-mono font-medium focus:outline-none focus:border-primary"
              >
                <option value="DEMAND_VARIATION">Demand Variation (0% → +100%)</option>
                <option value="MECHANIC_COUNT">Mechanic Count (2 → 10 Technicians)</option>
                <option value="WORKING_HOURS">Operating Hours (6h → 12h Shifts)</option>
              </select>
              
              <button
                onClick={handleRunSensitivity}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>EXECUTE SWEEP</span>
              </button>
            </div>
          </div>

          {sensitivityResult && (
            <div className="space-y-6">
              {/* Key Insight Alert */}
              <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/30 text-xs font-mono text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span><strong>Diagnostic Insight:</strong> {sensitivityResult.key_insight}</span>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Parameter Step</th>
                      <th className="p-3">Utilization %</th>
                      <th className="p-3">Avg Wait Time</th>
                      <th className="p-3">Delayed Jobs</th>
                      <th className="p-3">Throughput (Jobs/Day)</th>
                      <th className="p-3">Realized Revenue (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sensitivityResult.data_points.map((pt, idx) => (
                      <tr key={idx} className={pt.utilization_pct >= 85 ? 'bg-amber-500/5' : ''}>
                        <td className="p-3 font-bold text-foreground">{pt.parameter_label}</td>
                        <td className={`p-3 font-semibold ${pt.utilization_pct >= 90 ? 'text-red-400' : (pt.utilization_pct >= 80 ? 'text-amber-400' : 'text-emerald-400')}`}>
                          {pt.utilization_pct}%
                        </td>
                        <td className="p-3 text-foreground">~{pt.avg_wait_mins}m</td>
                        <td className="p-3 text-foreground">{pt.delayed_jobs}</td>
                        <td className="p-3 text-foreground">{pt.throughput_jobs_day}</td>
                        <td className="p-3 text-emerald-400">₹{pt.realized_revenue_inr?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!sensitivityResult && (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Select a parameter sweep dimension and click <strong>Execute Sweep</strong>.
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: SIMULATION HISTORY */}
      {activeView === 'history' && (
        <div className="bg-card/50 border border-border/80 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Simulation Run History & Reproducibility</h3>
              <p className="text-xs text-muted-foreground">Audit log of previous hypothetical simulations for garage: {garageId}</p>
            </div>
            <button
              onClick={loadHistory}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center space-x-1 cursor-pointer font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {historyList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Scenario Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Execution Time</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {historyList.map((run, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-foreground">{run.scenario_name || 'What-If Run'}</td>
                      <td className="p-3 text-primary">{run.scenario_type}</td>
                      <td className="p-3 text-muted-foreground">{run.execution_time_ms}ms</td>
                      <td className="p-3 text-muted-foreground">{new Date(run.created_at).toLocaleString()}</td>
                      <td className="p-3 text-emerald-400 font-bold">COMPLETED</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No previous simulation runs logged yet. Execute a simulation to record reproducible runs.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
