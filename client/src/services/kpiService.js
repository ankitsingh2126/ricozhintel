// KPI-related API calls.

import { apiClient } from './apiClient.js';

export const fetchKpiSummary = async () => {
  const res = await apiClient.get('/kpis/summary');
  return res.data.data; // { total, byStatus, avgProgress }
};

export const fetchKpiSummaryByDepartment = async () => {
  const res = await apiClient.get('/kpis/summary/by-department');
  return res.data.data; // array of department summary rows
};

export const fetchKpis = async (params = {}) => {
  const res = await apiClient.get('/kpis', { params });
  return { items: res.data.data, meta: res.data.meta };
};