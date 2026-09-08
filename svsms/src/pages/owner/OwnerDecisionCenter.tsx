import React, { useState, useEffect } from 'react';
import { 
  Award, Building2, BrainCircuit, CheckCircle, XCircle, 
  TrendingUp, Package, ShieldCheck, Clock, RefreshCw, AlertTriangle, Sparkles 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useGarageStore } from '../../store/garageStore';
import { decisionService } from '../../api/services/decisionService';
import { DecisionAuditItem } from '../../types/decisions';
import { toast } from 'sonner';

export const OwnerDecisionCenter = () => {
  const { garages, fetchGarages } = useGarageStore();
  const [selectedGarage, setSelectedGarage] = useState<string>('all');
  const [decisions, setDecisions] = useState<DecisionAuditItem[]>([]);
  const [history, setHistory] = useState<DecisionAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, histRes] = await Promise.all([
        decisionService.getPendingDecisions(selectedGarage),
        decisionService.getDecisionHistory(selectedGarage, 50)
      ]);
      setDecisions(pendingRes.decisions || []);
      setHistory(histRes.history || []);
    } catch (err) {
      console.error('Failed to load owner decisions:', err);
      toast.error('Failed to load enterprise decision feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  useEffect(() => {
    loadData();
  }, [selectedGarage]);

  const handleApprove = async (decision: DecisionAuditItem) => {
    setActionLoading(decision.id);
    try {
      await decisionService.approveDecision(decision.id);
      toast.success(`Approved decision for ${decision.garage_name || 'Garage'}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <Award className="w-4 h-4" />
            Enterprise Strategic Governance
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1 flex items-center gap-2">
            <span>Owner Decision Deck</span>
            <Badge className="font-mono text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Multi-Garage Intelligence
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            High-level operational interventions across all authorized garage branches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedGarage} 
            onChange={(e) => setSelectedGarage(e.target.value)}
            className="bg-card border border-border/80 text-foreground rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary shadow-sm"
          >
            <option value="all">All Garages ({garages.length} branches)</option>
            {garages.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Proposals Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-primary" /> Active Decision Proposals Awaiting Authorization
        </h2>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-mono">Consolidating cross-garage predictive intelligence...</p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="py-12 text-center bg-card border border-dashed border-border/60 rounded-xl space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">All Branches Operating Optimally</p>
            <p className="text-xs text-muted-foreground">No urgent cross-garage reallocations or stock authorizations pending.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decisions.map((decision) => (
              <Card key={decision.id} className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-md flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                      {decision.garage_name || decision.garage_id}
                    </span>
                    <Badge variant="outline" className="font-mono text-[9px]">
                      {decision.confidence_level.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground mt-1">
                    {decision.action_title || decision.decision_type.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-3 space-y-3 flex-1 text-xs">
                  {decision.why && decision.why.length > 0 && (
                    <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 space-y-1">
                      {decision.why.slice(0, 2).map((w, i) => (
                        <p key={i} className="text-muted-foreground text-[11px]">• {w}</p>
                      ))}
                    </div>
                  )}

                  {decision.impact_estimate && (
                    <p className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded">
                      {decision.impact_estimate}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t border-border/40 flex justify-end gap-2 bg-muted/20">
                  <Button 
                    size="sm"
                    disabled={actionLoading === decision.id}
                    onClick={() => handleApprove(decision)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {actionLoading === decision.id ? 'Executing...' : 'Approve Action'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
