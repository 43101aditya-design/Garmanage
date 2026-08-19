import { Vehicle } from '../../types';
import { useDbStore } from '../../store/dbStore';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const VehicleService = {
  getAll: async (): Promise<Vehicle[]> => {
    if (isMock) {
        return useDbStore.getState().vehicles;
    }
    return await apiClient.get('/vehicles');
  },
  
  getById: async (id: string): Promise<Vehicle> => {
    if (isMock) {
        const all = useDbStore.getState().vehicles;
        const found = all.find(c => c.id === id);
        if (!found) throw new Error("Vehicle not found");
        return found;
    }
    return await apiClient.get(`/vehicles/${id}`);
  },

  create: async (data: Omit<Vehicle, 'id' | 'created_at'>): Promise<Vehicle> => {
    if (isMock) {
        const id = `${Math.floor(Math.random() * 1000)}`;
        const newItem = { ...data, id, created_at: new Date().toISOString() } as unknown as Vehicle;
        const current = useDbStore.getState().vehicles;
        useDbStore.getState().setVehicles([...current, newItem]);
        return newItem;
    }
    return await apiClient.post('/vehicles', data);
  },

  update: async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
    if (isMock) {
        const current = useDbStore.getState().vehicles;
        const old = current.find(c => c.id === id);
        if (!old) throw new Error("Vehicle not found");
        const updated = { ...old, ...data } as Vehicle;
        useDbStore.getState().setVehicles(current.map(c => c.id === id ? updated : c));
        return updated;
    }
    return await apiClient.put(`/vehicles/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) {
        const current = useDbStore.getState().vehicles;
        useDbStore.getState().setVehicles(current.filter(c => c.id !== id));
        return;
    }
    return await apiClient.delete(`/vehicles/${id}`);
  }
};
