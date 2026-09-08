const isLocalhost = () => {
  if (typeof window === 'undefined') return false;

  const hostname = String(window.location.hostname || '').toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
};

export const isRGWorkspace = (user) => {
  const tenantSlug = String(user?.company?.subdomain || '').trim().toLowerCase();
  return tenantSlug === 'rg' || (isLocalhost() && tenantSlug === 'telentcio');
};

export const canViewRGDocumentTracker = () => true;
