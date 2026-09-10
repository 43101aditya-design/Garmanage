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
      // Hydrate Zustand store from Real APIs with resilient per-service hydration
      Promise.allSettled([
        CustomerService.getAllCustomers(),
        VehicleService.getAll(),
        MechanicService.getAll(),
        AppointmentService.getAll(),
        InventoryService.getAll()
      ]).then(([cRes, vRes, mRes, aRes, iRes]) => {
        if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) setCustomers(cRes.value);
        if (vRes.status === 'fulfilled' && Array.isArray(vRes.value)) setVehicles(vRes.value);
        if (mRes.status === 'fulfilled' && Array.isArray(mRes.value)) setMechanics(mRes.value);
        if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) setAppointments(aRes.value);
        if (iRes.status === 'fulfilled' && Array.isArray(iRes.value)) {
          setInventory(iRes.value.map((item: any) => ({
            ...item,
            part_name: item.name || item.part_name || 'Part',
            quantity_in_stock: Number(item.quantity_in_stock || 0),
            unit_cost: Number(item.unit_cost || item.unit_price || 0),
            unit_price: Number(item.unit_price || 0),
            location: item.location || 'Warehouse'
          })));
        } else {
          setInventory([]);
        }
      }).catch(err => {
        console.warn('Real API hydration warning:', err?.message || err);
      });
    }
  }, [setCustomers, setVehicles, setMechanics, setAppointments, setInventory]);

  return (
    <RouterProvider router={router} />
  );
}

export default App;
