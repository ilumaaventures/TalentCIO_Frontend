import React, { useState, useEffect } from 'react';
import { FileText, Shield, Clock, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { adminService } from '../../services/api';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const currentPage = pagination?.page || 1;
      const res = await adminService.getAuditLogs({ page: currentPage });
      if (res?.success) {
        setLogs(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        } else {
          setPagination((prev) => ({
            ...prev,
            total: res.data?.length || 0,
            totalPages: 1,
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination?.page]);

  const columns = [
    {
      title: 'Action',
      key: 'action',
      render: (val) => {
        const variants = {
          LOGIN: 'neutral',
          CREATE_LEAD: 'blue',
          STAGE_CHANGE: 'purple',
          CONVERT_LEAD: 'emerald',
          UPDATE_DEAL: 'indigo',
          DELETE_LEAD: 'rose',
        };
        return <Badge variant={variants[val] || 'neutral'} size="sm">{val}</Badge>;
      },
    },
    {
      title: 'User',
      key: 'userName',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val || 'System'}</span>
          {row.userEmail && <p className="text-[11px] text-slate-400">{row.userEmail}</p>}
        </div>
      ),
    },
    {
      title: 'Entity Affected',
      key: 'entityType',
      render: (val, row) => (
        <span className="text-xs font-medium text-slate-700">
          {val}: <span className="font-bold text-slate-900">{row.entityName || row.entityId || '—'}</span>
        </span>
      ),
    },
    {
      title: 'Timestamp',
      key: 'timestamp',
      render: (val) => (
        <span className="text-xs text-slate-500">
          {val ? new Date(val).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Security & Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable tracking of system logins, record changes, stage moves, and conversion actions.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
      />
    </div>
  );
};
