import { Customer } from '../../types';
import { useDbStore } from '../../store/dbStore';
import { delay, emitSqlLog } from './utils';

export const CustomerMockApi = {
  getAll: async (): Promise<Customer[]> => {
    await delay(300);
    const start = performance.now();
    const data = useDbStore.getState().customers;
    const time = performance.now() - start;
    
    emitSqlLog(
      'SELECT * FROM Customer ORDER BY created_at DESC;',
      'SELECT',
      'Customer',
      data.length,
      time
    );
    return data;
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    await delay(500);
    const start = performance.now();
    
    const newCustomer: Customer = {
      ...customer,
      id: `CUST-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      created_at: new Date().toISOString()
    };

    const currentCustomers = useDbStore.getState().customers;
    useDbStore.getState().setCustomers([...currentCustomers, newCustomer]);
    
    const time = performance.now() - start;

    emitSqlLog(
      `INSERT INTO Customer (id, first_name, last_name, email, phone, address, created_at) VALUES ('${newCustomer.id}', '${newCustomer.first_name}', '${newCustomer.last_name}', '${newCustomer.email}', '${newCustomer.phone}', '${newCustomer.address}', '${newCustomer.created_at}');`,
      'INSERT',
      'Customer',
      1,
      time,
      newCustomer.id,
      undefined,
      newCustomer
    );

    return newCustomer;
  },

  update: async (id: string, customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    await delay(400);
    const start = performance.now();
    
    const currentCustomers = useDbStore.getState().customers;
    const oldCustomer = currentCustomers.find(c => c.id === id);
    if (!oldCustomer) throw new Error("Customer not found");

    const updatedCustomer: Customer = {
      ...oldCustomer,
      ...customer
    };

    useDbStore.getState().setCustomers(currentCustomers.map(c => c.id === id ? updatedCustomer : c));
    const time = performance.now() - start;

    emitSqlLog(
      `UPDATE Customer SET first_name = '${customer.first_name}', last_name = '${customer.last_name}', email = '${customer.email}', phone = '${customer.phone}', address = '${customer.address}' WHERE id = '${id}';`,
      'UPDATE',
      'Customer',
      1,
      time,
      id,
      oldCustomer,
      updatedCustomer
    );

    return updatedCustomer;
  },

  delete: async (id: string): Promise<void> => {
    await delay(400);
    const start = performance.now();
    
    const currentCustomers = useDbStore.getState().customers;
    const customerToDelete = currentCustomers.find(c => c.id === id);
    
    if (customerToDelete) {
      useDbStore.getState().setCustomers(currentCustomers.filter(c => c.id !== id));
      const time = performance.now() - start;

      emitSqlLog(
        `DELETE FROM Customer WHERE id = '${id}';`,
        'DELETE',
        'Customer',
        1,
        time,
        id,
        customerToDelete,
        undefined
      );
    }
  }
};
