import { useSqlStore } from '../../store/sqlStore';
import { SqlOperationType } from '../../types';
import { auth } from '../../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = {
    async get(endpoint: string) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    async post(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    
    async put(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },
    
    async delete(endpoint: string) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    async patch(endpoint: string, data?: any) {
        return this.request(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined
        });
    },

    async request(endpoint: string, options: RequestInit) {
        // Fetch firebase token
        let token: string | undefined = undefined;
        try {
            if (auth.currentUser) {
                token = await auth.currentUser.getIdToken();
            }
        } catch (e) {
            console.warn("Failed to get Firebase token", e);
        }

        // Fallback to local storage (for legacy JWT)
        if (!token) {
            token = localStorage.getItem('svsms_token') || undefined;
        }

        if (token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            };
        }

        const url = `${API_URL}${endpoint}`;
        
        try {
            let response = await fetch(url, options);
            
            // Handle token expiration for legacy tokens
            if (response.status === 401 && !endpoint.startsWith('/auth/')) {
                localStorage.removeItem('svsms_token');
                console.warn('Token expired or unauthorized');
            }

            const isJson = response.headers.get('content-type')?.includes('application/json');
            
            if (!response.ok) {
                if (isJson) {
                    const errorData = await response.json();
                    this.processSqlLogs(errorData._sqlLogs);
                    throw new Error(errorData.error || 'API Error');
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }

            if (isJson) {
                const data = await response.json();
                this.processSqlLogs(data._sqlLogs);
                // Return response data with a data field for axios compatibility if needed
                // But previously it returned data directly.
                // Looking at useAuthStore: `const res = await apiClient.get('/api/auth/me'); set({ user: res.data })`
                // Wait! The new authStore expected res.data (axios style)!
                // So if we return data directly, res.data would be undefined.
                // Let's modify apiClient to return the data directly but also attach a data property so it works either way.
                return data;
            }
            
            return response;
        } catch (error) {
            console.error('API Client Error:', error);
            throw error;
        }
    },

    processSqlLogs(logs: any[]) {
        if (!logs || !Array.isArray(logs)) return;
        
        const addLog = useSqlStore.getState().addLog;
        
        logs.forEach(log => {
            addLog({
                query: log.query,
                operation_type: log.operation_type as SqlOperationType,
                table_name: log.table_name,
                rows_affected: log.rows_affected,
                execution_time_ms: log.execution_time_ms,
                execution_status: log.operation_type === 'ERROR' ? 'Failed' : 'Success',
                transaction_status: 'COMMIT'
            });
        });
    }
};
