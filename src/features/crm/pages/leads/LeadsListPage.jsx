import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Tag,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  Mail,
  MessageSquare,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { leadsService } from '../../services/api';
import { AddNewLeadModal } from './AddNewLeadModal';
import { exportDataToCsv } from '../../utils/export';

export const LeadsListPage = ({ onNavigate, onOpenLeadDetail }) => {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const res = await leadsService.getLeads({
        search,
        status: statusFilter,
        source: sourceFilter,
        page: pagination?.page || 1,
        limit: pagination?.limit || 25,
      });
      if (res?.success) {
        setLeads(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching leads', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, sourceFilter, pagination?.page]);

  const handleBulkStatusChange = async (status) => {
    if (!selectedIds.length) return;
    try {
      await leadsService.bulkUpdate({
        ids: selectedIds,
        action: 'status',
        payload: { status },
      });
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) return;
    try {
      await leadsService.bulkUpdate({
        ids: selectedIds,
        action: 'delete',
        payload: {},
      });
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    {
      title: 'Lead Name',
      key: 'fullName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
            {row.fullName || `${row.firstName} ${row.lastName}`}
          </div>
          {row.jobTitle && <div className="text-xs text-slate-400">{row.jobTitle}</div>}
        </div>
      ),
    },
    {
      title: 'Company',
      key: 'companyName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-medium text-slate-900">{val || <span className="text-slate-400">—</span>}</div>
          {row.address?.city && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span>{row.address.city}{row.address.state ? `, ${row.address.state}` : ''}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contactInfo',
      render: (_, row) => (
        <div className="text-xs space-y-0.5">
          {row.email && <div className="text-slate-700">{row.email}</div>}
          {row.phone && <div className="text-slate-400">{row.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Source',
      key: 'source',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-600 font-medium">{val}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      sortable: true,
      render: (val) => {
        const variants = {
          New: 'neutral',
          Contacted: 'blue',
          Qualified: 'purple',
          Unqualified: 'rose',
          Nurturing: 'amber',
          Converted: 'emerald',
          Lost: 'rose',
        };
        return <Badge variant={variants[val] || 'neutral'} size="sm" dot>{val}</Badge>;
      },
    },
    {
      title: 'Score',
      key: 'score',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                val >= 80 ? 'bg-emerald-500' : val >= 60 ? 'bg-indigo-500' : val >= 40 ? 'bg-amber-500' : 'bg-slate-400'
              }`}
              style={{ width: `${val || 40}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700">{val}</span>
        </div>
      ),
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (val) => (
        <Badge
          variant={val === 'Urgent' || val === 'High' ? 'rose' : val === 'Medium' ? 'blue' : 'neutral'}
          size="sm"
        >
          {val}
        </Badge>
      ),
    },
    {
      title: 'Owner',
      key: 'ownerId',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          {val?.avatar ? (
            <img src={val.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
          ) : null}
          <span>{val?.name || 'Unassigned'}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leads</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Capture, qualify, score, and convert prospect inquiries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={() => exportDataToCsv('leads')}
          >
            Export
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search leads by name, email, phone, company..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'New', label: 'New' },
              { value: 'Contacted', label: 'Contacted' },
              { value: 'Qualified', label: 'Qualified' },
              { value: 'Nurturing', label: 'Nurturing' },
              { value: 'Converted', label: 'Converted' },
              { value: 'Lost', label: 'Lost' },
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Sources' },
              { value: 'Website', label: 'Website' },
              { value: 'Referral', label: 'Referral' },
              { value: 'Google Ads', label: 'Google Ads' },
              { value: 'LinkedIn', label: 'LinkedIn' },
              { value: 'WhatsApp', label: 'WhatsApp' },
              { value: 'Cold Call', label: 'Cold Call' },
            ]}
          />
        </div>
      </div>

      {/* Main Leads Table */}
      <DataTable
        columns={columns}
        data={leads}
        isLoading={isLoading}
        selectable
        selectedIds={selectedIds}
        onSelectRow={(id, checked) => {
          setSelectedIds((prev) =>
            checked ? [...prev, id] : prev.filter((item) => item !== id)
          );
        }}
        onSelectAll={(checked) => {
          setSelectedIds(checked ? leads.map((l) => l._id) : []);
        }}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onRowClick={(row) => onOpenLeadDetail(row._id)}
        bulkActions={
          <>
            <button
              onClick={() => handleBulkStatusChange('Qualified')}
              className="px-2.5 py-1 rounded bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Mark Qualified
            </button>
            <button
              onClick={() => handleBulkStatusChange('Contacted')}
              className="px-2.5 py-1 rounded bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Mark Contacted
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </>
        }
      />

      {/* Add New Lead Modal */}
      <AddNewLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchLeads()}
        onViewLead={(id) => onOpenLeadDetail && onOpenLeadDetail(id)}
      />
    </div>
  );
};
