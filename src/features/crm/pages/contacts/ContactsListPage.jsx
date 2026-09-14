import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Mail, Phone, Building2, Download } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { contactsService, companiesService } from '../../services/api';
import { ContactDetailDrawer } from './ContactDetailDrawer';
import { exportDataToCsv } from '../../utils/export';

export const ContactsListPage = ({ onOpenContactDetail }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
  const [selectedContactId, setSelectedContactId] = useState(null);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await contactsService.getContacts({ search, page: pagination?.page || 1 });
      if (res?.success) {
        setContacts(res.data || []);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching contacts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, pagination?.page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await contactsService.createContact(formData);
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
      fetchContacts();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    {
      title: 'Name',
      key: 'fullName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.fullName || `${row.firstName} ${row.lastName}`}</div>
          {row.jobTitle && <div className="text-xs text-slate-400">{row.jobTitle}</div>}
        </div>
      ),
    },
    {
      title: 'Company',
      key: 'companyId',
      render: (val) => val?.name ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{val.name}</span>
        </div>
      ) : '—',
    },
    {
      title: 'Email',
      key: 'email',
      render: (val) => <span className="text-xs text-slate-700">{val || '—'}</span>,
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (val) => <span className="text-xs text-slate-700">{val || '—'}</span>,
    },
    {
      title: 'Lifecycle Stage',
      key: 'lifecycleStage',
      render: (val) => <Badge variant="blue" size="sm">{val || 'Contact'}</Badge>,
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
          <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Directory of individual business contacts & stakeholders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" icon={Download} onClick={() => exportDataToCsv('contacts')}>
            Export
          </Button>
          <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Add Contact
          </Button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <Input
          placeholder="Search contacts by name, email, phone..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onRowClick={(row) => setSelectedContactId(row._id)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Contact"
        subtitle="Create a new person record"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Contact</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <Input
            label="Job Title"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          />
        </form>
      </Modal>

      <ContactDetailDrawer
        contactId={selectedContactId}
        isOpen={Boolean(selectedContactId)}
        onClose={() => setSelectedContactId(null)}
        onUpdated={fetchContacts}
      />
    </div>
  );
};
