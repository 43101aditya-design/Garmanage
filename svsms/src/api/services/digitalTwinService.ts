import { apiClient } from './apiClient';
import { SimulationResult, ComparisonResult, SensitivityResult } from '../../types/digitalTwin';

export const digitalTwinService = {
  getSnapshot: async (garageId?: string) => {
    return apiClient.post('/digital-twin/snapshot', { garage_id: garageId });
  },

  simulate: async (payload: {
    garage_id?: string;
    scenario_type: string;
    parameters?: Record<string, any>;
    objective_weights?: Record<string, number>;
    custom_snapshot?: any;
    save_to_history?: boolean;
  }): Promise<SimulationResult> => {
    return apiClient.post('/digital-twin/simulate', payload);
  },

  optimize: async (payload: {
    garage_id?: string;
    objective_weights?: Record<string, number>;
    custom_snapshot?: any;
  }) => {
    return apiClient.post('/digital-twin/optimize', payload);
  },

  compare: async (payload: {
    garage_id?: string;
    scenarios: Array<{
      name: string;
      scenario_type: string;
      parameters: Record<string, any>;
    }>;
    objective_weights?: Record<string, number>;
  }): Promise<ComparisonResult> => {
    return apiClient.post('/digital-twin/compare', payload);
  },

  sensitivity: async (payload: {
    garage_id?: string;
    sweep_type: string;
    custom_range?: number[];
  }): Promise<SensitivityResult> => {
    return apiClient.post('/digital-twin/sensitivity', payload);
  },

  getHistory: async (garageId?: string) => {
    return apiClient.get(`/digital-twin/history${garageId ? `?garage_id=${garageId}` : ''}`);
  },

  getMetadata: async () => {
    return apiClient.get('/digital-twin/pipeline/metadata');
  }
};
