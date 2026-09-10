import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';

const ClientProtectedRoute = () => {
  const { isAuthenticated, loading } = useClientAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/client-portal/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ClientProtectedRoute;
