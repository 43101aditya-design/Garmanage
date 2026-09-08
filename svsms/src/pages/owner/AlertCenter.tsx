import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, RefreshCw, Eye, Trash2, XCircle, Info, BrainCircuit } from 'lucide-react';
import { apiClient } from '../../api/services/apiClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

export const AlertCenter = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [severityFilter, setSeverityFilter] = useState('all');

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      let path = `/anomalies?status=${statusFilter}`;
      if (severityFilter !== 'all') {
        path += `&severity=${severityFilter}`;
      }
      const data = await apiClient.get(path);
      setAnomalies(data);
    } catch (e) {
      console.error('Failed to fetch anomalies:', e);
      toast.error('Could not connect to anomaly service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [statusFilter, severityFilter]);

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await apiClient.post('/anomalies/trigger-scan', {});
      toast.success(res.message || 'Scan completed successfully.');
      fetchAnomalies();
    } catch (e) {
      console.error('Failed scanning anomalies:', e);
      toast.error('Anomaly scan trigger failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/anomalies/${id}/status`, { status: newStatus });
      toast.success(`Alert marked as ${newStatus.toLowerCase()}.`);
      fetchAnomalies();
    } catch (e) {
      console.error('Failed updating anomaly status:', e);
      toast.error('Failed to update status.');
    }
  };

  const getActionRecommendation = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'invoice':
        return {
          whyMatters: 'Excessive discounts reduce operational margins and may indicate unauthorized billing concessions.',
          whatReview: `Examine the invoice details and compare with the service logs. Confirm if the discounting manager logged a valid promo justification.`
        };
      case 'inventory':
        return {
          whyMatters: 'Unexpected weekly spikes in part usage could signify inventory leakage, unrecorded customer repairs, or tracking errors.',
          whatReview: `Conduct a physical count of Part ID: ${entityId} in the warehouse. Reconcile this usage against the logged work orders.`
        };
      case 'duration':
        return {
          whyMatters: 'Repair durations exceeding 4x normal medians cause bay scheduling bottlenecks and lower bay efficiency.',
          whatReview: `Examine the completion log of Job Card #${entityId}. Verify if the mechanic reported unexpected parts delays or structural defects.`
        };
      case 'cancellation':
        return {
          whyMatters: 'High cancellation rates consume bay capacity slots that could have been filled by other customers.',
          whatReview: `Review customer ID #${entityId} booking records. Verify if the cancellations are malicious or justify account flag limits.`
        };
      case 'garage':
        return {
          whyMatters: 'Extreme operational shifts indicate sudden volume drops or financial variations.',
          whatReview: `Inspect the daily operational logs for the flagged date: ${entityId}. Check for electricity outages or local holiday closures.`
        };
      default:
        return {
          whyMatters: 'Unusual profile detected relative to historical normal patterns.',
          whatReview: 'Initiate a standard compliance audit of the flagged item.'
        };
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <BrainCircuit className="w-4 h-4 text-primary" />
            AI Audit Center
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Owner Alert Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review machine learning-detected operational and financial anomalies.
          </p>
        </div>
        
        <Button 
          onClick={handleTriggerScan} 
          disabled={scanning}
          className="shadow-lg shadow-primary/20"
        >
          {scanning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scanning Database...
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 mr-2" /> Run Anomaly Scan
            </>
          )}
        </Button>
      </div>

      {/* Filter Options */}
      <div className="flex flex-col sm:flex-row gap-4 bg-muted/20 p-4 rounded-xl border border-border/50 text-xs font-mono">
        <div className="flex flex-col space-y-1.5 flex-1">
          <label className="text-muted-foreground font-semibold uppercase">Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card border border-border text-foreground rounded-lg p-2 focus:outline-none focus:border-primary font-semibold"
          >
            <option value="OPEN">OPEN (Requires Action)</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="DISMISSED">DISMISSED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        <div className="flex flex-col space-y-1.5 flex-1">
          <label className="text-muted-foreground font-semibold uppercase">Severity</label>
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-card border border-border text-foreground rounded-lg p-2 focus:outline-none focus:border-primary font-semibold"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Fetching anomalies...</p>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-16 bg-muted/10 rounded-2xl border border-dashed border-border/70 text-muted-foreground">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <p className="font-semibold text-sm">No anomalous activities found matching filters.</p>
          <p className="text-xs text-muted-foreground mt-1">SVSMS operational models are currently flagging normal behavior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {anomalies.map((item) => {
            const advice = getActionRecommendation(item.entity_type, item.entity_id);
            return (
              <Card key={item.id} className="border-border/60 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${getSeverityColor(item.severity)}`}>
                        {item.severity} RISK
                      </span>
                      <CardTitle className="text-base font-bold text-foreground">
                        {item.entity_type.toUpperCase()} ANOMALY
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {item.algorithm}
                      </Badge>
                    </div>

                    <div className="text-xs font-mono text-muted-foreground">
                      Detected: {new Date(item.detected_at).toLocaleString()}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-sm">
                  {/* Headline / Explanation */}
                  <div className="flex items-start space-x-2.5 bg-muted/30 p-3 rounded-lg border border-border/40">
                    <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground text-xs font-mono">Detection Rationale:</p>
                      <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{item.reason}</p>
                    </div>
                  </div>

                  {/* Actions & Explanations split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1 bg-gradient-to-br from-card to-red-500/5 p-3 rounded-lg border border-border/40">
                      <p className="font-bold text-foreground">Why It Matters</p>
                      <p className="text-muted-foreground leading-normal text-[11px]">{advice.whyMatters}</p>
                    </div>

                    <div className="space-y-1 bg-gradient-to-br from-card to-amber-500/5 p-3 rounded-lg border border-border/40">
                      <p className="font-bold text-foreground">Review Action Items</p>
                      <p className="text-muted-foreground leading-normal text-[11px]">{advice.whatReview}</p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 pb-4 flex justify-between items-center text-xs font-mono border-t border-border/40">
                  <div className="text-muted-foreground">
                    {item.garage_name ? `Location: ${item.garage_name}` : 'Global System Event'}
                    {item.reviewer_name && ` | Reviewed By: ${item.reviewer_name}`}
                  </div>

                  {item.status === 'OPEN' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(item.id, 'REVIEWED')}
                        className="h-8 text-xs font-bold font-mono"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-blue-400" /> Review
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateStatus(item.id, 'DISMISSED')}
                        className="h-8 text-xs font-bold font-mono"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1 text-red-400" /> Dismiss
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                        className="h-8 text-xs font-bold font-mono bg-emerald-600 hover:bg-emerald-500"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                      </Button>
                    </div>
                  )}

                  {item.status !== 'OPEN' && (
                    <Badge variant="success" className="font-mono uppercase text-[9px]">
                      {item.status} (Human Decision)
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
