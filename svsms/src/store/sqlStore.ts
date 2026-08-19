import { create } from 'zustand';
import { SqlExecutionLog } from '../types';

interface SqlState {
  logs: SqlExecutionLog[];
  addLog: (log: Omit<SqlExecutionLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const useSqlStore = create<SqlState>((set) => ({
  logs: [],
  addLog: (log) => set((state) => {
    const newLog: SqlExecutionLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    return { logs: [newLog, ...state.logs] }; // Prepend new logs
  }),
  clearLogs: () => set({ logs: [] }),
}));
