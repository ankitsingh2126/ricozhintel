// KPI-related API calls.

import { apiClient } from './apiClient.js';

export const fetchKpiSummary = async () => {
  const res = await apiClient.get('/kpis/summary');
  return res.data.data; // { total, byStatus, avgProgress }
};

export const fetchKpis = async (params = {}) => {
  const res = await apiClient.get('/kpis', { params });
  return { items: res.data.data, meta: res.data.meta };
};
