const AUTH_USER_KEY = 'user';
const AUTH_SESSION_HINT_KEY = 'talentcio_auth_session';
const AUTH_TOKEN_KEY = 'talentcio_access_token';
const TENANT_KEY = 'tenant';
const LEGACY_TOKEN_KEY = 'token';

const SESSION_EXACT_KEYS = [AUTH_SESSION_HINT_KEY, 'chunk-reload-count'];
const SESSION_PREFIXES = [
  'handoff-exchange:',
  'talentcio_announcement_gate_seen_',
  'attendance_',
  'dashboard_',
  'discussion_',
  'helpdesk_',
  'holiday_',
  'meeting_',
  'project_',
  'role_',
  'user_',
  'business_unit_',
  'client_',
  'timesheet_',
  'leave_',
  'leaves_',
  'onboarding_',
  'ta_',
];

const shouldRemoveSessionKey = (key, userId = '') => (
  SESSION_EXACT_KEYS.includes(key)
  || SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))
  || (userId && key.includes(userId))
);

const removeMatchingSessionKeys = (userId = '') => {
  const keysToRemove = [];
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key && shouldRemoveSessionKey(key, userId)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
};

export const readStoredUser = () => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const persistAuthUser = (user) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getStoredAccessToken = () => (
  sessionStorage.getItem(AUTH_TOKEN_KEY) || ''
);

export const persistAccessToken = (token) => {
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export const markAuthSessionActive = () => {
  sessionStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
};

export const hasAuthSessionHint = () => (
  sessionStorage.getItem(AUTH_SESSION_HINT_KEY) === '1'
  || Boolean(sessionStorage.getItem(AUTH_TOKEN_KEY))
  || Boolean(localStorage.getItem(AUTH_USER_KEY))
);

export const clearAuthSession = ({ preserveTenant = false, userId = '' } = {}) => {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  if (!preserveTenant) {
    localStorage.removeItem(TENANT_KEY);
  }

  removeMatchingSessionKeys(userId);
};
