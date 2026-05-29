import React from 'react';
import ProtectedRoute from './ProtectedRoute';

const RoleRoute = ({ requiredPermissions = [], requiredRoles = [], allowAllPermissions = false }) => {
    return (
        <ProtectedRoute
            requiredPermissions={requiredPermissions}
            requiredRoles={requiredRoles}
            allowAllPermissions={allowAllPermissions}
            redirectTo="/"
        />
    );
};

export default RoleRoute;
