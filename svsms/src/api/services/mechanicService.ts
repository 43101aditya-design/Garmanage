import { Mechanic } from '../../types';
import { useDbStore } from '../../store/dbStore';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const MechanicService = {
  getAll: async (): Promise<Mechanic[]> => {
    if (isMock) {
        return useDbStore.getState().mechanics;
    }
    return await apiClient.get('/mechanics');
  },
  
  getById: async (id: string): Promise<Mechanic> => {
    if (isMock) {
        const all = useDbStore.getState().mechanics;
        const found = all.find(c => c.id === id);
        if (!found) throw new Error("Mechanic not found");
        return found;
    }
    return await apiClient.get(`/mechanics/${id}`);
  },

  create: async (data: Omit<Mechanic, 'id' | 'created_at'>): Promise<Mechanic> => {
    if (isMock) {
        const id = `${Math.floor(Math.random() * 1000)}`;
        const newItem = { ...data, id, created_at: new Date().toISOString() } as unknown as Mechanic;
        const current = useDbStore.getState().mechanics;
        useDbStore.getState().setMechanics([...current, newItem]);
        return newItem;
    }
    return await apiClient.post('/mechanics', data);
  },

  update: async (id: string, data: Partial<Mechanic>): Promise<Mechanic> => {
    if (isMock) {
        const current = useDbStore.getState().mechanics;
        const old = current.find(c => c.id === id);
        if (!old) throw new Error("Mechanic not found");
        const updated = { ...old, ...data } as Mechanic;
        useDbStore.getState().setMechanics(current.map(c => c.id === id ? updated : c));
        return updated;
    }
    return await apiClient.put(`/mechanics/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) {
        const current = useDbStore.getState().mechanics;
        useDbStore.getState().setMechanics(current.filter(c => c.id !== id));
        return;
    }
    return await apiClient.delete(`/mechanics/${id}`);
  }
};
