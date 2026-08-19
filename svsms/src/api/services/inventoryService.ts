import { Inventory } from '../../types';
import { useDbStore } from '../../store/dbStore';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const InventoryService = {
  getAll: async (): Promise<Inventory[]> => {
    if (isMock) {
        return useDbStore.getState().inventory;
    }
    return await apiClient.get('/inventory');
  },
  
  getById: async (id: string): Promise<Inventory> => {
    if (isMock) {
        const all = useDbStore.getState().inventory;
        const found = all.find(c => c.id === id);
        if (!found) throw new Error("Inventory not found");
        return found;
    }
    return await apiClient.get(`/inventory/${id}`);
  },

  create: async (data: Omit<Inventory, 'id' | 'created_at'>): Promise<Inventory> => {
    if (isMock) {
        const id = `${Math.floor(Math.random() * 1000)}`;
        const newItem = { ...data, id, created_at: new Date().toISOString() } as unknown as Inventory;
        const current = useDbStore.getState().inventory;
        useDbStore.getState().setInventory([...current, newItem]);
        return newItem;
    }
    return await apiClient.post('/inventory', data);
  },

  update: async (id: string, data: Partial<Inventory>): Promise<Inventory> => {
    if (isMock) {
        const current = useDbStore.getState().inventory;
        const old = current.find(c => c.id === id);
        if (!old) throw new Error("Inventory not found");
        const updated = { ...old, ...data } as Inventory;
        useDbStore.getState().setInventory(current.map(c => c.id === id ? updated : c));
        return updated;
    }
    return await apiClient.put(`/inventory/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) {
        const current = useDbStore.getState().inventory;
        useDbStore.getState().setInventory(current.filter(c => c.id !== id));
        return;
    }
    return await apiClient.delete(`/inventory/${id}`);
  }
};
