import React from 'react';
import ProtectedRoute from './ProtectedRoute';

const ModuleRoute = ({ moduleName }) => {
  return <ProtectedRoute moduleName={moduleName} redirectTo="/" />;
};

export default ModuleRoute;
