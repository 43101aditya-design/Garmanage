import { apiClient } from './apiClient';
import {
  RevenueForecast,
  WorkloadForecast,
  InventoryDemandForecast,
  DurationPrediction,
  AllModelsStatus,
  PredictionPipelineMetadata,
  PredictionMonitoring
} from '../../types/predictions';

export const predictionService = {
  /**
   * Fetch revenue forecast for 7 or 30 day horizon
   */
  async getRevenueForecast(horizon: number = 7, garageId?: string): Promise<RevenueForecast> {
    let endpoint = `/predictions/revenue?horizon=${horizon}`;
    if (garageId && garageId !== 'all') {
      endpoint += `&garage_id=${garageId}`;
    }
    return apiClient.get(endpoint);
  },

  /**
   * Fetch workshop workload forecast
   */
  async getWorkloadForecast(garageId?: string): Promise<WorkloadForecast> {
    let endpoint = '/predictions/workload';
    if (garageId && garageId !== 'all') {
      endpoint += `?garage_id=${garageId}`;
    }
    return apiClient.get(endpoint);
  },

  /**
   * Fetch inventory demand forecast and stockout risks
   */
  async getInventoryDemandForecast(garageId?: string, partId?: string): Promise<InventoryDemandForecast> {
    const params: string[] = [];
    if (garageId && garageId !== 'all') params.push(`garage_id=${garageId}`);
    if (partId) params.push(`part_id=${partId}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    return apiClient.get(`/predictions/inventory-demand${qs}`);
  },

  /**
   * Predict job service duration based on vehicle, service type, and mechanic
   */
  async predictServiceDuration(params: {
    service_type: string;
    vehicle_type: string;
    mechanic_id?: string;
    parts_count?: number;
    garage_id?: string;
    job_id?: string;
  }): Promise<DurationPrediction> {
    return apiClient.post('/predictions/service-duration', params);
  },

  /**
   * Get all registered ML models status
   */
  async getModelsStatus(): Promise<AllModelsStatus> {
    return apiClient.get('/predictions/models/status');
  },

  /**
   * Trigger retraining of a specific ML model
   */
  async trainModel(modelType: 'revenue' | 'workload' | 'inventory-demand' | 'duration', garageId?: string) {
    return apiClient.post(`/predictions/train/${modelType}`, { garage_id: garageId });
  },

  /**
   * Get pipeline metadata for engineering lab
   */
  async getPipelineMetadata(): Promise<PredictionPipelineMetadata> {
    return apiClient.get('/predictions/pipeline/metadata');
  },

  /**
   * Get monitoring metrics and recent prediction logs
   */
  async getMonitoring(): Promise<PredictionMonitoring> {
    return apiClient.get('/predictions/monitoring');
  }
};
