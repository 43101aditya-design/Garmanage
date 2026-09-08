import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { AlertTriangle, ShieldCheck, Box, ArrowUpRight, RefreshCw, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InventoryDemandForecast } from '../../../types/predictions';

interface InventoryRiskWidgetProps {
  data: InventoryDemandForecast | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export const InventoryRiskWidget: React.FC<InventoryRiskWidgetProps> = ({
  data,
  loading,
  error,
  onRefresh
}) => {
  const navigate = useNavigate();
  const predictions = data?.predictions || [];
  const criticalCount = data?.critical_count || 0;
  const highRiskCount = data?.high_risk_count || 0;

  const topRisks = predictions.slice(0, 5);

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-amber-500/5 shadow-md">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                Inventory Stockout Risk Forecast
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="font-mono text-[9px] animate-pulse">
                    {criticalCount} Critical
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                14-day ML consumption forecast against current available stock.
              </p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/inventory')}
            className="text-xs text-primary hover:text-primary"
          >
            Manage Parts <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Evaluating 14-day stockout probabilities...</p>
          </div>
        ) : error || data?.mode === 'UNAVAILABLE' ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">
            Predictive stockout analysis temporarily offline.
          </p>
        ) : topRisks.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-emerald-500 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">Stock Levels Optimal</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              All active spare parts have sufficient inventory coverage for expected 14-day consumption.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topRisks.map((part) => {
              const riskColor = 
                part.stockout_risk === 'CRITICAL' ? 'text-red-500 bg-red-500/10 border-red-500/30' :
                part.stockout_risk === 'HIGH' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' :
                part.stockout_risk === 'MEDIUM' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' :
                'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';

              return (
                <div 
                  key={part.part_id} 
                  className="p-3 rounded-lg bg-card/60 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-border transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{part.part_name}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded border ${riskColor}`}>
                        {part.stockout_risk} RISK
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Available: <strong className="text-foreground">{part.available_stock}</strong></span>
                      <span>•</span>
                      <span>14d Demand: <strong className="text-primary">{part.predicted_14d_demand}</strong></span>
                      <span>•</span>
                      <span>Reorder Lvl: {part.reorder_level}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {part.reorder_recommended && (
                      <Badge variant="warning" className="text-[10px] font-mono">
                        Reorder Recommended
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
