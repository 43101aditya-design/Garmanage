import { apiClient } from '../apiClient';

export class AuthService {
  static async login(credentials: { email: string; password?: string; role?: string }) {
    // We can add a "demo" login if the backend isn't connected for a specific role
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
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  }
}
