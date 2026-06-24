import apiClient from './axiosConfig';
import { ApiResponse, User } from '../types/api';

export const usersApi = {
  getUsers: async (params?: Record<string, any>) => {
    const response = await apiClient.get<ApiResponse<User[]>>('/api/admin/users', { params });
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<User>>(`/api/admin/users/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/api/admin/users/${id}/status`, { status });
    return response.data;
  },

  revokeSessions: async (id: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/api/admin/users/${id}/revoke-sessions`);
    return response.data;
  }
};
