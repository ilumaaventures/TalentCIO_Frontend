import api from '../api/axios';
import { createCachePayload, readSessionCache } from './cache';

export const TA_CLIENT_CACHE_KEY = 'ta_client_selection_v1';
export const TA_CLIENT_LOCAL_CACHE_KEY = 'ta_client_selection_local_v1';
export const TA_MUTATION_MARKER_KEY = 'ta_last_mutation_v1';

const readStorageCache = (storage, key) => {
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        storage.removeItem(key);
        return null;
    }
};

const getMutationMarker = () => readStorageCache(localStorage, TA_MUTATION_MARKER_KEY);

export const createNoCacheRequestConfig = (params = {}) => ({
    headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
    },
    params: {
        ...params,
        _t: Date.now()
    }
});

export const invalidateTACaches = (meta = {}) => {
    sessionStorage.removeItem(TA_CLIENT_CACHE_KEY);
    localStorage.setItem(TA_MUTATION_MARKER_KEY, JSON.stringify({
        updatedAt: Date.now(),
        ...meta
    }));
};

const isCacheFreshForMutation = (payload) => {
    const marker = getMutationMarker();
    if (!marker?.updatedAt || !payload?.cachedAt) return true;
    return payload.cachedAt >= marker.updatedAt;
};

export const readTAClientsCache = () => {
    const sessionCached = readSessionCache(TA_CLIENT_CACHE_KEY);
    if (sessionCached && isCacheFreshForMutation(sessionCached)) {
        return sessionCached;
    }

    const localCached = readStorageCache(localStorage, TA_CLIENT_LOCAL_CACHE_KEY);
    if (localCached && isCacheFreshForMutation(localCached)) {
        return localCached;
    }

    return null;
};

export const writeTAClientsCache = (clients) => {
    const fingerprint = (clients || [])
        .map((client) => `${client.name}:${client.activePositions}:${client.pendingPositions}:${client.closedPositions}:${client.rejectedPositions}`)
        .join('|');
    const payload = createCachePayload(clients, fingerprint);

    sessionStorage.setItem(TA_CLIENT_CACHE_KEY, JSON.stringify(payload));
    localStorage.setItem(TA_CLIENT_LOCAL_CACHE_KEY, JSON.stringify(payload));

    return payload;
};

export const refreshTAClientsCache = async () => {
    const response = await api.get('/ta/clients', createNoCacheRequestConfig());
    writeTAClientsCache(response.data || []);
    return response.data || [];
};
