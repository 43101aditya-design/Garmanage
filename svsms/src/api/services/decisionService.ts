import { apiClient } from './apiClient';
import {
  DecisionAuditItem,
  JobPriorityResult,
  AppointmentSlotResult,
  DecisionPipelineMetadata,
  RejectionReasonCode
} from '../../types/decisions';

export const decisionService = {
  /**
   * Fetch pending decisions awaiting human review
   */
  async getPendingDecisions(garageId?: string): Promise<{ garage_id: string; count: number; decisions: DecisionAuditItem[] }> {
    let endpoint = '/decisions/pending';
    if (garageId && garageId !== 'all') {
      endpoint += `?garage_id=${garageId}`;
    }
    return apiClient.get(endpoint);
  },

  /**
   * Approve an AI decision recommendation
   */
  async approveDecision(id: string): Promise<{ success: boolean; decision_id: string; status: string; execution: any }> {
    return apiClient.post(`/decisions/${id}/approve`, {});
  },

  /**
   * Reject an AI decision recommendation with structured reason feedback
   */
  async rejectDecision(id: string, reasonCode: RejectionReasonCode, notes?: string): Promise<{ success: boolean; decision_id: string; status: string }> {
    return apiClient.post(`/decisions/${id}/reject`, {
      rejection_reason_code: reasonCode,
      notes: notes || ''
    });
  },

  /**
   * Modify / override an AI decision recommendation (e.g. choose different mechanic)
   */
  async modifyDecision(id: string, modifications: {
    mechanic_id?: string;
    modified_quantity?: number;
    override_reason?: string;
    notes?: string;
  }): Promise<{ success: boolean; decision_id: string; status: string; execution: any }> {
    return apiClient.post(`/decisions/${id}/modify`, modifications);
  },

  /**
   * Calculate smart job priority score
   */
  async scoreJobPriority(params: {
    job_details: { id: string; service_type: string };
    hours_until_scheduled?: number;
    customer_wait_hours?: number;
    parts_available?: boolean;
    predicted_duration_mins?: number;
    is_vip_customer?: boolean;
  }): Promise<JobPriorityResult> {
    return apiClient.post('/decisions/job-priority', params);
  },

  /**
   * Find optimal appointment slots
   */
  async getOptimizedAppointmentSlots(params: {
    service_type: string;
    vehicle_type?: string;
    target_date?: string;
    garage_id?: string;
  }): Promise<AppointmentSlotResult> {
    return apiClient.post('/decisions/appointment-slots', params);
  },

  /**
   * Fetch decision audit history
   */
  async getDecisionHistory(garageId?: string, limit: number = 100): Promise<{ garage_id: string; count: number; history: DecisionAuditItem[] }> {
    let endpoint = `/decisions/history?limit=${limit}`;
    if (garageId && garageId !== 'all') {
      endpoint += `&garage_id=${garageId}`;
    }
    return apiClient.get(endpoint);
  },

  /**
   * Fetch pipeline metadata for Engineering Lab
   */
  async getPipelineMetadata(): Promise<DecisionPipelineMetadata> {
    return apiClient.get('/decisions/pipeline/metadata');
  }
};
