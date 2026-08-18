import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '@/lib/apiClient';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { clearAuthSession, clearScopedCaches, hasAuthSessionHint, markAuthSessionActive, persistAccessToken, persistAuthUser, readStoredUser } from '@/features/auth/utils/authStorage';
import { hasModuleEnabled, normalizeEnabledModules } from '@/config/enabledModules';
import { isAdminUser } from '@/config/accessPolicies';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isStandalonePublicRoute = (pathname = '') => (
  String(pathname || '').startsWith('/pre-onboarding')
  || pathname === '/reset-password'
);

const normalizeUserPayload = (rawUser = null) => {
  if (!rawUser) return rawUser;
  const { token: _token, ...safeUser } = rawUser;

  const normalizedRoles = safeUser.roleNames || (Array.isArray(safeUser.roles)
    ? safeUser.roles.map((role) => role.name || role)
    : []);

  const normalizedCompany = safeUser.company
    ? {
        ...safeUser.company,
        enabledModules: normalizeEnabledModules(safeUser.company.enabledModules || [])
      }
    : safeUser.company;

  const dossierStatus = safeUser.dossierStatus || { isComplete: true, missingSections: [], missingFields: [] };

  return {
    ...safeUser,
    roles: normalizedRoles,
    company: normalizedCompany,
    dossierStatus
  };
};

const getInitialUser = () => {
  const storedUser = readStoredUser();
  return storedUser ? normalizeUserPayload(storedUser) : null;
};

export const verifyWorkspace = createAsyncThunk(
  'auth/verifyWorkspace',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/verify-workspace');
      if (response.data?.type === 'tenant') {
        if (response.data.subdomain) {
          localStorage.setItem('tenant', response.data.subdomain);
        }
        return response.data;
      }
      return null;
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        return rejectWithValue({ invalidWorkspace: true });
      }
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const loadProfile = createAsyncThunk(
  'auth/loadProfile',
  async (_, { rejectWithValue }) => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const storedUser = readStoredUser();

    if (isStandalonePublicRoute(currentPath) && !hasAuthSessionHint()) {
      return rejectWithValue({ standalonePublic: true });
    }

    try {
      const response = await api.get('/auth/profile');
      const normalisedUser = normalizeUserPayload(response.data);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);

      if (normalisedUser?._id) {
        connectSocket(normalisedUser._id);
      }
      return normalisedUser;
    } catch (err) {
      console.error('Profile Load Error:', err);
      disconnectSocket();
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
        clearAuthSession({ userId: storedUser?._id || '' });
      }
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password, companyId = null }, { getState, rejectWithValue }) => {
    const state = getState();
    const loginData = { email: normalizeEmail(email), password };
    const targetCompanyId = companyId || state.auth.workspace?.id;
    if (targetCompanyId) loginData.companyId = targetCompanyId;

    try {
      const response = await api.post('/auth/login', loginData);
      if (response.data?.passwordResetRequired) {
        return response.data;
      }

      const normalisedUser = normalizeUserPayload(response.data);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);

      if (normalisedUser?._id) {
        connectSocket(normalisedUser._id);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register-company', data);
      const normalisedUser = normalizeUserPayload(response.data);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);
      return normalisedUser;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    const state = getState();
    const currentUserId = state.auth.user?._id || '';
    try {
      await api.post('/auth/logout');
    } catch (err) {
      if (err.response?.status && ![401, 403].includes(err.response.status)) {
        console.error('Logout error:', err);
      }
    } finally {
      disconnectSocket();
      clearAuthSession({ userId: currentUserId });
    }
  }
);

export const refreshProfile = createAsyncThunk(
  'auth/refreshProfile',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get('/auth/profile');
      const normalisedUser = normalizeUserPayload(response.data);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);
      return normalisedUser;
    } catch (err) {
      console.error('refreshProfile error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        dispatch(logout());
        return rejectWithValue({ authError: true });
      }
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const startImpersonation = createAsyncThunk(
  'auth/startImpersonation',
  async ({ userId, reason = '' }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/${userId}/impersonate`, { reason });
      const normalisedUser = normalizeUserPayload(response.data);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      clearScopedCaches();
      markAuthSessionActive();
      persistAuthUser(normalisedUser);
      if (normalisedUser?._id) {
        connectSocket(normalisedUser._id);
      }
      return {
        user: normalisedUser,
        impersonation: response.data?.impersonation || { active: true }
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const endImpersonation = createAsyncThunk(
  'auth/endImpersonation',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/users/impersonate/end');
      clearScopedCaches();
      if (response.data?.isSuperAdmin) {
        return { isSuperAdmin: true };
      }
      const normalisedUser = normalizeUserPayload(response.data);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);
      if (normalisedUser?._id) {
        connectSocket(normalisedUser._id);
      }
      return { user: normalisedUser };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const checkImpersonationStatus = createAsyncThunk(
  'auth/checkImpersonationStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/impersonate/status');
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const initialState = {
  user: getInitialUser(),
  token: hasAuthSessionHint(),
  loading: true,
  invalidWorkspace: false,
  workspace: null,
  activeRequestId: null,
  impersonation: { active: false, tier: null, expiresAt: null, actorName: null, actorEmail: null }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoginWithToken: (state, action) => {
      const normalisedUser = normalizeUserPayload(action.payload);
      state.token = true;
      state.user = normalisedUser;
      state.activeRequestId = `token-login-${Date.now()}`;
      if (action.payload?.token) {
        persistAccessToken(action.payload.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);
      if (normalisedUser?._id) {
        connectSocket(normalisedUser._id);
      }
    },
    setAuthLoading: (state, action) => {
      state.loading = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // verifyWorkspace
      .addCase(verifyWorkspace.fulfilled, (state, action) => {
        if (action.payload) {
          state.workspace = action.payload;
        }
      })
      .addCase(verifyWorkspace.rejected, (state, action) => {
        if (action.payload?.invalidWorkspace) {
          state.invalidWorkspace = true;
          state.loading = false;
        }
      })
      // Track activeRequestId on pending actions to guard against stale responses
      .addCase(loadProfile.pending, (state, action) => {
        state.loading = true;
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(refreshProfile.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(login.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(register.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(logout.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
        state.user = null;
        state.token = false;
        state.impersonation = { active: false, tier: null, expiresAt: null, actorName: null, actorEmail: null };
      })
      // loadProfile handlers
      .addCase(loadProfile.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        state.user = action.payload;
        state.token = true;
        state.loading = false;
        if (action.payload?.impersonation) {
          state.impersonation = action.payload.impersonation;
        }
      })
      .addCase(loadProfile.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        state.loading = false;
        if (!action.payload?.standalonePublic) {
          state.token = false;
          state.user = null;
        }
      })
      // refreshProfile handlers
      .addCase(refreshProfile.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        state.user = action.payload;
        state.token = true;
        if (action.payload?.impersonation) {
          state.impersonation = action.payload.impersonation;
        }
      })
      .addCase(refreshProfile.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        if (action.payload?.authError) {
          state.token = false;
          state.user = null;
        }
      })
      // login handlers
      .addCase(login.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        if (!action.payload?.passwordResetRequired) {
          state.user = normalizeUserPayload(action.payload);
          state.token = true;
        }
      })
      // register handlers
      .addCase(register.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        state.user = action.payload;
        state.token = true;
      })
      // logout handlers
      .addCase(logout.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        state.user = null;
        state.token = false;
        state.impersonation = { active: false, tier: null, expiresAt: null, actorName: null, actorEmail: null };
      })
      // impersonation handlers
      .addCase(startImpersonation.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = true;
        state.impersonation = action.payload.impersonation;
      })
      .addCase(endImpersonation.fulfilled, (state, action) => {
        state.impersonation = { active: false, tier: null, expiresAt: null, actorName: null, actorEmail: null };
        if (action.payload?.isSuperAdmin) {
          state.user = null;
          state.token = false;
        } else if (action.payload?.user) {
          state.user = action.payload.user;
        }
      })
      .addCase(checkImpersonationStatus.fulfilled, (state, action) => {
        if (action.payload?.active) {
          state.impersonation = action.payload;
        } else {
          state.impersonation = { active: false, tier: null, expiresAt: null, actorName: null, actorEmail: null };
        }
      });
  }
});

export const { setLoginWithToken, setAuthLoading } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectWorkspace = (state) => state.auth.workspace;
export const selectInvalidWorkspace = (state) => state.auth.invalidWorkspace;
export const selectImpersonation = (state) => state.auth.impersonation;

export const selectHasModule = (state, moduleName) => {
  const user = state.auth.user;
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return hasModuleEnabled(user?.company?.enabledModules || [], moduleName);
};

export const selectIsDossierComplete = (state) => {
  const user = state.auth.user;
  return (
    user?.dossierStatus?.isComplete !== false ||
    isAdminUser(user) ||
    Boolean(user?.permissions?.includes('dossier.bypass_completeness_gate'))
  );
};

export const selectDossierMissingSections = (state) => (
  state.auth.user?.dossierStatus?.missingSections || []
);

export const selectDossierMissingFields = (state) => (
  state.auth.user?.dossierStatus?.missingFields || []
);

export default authSlice.reducer;
