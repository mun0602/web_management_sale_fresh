import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const auditApi = {
  getAuditLogs: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<unknown[]>>('/api/admin/audit-logs', { params });
    return response.data;
  }
};

export const systemApi = {
  getHealth: async () => {
    const response = await apiClient.get<ApiResponse<unknown>>('/api/admin/system/health');
    return response.data;
  },
  
  getWebhooks: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<unknown[]>>('/api/admin/system/webhooks', { params });
    return response.data;
  },

  getReconciliation: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<unknown[]>>('/api/admin/system/reconciliation', { params });
    return response.data;
  }
};
