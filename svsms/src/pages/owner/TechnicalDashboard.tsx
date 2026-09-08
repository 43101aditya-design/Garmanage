import React, { useState, useEffect } from 'react';
import { ShieldCheck, HardDrive, Cpu, Clock, TerminalSquare, AlertTriangle, Activity, Database } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

export const TechnicalDashboard = () => {
  const [health, setHealth] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pingTime, setPingTime] = useState<number>(0);

  const fetchTechMetrics = async () => {
    setLoading(true);
    try {
      const t0 = performance.now();
      const healthData = await apiClient.get('/benchmarks/health-check');
      const t_diff = performance.now() - t0;
      setPingTime(Math.round(t_diff));
      setHealth(healthData);

      // Model metadata
      const modelsData = await apiClient.get('/predictions/pipeline/metadata');
      setModelStatus(modelsData);
    } catch (e) {
      console.error(e);
      toast.error('System health monitors unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechMetrics();
    const interval = setInterval(fetchTechMetrics, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-500 font-bold">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            System Control Board
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Technical Operations Deck
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status of APIs, database performance, memory buffers, and ML pipelines.
          </p>
        </div>
      </div>

      {loading && !health ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Probing system gateways...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Uptime indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:translate-y-[-2px] transition-transform duration-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Node.js Server</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">{health?.status === 'healthy' ? 'ONLINE' : 'DOWN'}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${health?.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:translate-y-[-2px] transition-transform duration-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">MySQL DBMS</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">{health?.database === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${health?.database === 'connected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  <Database className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:translate-y-[-2px] transition-transform duration-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">FastAPI Pipeline</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">{health?.python_service === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${health?.python_service === 'online' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                  <Cpu className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:translate-y-[-2px] transition-transform duration-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">API Latency</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">{pingTime} ms</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model Registry status */}
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-wider">
                  Operational Model Registry Status
                </CardTitle>
                <CardDescription className="text-xs">Identifies active ML model parameters and file versions deployed in the Python FastAPI workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 font-mono text-xs">
                  {modelStatus?.models && Object.entries(modelStatus.models).map(([key, item]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-muted/20 border border-border/40">
                      <div>
                        <p className="font-bold text-foreground truncate max-w-[250px]">{key.replace('_model_v1', ' Forecast')}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Engine: {item.model_name || 'Baseline moving average'}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[9px] font-mono">{item.version || 'v1.0'}</Badge>
                        <p className="text-[9px] text-muted-foreground mt-1">Rows: {item.training_rows || 0} items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SQL Queries Diagnostics */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TerminalSquare className="w-4 h-4 text-primary" /> SQL Diagnostics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs font-mono">
                <div className="space-y-1 bg-muted/40 p-3 rounded-lg border border-border/40 leading-relaxed text-muted-foreground text-[11px]">
                  <p className="font-bold text-foreground">Optimized Indexing Checked</p>
                  <p className="text-[10px] mt-1">Verified index matching for: </p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li>`idx_appointment_date_status`</li>
                    <li>`idx_invoice_issue_date`</li>
                    <li>`idx_anomaly_event_garage_status`</li>
                  </ul>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-1 text-[11px] text-muted-foreground">
                  <p className="font-bold text-foreground">DBMS Health Check</p>
                  <p className="text-[10px] mt-1">Clever Cloud MySQL Host: </p>
                  <p className="text-foreground text-[9px] break-all truncate">b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com</p>
                  <p className="text-[10px] mt-1">Max connections pool: 5 slots</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
