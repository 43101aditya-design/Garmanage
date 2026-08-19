import { Appointment } from '../../types';
import { useDbStore } from '../../store/dbStore';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const AppointmentService = {
  getAll: async (): Promise<Appointment[]> => {
    if (isMock) {
        return useDbStore.getState().appointments;
    }
    return await apiClient.get('/appointments');
  },
  
  getById: async (id: string): Promise<Appointment> => {
    if (isMock) {
        const all = useDbStore.getState().appointments;
        const found = all.find(c => c.id === id);
        if (!found) throw new Error("Appointment not found");
        return found;
    }
    return await apiClient.get(`/appointments/${id}`);
  },

  create: async (data: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> => {
    if (isMock) {
        const id = `${Math.floor(Math.random() * 1000)}`;
        const newItem = { ...data, id, created_at: new Date().toISOString() } as unknown as Appointment;
        const current = useDbStore.getState().appointments;
        useDbStore.getState().setAppointments([...current, newItem]);
        return newItem;
    }
    return await apiClient.post('/appointments', data);
  },

  update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    if (isMock) {
        const current = useDbStore.getState().appointments;
        const old = current.find(c => c.id === id);
        if (!old) throw new Error("Appointment not found");
        const updated = { ...old, ...data } as Appointment;
        useDbStore.getState().setAppointments(current.map(c => c.id === id ? updated : c));
        return updated;
    }
    return await apiClient.put(`/appointments/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) {
        const current = useDbStore.getState().appointments;
        useDbStore.getState().setAppointments(current.filter(c => c.id !== id));
        return;
    }
    return await apiClient.delete(`/appointments/${id}`);
  }
};
