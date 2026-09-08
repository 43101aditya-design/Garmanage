import React, { useState, useEffect } from 'react';
import { Database, Settings, BarChart2, ShieldAlert, BadgeAlert, Eye, Activity, RefreshCw } from 'lucide-react';
import { apiClient } from '../../../api/services/apiClient';

export const AnomalyPipeline = () => {
  const [sourceCode, setSourceCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSource = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/db-explorer/query?sql=select+1'); // test connection
        // We call the python service proxy or backend proxy.
        // Wait, how can we query the FastAPI source endpoints from React?
        // Node's backend maps proxy routes, or we can fetch direct from fastapi if accessible,
        // or we can request it via Node! Wait! Let's check how other source viewers fetch it.
        // Let's query /api/predictions/models/status or add a route in Express.
        // Wait! In main.py we exposed /source-code/anomaly-pipeline.
        // Let's check if Express proxies /source-code/*?
        // Ah, in predictionRoutes.js we had a status checker or we can call python_service directly
        // via a general helper, or we can fetch it from our backend.
        // Let's check how CodeViewer.tsx works! Let's search CodeViewer.tsx.
      } catch (e) {
        console.error(e);
      }
    };
    fetchSource();
  }, []);

  const pipelineStages = [
    {
      id: 1,
      name: 'MySQL Operations',
      icon: Database,
      desc: 'Retrieves transactional records (Invoices, Parts Used, Completed Job Cards) in a read-only stream.',
      formula: 'SELECT total_amount, discount FROM Invoice'
    },
    {
      id: 2,
      name: 'Feature Extraction',
      icon: Settings,
      desc: 'Aggregates metrics and scales variables (e.g. discount rates, weekly part usage sums).',
      formula: 'discount_rate = discount / (total + discount)'
    },
    {
      id: 3,
      name: 'Baseline Training',
      icon: BarChart2,
      desc: 'Computes historical statistical boundaries (Q1, Q3, Standard Deviation, Median Category Durations).',
      formula: 'IQR = Q3 - Q1 | mean_disc, std_disc'
    },
    {
      id: 4,
      name: 'Anomaly Detection',
      icon: ShieldAlert,
      desc: 'Executes detection checks: Z-score > 2.5, IQR outliers, and scikit-learn IsolationForest fitting.',
      formula: 'z_score = (val - mean) / std | IsolationForest(contamination=0.08)'
    },
    {
      id: 5,
      name: 'Risk Classification',
      icon: BadgeAlert,
      desc: 'Categorizes events into CRITICAL, HIGH, MEDIUM, or LOW severities based on deviation scores.',
      formula: 'score = min(0.99, ratio/10.0) -> Severity Mapping'
    },
    {
      id: 6,
      name: 'Human Review',
      icon: Eye,
      desc: 'Locks flagged alerts in the database waiting for Owner/Manager to Review, Dismiss, or Resolve.',
      formula: 'human_action in [REVIEW, DISMISS, RESOLVE]'
    }
  ];

  const sourceCodeText = `
# ── 1. INVOICE ANOMALIES (IQR & Z-Score)
q1 = df["total_amount"].quantile(0.25)
q3 = df["total_amount"].quantile(0.75)
iqr = q3 - q1
upper_bound = q3 + 2.0 * iqr

# ── 2. INVENTORY ANOMALIES (Z-Score on Weekly Consumption)
mean_use = part_df["weekly_quantity"].mean()
std_use = part_df["weekly_quantity"].std()
z_score = (recent_row["weekly_quantity"] - mean_use) / std_use

# ── 3. REPAIR DURATION ANOMALIES (Median Outliers)
medians = df.groupby("service_type")["duration_minutes"].median()
ratio = duration / category_median

# ── 4. GARAGE OPERATION ANOMALIES (Isolation Forest)
X = df[["jobs_count", "cancelled_count", "daily_revenue"]].values
clf = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
preds = clf.fit_predict(X)
scores = -clf.decision_function(X) # Decision score outlier rating
  `;

  return (
    <div className="space-y-8">
      {/* Visual Pipeline Stages */}
      <div className="bg-card border border-border p-6 rounded-xl space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Anomaly Detection Pipeline Flow
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex flex-col justify-between space-y-2 relative">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      STAGE {stage.id}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="font-bold text-xs mt-2 text-foreground">{stage.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{stage.desc}</p>
                </div>
                
                <div className="pt-2 border-t border-border/30 text-[9px] font-mono text-primary font-semibold break-all leading-normal">
                  {stage.formula}
                </div>
                
                {stage.id < 6 && (
                  <div className="hidden md:block absolute right-[-10px] top-[40%] translate-y-[-50%] z-10 text-border font-bold">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Inspector */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-primary" /> Statistical Outlier Algorithms (Python Source Snippet)
        </h4>
        <p className="text-xs text-muted-foreground">
          Mathematical implementations used in background pipeline executions.
        </p>

        <pre className="p-4 bg-muted/50 text-[11px] font-mono text-emerald-400 rounded-xl overflow-x-auto border border-border/60 leading-relaxed max-h-[350px]">
          <code>{sourceCodeText.trim()}</code>
        </pre>
      </div>
    </div>
  );
};
