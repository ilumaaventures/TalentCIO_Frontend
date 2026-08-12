import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectToken, selectCurrentUser, selectHasModule } from '@/features/auth/authSlice';

const ProtectedRoute = ({
  children,
  moduleName,
  requiredPermissions = [],
  requiredRoles = [],
  requireAllPermissions = false,
  matchMode = 'any',
  allowAllPermissions = true,
  check,
  redirectTo = '/unauthorized'
}) => {
  const location = useLocation();
  const token = useAppSelector(selectToken);
  const user = useAppSelector(selectCurrentUser);
  const hasModuleAccess = useAppSelector((state) => (moduleName ? selectHasModule(state, moduleName) : true));

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user) {
    return null;
  }

  if (moduleName && !hasModuleAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  const hasWildcardAccess = allowAllPermissions && (
    Boolean(user.hasAllPermissions)
    || user.permissions?.includes('*')
  );
  const hasRole = requiredRoles.length === 0 || requiredRoles.some((role) => user.roles?.includes(role));
  const hasPermission = requiredPermissions.length === 0 || (
    requireAllPermissions
      ? requiredPermissions.every((permission) => user.permissions?.includes(permission))
      : requiredPermissions.some((permission) => user.permissions?.includes(permission))
  );

  const hasRoleOrPermissionAccess = (() => {
    if (hasWildcardAccess) return true;
    if (requiredRoles.length === 0 && requiredPermissions.length === 0) return true;
    if (requiredRoles.length === 0) return hasPermission;
    if (requiredPermissions.length === 0) return hasRole;

    return matchMode === 'all'
      ? hasRole && hasPermission
      : hasRole || hasPermission;
  })();

  const passesCustomCheck = typeof check === 'function' ? check(user) : true;

  if (!hasRoleOrPermissionAccess || !passesCustomCheck) {
    return <Navigate to={redirectTo} replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
