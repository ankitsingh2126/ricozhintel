// Department-related API calls.

import { apiClient } from './apiClient.js';

export const fetchDepartments = async (params = {}) => {
  const res = await apiClient.get('/departments', { params });
  return { items: res.data.data, meta: res.data.meta };
};

export const fetchDepartmentById = async (id) => {
  const res = await apiClient.get(`/departments/${id}`);
  return res.data.data;
};
