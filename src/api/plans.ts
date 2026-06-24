import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const plansApi = {
  getPlans: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<unknown[]>>('/api/admin/plans', { params });
    return response.data;
  },

  getPlanById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<unknown>>(`/api/admin/plans/${id}`);
    return response.data;
  },

  createPlan: async (data: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<unknown>>('/api/admin/plans', data);
    return response.data;
  },

  updatePlan: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.patch<ApiResponse<unknown>>(`/api/admin/plans/${id}`, data);
    return response.data;
  },

  addPrice: async (id: string, priceData: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<unknown>>(`/api/admin/plans/${id}/prices`, priceData);
    return response.data;
  }
};
