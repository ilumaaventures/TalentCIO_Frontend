import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Globe, Phone, Download } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { companiesService } from '../../services/api';
import { CompanyDetailDrawer } from './CompanyDetailDrawer';
import { exportDataToCsv } from '../../utils/export';

export const CompaniesListPage = ({ onOpenCompanyDetail }) => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [formData, setFormData] = useState({ name: '', industry: 'Technology', website: '', phone: '', companySize: '51-200' });

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await companiesService.getCompanies({ search, page: pagination?.page || 1 });
      if (res?.success) {
        setCompanies(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching companies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search, pagination?.page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await companiesService.createCompany(formData);
      setIsModalOpen(false);
      setFormData({ name: '', industry: 'Technology', website: '', phone: '', companySize: '51-200' });
      fetchCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    {
      title: 'Company Name',
      key: 'name',
      sortable: true,
      render: (val) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{val}</span>
        </div>
      ),
    },
    {
      title: 'Industry',
      key: 'industry',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-600">{val || '—'}</span>,
    },
    {
      title: 'Health Score',
      key: 'healthScore',
      render: (val) => {
        const variants = { healthy: 'emerald', attention_needed: 'amber', at_risk: 'rose' };
        return <Badge variant={variants[val] || 'neutral'} size="sm" dot>{val ? val.replace('_', ' ') : 'Healthy'}</Badge>;
      },
    },
    {
      title: 'Account Type',
      key: 'accountType',
      render: (val) => <span className="text-xs font-medium text-slate-700">{val || 'Prospect'}</span>,
    },
    {
      title: 'Website',
      key: 'website',
      render: (val) => val ? (
        <a href={val} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
          <Globe className="w-3 h-3" />
          <span>{val.replace('https://', '')}</span>
        </a>
      ) : '—',
    },
    {
      title: 'Owner',
      key: 'ownerId',
      render: (val) => val?.name || 'Unassigned',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Companies & Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Enterprise account directory, health scores, and client lifecycle.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={Download} onClick={() => exportDataToCsv('companies')}>
            Export
          </Button>
          <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Add Company
          </Button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <Input
          placeholder="Search companies by name or industry..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={companies}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onRowClick={(row) => setSelectedCompanyId(row._id)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Company"
        subtitle="Create an enterprise account profile"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Company</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Company Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Acme Technologies India"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="Technology"
            />
            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://acme.in"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 80 4455 6677"
            />
            <Input
              label="Company Size"
              value={formData.companySize}
              onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
              placeholder="51-200"
            />
          </div>
        </form>
      </Modal>

      <CompanyDetailDrawer
        companyId={selectedCompanyId}
        isOpen={Boolean(selectedCompanyId)}
        onClose={() => setSelectedCompanyId(null)}
        onUpdated={fetchCompanies}
      />
    </div>
  );
};
