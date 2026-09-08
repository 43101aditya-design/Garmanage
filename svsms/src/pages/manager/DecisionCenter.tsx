import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, CheckCircle, XCircle, AlertTriangle, 
  Sparkles, Clock, Users, Package, TrendingUp, Calendar, 
  RefreshCw, ChevronRight, ShieldCheck, FileText, ArrowRight, UserCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { decisionService } from '../../api/services/decisionService';
import { DecisionAuditItem, RejectionReasonCode, JobPriorityResult } from '../../types/decisions';
import { toast } from 'sonner';

export const DecisionCenter = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'priority' | 'history'>('pending');
  const [decisions, setDecisions] = useState<DecisionAuditItem[]>([]);
  const [history, setHistory] = useState<DecisionAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingItem, setRejectingItem] = useState<DecisionAuditItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<RejectionReasonCode>('BUSINESS_PREFERENCE');
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Modify / Override modal state
  const [modifyingItem, setModifyingItem] = useState<DecisionAuditItem | null>(null);
  const [overrideMechanicId, setOverrideMechanicId] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const [pendingRes, historyRes] = await Promise.all([
        decisionService.getPendingDecisions(),
        decisionService.getDecisionHistory(undefined, 50)
      ]);
      setDecisions(pendingRes.decisions || []);
      setHistory(historyRes.history || []);
    } catch (err: any) {
      console.error('Failed to load decisions:', err);
      toast.error('Could not load AI decisions. Intelligence engine offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleApprove = async (decision: DecisionAuditItem) => {
    setActionLoading(decision.id);
    try {
      await decisionService.approveDecision(decision.id);
      toast.success(`Approved: ${decision.action_title || decision.decision_type}`);
      await fetchDecisions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve decision');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setActionLoading(rejectingItem.id);
    try {
      await decisionService.rejectDecision(rejectingItem.id, rejectionReason, rejectionNotes);
      toast.info(`Rejected decision: Feedback recorded.`);
      setRejectingItem(null);
      setRejectionNotes('');
      await fetchDecisions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject decision');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmModify = async () => {
    if (!modifyingItem) return;
    setActionLoading(modifyingItem.id);
    try {
      await decisionService.modifyDecision(modifyingItem.id, {
        mechanic_id: overrideMechanicId || undefined,
        override_reason: overrideNotes || 'Manager manual override selection',
        notes: overrideNotes
      });
      toast.success(`Modified & Approved decision.`);
      setModifyingItem(null);
      setOverrideMechanicId('');
      setOverrideNotes('');
      await fetchDecisions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to modify decision');
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MECHANIC_ASSIGNMENT': return <Users className="w-4 h-4 text-blue-500" />;
      case 'INVENTORY_REORDER': return <Package className="w-4 h-4 text-amber-500" />;
      case 'WORKLOAD_REBALANCING': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default: return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
            <BrainCircuit className="w-4 h-4" />
            Controlled Autonomous Operations
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-1 flex items-center gap-2">
            <span>AI Decision Center</span>
            <Badge className="font-mono text-[9px] bg-primary/10 text-primary border border-primary/20">
              Human-in-the-Loop
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explainable AI recommendations with safety constraint validation and atomic workflow execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDecisions} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Signals
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase font-bold text-muted-foreground">Pending Approvals</p>
            <p className="text-3xl font-extrabold text-foreground mt-1">{decisions.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase font-bold text-muted-foreground">Decisions Executed</p>
            <p className="text-3xl font-extrabold text-emerald-500 mt-1">
              {history.filter(h => h.status === 'APPROVED' || h.status === 'MODIFIED').length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase font-bold text-muted-foreground">Feedback Loop Data</p>
            <p className="text-3xl font-extrabold text-purple-500 mt-1">{history.length} logs</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-border/60 font-mono text-xs">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 px-4 font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending Proposals ({decisions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Decision Audit History ({history.length})
        </button>
      </div>

      {/* TAB 1: PENDING PROPOSALS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Synthesizing predictive signals into actionable decisions...</p>
            </div>
          ) : decisions.length === 0 ? (
            <div className="py-16 text-center bg-card border border-dashed border-border/60 rounded-xl space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-base font-bold text-foreground">No Pending Action Items</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                All workshop bays, mechanic allocations, and inventory replenishment thresholds are currently operating within nominal targets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {decisions.map((decision) => {
                const payload = decision.recommendation_payload || {};
                const recMech = payload.recommended_mechanic;
                const whyList = decision.why || payload.why || [];
                const alternatives = payload.alternative_candidates || [];

                return (
                  <Card key={decision.id} className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-md flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-card border border-border/60 shadow-xs">
                            {getTypeIcon(decision.decision_type)}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                              {decision.decision_type.replace(/_/g, ' ')}
                            </span>
                            <CardTitle className="text-base font-bold text-foreground mt-0.5">
                              {decision.action_title || `Action proposal for ${decision.target_entity_type} #${decision.target_entity_id}`}
                            </CardTitle>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(Date.now() - new Date(decision.created_at).getTime()) > 48 * 3600 * 1000 && (
                            <Badge variant="destructive" className="font-mono text-[9px] uppercase">
                              STALE (&gt;48h)
                            </Badge>
                          )}
                          <Badge 
                            variant={decision.confidence_level === 'HIGH_CONFIDENCE' ? 'success' : 'warning'}
                            className="font-mono text-[9px] uppercase shrink-0"
                          >
                            {decision.confidence_level.replace('_', ' ')} ({decision.confidence_score}%)
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4 flex-1">
                      {/* Why Explanation List */}
                      {whyList.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-primary" /> Transparent Rationale (Why):
                          </p>
                          <div className="bg-muted/40 p-3 rounded-lg border border-border/50 space-y-1">
                            {whyList.map((reason, rIdx) => (
                              <div key={rIdx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary font-bold">•</span>
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expected Impact */}
                      {decision.impact_estimate && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                          <strong>Expected Impact: </strong>{decision.impact_estimate}
                        </div>
                      )}

                      {/* Alternative candidates if available */}
                      {alternatives.length > 0 && (
                        <div className="space-y-1 text-xs">
                          <p className="text-[10px] font-mono uppercase text-muted-foreground font-bold">Alternative Options:</p>
                          <div className="flex flex-wrap gap-2">
                            {alternatives.map((alt) => (
                              <span key={alt.id} className="px-2 py-1 rounded bg-muted/60 border border-border/50 text-[11px] text-foreground font-mono">
                                {alt.name} ({alt.summary || `${alt.suitability_score}%`})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Constraints Verified */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/40">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Constraints verified: Garage isolation, status active, no booking collision.</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 border-t border-border/40 flex items-center justify-between gap-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={actionLoading === decision.id}
                          onClick={() => setRejectingItem(decision)}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>

                        {decision.decision_type === 'MECHANIC_ASSIGNMENT' && alternatives.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={actionLoading === decision.id}
                            onClick={() => setModifyingItem(decision)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Choose Another
                          </Button>
                        )}
                      </div>

                      <Button 
                        size="sm"
                        disabled={actionLoading === decision.id || ((Date.now() - new Date(decision.created_at).getTime()) > 48 * 3600 * 1000)}
                        onClick={() => handleApprove(decision)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/20 disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {actionLoading === decision.id ? 'Executing...' : (Date.now() - new Date(decision.created_at).getTime()) > 48 * 3600 * 1000 ? 'Expired (>48h)' : 'Approve & Execute'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold text-foreground">Decision Execution & Feedback Audit Trail</CardTitle>
            <CardDescription className="text-xs">Immutable record of AI proposals, human reviewer decisions, override reasons, and timestamps.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground font-mono">No historical decisions logged yet.</p>
            ) : (
              <div className="divide-y divide-border/40 text-xs">
                {history.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{item.action_title || item.decision_type}</span>
                        <Badge 
                          variant={
                            item.status === 'APPROVED' ? 'success' :
                            item.status === 'MODIFIED' ? 'info' :
                            item.status === 'REJECTED' ? 'destructive' : 'outline'
                          } 
                          className="font-mono text-[9px]"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Target: <strong className="text-foreground">{item.target_entity_type} #{item.target_entity_id}</strong> • Confidence: {item.confidence_score}%
                      </p>
                      {item.decision_reason && (
                        <p className="text-[11px] text-muted-foreground italic">Review Note: {item.decision_reason}</p>
                      )}
                    </div>

                    <div className="text-right text-[11px] font-mono text-muted-foreground shrink-0">
                      <p>Reviewer: <strong className="text-foreground">{item.reviewed_by_name || 'Authorized Manager'}</strong></p>
                      <p>{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: REJECTION FEEDBACK */}
      {rejectingItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" /> Reject Decision Recommendation
              </CardTitle>
              <CardDescription className="text-xs">
                Your feedback directly improves future AI decision quality without online self-contamination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="font-mono font-bold text-muted-foreground uppercase">Reason for Rejection</label>
                <select 
                  value={rejectionReason} 
                  onChange={(e) => setRejectionReason(e.target.value as RejectionReasonCode)}
                  className="w-full mt-1 p-2 bg-background border rounded-md"
                >
                  <option value="WRONG_MECHANIC">Wrong Mechanic Selected</option>
                  <option value="WRONG_TIMING">Timing / Shift Conflict</option>
                  <option value="AVAILABILITY_ISSUE">Mechanic / Bay Unavailable</option>
                  <option value="BUSINESS_PREFERENCE">Specific Business / Client Preference</option>
                  <option value="PREDICTION_INACCURATE">Prediction Inaccurate</option>
                  <option value="OTHER">Other Operational Constraint</option>
                </select>
              </div>

              <div>
                <label className="font-mono font-bold text-muted-foreground uppercase">Optional Notes</label>
                <textarea 
                  rows={3} 
                  value={rejectionNotes} 
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Describe why this decision was rejected..."
                  className="w-full mt-1 p-2 bg-background border rounded-md text-xs"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setRejectingItem(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleConfirmReject}>Confirm Rejection</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* MODAL: CHOOSE ALTERNATIVE MECHANIC */}
      {modifyingItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Select Alternative Mechanic
              </CardTitle>
              <CardDescription className="text-xs">
                Override the top recommendation with another eligible candidate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="font-mono font-bold text-muted-foreground uppercase">Choose Mechanic</label>
                <select 
                  value={overrideMechanicId} 
                  onChange={(e) => setOverrideMechanicId(e.target.value)}
                  className="w-full mt-1 p-2 bg-background border rounded-md"
                >
                  <option value="">Select a candidate...</option>
                  {modifyingItem.recommendation_payload?.alternative_candidates?.map((alt) => (
                    <option key={alt.id} value={alt.id}>
                      {alt.name} ({alt.summary || `${alt.suitability_score}% match`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono font-bold text-muted-foreground uppercase">Override Justification</label>
                <input 
                  type="text"
                  value={overrideNotes} 
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Customer requested this mechanic specifically"
                  className="w-full mt-1 p-2 bg-background border rounded-md text-xs"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setModifyingItem(null)}>Cancel</Button>
              <Button size="sm" onClick={handleConfirmModify} disabled={!overrideMechanicId}>
                Apply & Execute
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};
