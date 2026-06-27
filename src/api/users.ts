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

  updateUser: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
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
  },

  getAiQuota: async (id: string) => {
    const response = await apiClient.get<ApiResponse<{
      limit: number;
      usage: number;
      remaining: number;
      isUnlimited: boolean;
      resetAt?: string;
    }>>(`/admin/users/${id}/ai-quota`);
    return response.data;
  },

  resetAiQuota: async (id: string) => {
    const response = await apiClient.post<ApiResponse<{ message: string; usage: number }>>(
      `/admin/users/${id}/ai-quota`,
      { action: 'reset' }
    );
    return response.data;
  },

  addAiCredit: async (id: string, amount: number) => {
    const response = await apiClient.post<ApiResponse<{ message: string; usage: number }>>(
      `/admin/users/${id}/ai-quota`,
      { action: 'add', amount }
    );
    return response.data;
  },
};

