import { 
  Customer, Vehicle, Mechanic, Appointment, SparePart, 
  Inventory, InventoryMovement, PurchaseRequest, GarageTransfer, JobPartRequirement 
} from '../types';

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
  { id: 'PART-001', name: 'Synthetic Engine Oil 5W-30', part_number: 'OIL-5W30-SYN', manufacturer: 'Castrol', unit_price: 45.00, cost: 28.00, category: 'Fluids & Oils', vehicle_compatibility: 'Universal', unit: 'Liters', supplier: 'Castrol India Ltd', is_active: true, description: 'High performance synthetic oil' },
  { id: 'PART-002', name: 'Ceramic Brake Pads (Front)', part_number: 'BRK-PAD-FR-CER', manufacturer: 'Brembo', unit_price: 85.00, cost: 52.00, category: 'Braking System', vehicle_compatibility: 'Toyota Camry / Honda Civic', unit: 'Set', supplier: 'Brembo Automotive Distributors', is_active: true, description: 'Premium ceramic brake pads' },
  { id: 'PART-003', name: 'High Flow Air Filter', part_number: 'FLT-AIR-001', manufacturer: 'K&N', unit_price: 25.00, cost: 14.00, category: 'Filters', vehicle_compatibility: 'Universal Sedan', unit: 'Piece', supplier: 'K&N Global Supplies', is_active: true, description: 'High flow air filter' },
  { id: 'PART-004', name: 'Iridium Spark Plug (Pack of 4)', part_number: 'SPK-PLG-IR', manufacturer: 'NGK', unit_price: 32.50, cost: 18.00, category: 'Ignition', vehicle_compatibility: 'Ford / Toyota / Honda Engine V4', unit: 'Pack', supplier: 'NGK Spark Plugs Co', is_active: true, description: 'Iridium spark plug pack' },
  { id: 'PART-005', name: 'Heavy Duty Transmission Fluid', part_number: 'TRN-FLD-ATF6', manufacturer: 'Valvoline', unit_price: 60.00, cost: 36.00, category: 'Fluids & Oils', vehicle_compatibility: 'Automatic Transmissions', unit: 'Gallon', supplier: 'Valvoline Commercial', is_active: true, description: 'ATF Full Synthetic Fluid' },
];

// Multi-Garage Specific Inventory Stocks
export const mockInventory: Inventory[] = [
  // Garage 1 - GAR-001 (Downtown Central Hub)
  { id: 'INV-001', part_id: 'PART-001', garage_id: 'GAR-001', quantity_in_stock: 50, reserved_quantity: 4, reorder_level: 15, unit_cost: 28.00, unit_price: 45.00, last_restock_date: '2026-05-01', location: 'Aisle 1, Shelf A', part_name: 'Synthetic Engine Oil 5W-30', part_number: 'OIL-5W30-SYN', category: 'Fluids & Oils', garage_name: 'Downtown Central Hub' },
  { id: 'INV-002', part_id: 'PART-002', garage_id: 'GAR-001', quantity_in_stock: 8, reserved_quantity: 2, reorder_level: 10, unit_cost: 52.00, unit_price: 85.00, last_restock_date: '2026-04-15', location: 'Aisle 2, Shelf C', part_name: 'Ceramic Brake Pads (Front)', part_number: 'BRK-PAD-FR-CER', category: 'Braking System', garage_name: 'Downtown Central Hub' },
  { id: 'INV-003', part_id: 'PART-003', garage_id: 'GAR-001', quantity_in_stock: 3, reserved_quantity: 1, reorder_level: 10, unit_cost: 14.00, unit_price: 25.00, last_restock_date: '2026-03-10', location: 'Aisle 1, Shelf B', part_name: 'High Flow Air Filter', part_number: 'FLT-AIR-001', category: 'Filters', garage_name: 'Downtown Central Hub' },
  { id: 'INV-004', part_id: 'PART-004', garage_id: 'GAR-001', quantity_in_stock: 45, reserved_quantity: 0, reorder_level: 12, unit_cost: 18.00, unit_price: 32.50, last_restock_date: '2026-05-10', location: 'Aisle 3, Shelf A', part_name: 'Iridium Spark Plug (Pack of 4)', part_number: 'SPK-PLG-IR', category: 'Ignition', garage_name: 'Downtown Central Hub' },

  // Garage 2 - GAR-002 (Westside Express Workshop)
  { id: 'INV-005', part_id: 'PART-001', garage_id: 'GAR-002', quantity_in_stock: 18, reserved_quantity: 0, reorder_level: 10, unit_cost: 28.00, unit_price: 45.00, last_restock_date: '2026-05-12', location: 'Rack 4, Bin 1', part_name: 'Synthetic Engine Oil 5W-30', part_number: 'OIL-5W30-SYN', category: 'Fluids & Oils', garage_name: 'Westside Express Workshop' },
  { id: 'INV-006', part_id: 'PART-002', garage_id: 'GAR-002', quantity_in_stock: 25, reserved_quantity: 0, reorder_level: 8, unit_cost: 52.00, unit_price: 85.00, last_restock_date: '2026-05-18', location: 'Rack 2, Bin 3', part_name: 'Ceramic Brake Pads (Front)', part_number: 'BRK-PAD-FR-CER', category: 'Braking System', garage_name: 'Westside Express Workshop' },
  { id: 'INV-007', part_id: 'PART-005', garage_id: 'GAR-002', quantity_in_stock: 2, reserved_quantity: 0, reorder_level: 5, unit_cost: 36.00, unit_price: 60.00, last_restock_date: '2026-02-14', location: 'Rack 1, Bin 9', part_name: 'Heavy Duty Transmission Fluid', part_number: 'TRN-FLD-ATF6', category: 'Fluids & Oils', garage_name: 'Westside Express Workshop' },

  // Garage 3 - GAR-003 (Suburban Repair Hub)
  { id: 'INV-008', part_id: 'PART-002', garage_id: 'GAR-003', quantity_in_stock: 4, reserved_quantity: 1, reorder_level: 8, unit_cost: 52.00, unit_price: 85.00, last_restock_date: '2026-04-20', location: 'Section A, Shelf 3', part_name: 'Ceramic Brake Pads (Front)', part_number: 'BRK-PAD-FR-CER', category: 'Braking System', garage_name: 'Suburban Repair Hub' },
  { id: 'INV-009', part_id: 'PART-003', garage_id: 'GAR-003', quantity_in_stock: 22, reserved_quantity: 0, reorder_level: 10, unit_cost: 14.00, unit_price: 25.00, last_restock_date: '2026-05-15', location: 'Section B, Shelf 1', part_name: 'High Flow Air Filter', part_number: 'FLT-AIR-001', category: 'Filters', garage_name: 'Suburban Repair Hub' }
];

// Stock Movement Audit Ledger Records
export const mockInventoryMovements: InventoryMovement[] = [
  {
    id: 'MOV-1001',
    part_id: 'PART-001',
    garage_id: 'GAR-001',
    movement_type: 'RECEIVE',
    quantity_changed: 50,
    previous_quantity: 0,
    new_quantity: 50,
    reference_type: 'PURCHASE_ORDER',
    reference_id: 'PO-9941',
    performed_by: 'MGR-001',
    performed_by_name: 'Rahul Sharma (Manager)',
    notes: 'Initial restock from Castrol distributor shipment',
    created_at: '2026-05-01T10:30:00Z',
    part_name: 'Synthetic Engine Oil 5W-30',
    garage_name: 'Downtown Central Hub'
  },
  {
    id: 'MOV-1002',
    part_id: 'PART-002',
    garage_id: 'GAR-001',
    movement_type: 'RESERVE',
    quantity_changed: 2,
    previous_quantity: 10,
    new_quantity: 8,
    reference_type: 'JOB_CARD',
    reference_id: 'APP-002',
    performed_by: 'MEC-002',
    performed_by_name: 'Sarah Sparks (Mechanic)',
    notes: 'Reserved front brake pads for Honda Civic brake overhaul',
    created_at: '2026-05-18T11:15:00Z',
    part_name: 'Ceramic Brake Pads (Front)',
    garage_name: 'Downtown Central Hub'
  },
  {
    id: 'MOV-1003',
    part_id: 'PART-003',
    garage_id: 'GAR-001',
    movement_type: 'CONSUME',
    quantity_changed: 1,
    previous_quantity: 4,
    new_quantity: 3,
    reference_type: 'JOB_CARD',
    reference_id: 'APP-001',
    performed_by: 'MEC-001',
    performed_by_name: 'Mike Wrench (Mechanic)',
    notes: 'Installed high flow air filter during oil change service',
    created_at: '2026-05-20T14:00:00Z',
    part_name: 'High Flow Air Filter',
    garage_name: 'Downtown Central Hub'
  }
];

// Purchase Requests
export const mockPurchaseRequests: PurchaseRequest[] = [
  {
    id: 'PR-1001',
    request_number: 'PR-2026-001',
    garage_id: 'GAR-001',
    part_id: 'PART-003',
    requested_quantity: 25,
    unit_cost: 14.00,
    supplier: 'K&N Global Supplies',
    status: 'PENDING',
    requested_by: 'MGR-001',
    requested_by_name: 'Rahul Sharma',
    notes: 'Air filter stock dropped below reorder threshold (3 left, threshold 10)',
    created_at: '2026-05-21T09:00:00Z',
    part_name: 'High Flow Air Filter',
    garage_name: 'Downtown Central Hub'
  },
  {
    id: 'PR-1002',
    request_number: 'PR-2026-002',
    garage_id: 'GAR-002',
    part_id: 'PART-005',
    requested_quantity: 10,
    approved_quantity: 10,
    unit_cost: 36.00,
    supplier: 'Valvoline Commercial',
    status: 'APPROVED',
    requested_by: 'MGR-002',
    requested_by_name: 'Vikas Mehta',
    approved_by: 'OWN-001',
    notes: 'Urgent ATF fluid restock for transmission repair jobs',
    created_at: '2026-05-19T14:20:00Z',
    part_name: 'Heavy Duty Transmission Fluid',
    garage_name: 'Westside Express Workshop'
  }
];

// Garage Transfers
export const mockGarageTransfers: GarageTransfer[] = [
  {
    id: 'TR-2001',
    transfer_number: 'TR-2026-001',
    source_garage_id: 'GAR-002',
    target_garage_id: 'GAR-001',
    part_id: 'PART-002',
    quantity: 5,
    status: 'DISPATCHED',
    requested_by: 'MGR-001',
    requested_by_name: 'Rahul Sharma',
    approved_by: 'OWN-001',
    created_at: '2026-05-22T10:00:00Z',
    part_name: 'Ceramic Brake Pads (Front)',
    source_garage_name: 'Westside Express Workshop',
    target_garage_name: 'Downtown Central Hub'
  }
];

// Job Part Requirements
export const mockJobPartRequirements: JobPartRequirement[] = [
  {
    id: 'JPR-3001',
    appointment_id: 'APP-002',
    part_id: 'PART-002',
    garage_id: 'GAR-001',
    requested_qty: 2,
    reserved_qty: 2,
    consumed_qty: 0,
    unit_price: 85.00,
    status: 'RESERVED',
    notes: 'Front brake set for Honda Civic',
    created_at: '2026-05-18T11:15:00Z',
    part_name: 'Ceramic Brake Pads (Front)',
    part_number: 'BRK-PAD-FR-CER'
  },
  {
    id: 'JPR-3002',
    appointment_id: 'APP-001',
    part_id: 'PART-001',
    garage_id: 'GAR-001',
    requested_qty: 4,
    reserved_qty: 0,
    consumed_qty: 4,
    unit_price: 45.00,
    status: 'CONSUMED',
    notes: 'Synthetic 5W-30 oil for Toyota Camry',
    created_at: '2026-05-20T10:00:00Z',
    part_name: 'Synthetic Engine Oil 5W-30',
    part_number: 'OIL-5W30-SYN'
  }
];
