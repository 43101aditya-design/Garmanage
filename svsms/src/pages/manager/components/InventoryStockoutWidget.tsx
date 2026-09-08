import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { AlertTriangle, ShieldCheck, ArrowRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InventoryDemandForecast } from '../../../types/predictions';

interface InventoryStockoutWidgetProps {
  data: InventoryDemandForecast | null;
  loading: boolean;
  error: string | null;
}

export const InventoryStockoutWidget: React.FC<InventoryStockoutWidgetProps> = ({
  data,
  loading,
  error
}) => {
  const navigate = useNavigate();
  const predictions = data?.predictions || [];
  const topRisks = predictions.filter(p => p.stockout_risk === 'CRITICAL' || p.stockout_risk === 'HIGH').slice(0, 3);

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5 shadow-md">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight text-foreground">
                Critical Parts Shortage Alerts
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proactive 14-day stockout indicators based on job card demand patterns.
              </p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/inventory')}
            className="text-xs text-primary hover:text-primary"
          >
            Inventory Hub <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Analyzing parts depletion rates...</p>
          </div>
        ) : error || data?.mode === 'UNAVAILABLE' ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Inventory risk service temporarily offline.
          </p>
        ) : topRisks.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-emerald-500 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">No Immediate Shortages</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              All high-turnover service parts have healthy stock coverage for upcoming jobs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topRisks.map((item) => (
              <div 
                key={item.part_id} 
                className="flex justify-between items-center p-2.5 rounded-lg bg-card/80 border border-border/60 text-xs hover:border-border transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{item.part_name}</span>
                    <Badge variant={item.stockout_risk === 'CRITICAL' ? 'destructive' : 'warning'} className="font-mono text-[9px]">
                      {item.stockout_risk}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Available: <strong className="text-foreground">{item.available_stock}</strong> • Expected 14d Demand: <strong className="text-amber-500">{item.predicted_14d_demand}</strong>
                  </p>
                </div>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/inventory')}
                  className="text-[11px] font-semibold h-7 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                >
                  Restock
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
