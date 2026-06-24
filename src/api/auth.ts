import apiClient from './axiosConfig';
import { ApiResponse, User } from '../types/api';

export const authApi = {
  login: async (credentials: Record<string, string>): Promise<void> => {
    // Gọi đến route handler local để bọc session (hoặc trực tiếp backend)
    await apiClient.post('/auth/login', credentials);
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    // API backend trả về chuẩn data
    return response.data.data ? response.data.data : (response.data as unknown as User);
  },
};
