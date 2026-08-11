import api from './axios';

export const getBinItems = (entity, page = 1, limit = 20) =>
    api.get('/bin', {
        params: {
            ...(entity ? { entity } : {}),
            page,
            limit
        }
    });

export const restoreBinItem = (entity, id, payload = {}) =>
    api.post(`/bin/${entity}/${id}/restore`, payload);

export const permanentDeleteBinItem = (entity, id) =>
    api.delete(`/bin/${entity}/${id}/permanent`);

export const emptyBin = (entity) =>
    api.delete('/bin/empty', {
        params: entity ? { entity } : {}
    });
