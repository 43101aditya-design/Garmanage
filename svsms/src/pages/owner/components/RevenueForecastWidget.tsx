import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { 
  TrendingUp, Sparkles, BrainCircuit, ShieldAlert, 
  Info, IndianRupee, Layers
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { RevenueForecast } from '../../../types/predictions';

interface RevenueForecastWidgetProps {
  data: RevenueForecast | null;
  loading: boolean;
  error: string | null;
  horizon: number;
  onHorizonChange: (horizon: number) => void;
  currencySymbol?: string;
}

export const RevenueForecastWidget: React.FC<RevenueForecastWidgetProps> = ({
  data,
  loading,
  error,
  horizon,
  onHorizonChange,
  currencySymbol = '₹'
}) => {
  const isML = data?.mode === 'ML';
  const isBaseline = data?.mode === 'BASELINE';
  const isNoData = data?.mode === 'NO_DATA';
  const isUnavailable = data?.mode === 'UNAVAILABLE' || !!error;

  const chartData = data?.forecast?.map(item => ({
    date: item.date.slice(5), // MM-DD
    fullDate: item.date,
    predicted: item.predicted_revenue,
    lower: item.lower_bound,
    upper: item.upper_bound,
    range: [item.lower_bound, item.upper_bound]
  })) || [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      <CardHeader className="pb-2 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-primary/20 text-primary border border-primary/30">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Revenue Forecasting Engine
                <Badge variant={isML ? 'default' : isBaseline ? 'secondary' : 'outline'} className="font-mono text-[9px] uppercase">
                  {isML ? 'ML: GradientBoosting' : isBaseline ? '7D Moving Avg' : 'Predictive'}
                </Badge>
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production predictive revenue pipeline with confidence bounds and feature importance.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60 text-xs">
            <button
              onClick={() => onHorizonChange(7)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                horizon === 7 ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => onHorizonChange(30)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                horizon === 30 ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Running revenue predictive inference...</p>
          </div>
        ) : isUnavailable ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-center p-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
            <p className="text-sm font-semibold text-foreground">Prediction Service Offline</p>
            <p className="text-xs text-muted-foreground max-w-md">
              The FastAPI intelligence service is currently unreachable. Historical baseline reporting is preserved.
            </p>
          </div>
        ) : isNoData ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-center p-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
            <Info className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Insufficient Historical Data</p>
            <p className="text-xs text-muted-foreground max-w-md">
              At least 7 completed daily billing cycles are needed to generate revenue projections.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Forecasted Total</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-foreground">
                    {currencySymbol}{data?.summary?.total_predicted?.toLocaleString() || 0}
                  </span>
                  <span className="text-[11px] text-primary font-mono font-semibold">({horizon}d)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Expected bounds: {currencySymbol}{data?.summary?.lower_bound?.toLocaleString()} – {currencySymbol}{data?.summary?.upper_bound?.toLocaleString()}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Expected Daily Avg</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-emerald-500">
                    {currencySymbol}{data?.summary?.avg_daily?.toLocaleString() || 0}
                  </span>
                  <span className="text-[11px] text-muted-foreground">/ day</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Model confidence interval: ±{Math.round((((data?.summary?.upper_bound || 0) - (data?.summary?.total_predicted || 0)) / (data?.summary?.total_predicted || 1)) * 100)}%
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Model Performance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm font-bold font-mono text-foreground">
                    {isML ? `v${data?.model_version || '1.0'}` : 'MA-7 Baseline'}
                  </span>
                  {data?.evaluation?.MAE && (
                    <Badge variant="outline" className="font-mono text-[9px]">
                      MAE: {currencySymbol}{Math.round(data.evaluation.MAE)}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {isML ? `Trained: ${data?.data_rows || 0} cycles` : data?.message || 'Moving average cold-start fallback'}
                </p>
              </div>
            </div>

            {/* Forecast Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenuePredictionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                    formatter={(val: any) => [`${currencySymbol}${Number(val).toLocaleString()}`, 'Predicted Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="upper" 
                    stroke="transparent" 
                    fill="url(#confidenceBand)" 
                    name="Upper Bound"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5} 
                    fill="url(#revenuePredictionGrad)" 
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }}
                    name="Predicted"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Contributing factors if available */}
            {data?.contributing_factors && data.contributing_factors.length > 0 && (
              <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-mono font-semibold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Key Predictive Drivers:
                </span>
                {data.contributing_factors.map((factor, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-muted/60 border border-border/50 font-mono text-[10px] text-foreground">
                    {factor.feature.replace(/_/g, ' ')} {factor.importance ? `(${Math.round(factor.importance * 100)}%)` : ''}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
