import { apiClient } from './apiClient';
import { dbSchemaDefinition as mockSchema } from '../../pages/db/explorer/schemaDefinition';

const isMock = import.meta.env.VITE_API_MODE === 'mock';

export const DbExplorerService = {
  getSchema: async () => {
    if (isMock) {
      return {
        isMock: true,
        tables: mockSchema,
        views: [],
        procedures: [],
        triggers: []
      };
    }
    return await apiClient.get('/db-explorer/schema');
  }
};
