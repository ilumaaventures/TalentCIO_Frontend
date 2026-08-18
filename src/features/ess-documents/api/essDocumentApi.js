import api from '@/lib/apiClient';

const BASE = '/ess-documents';

// ─── Employee ────────────────────────────────────────────────────────────────

export const getEmployeeDocuments = (params = {}) =>
    api.get(`${BASE}/mine`, { params });

export const acknowledgeDocument = (id) =>
    api.post(`${BASE}/${id}/acknowledge`);

// ─── Admin ───────────────────────────────────────────────────────────────────

export const getAdminDocuments = (params = {}) =>
    api.get(BASE, { params });

export const uploadDocument = (formData) =>
    api.post(BASE, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteDocument = (id) =>
    api.delete(`${BASE}/${id}`);

export const getDocumentAcknowledgements = (id) =>
    api.get(`${BASE}/${id}/acknowledgements`);
