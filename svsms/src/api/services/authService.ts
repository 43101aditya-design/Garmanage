import { apiClient } from './apiClient';

export class AuthService {
  static async login(credentials: { email?: string; username?: string; password?: string; role?: string }) {
    if (import.meta.env.VITE_API_MODE === 'mock') {
        const dummyToken = 'mock_jwt_token';
        const role = credentials.role || 'admin';
        return {
            user: {
                id: 'mock-user-1',
                username: role,
                email: credentials.email,
                role: role
            },
            token: dummyToken
        };
    }
    
    let payload: any = credentials;
    if (!credentials.password && credentials.role) {
        if (credentials.role === 'admin') {
            payload = { username: 'admin', password: 'admin123' };
        } else if (credentials.role === 'manager') {
            payload = { username: 'manager', password: 'manager123' };
        } else if (credentials.role === 'mechanic') {
            payload = { username: 'mechanic', password: 'mechanic123' };
        }
    }
    
    const response = await apiClient.post('/auth/login', payload);
    return {
        user: response.user,
        token: response.accessToken
    };
  }
}
