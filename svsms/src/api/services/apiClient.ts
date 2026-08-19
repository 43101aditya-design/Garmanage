import { useSqlStore } from '../../store/sqlStore';
import { SqlOperationType } from '../../types';

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

    async request(endpoint: string, options: RequestInit) {
        // Exclude auth routes from token attachment to prevent infinite loops
        if (!endpoint.startsWith('/auth/')) {
            let token = localStorage.getItem('svsms_token');
            if (!token && import.meta.env.VITE_API_MODE !== 'mock') {
                // Auto-login for development UI compatibility
                try {
                    const authRes = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: 'admin', password: 'admin123' })
                    });
                    if (authRes.ok) {
                        const authData = await authRes.json();
                        token = authData.accessToken;
                        localStorage.setItem('svsms_token', token as string);
                    }
                } catch (e) {
                    console.error("Auto-login failed:", e);
                }
            }
            if (token) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
        }

        const url = `${API_URL}${endpoint}`;
        
        try {
            let response = await fetch(url, options);
            
            // Handle token expiration
            if (response.status === 401 && !endpoint.startsWith('/auth/')) {
                localStorage.removeItem('svsms_token');
                // Could implement refresh token logic here, but for now just drop token
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
