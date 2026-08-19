import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/services/apiClient';

interface Garage {
  id: string;
  name: string;
  description?: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone: string;
  email?: string;
  status: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  member_count?: number;
  mechanic_count?: number;
}

interface GarageState {
  currentGarage: Garage | null;
  garages: Garage[];
  setCurrentGarage: (garage: Garage | null) => void;
  setGarages: (garages: Garage[]) => void;
  fetchGarages: () => Promise<void>;
}

export const useGarageStore = create<GarageState>()(
  persist(
    (set) => ({
      currentGarage: null,
      garages: [],
      setCurrentGarage: (garage) => set({ currentGarage: garage }),
      setGarages: (garages) => set({ garages }),
      fetchGarages: async () => {
        try {
          const res = await apiClient.get('/api/garages');
          set({ garages: res.data || [] });
        } catch (error) {
          console.error('Failed to fetch garages', error);
        }
      },
    }),
    {
      name: 'svsms-garage',
    }
  )
);
