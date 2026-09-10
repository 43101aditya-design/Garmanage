import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { CustomerService } from './api/services/customerService';
import { VehicleService } from './api/services/vehicleService';
import { MechanicService } from './api/services/mechanicService';
import { AppointmentService } from './api/services/appointmentService';
import { InventoryService } from './api/services/inventoryService';
import { useDbStore } from './store/dbStore';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';

function App() {
  const setCustomers = useDbStore(state => state.setCustomers);
  const setVehicles = useDbStore(state => state.setVehicles);
  const setMechanics = useDbStore(state => state.setMechanics);
  const setAppointments = useDbStore(state => state.setAppointments);
  const setInventory = useDbStore(state => state.setInventory);
  const theme = useThemeStore(state => state.theme);

  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const syncProfile = useAuthStore(state => state.syncProfile);
  const setLoading = useAuthStore(state => state.setLoading);

  // Synchronize profile on app startup and attach Firebase auth listener
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initAuthListener();

    // If token exists, verify and refresh profile in background without blocking cached session
    const currentToken = useAuthStore.getState().token;
    if (currentToken) {
      useAuthStore.getState().syncProfile().catch((e) => {
        console.warn('[AUTH] Background session verification skipped/offline:', e?.message || e);
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    const isMock = import.meta.env.VITE_API_MODE === 'mock';
    if (!isMock) {
      // Hydrate Zustand store from Real APIs to make UI components work seamlessly
      Promise.all([
        CustomerService.getAllCustomers(),
        VehicleService.getAll(),
        MechanicService.getAll(),
        AppointmentService.getAll(),
        InventoryService.getAll()
      ]).then(([customers, vehicles, mechanics, appointments, inventory]) => {
        setCustomers(customers);
        setVehicles(vehicles);
        setMechanics(mechanics);
        setAppointments(appointments);
        setInventory(inventory);
      }).catch(console.error);
    }
  }, [setCustomers, setVehicles, setMechanics, setAppointments, setInventory]);

  return (
    <RouterProvider router={router} />
  );
}

export default App;
