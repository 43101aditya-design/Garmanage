import { Customer } from '../../types';
import { CustomerMockApi } from '../mock/customerMock';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const CustomerService = {
  getAllCustomers: async (): Promise<Customer[]> => {
    if (isMock) return await CustomerMockApi.getAll();
    return await apiClient.get('/customers');
  },
  
  getCustomerById: async (id: string): Promise<Customer> => {
    if (isMock) {
        // Find in mock data - returning all for now, this is just to demonstrate
        const all = await CustomerMockApi.getAll();
        const found = all.find(c => c.id === id);
        if (!found) throw new Error("Customer not found");
        return found;
    }
    return await apiClient.get(`/customers/${id}`);
  },

  createCustomer: async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    if (isMock) return await CustomerMockApi.create(customer);
    return await apiClient.post('/customers', customer);
  },

  updateCustomer: async (id: string, customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    if (isMock) return await CustomerMockApi.update(id, customer); // Assume mock has update
    return await apiClient.put(`/customers/${id}`, customer);
  },

  deleteCustomer: async (id: string): Promise<void> => {
    if (isMock) return await CustomerMockApi.delete(id);
    return await apiClient.delete(`/customers/${id}`);
  }
};
