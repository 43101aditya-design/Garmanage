import React, { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Users, Box, Wrench, AlertTriangle, Scale, Activity } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

export const AdvancedAnalytics = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [garageAId, setGarageAId] = useState<string>('');
  const [garageBId, setGarageBId] = useState<string>('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/analytics/advanced');
        setData(res);
        if (res.length > 0) setGarageAId(res[0].garage_id);
        if (res.length > 1) setGarageBId(res[1].garage_id);
        else if (res.length > 0) setGarageBId(res[0].garage_id);
      } catch (e) {
        console.error('Failed to fetch advanced analytics:', e);
        toast.error('Advanced analytics service down.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const garageA = data.find(g => g.garage_id === garageAId);
  const garageB = data.find(g => g.garage_id === garageBId);

  const renderMetricRow = (label: string, valueA: any, valueB: any, type: 'currency' | 'percent' | 'number' | 'duration') => {
    const formatVal = (val: any) => {
      if (val === undefined || val === null) return '-';
      if (type === 'currency') return `₹${parseFloat(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (type === 'percent') return `${parseFloat(val).toFixed(1)}%`;
      if (type === 'duration') return `${Math.round(val)} mins`;
      return val.toString();
    };

    // Calculate highlighting comparison
    const numA = parseFloat(valueA) || 0;
    const numB = parseFloat(valueB) || 0;
    const isHigherA = numA > numB;
    const isHigherB = numB > numA;

    return (
      <div className="grid grid-cols-3 gap-6 py-3 border-b border-border/40 text-xs font-mono items-center">
        <div className="text-muted-foreground font-semibold">{label}</div>
        <div className={`text-center font-bold text-sm ${isHigherA ? 'text-emerald-500' : 'text-foreground'}`}>
          {formatVal(valueA)}
        </div>
        <div className={`text-center font-bold text-sm ${isHigherB ? 'text-emerald-500' : 'text-foreground'}`}>
          {formatVal(valueB)}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <Scale className="w-4 h-4 text-primary" />
            Comparison Deck
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Advanced Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare operational efficiency, profitability, and customer rates side-by-side.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Running advanced DBMS aggregator...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-muted/10 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground italic">No garage data available for comparisons.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-border/50 text-xs font-mono">
            <div className="flex flex-col space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase">Compare Garage A</label>
              <select
                value={garageAId}
                onChange={(e) => setGarageAId(e.target.value)}
                className="bg-card border border-border text-foreground rounded-lg p-2 focus:outline-none focus:border-primary font-bold"
              >
                {data.map(g => (
                  <option key={g.garage_id} value={g.garage_id}>{g.garage_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase">Compare Garage B</label>
              <select
                value={garageBId}
                onChange={(e) => setGarageBId(e.target.value)}
                className="bg-card border border-border text-foreground rounded-lg p-2 focus:outline-none focus:border-primary font-bold"
              >
                {data.map(g => (
                  <option key={g.garage_id} value={g.garage_id}>{g.garage_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Card */}
          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="grid grid-cols-3 gap-6 text-center font-mono font-bold text-xs uppercase text-muted-foreground">
                <div className="text-left">Operational Metric</div>
                <div className="text-foreground text-sm font-black border-r border-border/40 pr-2 truncate">
                  {garageA?.garage_name || 'GARAGE A'}
                </div>
                <div className="text-foreground text-sm font-black truncate">
                  {garageB?.garage_name || 'GARAGE B'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/20 pt-2">
              {renderMetricRow('Profitability (Revenue - Parts)', garageA?.profitability, garageB?.profitability, 'currency')}
              {renderMetricRow('Gross Revenue', garageA?.total_revenue, garageB?.total_revenue, 'currency')}
              {renderMetricRow('Average Invoice value', garageA?.avg_invoice, garageB?.avg_invoice, 'currency')}
              {renderMetricRow('Total Parts cost', garageA?.total_inventory_cost, garageB?.total_inventory_cost, 'currency')}
              {renderMetricRow('Total discounts allowed', garageA?.total_discounts, garageB?.total_discounts, 'currency')}
              {renderMetricRow('Job completion volume', garageA?.completed_jobs, garageB?.completed_jobs, 'number')}
              {renderMetricRow('Job completion time', garageA?.avg_duration_minutes, garageB?.avg_duration_minutes, 'duration')}
              {renderMetricRow('Mechanic utilization', garageA?.mechanic_utilization, garageB?.mechanic_utilization, 'percent')}
              {renderMetricRow('Customer repeat service rate', garageA?.repeat_service_rate, garageB?.repeat_service_rate, 'percent')}
              {renderMetricRow('Appointment cancellation rate', garageA?.cancellation_rate, garageB?.cancellation_rate, 'percent')}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
