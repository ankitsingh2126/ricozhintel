// KPI controller. HTTP concerns only.

import * as kpiService from '../services/kpiService.js';
import { sendSuccess } from '../utils/apiResponse.js';

// GET /api/v1/kpis
export const getAllKpis = async (req, res, next) => {
  try {
    const { department, status, search, page, limit } = req.query;

    const { items, meta } = await kpiService.listKpis({
      department,
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return sendSuccess(res, items, meta);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/kpis/summary  (must be registered before /:id)
export const getSummary = async (req, res, next) => {
  try {
    const summary = await kpiService.getKpiSummary();
    return sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/kpis/:id
export const getKpi = async (req, res, next) => {
  try {
    const kpi = await kpiService.getKpiById(req.params.id);
    return sendSuccess(res, kpi);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/kpis
export const createKpi = async (req, res, next) => {
  try {
    const kpi = await kpiService.createKpi(req.body);
    return sendSuccess(res, kpi, undefined, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/kpis/:id
export const updateKpi = async (req, res, next) => {
  try {
    const kpi = await kpiService.updateKpi(req.params.id, req.body);
    return sendSuccess(res, kpi);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/kpis/:id
export const deleteKpi = async (req, res, next) => {
  try {
    await kpiService.deleteKpi(req.params.id);
    return sendSuccess(res, { message: 'KPI deleted' });
  } catch (err) {
    next(err);
  }
};
