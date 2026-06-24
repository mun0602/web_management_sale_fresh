import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const subscriptionsApi = {
  getSubscriptions: async (params?: Record<string, any>) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/api/admin/subscriptions', { params });
    return response.data;
  },

  getSubscriptionById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/admin/subscriptions/${id}`);
    return response.data;
  },

  adjustSubscription: async (id: string, data: Record<string, any>) => {
    const response = await apiClient.post<ApiResponse<any>>(`/api/admin/subscriptions/${id}/adjust`, data);
    return response.data;
  },

  cancelSubscription: async (id: string, reason?: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/api/admin/subscriptions/${id}/cancel`, { reason });
    return response.data;
  }
};
