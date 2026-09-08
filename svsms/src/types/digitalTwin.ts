export interface MechanicWorkload {
  mechanic_id: string;
  name: string;
  specialization: string;
  assigned_minutes: number;
  max_minutes: number;
  utilization_pct: number;
}

export interface FinancialImpact {
  currency: string;
  currency_symbol: string;
  total_potential_revenue_inr: number;
  realized_revenue_inr: number;
  delayed_revenue_inr: number;
  formatted_realized_inr: string;
  formatted_delayed_inr: string;
}

export interface WorkshopMetrics {
  active_jobs: number;
  available_mechanics: number;
  service_bays: number;
  operating_hours: number;
  daily_capacity_jobs: number;
  utilization_pct: number;
  avg_wait_mins: number;
  max_wait_mins: number;
  queue_backlog_length: number;
  jobs_completed_projected: number;
  delayed_jobs_count: number;
  throughput_jobs_per_hour: number;
  sla_violations_count: number;
  sla_compliance_pct: number;
  inventory_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  inventory_risk_score: number;
  critical_parts_depleted_count: number;
  financial_impact: FinancialImpact;
  mechanic_workloads: MechanicWorkload[];
}

export interface BottleneckDiagnosis {
  bottleneck_type: string;
  severity: 'NOMINAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  root_cause: string;
  evidence: Record<string, any>;
  affected_entities: Record<string, any>;
  remediation: string;
}

export interface RecommendedConfiguration {
  action: string;
  description: string;
  composite_score: number;
  solver_engine: string;
  projected_metrics: WorkshopMetrics;
  objective_weights_used: Record<string, number>;
}

export interface SimulationResult {
  status: string;
  scenario_type: string;
  scenario_name: string;
  garage_id: string;
  snapshot_hash: string;
  execution_time_ms: number;
  isolation_guarantee: string;
  is_feasible: boolean;
  baseline: {
    metrics: WorkshopMetrics;
    status: string;
  };
  simulated: {
    metrics: WorkshopMetrics;
    scenario_meta: Record<string, any>;
    risk_level: string;
  };
  recommended: RecommendedConfiguration;
  bottleneck: BottleneckDiagnosis;
  constraints: {
    is_feasible: boolean;
    status: string;
    violations_count: number;
    critical_violations: number;
    violations: Array<{
      constraint: string;
      severity: string;
      message: string;
      [key: string]: any;
    }>;
    warnings: any[];
  };
  phase8_decision_bridge: {
    integration_status: string;
    decision_type: string;
    target_entity_type: string;
    proposed_action: string;
    confidence_score: number;
    confidence_level: string;
    rationale: string[];
    projected_outcomes: Record<string, any>;
    governance_note: string;
  };
  execution_trace: string[];
}

export interface ScenarioComparisonItem {
  scenario_index: number;
  scenario_name: string;
  scenario_type: string;
  parameters: Record<string, any>;
  is_feasible: boolean;
  composite_score: number;
  rank: number;
  metrics: WorkshopMetrics;
  delta_vs_baseline: {
    wait_time_delta_mins: number;
    utilization_delta_pct: number;
    realized_revenue_delta_inr: number;
    delayed_jobs_delta: number;
  };
  recommendation: {
    title: string;
    composite_score: number;
    projected_wait_mins: number;
  };
}

export interface ComparisonResult {
  status: string;
  scenarios_evaluated_count: number;
  baseline_metrics: WorkshopMetrics;
  ranked_scenarios: ScenarioComparisonItem[];
  best_scenario: ScenarioComparisonItem | null;
  objective_weights_applied: Record<string, number>;
}

export interface SensitivityPoint {
  parameter_value: number;
  parameter_label: string;
  utilization_pct: number;
  avg_wait_mins: number;
  delayed_jobs: number;
  throughput_jobs_day: number;
  realized_revenue_inr: number;
  [key: string]: any;
}

export interface SensitivityResult {
  sweep_type: string;
  data_points: SensitivityPoint[];
  key_insight: string;
  baseline_parameter: SensitivityPoint;
}
