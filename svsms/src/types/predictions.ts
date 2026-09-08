export interface DailyRevenueForecast {
  date: string;
  predicted_revenue: number;
  lower_bound: number;
  upper_bound: number;
}

export interface RevenueForecastSummary {
  total_predicted: number;
  avg_daily: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ContributingFactor {
  feature: string;
  importance?: number;
  note?: string;
}

export interface RevenueForecast {
  mode: 'ML' | 'BASELINE' | 'NO_DATA' | 'UNAVAILABLE' | 'ERROR';
  model_name?: string;
  model_version?: string;
  trained_at?: string;
  garage_id?: string | null;
  horizon_days: number;
  data_period?: string;
  data_rows?: number;
  message?: string | null;
  forecast: DailyRevenueForecast[];
  summary: RevenueForecastSummary | null;
  evaluation?: {
    MAE?: number;
    RMSE?: number;
    MAPE?: number;
    R2?: number;
  };
  baseline_evaluation?: {
    MAE?: number;
    RMSE?: number;
  };
  contributing_factors?: ContributingFactor[];
}

export interface WorkloadDayForecast {
  date: string;
  predicted_jobs: number;
  lower_bound?: number;
  upper_bound?: number;
  workload_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  bottleneck_risk?: boolean;
  recommended_action?: string;
}

export interface WorkloadForecast {
  mode: 'ML' | 'BASELINE' | 'NO_DATA' | 'UNAVAILABLE' | 'ERROR';
  model_name?: string;
  model_version?: string;
  garage_id?: string | null;
  data_rows?: number;
  message?: string | null;
  tomorrow: WorkloadDayForecast | null;
  week_forecast?: Array<{
    date: string;
    predicted_jobs: number;
    workload_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  }>;
  historical_avg_14d?: number;
  evaluation?: {
    MAE?: number;
    RMSE?: number;
  };
  contributing_factors?: ContributingFactor[];
}

export interface PartDemandPrediction {
  part_id: string;
  part_name: string;
  garage_id?: string | null;
  mode: 'ML' | 'BASELINE';
  predicted_14d_demand: number;
  current_stock: number;
  reserved_quantity: number;
  available_stock: number;
  reorder_level: number;
  stockout_risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'HEALTHY';
  reorder_recommended: boolean;
  note?: string | null;
}

export interface InventoryDemandForecast {
  mode: 'ML' | 'BASELINE' | 'NO_DATA' | 'UNAVAILABLE' | 'ERROR';
  garage_id?: string | null;
  model_name?: string;
  model_status?: ModelStatusInfo;
  total_parts_analyzed: number;
  critical_count: number;
  high_risk_count: number;
  predictions: PartDemandPrediction[];
  message?: string | null;
}

export interface DurationPrediction {
  mode: 'ML' | 'RULE_BASED' | 'NO_DATA' | 'UNAVAILABLE' | 'ERROR';
  model_name?: string;
  model_version?: string;
  garage_id?: string | null;
  estimated_minutes: number;
  estimated_hours: number;
  estimated_completion: string;
  inputs: {
    service_type: string;
    vehicle_type: string;
    mechanic_id?: string | null;
    parts_count?: number;
  };
  contributing_factors?: ContributingFactor[];
  evaluation?: {
    MAE?: number;
    RMSE?: number;
  };
  message?: string | null;
}

export interface ModelStatusInfo {
  trained: boolean;
  version?: string;
  saved_at?: string;
  training_rows?: number;
  features?: string[];
  evaluation?: Record<string, number>;
  feature_importance?: Record<string, number>;
}

export interface AllModelsStatus {
  [modelName: string]: ModelStatusInfo;
}

export interface PipelineStage {
  stage: number;
  name: string;
  description: string;
}

export interface PredictionPipelineMetadata {
  pipeline_stages: PipelineStage[];
  models: AllModelsStatus;
  production_vs_simulation: {
    production: string;
    simulation: string;
  };
}

export interface PredictionLogEntry {
  id: string;
  prediction_type: 'revenue' | 'workload' | 'inventory_demand' | 'service_duration';
  garage_id: string | null;
  target_id: string | null;
  model_version: string;
  prediction_input: any;
  prediction_output: any;
  actual_outcome: number | null;
  created_at: string;
  garage_name?: string;
}

export interface PredictionMonitoring {
  logs: PredictionLogEntry[];
  metrics: {
    service_duration: { mae: number | null; rmse: number | null; count: number };
    revenue: { mae: number | null; rmse: number | null; count: number };
    workload: { mae: number | null; rmse: number | null; count: number };
  };
}
