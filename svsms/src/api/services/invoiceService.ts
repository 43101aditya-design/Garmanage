import { Invoice } from '../../types';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

// Note: No mock store for Invoice in dbStore yet, but service wrapper required by architecture.
export const InvoiceService = {
  getAll: async (): Promise<Invoice[]> => {
    if (isMock) return [];
    return await apiClient.get('/invoices');
  },
  
  getById: async (id: string): Promise<Invoice> => {
    if (isMock) throw new Error("Mock not implemented for Invoice");
    return await apiClient.get(`/invoices/${id}`);
  },

  create: async (data: any): Promise<Invoice> => {
    if (isMock) throw new Error("Mock not implemented for Invoice");
    return await apiClient.post('/invoices', data);
  },

  update: async (id: string, data: any): Promise<Invoice> => {
    if (isMock) throw new Error("Mock not implemented for Invoice");
    return await apiClient.put(`/invoices/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) throw new Error("Mock not implemented for Invoice");
    return await apiClient.delete(`/invoices/${id}`);
  }
};
