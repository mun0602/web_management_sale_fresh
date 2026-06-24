export interface Meta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Meta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
  requestId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  status?: string;
  createdAt?: string;
}

export interface AuthSession {
  id: string;
  role: string;
}
