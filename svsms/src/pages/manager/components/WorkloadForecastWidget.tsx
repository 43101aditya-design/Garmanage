import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { TrendingUp, Users, AlertTriangle, CheckCircle, BrainCircuit, Sparkles } from 'lucide-react';
import { WorkloadForecast } from '../../../types/predictions';

interface WorkloadForecastWidgetProps {
  data: WorkloadForecast | null;
  loading: boolean;
  error: string | null;
}

export const WorkloadForecastWidget: React.FC<WorkloadForecastWidgetProps> = ({
  data,
  loading,
  error
}) => {
  const tomorrow = data?.tomorrow;
  const isML = data?.mode === 'ML';
  const level = tomorrow?.workload_level || 'UNKNOWN';

  const badgeVariant = 
    level === 'HIGH' ? 'destructive' :
    level === 'MEDIUM' ? 'warning' :
    level === 'LOW' ? 'success' : 'outline';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-md">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary/20 text-primary border border-primary/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Tomorrow's Capacity Forecast
                <Badge variant="outline" className="font-mono text-[9px]">
                  {isML ? 'ML: GradientBoosting' : '14D Moving Avg'}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Predictive workshop appointment volume and bottleneck alert.
              </p>
            </div>
          </div>

          {!loading && !error && tomorrow && (
            <Badge variant={badgeVariant} className="font-mono text-[10px]">
              {level} WORKLOAD
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Forecasting tomorrow's bay utilization...</p>
          </div>
        ) : error || data?.mode === 'UNAVAILABLE' ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Workload forecast service temporarily offline.
          </p>
        ) : tomorrow ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 p-3.5 rounded-xl bg-card border border-border/60">
              <div>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Expected Intake</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-foreground">{tomorrow.predicted_jobs}</span>
                  <span className="text-xs font-bold text-muted-foreground">Job Cards</span>
                </div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground font-mono">
                <p>Date: {tomorrow.date}</p>
                <p className="text-[10px]">Confidence range: {tomorrow.lower_bound || 0} – {tomorrow.upper_bound || tomorrow.predicted_jobs} jobs</p>
              </div>
            </div>

            {/* Recommendation block */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs leading-relaxed text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Recommended Staffing Strategy:
              </div>
              <p className="text-[11px]">{tomorrow.recommended_action}</p>
            </div>

            {/* 7-day spark preview if available */}
            {data?.week_forecast && data.week_forecast.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold mb-2">
                  7-Day Outlook
                </p>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {data.week_forecast.map((day, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-muted/30 border border-border/40">
                      <p className="text-[9px] text-muted-foreground font-mono">{day.date.slice(5)}</p>
                      <p className="text-xs font-bold text-foreground">{day.predicted_jobs}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Insufficient historical data to forecast workload.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
