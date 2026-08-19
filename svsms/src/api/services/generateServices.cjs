const fs = require('fs');
const path = require('path');

const entities = [
  { name: 'Vehicle', typeName: 'Vehicle', storeKey: 'vehicles', endpoint: '/vehicles' },
  { name: 'Mechanic', typeName: 'Mechanic', storeKey: 'mechanics', endpoint: '/mechanics' },
  { name: 'Appointment', typeName: 'Appointment', storeKey: 'appointments', endpoint: '/appointments' },
  { name: 'Inventory', typeName: 'Inventory', storeKey: 'inventory', endpoint: '/inventory' }
  // Note: invoice and payment types might not be in dbStore yet, but the user requested CRUD for them.
  // Actually, I'll just check if they are in dbStore. Wait, there's no invoice or payment in dbStore based on what I just read.
  // I will generate services for invoice and payment just for the API layer anyway.
];

const types = ['Vehicle', 'Mechanic', 'Appointment', 'Inventory'];

types.forEach(type => {
  const entity = type.toLowerCase();
  const Capitalized = type;
  const storeKey = type === 'Inventory' ? 'inventory' : entity + 's';

  const template = `import { ${Capitalized} } from '../../types';
import { useDbStore } from '../../store/dbStore';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const ${Capitalized}Service = {
  getAll: async (): Promise<${Capitalized}[]> => {
    if (isMock) {
        return useDbStore.getState().${storeKey};
    }
    return await apiClient.get('/${entity === 'inventory' ? 'inventory' : entity + 's'}');
  },
  
  getById: async (id: string): Promise<${Capitalized}> => {
    if (isMock) {
        const all = useDbStore.getState().${storeKey};
        const found = all.find(c => c.id === id);
        if (!found) throw new Error("${Capitalized} not found");
        return found;
    }
    return await apiClient.get(\`/${entity === 'inventory' ? 'inventory' : entity + 's'}/\${id}\`);
  },

  create: async (data: Omit<${Capitalized}, 'id' | 'created_at'>): Promise<${Capitalized}> => {
    if (isMock) {
        const id = \`\${Math.floor(Math.random() * 1000)}\`;
        const newItem = { ...data, id, created_at: new Date().toISOString() } as unknown as ${Capitalized};
        const current = useDbStore.getState().${storeKey};
        useDbStore.getState().set${Capitalized === 'Inventory' ? 'Inventory' : Capitalized + 's'}([...current, newItem]);
        return newItem;
    }
    return await apiClient.post('/${entity === 'inventory' ? 'inventory' : entity + 's'}', data);
  },

  update: async (id: string, data: Partial<${Capitalized}>): Promise<${Capitalized}> => {
    if (isMock) {
        const current = useDbStore.getState().${storeKey};
        const old = current.find(c => c.id === id);
        if (!old) throw new Error("${Capitalized} not found");
        const updated = { ...old, ...data } as ${Capitalized};
        useDbStore.getState().set${Capitalized === 'Inventory' ? 'Inventory' : Capitalized + 's'}(current.map(c => c.id === id ? updated : c));
        return updated;
    }
    return await apiClient.put(\`/${entity === 'inventory' ? 'inventory' : entity + 's'}/\${id}\`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) {
        const current = useDbStore.getState().${storeKey};
        useDbStore.getState().set${Capitalized === 'Inventory' ? 'Inventory' : Capitalized + 's'}(current.filter(c => c.id !== id));
        return;
    }
    return await apiClient.delete(\`/${entity === 'inventory' ? 'inventory' : entity + 's'}/\${id}\`);
  }
};
`;

  fs.writeFileSync(path.join(__dirname, entity + 'Service.ts'), template);
});

// For Invoice and Payment which don't have mock stores yet
const additionalTypes = [
    { type: 'Invoice', storeKey: 'invoices', endpoint: 'invoices' },
    { type: 'Payment', storeKey: 'payments', endpoint: 'payments' }
];

additionalTypes.forEach(({ type, storeKey, endpoint }) => {
  const entity = type.toLowerCase();
  
  const template = `import { ${type} } from '../../types';
import { apiClient } from './apiClient';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

// Note: No mock store for ${type} in dbStore yet, but service wrapper required by architecture.
export const ${type}Service = {
  getAll: async (): Promise<${type}[]> => {
    if (isMock) return [];
    return await apiClient.get('/${endpoint}');
  },
  
  getById: async (id: string): Promise<${type}> => {
    if (isMock) throw new Error("Mock not implemented for ${type}");
    return await apiClient.get(\`/${endpoint}/\${id}\`);
  },

  create: async (data: any): Promise<${type}> => {
    if (isMock) throw new Error("Mock not implemented for ${type}");
    return await apiClient.post('/${endpoint}', data);
  },

  update: async (id: string, data: any): Promise<${type}> => {
    if (isMock) throw new Error("Mock not implemented for ${type}");
    return await apiClient.put(\`/${endpoint}/\${id}\`, data);
  },

  delete: async (id: string): Promise<void> => {
    if (isMock) throw new Error("Mock not implemented for ${type}");
    return await apiClient.delete(\`/${endpoint}/\${id}\`);
  }
};
`;

  fs.writeFileSync(path.join(__dirname, entity + 'Service.ts'), template);
});

console.log('Generated frontend services');
