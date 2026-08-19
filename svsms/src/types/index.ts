// User & Auth
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'mechanic' | 'receptionist';
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

export interface SparePart {
  id: string;
  name: string;
  part_number: string;
  manufacturer: string;
  unit_price: number;
  description: string;
}

export interface Inventory {
  id: string;
  part_id: string;
  quantity_in_stock: number;
  reorder_level: number;
  last_restock_date: string;
  location: string;
  // Denormalized view fields
  part_name?: string;
  part_number?: string;
  unit_price?: number | string;
  category?: string;
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
