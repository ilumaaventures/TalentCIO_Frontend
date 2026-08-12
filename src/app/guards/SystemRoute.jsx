import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectCurrentUser } from '@/features/auth/authSlice';

const SystemRoute = ({ children }) => {
    const user = useAppSelector(selectCurrentUser);

    // Check for System Roles (Admin) or All Permissions (Wildcards like *, all, admin)
    const hasAdminPermission = user?.permissions?.some(p => p === '*' || p === 'all' || p === 'admin');
    const hasSystemRole = user?.roles?.some(r => r === 'Admin' || r === 'admin' || r?.name === 'Admin' || r?.isSystem === true);
    const hasDashboardPermission = user?.permissions?.includes('dashboard.view');
    const hasAllAccess = hasSystemRole || hasAdminPermission || user?.hasAllPermissions || hasDashboardPermission;

    if (!hasAllAccess) {
        return <Navigate to="/attendance" replace />;
    }

    return children;
};

export default SystemRoute;
