import axios from 'axios';

// API Client cấu hình sẵn credentials để sử dụng HttpOnly Cookies
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
});

// Interceptor xử lý lỗi hệ thống chung (ví dụ: Token hết hạn - 401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Gọi API logout để xóa cookie ở phía máy chủ
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Bỏ qua lỗi kết nối khi logout
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
