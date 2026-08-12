import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  verifyWorkspace,
  loadProfile,
  selectAuthLoading,
  selectInvalidWorkspace,
  selectToken
} from '@/features/auth/authSlice';
import InvalidWorkspace from '@/pages/InvalidWorkspace';
import useAuth from '@/features/auth/hooks/useAuth';

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth };

export const AuthProvider = ({ children }) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAuthLoading);
  const invalidWorkspace = useAppSelector(selectInvalidWorkspace);
  const token = useAppSelector(selectToken);

  useEffect(() => {
    dispatch(verifyWorkspace());
  }, [dispatch]);

  useEffect(() => {
    dispatch(loadProfile());
  }, [dispatch, token]);

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

  return children;
};

export default AuthProvider;
