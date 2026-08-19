import { Customer, Vehicle, Mechanic, Appointment, SparePart, Inventory } from '../types';

export const mockCustomers: Customer[] = [
  { id: 'CUST-001', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '+1234567890', address: '123 Main St, City', created_at: '2023-01-15T10:00:00Z' },
  { id: 'CUST-002', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', phone: '+1987654321', address: '456 Oak Ave, Town', created_at: '2023-02-20T14:30:00Z' },
  { id: 'CUST-003', first_name: 'Robert', last_name: 'Johnson', email: 'robert@example.com', phone: '+1555666777', address: '789 Pine Rd, Village', created_at: '2023-03-05T09:15:00Z' },
];

export const mockVehicles: Vehicle[] = [
  { id: 'VEH-001', customer_id: 'CUST-001', make: 'Toyota', model: 'Camry', year: 2020, license_plate: 'ABC-1234', vin: '1HGCM82633A004', color: 'Silver', mileage: 25000, created_at: '2023-01-15T10:05:00Z' },
  { id: 'VEH-002', customer_id: 'CUST-002', make: 'Honda', model: 'Civic', year: 2019, license_plate: 'XYZ-9876', vin: '2HGCM82633A005', color: 'Black', mileage: 35000, created_at: '2023-02-20T14:35:00Z' },
  { id: 'VEH-003', customer_id: 'CUST-003', make: 'Ford', model: 'Mustang', year: 2022, license_plate: 'FST-5555', vin: '3FDPF82633A006', color: 'Red', mileage: 15000, created_at: '2023-03-05T09:20:00Z' },
];

export const mockMechanics: Mechanic[] = [
  { id: 'MEC-001', first_name: 'Mike', last_name: 'Wrench', phone: '+1112223333', email: 'mike@svsms.com', specialization: 'Engine Diagnostics', hire_date: '2020-05-10', status: 'active' },
  { id: 'MEC-002', first_name: 'Sarah', last_name: 'Sparks', phone: '+4445556666', email: 'sarah@svsms.com', specialization: 'Electrical Systems', hire_date: '2021-08-15', status: 'active' },
  { id: 'MEC-003', first_name: 'David', last_name: 'Fixit', phone: '+7778889999', email: 'david@svsms.com', specialization: 'Transmission', hire_date: '2019-11-20', status: 'on_leave' },
];

export const mockAppointments: Appointment[] = [
  { id: 'APP-001', customer_id: 'CUST-001', vehicle_id: 'VEH-001', mechanic_id: 'MEC-001', service_type: 'Oil Change', appointment_date: '2024-05-20', status: 'Completed', notes: 'Regular oil change and inspection', created_at: '2024-05-15T10:00:00Z' },
  { id: 'APP-002', customer_id: 'CUST-002', vehicle_id: 'VEH-002', mechanic_id: 'MEC-002', service_type: 'Brake Replacement', appointment_date: '2024-05-21', status: 'In Progress', notes: 'Brake pads replacement', created_at: '2024-05-18T11:00:00Z' },
  { id: 'APP-003', customer_id: 'CUST-003', vehicle_id: 'VEH-003', mechanic_id: undefined, service_type: 'Diagnostic', appointment_date: '2024-05-25', status: 'Pending', notes: 'Check engine light on', created_at: '2024-05-20T09:00:00Z' },
];

export const mockSpareParts: SparePart[] = [
  { id: 'PART-001', name: 'Synthetic Engine Oil 5W-30', part_number: 'OIL-5W30-SYN', manufacturer: 'Castrol', unit_price: 45.00, description: 'High performance synthetic oil' },
  { id: 'PART-002', name: 'Ceramic Brake Pads (Front)', part_number: 'BRK-PAD-FR-CER', manufacturer: 'Brembo', unit_price: 85.00, description: 'Premium ceramic brake pads' },
  { id: 'PART-003', name: 'Air Filter', part_number: 'FLT-AIR-001', manufacturer: 'K&N', unit_price: 25.00, description: 'High flow air filter' },
  { id: 'PART-004', name: 'Spark Plug', part_number: 'SPK-PLG-IR', manufacturer: 'NGK', unit_price: 12.50, description: 'Iridium spark plug' },
];

export const mockInventory: Inventory[] = [
  { id: 'INV-001', part_id: 'PART-001', quantity_in_stock: 50, reorder_level: 15, last_restock_date: '2024-05-01', location: 'Aisle 1, Shelf A' },
  { id: 'INV-002', part_id: 'PART-002', quantity_in_stock: 12, reorder_level: 10, last_restock_date: '2024-04-15', location: 'Aisle 2, Shelf C' },
  { id: 'INV-003', part_id: 'PART-003', quantity_in_stock: 5, reorder_level: 20, last_restock_date: '2024-03-10', location: 'Aisle 1, Shelf B' },
  { id: 'INV-004', part_id: 'PART-004', quantity_in_stock: 100, reorder_level: 40, last_restock_date: '2024-05-10', location: 'Aisle 3, Shelf A' },
];
