import apiClient from './axiosConfig';
import { ApiResponse, User } from '../types/api';

export const usersApi = {
  getUsers: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<User[]>>('/admin/users', { params });
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<User>>(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<User>>('/admin/users', data);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch<ApiResponse<unknown>>(`/admin/users/${id}/status`, { status });
    return response.data;
  },

  revokeSessions: async (id: string) => {
    const response = await apiClient.post<ApiResponse<unknown>>(`/admin/users/${id}/revoke-sessions`);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<unknown>>(`/admin/users/${id}`);
    return response.data;
  }
};

