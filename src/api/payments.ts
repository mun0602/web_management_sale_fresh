import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const paymentsApi = {
  getPayments: async (params?: Record<string, any>) => {
    const response = await apiClient.get<ApiResponse<any[]>>('/api/admin/payments', { params });
    return response.data;
  },

  getPaymentById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/admin/payments/${id}`);
    return response.data;
  },

  refundPayment: async (id: string, data: Record<string, any>) => {
    const response = await apiClient.post<ApiResponse<any>>(`/api/admin/payments/${id}/refunds`, data);
    return response.data;
  },
  
  getInvoiceById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/api/admin/invoices/${id}`);
    return response.data;
  }
};
