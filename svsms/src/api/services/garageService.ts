import { apiClient } from './apiClient';

export interface RecommendationParams {
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  area?: string;
  city?: string;
  serviceId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  requireService?: boolean;
}

export interface RecommendedGarage {
  id: string;
  name: string;
  description?: string;
  address: string;
  area?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  garage_type?: string;
  rating?: number | null;
  logo_url?: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  recommendation_score: number;
  base_score?: number;
  badges: { id: string; label: string; variant: string }[];
  match_reasons: string[];
  breakdown?: {
    area_score: number;
    service_score: number;
    history_score: number;
    saved_score: number;
    distance_score: number;
    availability_score: number;
    rating_score: number;
    name_bonus: number;
    base_score?: number;
  };
}

export const garageService = {
  // Get personalized spatial recommendations
  getRecommendations: async (params: RecommendationParams = {}): Promise<RecommendedGarage[]> => {
    const query = new URLSearchParams();
    if (params.latitude !== undefined && params.latitude !== null) query.append('lat', params.latitude.toString());
    if (params.longitude !== undefined && params.longitude !== null) query.append('lng', params.longitude.toString());
    if (params.radiusKm) query.append('radius', params.radiusKm.toString());
    if (params.area) query.append('area', params.area);
    if (params.city) query.append('city', params.city);
    if (params.serviceId) query.append('service_id', params.serviceId);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());
    if (params.requireService) query.append('require_service', 'true');

    const res: any = await apiClient.get(
      `/api/garages/recommendations?${query.toString()}`
    );
    return res?.garages || [];
  },

  // Get customer saved location
  getCustomerLocation: async () => {
    const res: any = await apiClient.get('/api/customers/me/location');
    return res?.location || null;
  },

  // Update customer preferred location
  updateCustomerLocation: async (locationData: {
    address?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const res: any = await apiClient.post('/api/customers/me/location', locationData);
    return res;
  },

  // Get services offered by a garage
  getGarageServices: async (garageId: string) => {
    const res: any = await apiClient.get(`/api/garages/${garageId}/services`);
    return res?.services || [];
  },

  // Get all master services
  getAllMasterServices: async () => {
    const res: any = await apiClient.get('/api/services');
    return res?.services || (Array.isArray(res) ? res : []);
  }
};
