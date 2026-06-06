import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { connectSocket, disconnectSocket } from '../api/socket';
import InvalidWorkspace from '../pages/InvalidWorkspace';
import { clearAuthSession, hasAuthSessionHint, markAuthSessionActive, persistAccessToken, persistAuthUser, readStoredUser } from '../utils/authStorage';
import { hasModuleEnabled, normalizeEnabledModules } from '../utils/enabledModules';

const AuthContext = createContext(null);
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

  return {
    ...safeUser,
    roles: normalizedRoles,
    company: normalizedCompany
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(hasAuthSessionHint());
  const [loading, setLoading] = useState(true);
  const authLoadIdRef = useRef(0);

  const [invalidWorkspace, setInvalidWorkspace] = useState(false);
  const [workspace, setWorkspace] = useState(null);

  const invalidatePendingAuthLoads = useCallback(() => {
    authLoadIdRef.current += 1;
    return authLoadIdRef.current;
  }, []);

  useEffect(() => {
    const authLoadId = invalidatePendingAuthLoads();
    let active = true;

    const loadUserAndVerifyWorkspace = async () => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

      // 1. Verify workspace first
      try {
        const response = await api.get('/auth/verify-workspace');
        if (!active || authLoadIdRef.current !== authLoadId) return;
        if (response.data.type === 'tenant') {
          setWorkspace(response.data);
          // If we have a subdomain, ensure it's in localStorage so axios can pick it up
          if (response.data.subdomain) {
            localStorage.setItem('tenant', response.data.subdomain);
          }
        }
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 403) {
          setInvalidWorkspace(true);
          setLoading(false);
          return;
        }
      }

      // 2. Try localStorage for initial state (avoids flicker)
      const storedUser = readStoredUser();
      if (storedUser) {
        if (!active || authLoadIdRef.current !== authLoadId) return;
        const normalisedUser = normalizeUserPayload(storedUser);
        setUser(normalisedUser);
        setToken(true);
      }

      // Standalone public flows should not trigger the main workspace auth bootstrap.
      if (isStandalonePublicRoute(currentPath) && !hasAuthSessionHint()) {
        setLoading(false);
        return;
      }

      // 3. ALWAYS fetch fresh profile from server to restore any valid httpOnly session
      //    and get the latest company configuration (modules, styles, etc.)
      try {
        const response = await api.get('/auth/profile');
        if (!active || authLoadIdRef.current !== authLoadId) return;
        const normalisedUser = normalizeUserPayload(response.data);
        setToken(true);
        setUser(normalisedUser);
        if (response.data?.token) {
          persistAccessToken(response.data.token);
        }
        markAuthSessionActive();
        persistAuthUser(normalisedUser);

        if (normalisedUser?._id) {
          connectSocket(normalisedUser._id);
        }
      } catch (err) {
        if (!active || authLoadIdRef.current !== authLoadId) return;
        console.error('Profile Load Error:', err);
        if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
          disconnectSocket();
          setToken(false);
          setUser(null);
          clearAuthSession({ userId: storedUser?._id || '' });
        }
      } finally {
        if (active && authLoadIdRef.current === authLoadId) {
          setLoading(false);
        }
      }
    };

    loadUserAndVerifyWorkspace();

    return () => {
      active = false;
    };
  }, [invalidatePendingAuthLoads, token]);

  const login = async (email, password, companyId = null) => {
    invalidatePendingAuthLoads();
    const loginData = { email: normalizeEmail(email), password };

    // Priority: 1. Explicit selection, 2. Auto-detected from domain, 3. Empty (discovers via email)
    const targetCompanyId = companyId || workspace?.id;
    if (targetCompanyId) loginData.companyId = targetCompanyId;

    const response = await api.post('/auth/login', loginData);

    if (response.data.passwordResetRequired) {
      return response.data;
    }

    const normalisedUser = normalizeUserPayload(response.data);
    setToken(true);
    setUser(normalisedUser);
    if (response.data?.token) {
      persistAccessToken(response.data.token);
    }
    markAuthSessionActive();
    persistAuthUser(normalisedUser);

    // Connect socket on login
    if (normalisedUser?._id) {
      connectSocket(normalisedUser._id);
    }

    return response.data;
  };

  const loginWithToken = useCallback((userData) => {
    invalidatePendingAuthLoads();
    const normalisedUser = normalizeUserPayload(userData);

    setToken(true);
    setUser(normalisedUser);
    if (userData?.token) {
      persistAccessToken(userData.token);
    }
    markAuthSessionActive();
    persistAuthUser(normalisedUser);

    if (normalisedUser?._id) {
      connectSocket(normalisedUser._id);
    }
  }, [invalidatePendingAuthLoads]);

  const register = async (data) => {
    invalidatePendingAuthLoads();
    const response = await api.post('/auth/register-company', data);
    const normalisedUser = normalizeUserPayload(response.data);
    setToken(true);
    setUser(normalisedUser);
    if (response.data?.token) {
      persistAccessToken(response.data.token);
    }
    markAuthSessionActive();
    persistAuthUser(normalisedUser);
  };

  const logout = useCallback(async () => {
    invalidatePendingAuthLoads();
    const currentUserId = user?._id || '';

    try {
      await api.post('/auth/logout');
    } catch (err) {
      if (err.response?.status && ![401, 403].includes(err.response.status)) {
        console.error('Logout error:', err);
      }
    } finally {
      disconnectSocket();
      setToken(false);
      setUser(null);
      clearAuthSession({ userId: currentUserId });
    }
  }, [invalidatePendingAuthLoads, user?._id]);

  const logoutAndThrow = useCallback(async (err) => {
    await logout();
    throw err;
  }, [logout]);

  const refreshProfile = async () => {
    const requestId = invalidatePendingAuthLoads();
    try {
      const response = await api.get('/auth/profile');
      if (authLoadIdRef.current !== requestId) return user;
      const normalisedUser = normalizeUserPayload(response.data);
      setToken(true);
      setUser(normalisedUser);
      if (response.data?.token) {
        persistAccessToken(response.data.token);
      }
      markAuthSessionActive();
      persistAuthUser(normalisedUser);
      return normalisedUser;
    } catch (err) {
      if (authLoadIdRef.current !== requestId) return user;
      console.error('refreshProfile error:', err);
      // If the token was invalidated (e.g. role change bumped tokenVersion), log out
      if (err.response?.status === 401 || err.response?.status === 403) {
        await logoutAndThrow(err);
      }
      throw err;
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', zIndex: 9999
      }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #e2e8f0',
          borderTop: '3px solid #2563eb', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (invalidWorkspace) {
    return <InvalidWorkspace />;
  }

  const hasModule = (moduleName) => {
    return hasModuleEnabled(user?.company?.enabledModules || [], moduleName);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, register, logout, refreshProfile, hasModule, loading, workspace }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
