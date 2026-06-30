import axios from 'axios';
import { clearAuthSession, getStoredAccessToken } from '../utils/authStorage';

const API_TIMEOUT_MS = 40000;
const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const resolveApiUrl = (rawUrl) => {
  if (typeof window === 'undefined' || !rawUrl) {
    return rawUrl;
  }

  const browserHost = String(window.location.hostname || '').trim().toLowerCase();
  const isLocalBrowserHost = browserHost === 'localhost' || browserHost === '127.0.0.1';

  if (!isLocalBrowserHost) {
    return rawUrl;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const apiHost = parsedUrl.hostname.toLowerCase();
    const isLocalApiHost = apiHost === 'localhost' || apiHost === '127.0.0.1';

    if (!isLocalApiHost || apiHost === browserHost) {
      return parsedUrl.toString().replace(/\/$/, '');
    }

    parsedUrl.hostname = browserHost;
    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
};

const api = axios.create({
  baseURL: `${resolveApiUrl(DEFAULT_API_URL)}/api`,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prevent redundant parallel mutations by sharing the first in-flight result
// with any identical follow-up request instead of surfacing a cancellation error.
const pendingRequests = new Map();

const createSharedRequestRecord = () => {
  let resolveShared;
  let rejectShared;

  const sharedPromise = new Promise((resolve, reject) => {
    resolveShared = resolve;
    rejectShared = reject;
  });

  return {
    sharedPromise,
    resolve: resolveShared,
    reject: rejectShared,
  };
};

const normalizeSerializableValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSerializableValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof File !== 'undefined' && value instanceof File) {
    return {
      __type: 'file',
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    };
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return {
      __type: 'blob',
      size: value.size,
      type: value.type,
    };
  }

  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeSerializableValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const serializeRequestPart = (value) => {
  try {
    if (value instanceof FormData) {
      // Avoid serializing binary files/FormData which crashes on mobile Chrome/Android sandbox.
      // Returning a unique key bypasses deduplication for file uploads.
      return `FormData-${Math.random()}-${Date.now()}`;
    }
    return JSON.stringify(normalizeSerializableValue(value));
  } catch (e) {
    console.warn('Request serialization failed, using fallback key:', e);
    return `Fallback-${Math.random()}-${Date.now()}`;
  }
};

const getRequestKey = (config) => [
  String(config.method || 'get').toLowerCase(),
  config.baseURL || '',
  config.url || '',
  serializeRequestPart(config.params || null),
  serializeRequestPart(config.data || null),
].join(':');

const isAuthFailure = (error) => {
  const status = error.response?.status;
  const errorCode = error.response?.data?.code;

  return status === 401 || (status === 403 && errorCode === 'TENANT_MISMATCH');
};

const isLoginRequest = (url = '') => String(url).includes('/auth/login');
const isPublicAuthFlowPath = (pathname = '') => (
  String(pathname || '').startsWith('/pre-onboarding')
  || pathname === '/reset-password'
  || pathname === '/auth/handoff'
);

// Add a request interceptor to attach workspace context and dedupe sensitive mutations.
api.interceptors.request.use(
  (config) => {
    // Block only identical in-flight mutations, including params and payload.
    const requestKey = getRequestKey(config);
    const method = String(config.method || '').toLowerCase();
    if (MUTATION_METHODS.has(method)) {
      const pendingRecord = pendingRequests.get(requestKey);
      if (pendingRecord) {
        config.adapter = () => pendingRecord.sharedPromise;
        return config;
      }

      const sharedRecord = createSharedRequestRecord();
      pendingRequests.set(requestKey, sharedRecord);
      config.__requestKey = requestKey;
    }

    // Automatically remove Content-Type for FormData so Axios can infer the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const accessToken = getStoredAccessToken();
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // ── Tenant Detection ──────────────────────────────────────────────────────
    // Priority: ?tenant= query param > subdomain from hostname
    // Supported:
    //   localhost                 → no tenant
    //   ilumaa.localhost          → tenant: ilumaa
    //   telentcio.vercel.app      → tenant: telentcio
    //   telentcio-demo.vercel.app → tenant: telentcio-demo
    //   ilumaa.talentcio.com      → tenant: ilumaa
    //   talentcio.com             → no tenant (root domain)
    const hostname = window.location.hostname;
    const urlParams = new URLSearchParams(window.location.search);
    const parts = hostname.split('.');
    const storedTenant = localStorage.getItem('tenant') || '';

    // Infra identifiers that are never tenant slugs
    const NON_TENANT_IDS = new Set(['www', 'api', 'talentcio', 'talentcio-be']);
    // Root domains we own — their subdomains are tenants
    const OWN_ROOTS = ['talentcio.in', 'telentcio.in', 'talentcio.com', 'telentcio.com'];

    let detectedSubdomain = '';

    if (hostname === 'localhost' || hostname === '') {
      // Plain localhost — no tenant
    } else if (hostname.endsWith('localhost')) {
      // e.g. ilumaa.localhost:3000
      if (parts.length > 1 && parts[0] !== 'localhost') {
        detectedSubdomain = parts[0];
      }
    } else if (hostname.endsWith('vercel.app')) {
      // Full Vercel slug is the tenant slug
      // telentcio.vercel.app → 'telentcio'
      // telentcio-demo.vercel.app → 'telentcio-demo'
      detectedSubdomain = hostname.replace(/\.vercel\.app$/, '');
    } else {
      // Custom domain
      const isOwnRoot = OWN_ROOTS.some(r => hostname === r);
      const isOwnSubdomain = OWN_ROOTS.some(r => hostname.endsWith('.' + r));

      if (isOwnSubdomain) {
        // ilumaa.talentcio.com → 'ilumaa'
        detectedSubdomain = parts[0];
      } else if (!isOwnRoot && parts.length > 2) {
        // Unknown custom subdomain
        detectedSubdomain = parts[0];
      }
      // If isOwnRoot (talentcio.com itself) → no tenant
    }

    // Query param overrides everything; on plain localhost we can also reuse the stored tenant.
    const isPlainLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    let targetTenant = urlParams.get('tenant') || detectedSubdomain || (isPlainLocalhost ? storedTenant : '');

    // Strip non-tenant infra names
    if (targetTenant && NON_TENANT_IDS.has(targetTenant.toLowerCase())) {
      targetTenant = '';
    }

    if (targetTenant) {
      localStorage.setItem('tenant', targetTenant.toLowerCase());
      config.headers['x-tenant-id'] = targetTenant.toLowerCase();
    } else {
      localStorage.removeItem('tenant');
      delete config.headers['x-tenant-id'];
    }
    // ─────────────────────────────────────────────────────────────────────────

    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle errors and clean up tracking
api.interceptors.response.use(
  (response) => {
    const requestKey = response.config?.__requestKey || getRequestKey(response.config);
    const pendingRecord = pendingRequests.get(requestKey);
    if (pendingRecord) {
      pendingRecord.resolve(response);
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  (error) => {
    if (error.config) {
      const requestKey = error.config.__requestKey || getRequestKey(error.config);
      const pendingRecord = pendingRequests.get(requestKey);
      if (pendingRecord) {
        pendingRecord.reject(error);
        pendingRequests.delete(requestKey);
      }
    }

    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      console.warn('API Request Timed Out:', error.config?.url);
    }

    // Handle 429 (Too Many Requests) specifically
    if (error.response && error.response.status === 429) {
      // You could import toast here, but since this is a utility, 
      // we mainly want to ensure the error is passed through with a clear message.
      console.warn('API Rate Limit Hit:', error.response.data?.message);
    }

    // Redirect only for true auth/session failures, and keep login errors in-place for the screen to handle.
    if (isAuthFailure(error) && !isLoginRequest(error.config?.url)) {
      if (
        typeof window !== 'undefined'
        && window.location.pathname !== '/login'
        && !isPublicAuthFlowPath(window.location.pathname)
      ) {
        clearAuthSession();
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
