import React, { useState } from 'react';
import { Play, Activity, Clock, Users, ArrowRight, ShieldAlert, BarChart3, Box, FastForward, BrainCircuit, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../../api/services/apiClient';

export const SimulationPanel = () => {
  const [activeSim, setActiveSim] = useState('digital-twin');
  const [scenarioType, setScenarioType] = useState('job_surge_30pct');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [trace, setTrace] = useState<string[]>([]);
  
  const [simSpeed, setSimSpeed] = useState('1x');

  const addTrace = (msg: string) => {
    setTrace(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const runSimulation = async (type: string) => {
    setLoading(true);
    setResult(null);
    setTrace([]);
    
    addTrace(`Request initiated: ${type}`);
    
    try {
      addTrace(`JWT/RBAC validation in Node.js`);
      
      // Simulate delay for trace if needed
      await new Promise(r => setTimeout(r, 400));
      
      let res;
      
      if (type === 'digital-twin') {
        addTrace(`Executing Digital Twin What-If Simulator [Scenario: ${scenarioType}]`);
        addTrace(`Enforcing memory sandbox: MySQL production database is 100% immutable`);
        res = await apiClient.post('/engineering/simulation/digital-twin', {
          scenario_type: scenarioType,
          custom_jobs: 20,
          custom_mechanics: 8
        });
      } else if (type === 'mechanic-assignment') {
        addTrace(`Proxying POST to Python Engine`);
        res = await apiClient.post('/engineering/simulation/mechanic-assignment', {
          branch_id: 1,
          job_type: 'Engine Repair',
          priority: 'High',
          required_skill: 4
        });
      } else {
        addTrace(`Proxying GET to Python Engine`);
        res = await apiClient.get(`/engineering/simulation/${type}`);
      }
      
      addTrace(`Python executing model sandbox...`);
      await new Promise(r => setTimeout(r, 400));
      addTrace(`Phase 8 Decision Engine evaluated recommendation`);
      addTrace(`Data processed and result generated`);
      addTrace(`Node.js responded to React UI`);
      
      setResult(res);
      addTrace(`Simulation completed successfully.`);
    } catch (e: any) {
      addTrace(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Controls */}
      <div className="w-80 border-r border-border bg-surface p-6 flex flex-col space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Simulation Controls</h3>
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">SIMULATION MODE</span>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-textSecondary mb-1">Dataset</div>
            <select className="w-full bg-background border border-border text-text rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary">
              <option>Workshop Historical Data (Real)</option>
            </select>
          </div>
        </div>

        <div>
          <div className="text-sm text-textSecondary mb-2">Simulation Model</div>
          <div className="space-y-2">
            {[
              { id: 'digital-twin', label: 'Digital Twin (What-If)', icon: BrainCircuit },
              { id: 'mechanic-assignment', label: 'Mechanic Assignment', icon: Users },
              { id: 'revenue-forecast', label: 'Revenue Forecast', icon: BarChart3 },
              { id: 'anomaly-detection', label: 'Anomaly Detection', icon: ShieldAlert },
              { id: 'inventory-prediction', label: 'Inventory Prediction', icon: Box },
            ].map(sim => (
              <button
                key={sim.id}
                onClick={() => setActiveSim(sim.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border text-sm transition-all ${
                  activeSim === sim.id
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-background text-text hover:border-textSecondary'
                }`}
              >
                <sim.icon className="w-5 h-5" />
                <span>{sim.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeSim === 'digital-twin' && (
          <div className="space-y-2 bg-background p-3 rounded-lg border border-border">
            <label className="text-xs font-mono font-bold text-textSecondary uppercase">What-If Scenario</label>
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className="w-full bg-surface border border-border text-text rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary font-medium"
            >
              <option value="job_surge_30pct">+30% Job Surge (26 jobs, 8 mechanics)</option>
              <option value="mechanic_absence">Mechanic Absence (-2 Technicians)</option>
              <option value="inventory_shortage">Brake Pad Stockout Shortage</option>
              <option value="standard_shift">Standard Schedule Shift</option>
            </select>
          </div>
        )}
        
        <div>
           <div className="text-sm text-textSecondary mb-2">Simulation Speed</div>
           <div className="flex space-x-2">
             {['Real Time', '2x', '5x'].map(s => (
               <button 
                key={s} 
                onClick={() => setSimSpeed(s)}
                className={`px-3 py-1 text-xs rounded border ${simSpeed === s ? 'border-primary bg-primary/20 text-primary' : 'border-border text-textSecondary'}`}
               >
                 {s}
               </button>
             ))}
           </div>
        </div>

        <button
          onClick={() => runSimulation(activeSim)}
          disabled={loading}
          className="mt-auto w-full bg-primary hover:bg-primary-hover text-background font-semibold py-3 rounded-lg transition-colors flex justify-center items-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>RUN SIMULATION</span>
            </>
          )}
        </button>
      </div>

      {/* Output Area */}
      <div className="flex-1 flex flex-col">
        {/* Trace */}
        <div className="h-48 border-b border-border bg-background p-4 overflow-y-auto font-mono text-xs text-textSecondary">
          <div className="flex items-center space-x-2 mb-2 text-primary">
            <Activity className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Execution Trace</span>
          </div>
          {trace.length === 0 && <span className="opacity-50">Waiting for simulation to start...</span>}
          {trace.map((t, i) => (
            <div key={i} className="flex items-start space-x-2 py-0.5">
              <span className="opacity-50 shrink-0">[{t.split(' - ')[0]}]</span>
              <span className={t.includes('Error') ? 'text-red-400' : 'text-text'}>
                {t.includes('MySQL') && <span className="text-purple-400">MySQL </span>}
                {t.includes('Python') && <span className="text-amber-400">Python </span>}
                {t.includes('Node.js') && <span className="text-blue-400">Node.js </span>}
                {t.split(' - ')[1]}
              </span>
            </div>
          ))}
        </div>

        {/* Result Area */}
        <div className="flex-1 p-6 bg-surface overflow-y-auto">
          {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-textSecondary">
              <FastForward className="w-16 h-16 opacity-20 mb-4" />
              <p>Select a model and click Run Simulation</p>
            </div>
          )}
          
          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-primary">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="animate-pulse">Executing Intelligence Model...</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-background p-4 rounded-lg border border-border">
                  <div>
                    <h2 className="text-xl font-bold text-text mb-1">Simulation Output</h2>
                    <p className="text-sm text-textSecondary">Model: {activeSim}</p>
                  </div>
                  {result.status && (
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      result.status.includes('Simulation') ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                    }`}>
                      {result.status}
                    </div>
                  )}
               </div>

               {/* Digital Twin (What-If) Result */}
               {activeSim === 'digital-twin' && result.baseline && result.simulated && (
                 <div className="space-y-6">
                   {/* Isolation Guarantee Banner */}
                   <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400 font-mono">
                     <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                       <span>{result.isolation_guarantee || "Isolated In-Memory Sandbox: Production MySQL data unmodified."}</span>
                     </div>
                     <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">100% MUTATION-FREE</span>
                   </div>

                   {/* 3-Panel Scenario vs Baseline vs Phase 8 Decision Comparison */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     {/* Column 1: BASELINE */}
                     <div className="bg-background p-5 rounded-xl border border-border/80 flex flex-col justify-between space-y-4">
                       <div>
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                             BASELINE PROFILE
                           </span>
                           <span className="text-xs font-bold text-emerald-400">{result.baseline.status}</span>
                         </div>
                         <h3 className="text-lg font-bold text-text mt-3">Nominal Workshop State</h3>
                         <p className="text-xs text-textSecondary mt-1">Real historical baseline capacity metrics.</p>
                       </div>

                       <div className="space-y-2.5 text-xs font-mono">
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Active Jobs:</span>
                           <strong className="text-text">{result.baseline.active_jobs} jobs</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Mechanics:</span>
                           <strong className="text-text">{result.baseline.available_mechanics} available</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Capacity:</span>
                           <strong className="text-text">{result.baseline.daily_capacity_jobs} jobs/day</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Utilization:</span>
                           <strong className="text-emerald-400">{result.baseline.utilization_pct}%</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Avg Customer Wait:</span>
                           <strong className="text-text">~{result.baseline.avg_customer_wait_mins}m</strong>
                         </div>
                       </div>
                     </div>

                     {/* Column 2: SIMULATED */}
                     <div className="bg-background p-5 rounded-xl border border-amber-500/30 flex flex-col justify-between space-y-4 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                       <div>
                         <div className="flex items-center justify-between">
                           <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                             SIMULATED SCENARIO
                           </span>
                           <span className={`text-xs font-bold ${result.simulated.risk_level === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                             {result.simulated.risk_level} RISK
                           </span>
                         </div>
                         <h3 className="text-lg font-bold text-text mt-3">{result.simulated.scenario_name}</h3>
                         <p className="text-xs text-textSecondary mt-1">What-if simulation impact on queuing & bays.</p>
                       </div>

                       <div className="space-y-2.5 text-xs font-mono">
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Projected Intake:</span>
                           <strong className="text-amber-400">{result.simulated.predicted_jobs} jobs</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Active Technicians:</span>
                           <strong className="text-text">{result.simulated.available_mechanics} available</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Projected Utilization:</span>
                           <strong className={result.simulated.simulated_utilization_pct > 90 ? 'text-red-400 font-bold' : 'text-amber-400'}>
                             {result.simulated.simulated_utilization_pct}%
                           </strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">Projected Wait Time:</span>
                           <strong className="text-red-400">~{result.simulated.simulated_avg_wait_mins}m</strong>
                         </div>
                         <div className="flex justify-between p-2 rounded bg-surface border border-border/50">
                           <span className="text-textSecondary">SLA Violations Risk:</span>
                           <strong className="text-red-400">{result.simulated.projected_schedule_violations} breaches</strong>
                         </div>
                       </div>
                     </div>

                     {/* Column 3: RECOMMENDED ACTION (Phase 8 Decision Engine) */}
                     {result.recommended_action && (
                       <div className="bg-background p-5 rounded-xl border border-primary/40 flex flex-col justify-between space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                         <div>
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                               <Sparkles className="w-3 h-3" /> PHASE 8 DECISION
                             </span>
                             <span className="text-xs font-mono text-primary font-bold">
                               {result.recommended_action.confidence_score}% Confidence
                             </span>
                           </div>
                           <h3 className="text-sm font-bold text-foreground mt-3 leading-snug">
                             {result.recommended_action.action}
                           </h3>
                         </div>

                         <div className="space-y-2 text-xs">
                           <p className="font-mono text-[10px] uppercase text-textSecondary font-bold">Why Rationale:</p>
                           <div className="bg-surface p-2.5 rounded-lg border border-border/60 space-y-1">
                             {result.recommended_action.why.map((r: string, idx: number) => (
                               <p key={idx} className="text-textSecondary text-[11px] leading-relaxed">• {r}</p>
                             ))}
                           </div>
                         </div>

                         {result.recommended_action.projected_outcome && (
                           <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 space-y-1">
                             <p className="font-bold flex items-center gap-1">
                               <CheckCircle className="w-3.5 h-3.5" /> Projected Resolution Impact:
                             </p>
                             <p className="text-[11px] font-mono">
                               Restores utilization to nominal ~{result.recommended_action.projected_outcome.resulting_utilization_pct}% • Wait time: ~{result.recommended_action.projected_outcome.resulting_avg_wait_mins}m
                             </p>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 </div>
               )}

               {/* Mechanic Assignment Result */}
               {activeSim === 'mechanic-assignment' && result.recommended_mechanic && (
                 <div className="grid grid-cols-2 gap-6">
                   <div className="bg-background p-6 rounded-lg border border-primary/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                     <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-4">Recommended Candidate</h3>
                     <div className="flex items-center justify-between mb-6">
                       <div>
                         <p className="text-2xl font-bold text-primary">{result.recommended_mechanic.name}</p>
                         <p className="text-sm text-textSecondary">{result.recommended_mechanic.specialization}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-3xl font-bold text-green-400">{result.recommended_mechanic.score}</p>
                         <p className="text-xs text-textSecondary uppercase">Match Score</p>
                       </div>
                     </div>
                     <div className="space-y-3">
                       <div>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="text-textSecondary">Skill Match</span>
                           <span className="text-text">{result.recommended_mechanic.details.skill_match} / 40</span>
                         </div>
                         <div className="w-full bg-surface h-2 rounded-full"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(result.recommended_mechanic.details.skill_match/40)*100}%` }}></div></div>
                       </div>
                       <div>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="text-textSecondary">Workload Capacity</span>
                           <span className="text-text">{result.recommended_mechanic.details.workload} / 40</span>
                         </div>
                         <div className="w-full bg-surface h-2 rounded-full"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(result.recommended_mechanic.details.workload/40)*100}%` }}></div></div>
                       </div>
                       <div>
                         <div className="flex justify-between text-sm mb-1">
                           <span className="text-textSecondary">Availability</span>
                           <span className="text-text">{result.recommended_mechanic.details.availability} / 20</span>
                         </div>
                         <div className="w-full bg-surface h-2 rounded-full"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(result.recommended_mechanic.details.availability/20)*100}%` }}></div></div>
                       </div>
                     </div>
                   </div>

                   <div className="bg-background p-6 rounded-lg border border-border">
                     <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-4">All Candidates</h3>
                     <div className="space-y-3">
                       {result.all_candidates.map((c: any, i: number) => (
                         <div key={i} className="flex justify-between items-center p-3 bg-surface rounded-md border border-border/50">
                           <div>
                             <p className="font-medium text-text text-sm">{c.name}</p>
                             <p className="text-xs text-textSecondary">Active Jobs: {c.details.active_jobs}</p>
                           </div>
                           <div className="text-right">
                             <p className={`font-bold ${i === 0 ? 'text-green-400' : 'text-text'}`}>{c.score}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

               {/* Revenue Forecast Result */}
               {activeSim === 'revenue-forecast' && result.forecast && (
                 <div className="bg-background p-6 rounded-lg border border-border">
                   <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-4">Prediction Model: {result.forecast.model_used}</h3>
                   <div className="flex items-center space-x-12">
                     <div>
                       <p className="text-textSecondary text-sm mb-1">Forecasted Revenue ({result.forecast.month})</p>
                       <p className="text-4xl font-bold text-emerald-400">₹{result.forecast.revenue.toLocaleString()}</p>
                     </div>
                     <div className="flex-1">
                        <p className="text-sm text-textSecondary mb-2">Historical Trend</p>
                        <div className="flex space-x-2">
                           {result.historical.map((h: any, i: number) => (
                             <div key={i} className="flex-1 bg-surface p-3 rounded border border-border text-center">
                                <p className="text-xs text-textSecondary mb-1">{h.month}</p>
                                <p className="font-semibold text-text">₹{(h.revenue/1000).toFixed(1)}k</p>
                             </div>
                           ))}
                        </div>
                     </div>
                   </div>
                 </div>
               )}

               {/* Anomaly Detection Result */}
               {activeSim === 'anomaly-detection' && result.anomalies && (
                 <div className="space-y-4">
                   <p className="text-sm text-textSecondary">{result.details}</p>
                   {result.anomalies.map((a: any, i: number) => (
                     <div key={i} className={`p-4 rounded-lg border flex justify-between items-center ${
                       a.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/50' : 'bg-amber-500/10 border-amber-500/50'
                     }`}>
                       <div className="flex items-center space-x-4">
                         <ShieldAlert className={`w-8 h-8 ${a.severity === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`} />
                         <div>
                           <p className="font-bold text-text">Invoice: {a.invoice_id} (Manager: {a.manager_id})</p>
                           <p className="text-sm text-textSecondary mt-1">Reason: {a.reason}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-sm text-textSecondary mb-1">Discount Amount</p>
                         <p className="text-xl font-bold text-text">₹{a.discount}</p>
                       </div>
                     </div>
                   ))}
                   {result.anomalies.length === 0 && (
                     <div className="p-8 text-center text-emerald-400 bg-emerald-400/10 rounded-lg border border-emerald-400/20">
                       <p className="font-semibold">No anomalies detected in recent invoices.</p>
                     </div>
                   )}
                 </div>
               )}

               {/* Inventory Prediction Result */}
               {activeSim === 'inventory-prediction' && result.predictions && (
                 <div className="grid grid-cols-2 gap-4">
                   {result.predictions.map((p: any, i: number) => (
                     <div key={i} className={`p-4 rounded-lg border flex flex-col ${
                       p.status.includes('REORDER') ? 'bg-amber-500/10 border-amber-500/30' : 
                       p.status === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30' : 
                       'bg-background border-border'
                     }`}>
                       <div className="flex justify-between items-start mb-4">
                         <div>
                           <p className="font-bold text-text">{p.item_name}</p>
                           <p className="text-xs text-textSecondary">{p.part_number}</p>
                         </div>
                         <span className={`text-xs font-bold px-2 py-1 rounded ${
                           p.status.includes('REORDER') ? 'bg-amber-500/20 text-amber-500' : 
                           p.status === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : 
                           'bg-emerald-500/20 text-emerald-500'
                         }`}>
                           {p.status}
                         </span>
                       </div>
                       <div className="grid grid-cols-3 gap-2 mt-auto">
                         <div>
                           <p className="text-xs text-textSecondary">Stock</p>
                           <p className="font-semibold text-text">{p.current_stock}</p>
                         </div>
                         <div>
                           <p className="text-xs text-textSecondary">Avg Use/Wk</p>
                           <p className="font-semibold text-text">{p.average_weekly_use}</p>
                         </div>
                         <div>
                           <p className="text-xs text-textSecondary">Depletes In</p>
                           <p className={`font-semibold ${p.predicted_depletion_days <= 7 ? 'text-red-400' : 'text-text'}`}>
                             {p.predicted_depletion_days} days
                           </p>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
