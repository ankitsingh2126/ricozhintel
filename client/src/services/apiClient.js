// Resolves the API base URL from Vite env (VITE_API_URL or VITE_API_BASE_URL),
// defaulting to the production Render backend in production and localhost in development.

import axios from 'axios';

export const resolveApiBaseUrl = (
  env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
) => {
  const configured = env?.VITE_API_URL || env?.VITE_API_BASE_URL;

  if (configured && typeof configured === 'string' && configured.trim() !== '') {
    const trimmed = configured.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }

  if (env?.PROD) {
    return 'https://ricozhintel-api.onrender.com/api/v1';
  }

  return 'http://localhost:5000/api/v1';
};

export const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ricozhintel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Turn any backend error into a plain Error with a friendly message.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage =
      error.response?.data?.error?.message ||
      error.message ||
      'Request failed';

    const wrapped = new Error(backendMessage);
    wrapped.status = error.response?.status;
    wrapped.code = error.response?.data?.error?.code;
    wrapped.details = error.response?.data?.error?.details;
    return Promise.reject(wrapped);
  }
);
