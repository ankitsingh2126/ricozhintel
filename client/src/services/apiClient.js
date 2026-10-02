// Axios instance used by every service.
// Reads the API base URL from Vite env (VITE_API_BASE_URL).
// Adds a response interceptor so components get a consistent error shape.

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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
