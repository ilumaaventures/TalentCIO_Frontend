import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';

const ClientAuthContext = createContext(null);

export const ClientAuthProvider = ({ children }) => {
  const [clientUser, setClientUser] = useState(null);
  const [client, setClient] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('talentcio_client_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentClientUser = useCallback(async () => {
    const storedToken = localStorage.getItem('talentcio_client_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/client-portal/auth/me');
      setClientUser(response.data.user);
      setClient(response.data.client);
      setToken(storedToken);
    } catch (err) {
      console.warn('Failed to restore client session:', err);
      localStorage.removeItem('talentcio_client_token');
      setClientUser(null);
      setClient(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentClientUser();
  }, [fetchCurrentClientUser]);

  const login = async (email, password) => {
    const response = await api.post('/client-portal/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser, client: receivedClient } = response.data;

    localStorage.setItem('talentcio_client_token', receivedToken);
    setToken(receivedToken);
    setClientUser(receivedUser);
    setClient(receivedClient);
    return response.data;
  };

  const acceptInvite = async (payload) => {
    const response = await api.post('/client-portal/auth/accept-invite', payload);
    const { token: receivedToken, user: receivedUser, client: receivedClient } = response.data;

    localStorage.setItem('talentcio_client_token', receivedToken);
    setToken(receivedToken);
    setClientUser(receivedUser);
    if (receivedClient) setClient(receivedClient);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/client-portal/auth/logout');
    } catch {
      // Best effort logout
    } finally {
      localStorage.removeItem('talentcio_client_token');
      setToken(null);
      setClientUser(null);
      setClient(null);
    }
  };

  const value = {
    clientUser,
    client,
    token,
    loading,
    isAuthenticated: Boolean(token && clientUser),
    login,
    acceptInvite,
    logout,
    refreshUser: fetchCurrentClientUser
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};

export default ClientAuthContext;
