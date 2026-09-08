import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/services/apiClient';

export interface Garage {
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
    (set, get) => ({
      currentGarage: null,
      garages: [],
      setCurrentGarage: (garage) => {
        const prevId = get().currentGarage?.id;
        const nextId = garage?.id;
        set({ currentGarage: garage });
        
        // Notify application components of garage context switch
        if (prevId !== nextId && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('svsms:garage_changed', {
              detail: { previousGarageId: prevId, currentGarageId: nextId },
            })
          );
        }
      },
      setGarages: (garages) => set({ garages }),
      fetchGarages: async () => {
        try {
          const res = await apiClient.get('/api/garages');
          const list = res.garages || res.data || (Array.isArray(res) ? res : []);
          set({ garages: list });
          
          // Auto-select first garage if none currently selected
          if (!get().currentGarage && list.length > 0) {
            get().setCurrentGarage(list[0]);
          }
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
