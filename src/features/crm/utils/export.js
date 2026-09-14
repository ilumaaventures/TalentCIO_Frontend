/**
 * Reusable utility to trigger authenticated browser CSV export downloads
 */
export const exportDataToCsv = async (entityType) => {
  try {
    const token = localStorage.getItem('sales_crm_token') || localStorage.getItem('token');
    const rawApi = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
    const apiBase = rawApi.endsWith('/api') ? rawApi : `${rawApi}/api`;
    const res = await fetch(`${apiBase}/data/export/${entityType}?format=csv`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to export ${entityType}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityType}_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Export error:', err);
    alert(err.message || 'Export failed. Please try again.');
  }
};
