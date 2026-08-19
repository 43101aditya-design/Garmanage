import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { CustomerService } from './api/services/customerService';
import { VehicleService } from './api/services/vehicleService';
import { MechanicService } from './api/services/mechanicService';
import { AppointmentService } from './api/services/appointmentService';
import { InventoryService } from './api/services/inventoryService';
import { useDbStore } from './store/dbStore';

function App() {
  const setCustomers = useDbStore(state => state.setCustomers);
  const setVehicles = useDbStore(state => state.setVehicles);
  const setMechanics = useDbStore(state => state.setMechanics);
  const setAppointments = useDbStore(state => state.setAppointments);
  const setInventory = useDbStore(state => state.setInventory);

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
