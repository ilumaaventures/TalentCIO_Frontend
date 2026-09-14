import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Edit3,
  MoreVertical,
  Eye,
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
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeMenuLead, setActiveMenuLead] = useState(null);
  const [menuPosition, setMenuPosition] = useState({});

  useEffect(() => {
    const handleClose = () => {
      setActiveMenuId(null);
      setActiveMenuLead(null);
    };
    document.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, []);

  const toggleActionMenu = (e, lead) => {
    e.stopPropagation();
    if (activeMenuId === lead._id) {
      setActiveMenuId(null);
      setActiveMenuLead(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 140;

      const positionStyles = {
        right: Math.max(12, window.innerWidth - rect.right),
      };

      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        positionStyles.bottom = window.innerHeight - rect.top + 4;
      } else {
        positionStyles.top = rect.bottom + 4;
      }

      setMenuPosition(positionStyles);
      setActiveMenuLead(lead);
      setActiveMenuId(lead._id);
    }
  };

  const handleOpenCreateModal = () => {
    setLeadToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    setLeadToEdit(lead);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setLeadToEdit(null);
  };

  const handleOpenDeleteSingle = (lead) => {
    setLeadToDelete(lead);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteBulk = () => {
    if (!selectedIds.length) return;
    setLeadToDelete(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (leadToDelete) {
        await leadsService.deleteLead(leadToDelete._id);
        setSelectedIds((prev) => prev.filter((id) => id !== leadToDelete._id));
      } else if (selectedIds.length > 0) {
        await leadsService.bulkUpdate({
          ids: selectedIds,
          action: 'delete',
          payload: {},
        });
        setSelectedIds([]);
      }
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
      fetchLeads();
    } catch (err) {
      alert(err.message || 'Failed to delete lead(s)');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l._id));
    }
  };

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
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => toggleActionMenu(e, row)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              activeMenuId === row._id
                ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Lead actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
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
            onClick={handleOpenCreateModal}
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
        {leads.length > 0 && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer whitespace-nowrap ml-auto"
          >
            {selectedIds.length === leads.length ? 'Deselect All' : `Select All (${leads.length})`}
          </button>
        )}
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
              className="px-2.5 py-1 rounded bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors cursor-pointer text-xs"
            >
              Mark Qualified
            </button>
            <button
              onClick={() => handleBulkStatusChange('Contacted')}
              className="px-2.5 py-1 rounded bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-xs"
            >
              Mark Contacted
            </button>
            <button
              onClick={handleOpenDeleteBulk}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors cursor-pointer text-xs shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </>
        }
      />

      {/* Add / Edit Lead Modal */}
      <AddNewLeadModal
        isOpen={isCreateModalOpen}
        leadToEdit={leadToEdit}
        onClose={handleCloseModal}
        onSuccess={() => fetchLeads()}
        onViewLead={(id) => onOpenLeadDetail && onOpenLeadDetail(id)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setLeadToDelete(null);
          }
        }}
        maxWidth="max-w-md"
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {leadToDelete ? 'Delete Lead' : `Delete ${selectedIds.length} Leads`}
              </h2>
              <p className="text-xs text-slate-500">This action cannot be undone.</p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setLeadToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              icon={Trash2}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              {leadToDelete ? 'Delete Lead' : `Delete (${selectedIds.length})`}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs text-slate-600">
          {leadToDelete ? (
            <>
              <p>
                Are you sure you want to permanently delete lead{' '}
                <strong className="text-slate-900">
                  {leadToDelete.fullName || `${leadToDelete.firstName} ${leadToDelete.lastName || ''}`.trim()}
                </strong>
                {leadToDelete.companyName ? ` (${leadToDelete.companyName})` : ''}?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px] text-slate-500">
                {leadToDelete.email && <div>Email: <span className="text-slate-700 font-medium">{leadToDelete.email}</span></div>}
                {leadToDelete.phone && <div>Phone: <span className="text-slate-700 font-medium">{leadToDelete.phone}</span></div>}
                <div>Status: <span className="text-slate-700 font-medium">{leadToDelete.status || 'New'}</span></div>
              </div>
            </>
          ) : (
            <p>
              Are you sure you want to permanently delete all{' '}
              <strong className="text-slate-900">{selectedIds.length}</strong> selected leads? All their qualification data and interaction logs will be permanently removed.
            </p>
          )}
        </div>
      </Modal>

      {/* Three-dot Context Menu */}
      {activeMenuId && activeMenuLead && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-9999 w-44 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 text-left animate-in fade-in zoom-in-95 duration-100 select-none"
          style={menuPosition}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const lead = activeMenuLead;
              setActiveMenuId(null);
              setActiveMenuLead(null);
              if (onOpenLeadDetail) onOpenLeadDetail(lead._id);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>View Details</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const lead = activeMenuLead;
              setActiveMenuId(null);
              setActiveMenuLead(null);
              handleOpenEditModal(lead);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Edit Lead</span>
          </button>
          <div className="h-px bg-slate-100 my-1" />
          <button
            type="button"
            onClick={() => {
              const lead = activeMenuLead;
              setActiveMenuId(null);
              setActiveMenuLead(null);
              handleOpenDeleteSingle(lead);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete Lead</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
