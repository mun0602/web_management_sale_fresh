import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const plansApi = {
  getPlans: async (params?: Record<string, any>) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/api/admin/plans', { params });
    return response.data;
  },

  getPlanById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/admin/plans/${id}`);
    return response.data;
  },

  createPlan: async (data: Record<string, any>) => {
    const response = await apiClient.post<ApiResponse<any>>('/api/admin/plans', data);
    return response.data;
  },

  updatePlan: async (id: string, data: Record<string, any>) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/api/admin/plans/${id}`, data);
    return response.data;
  },

  addPrice: async (id: string, priceData: Record<string, any>) => {
    const response = await apiClient.post<ApiResponse<any>>(`/api/admin/plans/${id}/prices`, priceData);
    return response.data;
  }
};
