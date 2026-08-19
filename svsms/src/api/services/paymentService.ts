import { Payment } from '../../types';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

// Note: No mock store for Payment in dbStore yet, but service wrapper required by architecture.
export const PaymentService = {
  getAll: async (): Promise<Payment[]> => {
    if (isMock) return [];
    return await apiClient.get('/payments');
  },
  
  getById: async (id: string): Promise<Payment> => {
    if (isMock) throw new Error("Mock not implemented for Payment");
    return await apiClient.get(`/payments/${id}`);
  },

  create: async (data: any): Promise<Payment> => {
    if (isMock) throw new Error("Mock not implemented for Payment");
    return await apiClient.post('/payments', data);
  },

  update: async (id: string, data: any): Promise<Payment> => {
    if (isMock) throw new Error("Mock not implemented for Payment");
    return await apiClient.put(`/payments/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) throw new Error("Mock not implemented for Payment");
    return await apiClient.delete(`/payments/${id}`);
  }
};
