import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const dashboardApi = {
  getSummary: async (params: { from: string; to: string; timezone: string }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/admin/dashboard/summary', { params });
    return response.data;
  },

  getRevenueTimeseries: async (params: { from: string; to: string; interval: 'day' | 'week' | 'month' }) => {
    const response = await apiClient.get<ApiResponse<any>>('/api/admin/revenue/timeseries', { params });
    return response.data;
  }
};
