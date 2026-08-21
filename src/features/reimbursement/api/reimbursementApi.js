import api from '@/lib/apiClient';

const BASE = '/reimbursements';

// ─── Employee ────────────────────────────────────────────────────────────────

export const getMyClaims = (params = {}) =>
    api.get(`${BASE}/mine`, { params });

export const getClaimById = (id) =>
    api.get(`${BASE}/${id}`);

export const submitClaim = (formData) =>
    api.post(BASE, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const cancelClaim = (id) =>
    api.patch(`${BASE}/${id}/cancel`);

export const getMyStats = (params = {}) =>
    api.get(`${BASE}/stats`, { params });

// ─── Approver ────────────────────────────────────────────────────────────────

export const getPendingApprovals = (params = {}) =>
    api.get(`${BASE}/pending-approvals`, { params });

export const getAllClaims = (params = {}) =>
    api.get(`${BASE}/all`, { params });

export const actionClaim = (id, payload) =>
    api.post(`${BASE}/${id}/action`, payload);

// ─── Finance / Admin ─────────────────────────────────────────────────────────

export const markReimbursed = (id, payload) =>
    api.patch(`${BASE}/${id}/mark-reimbursed`, payload);

// ─── Categories ──────────────────────────────────────────────────────────────

export const getCategories = () =>
    api.get(`${BASE}/categories`);

export const createCategory = (payload) =>
    api.post(`${BASE}/categories`, payload);

export const updateCategory = (id, payload) =>
    api.put(`${BASE}/categories/${id}`, payload);

export const deleteCategory = (id) =>
    api.delete(`${BASE}/categories/${id}`);
