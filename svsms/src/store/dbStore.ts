import { create } from 'zustand';
import { Customer, Vehicle, Mechanic, Appointment, SparePart, Inventory } from '../types';
import { mockCustomers, mockVehicles, mockMechanics, mockAppointments, mockSpareParts, mockInventory } from '../constants/mockData';

interface DbState {
  customers: Customer[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  appointments: Appointment[];
  spareParts: SparePart[];
  inventory: Inventory[];
  
  // Setters for entire tables (simulating DB population)
  setCustomers: (customers: Customer[]) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setMechanics: (mechanics: Mechanic[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setSpareParts: (spareParts: SparePart[]) => void;
  setInventory: (inventory: Inventory[]) => void;
}

export const useDbStore = create<DbState>((set) => ({
  customers: mockCustomers,
  vehicles: mockVehicles,
  mechanics: mockMechanics,
  appointments: mockAppointments,
  spareParts: mockSpareParts,
  inventory: mockInventory,

  setCustomers: (customers) => set({ customers }),
  setVehicles: (vehicles) => set({ vehicles }),
  setMechanics: (mechanics) => set({ mechanics }),
  setAppointments: (appointments) => set({ appointments }),
  setSpareParts: (spareParts) => set({ spareParts }),
  setInventory: (inventory) => set({ inventory }),
}));
