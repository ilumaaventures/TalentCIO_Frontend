const isLocalhost = () => {
  if (typeof window === 'undefined') return false;

  const hostname = String(window.location.hostname || '').toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
};

export const isRGWorkspace = (user) => {
  const tenantSlug = String(user?.company?.subdomain || '').trim().toLowerCase();
  return tenantSlug === 'rg' || (isLocalhost() && tenantSlug === 'telentcio');
};

export const canViewRGDocumentTracker = (user) => {
  const roleNames = Array.isArray(user?.roles)
    ? user.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean)
    : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return (
    roleNames.includes('Admin') ||
    roleNames.includes('Manager') ||
    permissions.includes('*') ||
    permissions.includes('attendance.view') ||
    permissions.includes('attendance.view_others') ||
    permissions.includes('user.read')
  );
};
