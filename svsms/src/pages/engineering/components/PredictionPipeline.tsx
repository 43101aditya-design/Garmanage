import React, { useState, useEffect } from 'react';
import { BrainCircuit, Play, Database, Activity, RefreshCw, CheckCircle, ShieldAlert, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../../api/services/apiClient';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../../components/ui/Card';

export const PredictionPipeline = () => {
  const [pipelineMeta, setPipelineMeta] = useState<any>(null);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trainingModel, setTrainingModel] = useState<string | null>(null);
  const [trainingResult, setTrainingResult] = useState<any>(null);

  const fetchPipelineData = async () => {
    setLoading(true);
    try {
      const [meta, monitor] = await Promise.all([
        apiClient.get('/predictions/pipeline/metadata'),
        apiClient.get('/predictions/monitoring')
      ]);
      setPipelineMeta(meta);
      setMonitoringData(monitor);
    } catch (e) {
      console.error('Error fetching pipeline metadata:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const triggerRetraining = async (modelType: string) => {
    setTrainingModel(modelType);
    setTrainingResult(null);
    try {
      // Retrain model (using global default or any active garage)
      const res = await apiClient.post(`/predictions/train/${modelType}`, {});
      setTrainingResult({ success: true, data: res });
      // Reload stats
      await fetchPipelineData();
    } catch (e: any) {
      setTrainingResult({ success: false, error: e.message });
    } finally {
      setTrainingModel(null);
    }
  };

  const getModelTitle = (key: string) => {
    return {
      revenue_model_v1: 'Revenue Forecast Model',
      workload_model_v1: 'Workload Forecast Model',
      inventory_demand_model_v1: 'Inventory Demand Model',
      duration_model_v1: 'Service Duration Model'
    }[key] || key;
  };

  const getModelSlug = (key: string) => {
    return {
      revenue_model_v1: 'revenue',
      workload_model_v1: 'workload',
      inventory_demand_model_v1: 'inventory-demand',
      duration_model_v1: 'duration'
    }[key] || key;
  };

  return (
    <div className="space-y-8">
      {/* Retraining outcome status alerts */}
      {trainingResult && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          trainingResult.success ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400' : 'bg-red-500/10 border-red-500/35 text-red-400'
        }`}>
          {trainingResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div>
            <p className="font-bold text-sm">
              {trainingResult.success ? 'Model Retraining Successful' : 'Model Retraining Failed'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {trainingResult.success 
                ? `Promoted new version: ${trainingResult.data.version || 'v1'}. Training dataset range: ${trainingResult.data.data_period_start || ''} to ${trainingResult.data.data_period_end || ''}`
                : trainingResult.error}
            </p>
          </div>
        </div>
      )}

      {/* Pipeline Diagram */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Active ML Pipeline Stages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {pipelineMeta?.pipeline_stages?.map((stage: any) => (
            <div key={stage.stage} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex flex-col justify-between space-y-2 relative">
              <div>
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  STAGE {stage.stage}
                </span>
                <p className="font-semibold text-xs mt-2 text-foreground">{stage.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">{stage.description}</p>
              </div>
              {stage.stage < 6 && (
                <div className="hidden md:block absolute right-[-10px] top-[40%] translate-y-[-50%] z-10 text-border">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Model Registry Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pipelineMeta?.models && Object.entries(pipelineMeta.models).map(([key, stat]: [string, any]) => (
          <div key={key} className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant={stat.trained ? 'success' : 'secondary'} className="font-mono text-[9px]">
                  {stat.mode} MODE
                </Badge>
                <h4 className="font-bold text-sm text-foreground mt-1">{getModelTitle(key)}</h4>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{stat.model_name}</p>
              </div>
              <Button 
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold"
                disabled={trainingModel !== null}
                onClick={() => triggerRetraining(getModelSlug(key))}
              >
                {trainingModel === getModelSlug(key) ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retrain
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3 text-xs">
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Registry Info</p>
                <p className="font-medium text-foreground">Version: {stat.version || 'v1'}</p>
                <p className="text-muted-foreground font-mono text-[10px]">
                  Trained: {stat.trained_at ? new Date(stat.trained_at).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Rows: {stat.training_rows || 0} records
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Metrics (Validation)</p>
                {stat.evaluation && Object.entries(stat.evaluation).length > 0 ? (
                  Object.entries(stat.evaluation).map(([metric, value]: [string, any]) => (
                    <p key={metric} className="font-medium text-foreground">
                      {metric}: <span className="font-mono">{value}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground italic text-[11px]">No validation stats available.</p>
                )}
              </div>
            </div>

            <div className="border-t border-border/40 pt-3 text-[10px] font-mono text-muted-foreground">
              <span className="font-semibold text-foreground">Feature Matrix: </span>
              {stat.features?.join(', ') || 'N/A'}
            </div>
          </div>
        ))}
      </div>

      {/* Model Monitoring logs */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Model Drift & Monitoring Logs
            </h3>
            <CardDescription className="text-xs mt-0.5">Real-time comparison of ML predictions vs actual historical outcomes in MySQL</CardDescription>
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-xs hover:text-primary" onClick={fetchPipelineData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reconcile Logs
          </Button>
        </div>

        {/* Aggregate monitoring metrics */}
        {monitoringData?.metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(monitoringData.metrics).map(([type, stats]: [string, any]) => (
              <div key={type} className="p-3.5 bg-muted/20 border border-border/50 rounded-xl space-y-1">
                <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  {type.replace('_', ' ')}
                </p>
                <div className="flex justify-between items-baseline pt-1">
                  <p className="text-lg font-bold text-foreground">
                    MAE: <span className="font-mono">{stats.mae !== null ? `₹${stats.mae}` : 'N/A'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">Count: {stats.count}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">RMSE: {stats.rmse !== null ? stats.rmse : 'N/A'}</p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto border border-border/60 rounded-xl">
          <table className="w-full text-left text-xs font-mono text-muted-foreground">
            <thead className="bg-muted/30 text-[10px] uppercase font-bold text-foreground border-b border-border/60">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Prediction Type</th>
                <th className="p-3">Garage</th>
                <th className="p-3">Prediction Val</th>
                <th className="p-3">Actual Value</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {monitoringData?.logs && monitoringData.logs.length > 0 ? (
                monitoringData.logs.slice(0, 15).map((log: any) => {
                  let predictionVal = '-';
                  if (log.prediction_type === 'service_duration') {
                    predictionVal = `${log.prediction_output?.estimated_minutes || 0} min`;
                  } else if (log.prediction_type === 'revenue' && log.prediction_output?.forecast?.length > 0) {
                    predictionVal = `₹${parseFloat(log.prediction_output.forecast[0].predicted_revenue).toLocaleString()}`;
                  } else if (log.prediction_type === 'workload' && log.prediction_output?.tomorrow) {
                    predictionVal = `${log.prediction_output.tomorrow.predicted_jobs} jobs`;
                  }

                  let actualVal = '-';
                  if (log.actual_outcome !== null) {
                    actualVal = log.prediction_type === 'revenue' 
                      ? `₹${parseFloat(log.actual_outcome).toLocaleString()}` 
                      : log.prediction_type === 'service_duration'
                      ? `${log.actual_outcome} min`
                      : `${log.actual_outcome} jobs`;
                  }

                  return (
                    <tr key={log.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                      <td className="p-3 text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-foreground font-semibold uppercase">{log.prediction_type.replace('_', ' ')}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-[120px]">{log.garage_name || 'All Garages'}</td>
                      <td className="p-3 text-foreground font-semibold">{predictionVal}</td>
                      <td className="p-3 text-emerald-400 font-semibold">{actualVal}</td>
                      <td className="p-3">
                        <Badge variant={log.actual_outcome !== null ? 'success' : 'secondary'} className="text-[9px]">
                          {log.actual_outcome !== null ? 'RECONCILED' : 'PENDING'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center italic text-muted-foreground">
                    No prediction log entries available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
