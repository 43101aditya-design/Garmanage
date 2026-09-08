// User & Auth
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'mechanic' | 'receptionist' | 'owner' | 'customer';
  avatar?: string;
  created_at: string;
}

// Entities
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string;
  color: string;
  mileage: number;
  created_at: string;
}

export interface Mechanic {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  specialization: string;
  hire_date: string;
  status: 'active' | 'on_leave' | 'terminated';
}

export interface Appointment {
  id: string;
  customer_id: string;
  vehicle_id: string;
  mechanic_id?: string;
  service_type: string;
  appointment_date: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes: string;
  created_at: string;
  updated_at?: string;
}

export interface ServiceRecord {
  id: string;
  appointment_id: string;
  mechanic_id: string;
  service_date: string;
  description: string;
  labor_hours: number;
  labor_rate: number;
  total_labor_cost: number;
  status: 'pending' | 'completed';
}

// ==========================================
// PHASE 6: INVENTORY & PARTS ARCHITECTURE
// ==========================================

export interface SparePart {
  id: string;
  name: string;
  part_number: string;
  manufacturer: string;
  unit_price: number;
  description: string;
  category?: string;
  vehicle_compatibility?: string;
  unit?: string;
  cost?: number;
  supplier?: string;
  is_active?: boolean;
}

export interface Inventory {
  id: string;
  part_id: string;
  garage_id?: string;
  quantity_in_stock: number;
  reserved_quantity?: number;
  reorder_level: number;
  unit_cost?: number;
  unit_price?: number | string;
  last_restock_date: string;
  last_updated?: string;
  location: string;
  // Denormalized view fields
  part_name?: string;
  part_number?: string;
  category?: string;
  garage_name?: string;
}

export type InventoryMovementType = 
  | 'PURCHASE'
  | 'RECEIVE'
  | 'RESERVE'
  | 'RELEASE'
  | 'CONSUME'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'RETURN';

export interface InventoryMovement {
  id: string;
  part_id: string;
  garage_id: string;
  movement_type: InventoryMovementType;
  quantity_changed: number;
  previous_quantity: number;
  new_quantity: number;
  reference_type: 'JOB_CARD' | 'PURCHASE_ORDER' | 'TRANSFER' | 'MANUAL_ADJUSTMENT';
  reference_id: string;
  performed_by: string;
  performed_by_name: string;
  notes?: string;
  created_at: string;
  // View join helpers
  part_name?: string;
  garage_name?: string;
}

export type PurchaseRequestStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseRequest {
  id: string;
  request_number: string;
  garage_id: string;
  part_id: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_cost: number;
  supplier: string;
  status: PurchaseRequestStatus;
  requested_by: string;
  requested_by_name: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Denormalized fields
  part_name?: string;
  garage_name?: string;
}

export type GarageTransferStatus = 
  | 'PENDING'
  | 'DISPATCHED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface GarageTransfer {
  id: string;
  transfer_number: string;
  source_garage_id: string;
  target_garage_id: string;
  part_id: string;
  quantity: number;
  status: GarageTransferStatus;
  requested_by: string;
  requested_by_name: string;
  approved_by?: string;
  created_at: string;
  // Denormalized fields
  part_name?: string;
  source_garage_name?: string;
  target_garage_name?: string;
}

export type JobPartStatus = 
  | 'REQUIRED'
  | 'RESERVED'
  | 'CONSUMED'
  | 'UNAVAILABLE'
  | 'RETURNED';

export interface JobPartRequirement {
  id: string;
  appointment_id: string;
  part_id: string;
  garage_id: string;
  requested_qty: number;
  reserved_qty: number;
  consumed_qty: number;
  unit_price: number;
  status: JobPartStatus;
  notes?: string;
  created_at: string;
  // View join helpers
  part_name?: string;
  part_number?: string;
}

export interface Invoice {
  id: string;
  appointment_id: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
}

export interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'credit_card' | 'cash' | 'bank_transfer' | 'upi';
  transaction_id: string;
}

// SQL Playground Types
export type SqlOperationType = 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'JOIN' | 'VIEW' | 'TRIGGER' | 'PROCEDURE' | 'TRANSACTION';

export interface SqlExecutionLog {
  id: string;
  timestamp: string;
  query: string;
  operation_type: SqlOperationType;
  table_name: string;
  primary_key?: string;
  foreign_keys?: string[];
  rows_affected: number;
  execution_status: 'Success' | 'Failed' | 'Rollback';
  execution_time_ms: number;
  transaction_status?: 'COMMIT' | 'ROLLBACK';
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
  error_message?: string;
}
