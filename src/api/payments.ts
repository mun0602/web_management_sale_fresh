import apiClient from './axiosConfig';
import { ApiResponse } from '../types/api';

export const paymentsApi = {
  getPayments: async (params?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<unknown[]>>('/admin/payments', { params });
    return response.data;
  },

  getPaymentById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<unknown>>(`/admin/payments/${id}`);
    return response.data;
  },

  refundPayment: async (id: string, data: Record<string, unknown>) => {
    const response = await apiClient.post<ApiResponse<unknown>>(`/admin/payments/${id}/refunds`, data);
    return response.data;
  },
  
  getInvoiceById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<unknown>>(`/admin/invoices/${id}`);
    return response.data;
  }
};
