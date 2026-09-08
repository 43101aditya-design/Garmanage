export type DecisionType = 
  | 'MECHANIC_ASSIGNMENT'
  | 'JOB_PRIORITIZATION'
  | 'APPOINTMENT_SCHEDULING'
  | 'WORKLOAD_REBALANCING'
  | 'INVENTORY_REORDER'
  | 'REVENUE_OPTIMIZATION';

export type DecisionStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'MODIFIED'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED';

export type ConfidenceLevel = 
  | 'HIGH_CONFIDENCE'
  | 'MEDIUM_CONFIDENCE'
  | 'LOW_CONFIDENCE';

export type RejectionReasonCode = 
  | 'WRONG_MECHANIC'
  | 'WRONG_TIMING'
  | 'AVAILABILITY_ISSUE'
  | 'BUSINESS_PREFERENCE'
  | 'PREDICTION_INACCURATE'
  | 'OTHER';

export interface AlternativeCandidate {
  id: string;
  name: string;
  suitability_score: number;
  skill_match_pct?: number;
  summary?: string;
}

export interface DecisionAuditItem {
  id: string;
  garage_id: string;
  garage_name?: string;
  decision_type: DecisionType;
  target_entity_type: string;
  target_entity_id: string;
  action_title?: string;
  input_summary: Record<string, any>;
  recommendation_payload: {
    recommended_mechanic?: {
      id: string;
      name: string;
      suitability_score: number;
      skill_match_pct: number;
      projected_workload_mins: number;
      reasoning: string[];
    };
    alternative_candidates?: AlternativeCandidate[];
    recommended_quantity?: number;
    supplier?: string;
    estimated_order_cost?: number;
    recommended_actions?: Array<{
      action_id: string;
      title: string;
      impact: string;
      priority: string;
    }>;
    why?: string[];
    action_title?: string;
    impact_estimate?: string;
  };
  why?: string[];
  impact_estimate?: string;
  confidence_level: ConfidenceLevel;
  confidence_score: number;
  model_versions: Record<string, string>;
  constraints_checked: string[];
  status: DecisionStatus;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  decision_reason?: string | null;
  rejection_reason_code?: RejectionReasonCode | null;
  feedback_notes?: string | null;
  manager_override_payload?: Record<string, any> | null;
  executed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface JobPriorityResult {
  job_id: string;
  priority_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority_score: number;
  score_breakdown: {
    base_score: number;
    urgency_points: number;
    wait_points: number;
    service_points: number;
    customer_points: number;
    parts_points: number;
  };
  reasons: string[];
  recommended_queue_action: string;
}

export interface AppointmentSlotRecommendation {
  date: string;
  start_time: string;
  formatted_slot: string;
  capacity_remaining: number;
  overlapping_jobs: number;
  suitability_score: number;
  reasons: string[];
}

export interface AppointmentSlotResult {
  success: boolean;
  target_date: string;
  service_type: string;
  predicted_duration_mins: number;
  recommended_slot: AppointmentSlotRecommendation | null;
  alternative_slots: AppointmentSlotRecommendation[];
  all_evaluated_slots: AppointmentSlotRecommendation[];
}

export interface DecisionPipelineMetadata {
  pipeline_stages: Array<{
    stage: number;
    name: string;
    description: string;
  }>;
  decision_types: DecisionType[];
  governance_mode: string;
}
