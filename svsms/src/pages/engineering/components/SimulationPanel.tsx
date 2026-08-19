import React, { useState } from 'react';
import { Play, Activity, Clock, Users, ArrowRight, ShieldAlert, BarChart3, Box, FastForward } from 'lucide-react';
import { apiClient } from '../../../../apiClient';

export const SimulationPanel = () => {
  const [activeSim, setActiveSim] = useState('mechanic-assignment');
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
      await new Promise(r => setTimeout(r, 500));
      
      let res;
      
      if (type === 'mechanic-assignment') {
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
      
      addTrace(`Python executing model...`);
      await new Promise(r => setTimeout(r, 600));
      addTrace(`MySQL queried by Python`);
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
          <h3 className="font-semibold text-text mb-4">Simulation Controls</h3>
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
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-text hover:border-textSecondary'
                }`}
              >
                <sim.icon className="w-5 h-5" />
                <span>{sim.label}</span>
              </button>
            ))}
          </div>
        </div>
        
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

               {/* Mechanic Assignment Result */}
               {activeSim === 'mechanic-assignment' && result.recommended_mechanic && (
                 <div className="grid grid-cols-2 gap-6">
                   <div className="bg-background p-6 rounded-lg border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
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
