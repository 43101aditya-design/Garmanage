import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, Database, ShieldCheck, Activity, CheckCircle, 
  ArrowRight, Users, Sparkles, Clock, AlertTriangle, Layers, GitBranch 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { decisionService } from '../../../api/services/decisionService';
import { DecisionPipelineMetadata, DecisionAuditItem } from '../../../types/decisions';

export const DecisionIntelligencePipeline = () => {
  const [pipelineMeta, setPipelineMeta] = useState<DecisionPipelineMetadata | null>(null);
  const [recentAudit, setRecentAudit] = useState<DecisionAuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [meta, hist] = await Promise.all([
          decisionService.getPipelineMetadata(),
          decisionService.getDecisionHistory(undefined, 20)
        ]);
        setPipelineMeta(meta);
        setRecentAudit(hist.history || []);
      } catch (err) {
        console.error('Failed to fetch decision pipeline data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Governance Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              Autonomous Decision Governance Architecture
              <Badge variant="success" className="font-mono text-[9px]">Human-in-the-Loop</Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strict constraint enforcement: Predictions provide signals, Decision Engine scores actions, humans authorize execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-card px-3 py-1.5 rounded-lg border border-border/60">
            <span className="text-muted-foreground">Mode: </span>
            <strong className="text-foreground">CONTROLLED_AUTONOMOUS</strong>
          </div>
        </div>
      </div>

      {/* 7-Stage Pipeline Visualizer */}
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" /> End-to-End Decision Pipeline Stages
          </CardTitle>
          <CardDescription className="text-xs">
            Data lineage from historical database records to finalized audited outcomes.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {pipelineMeta?.pipeline_stages?.map((st) => (
              <div 
                key={st.stage} 
                className="p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between space-y-3 relative hover:border-primary/40 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      STAGE {st.stage}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-foreground mt-2">{st.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{st.description}</p>
                </div>

                <div className="text-[9px] font-mono font-semibold text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Decision Audit Log Stream */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Live Decision Audit Trail
            </CardTitle>
            <CardDescription className="text-xs">
              Every decision transition is immutably logged with reviewer attribution and outcome metrics.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            {recentAudit.length} Recent Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {recentAudit.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground font-mono">No decision audit events recorded yet.</p>
          ) : (
            <div className="divide-y divide-border/40 text-xs max-h-96 overflow-y-auto custom-scrollbar">
              {recentAudit.map((log) => (
                <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/20 transition-colors font-mono text-[11px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{log.action_title || log.decision_type}</span>
                      <Badge 
                        variant={
                          log.status === 'APPROVED' ? 'success' :
                          log.status === 'MODIFIED' ? 'info' :
                          log.status === 'REJECTED' ? 'destructive' : 'outline'
                        }
                        className="text-[9px]"
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[10px]">
                      Entity: {log.target_entity_type} #{log.target_entity_id} • Reviewer: {log.reviewed_by_name || 'Manager'}
                    </p>
                  </div>

                  <div className="text-right text-[10px] text-muted-foreground shrink-0">
                    <p>{new Date(log.created_at).toLocaleTimeString()}</p>
                    <p>{new Date(log.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
