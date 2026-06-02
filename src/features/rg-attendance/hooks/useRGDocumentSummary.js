import { useCallback, useEffect, useState } from 'react';
import api from '../../../api/axios';

export const useRGDocumentSummary = ({ month, enabled = true }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    if (!enabled || !month) {
      setRecords([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.get('/attendance/rg/document-summary', {
        params: { month }
      });
      setRecords(Array.isArray(response.data?.records) ? response.data.records : []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to load RG document summary.';
      setError(message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, month]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    records,
    loading,
    error,
    refresh: fetchSummary
  };
};
