import { apiClient } from './apiClient';

export interface SavedGarage {
  id: string;
  saved_id: string;
  saved_at: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  garage_type?: string;
  logo_url?: string;
  status: string;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string;
  base_price: number | string;
  estimated_duration_minutes: number;
}

export const savedGarageService = {
  // Fetch all saved garages for the authenticated customer
  async getSavedGarages(): Promise<SavedGarage[]> {
    const res = await apiClient.get('/api/customer/saved-garages');
    return Array.isArray(res) ? res : res?.data || [];
  },

  // Save a garage
  async saveGarage(garageId: string): Promise<{ success?: boolean; id?: string; message: string; isSaved: boolean }> {
    return apiClient.post('/api/customer/saved-garages', { garage_id: garageId });
  },

  // Unsave a garage
  async unsaveGarage(garageId: string): Promise<{ success: boolean; message: string; isSaved: boolean }> {
    return apiClient.delete(`/api/customer/saved-garages/${garageId}`);
  },

  // Check if a specific garage is saved
  async checkSaved(garageId: string): Promise<{ isSaved: boolean }> {
    return apiClient.get(`/api/customer/saved-garages/check/${garageId}`);
  },

  // Fetch available services from catalog
  async getServices(): Promise<CatalogService[]> {
    const res = await apiClient.get('/api/services');
    return Array.isArray(res) ? res : res?.data || [];
  }
};
