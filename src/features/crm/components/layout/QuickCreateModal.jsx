import React, { useState, useEffect } from 'react';
import { Users, Briefcase, CheckSquare, Clock, UserCheck, PhoneCall, Plus, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { leadsService, dealsService, tasksService, followUpsService, contactsService, dataService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const QuickCreateModal = ({ isOpen, onClose, initialType = 'lead', onSuccess }) => {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState(initialType || 'lead');
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const defaultSources = [
    'Website',
    'Referral',
    'Google Ads',
    'LinkedIn',
    'WhatsApp',
    'Cold Call',
    'Email',
    'Facebook / Meta',
    'Partner',
    'Event',
    'Walk-in',
    'Existing Customer',
    'Other',
  ];

  const [sourcesList, setSourcesList] = useState(() => {
    try {
      const saved = localStorage.getItem('sales_crm_custom_sources');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.from(new Set([...defaultSources, ...parsed]));
      }
    } catch (e) {}
    return defaultSources;
  });

  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceInput, setNewSourceInput] = useState('');

  const handleAddNewSource = () => {
    const trimmed = newSourceInput.trim();
    if (!trimmed) return;
    if (!sourcesList.includes(trimmed)) {
      const updated = [...sourcesList, trimmed];
      setSourcesList(updated);
      try {
        const customOnly = updated.filter((s) => !defaultSources.includes(s));
        localStorage.setItem('sales_crm_custom_sources', JSON.stringify(customOnly));
      } catch (e) {}
    }
    setFormData((prev) => ({ ...prev, source: trimmed }));
    setNewSourceInput('');
    setIsAddingSource(false);
  };

  const entityTabs = [
    { id: 'lead', label: 'Lead', icon: Users },
    { id: 'deal', label: 'Opportunity', icon: Briefcase },
    { id: 'task', label: 'Task', icon: CheckSquare },
    { id: 'followup', label: 'Follow-up', icon: Clock },
    { id: 'contact', label: 'Contact', icon: UserCheck },
    { id: 'database', label: 'Database', icon: Database },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (entityType === 'lead') {
        if (!formData.firstName) throw new Error('First Name is required');
        if (!formData.phone) throw new Error('Phone Number is required');
        await leadsService.createLead({
          ...formData,
          address: {
            street: formData.street || '',
            city: formData.city || '',
            state: formData.state || '',
            country: formData.country || 'India',
            postalCode: formData.postalCode || '',
          },
        });
      } else if (entityType === 'deal') {
        if (!formData.title) throw new Error('Opportunity Title is required');
        await dealsService.createDeal({
          ...formData,
          value: Number(formData.value) || 100000,
          expectedCloseDate: formData.expectedCloseDate || new Date(Date.now() + 30 * 86400000),
        });
      } else if (entityType === 'task') {
        if (!formData.title) throw new Error('Task title is required');
        await tasksService.createTask({
          ...formData,
          dueDate: formData.dueDate || new Date(Date.now() + 86400000),
        });
      } else if (entityType === 'followup') {
        if (!formData.title) throw new Error('Follow-up title is required');
        await followUpsService.createFollowUp({
          ...formData,
          scheduledDate: formData.scheduledDate || new Date(Date.now() + 86400000),
        });
      } else if (entityType === 'contact') {
        if (!formData.firstName) throw new Error('First name is required');
        await contactsService.createContact(formData);
      } else if (entityType === 'database') {
        if (!formData.companyName) throw new Error('Company Name is required');
        const userFullName =
          [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
          user?.name ||
          user?.email ||
          'User';
        const selectedSource = (formData.source || 'Website').trim();
        const selectedStatus = (formData.status || 'New').trim();
        const newRecord = {
          id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          companyName: (formData.companyName || '').trim(),
          contactPerson: (formData.contactPerson || '').trim(),
          designation: (formData.designation || '').trim(),
          mobileNo: (formData.mobileNo || formData.phone || '').trim(),
          emailId: (formData.emailId || formData.email || '').trim(),
          industry: (formData.industry || '').trim(),
          source: selectedSource,
          leadSource: selectedSource,
          status: selectedStatus,
          leadStatus: selectedStatus,
          rating: (formData.rating || '').trim(),
          address: (formData.address || '').trim(),
          remarks: (formData.remarks || '').trim(),
          date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
          importedBy: userFullName,
        };

        await dataService.syncImportData([newRecord]);
        try {
          const STORAGE_KEY = 'crm_imported_excel_records';
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          const updated = [newRecord, ...existing];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('crm:import-data-updated'));
        toast.success(`"${newRecord.companyName}" added to Database successfully!`);
      }

      setFormData({});
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Create"
      subtitle="Instantly add a new record to your sales pipeline"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Save Record
          </Button>
        </>
      }
    >
      {/* Entity Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-slate-100 rounded-xl mb-5">
        {entityTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = entityType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setEntityType(tab.id);
                setFormData({});
                setError(null);
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
          {error}
        </div>
      )}

      {/* Form Fields based on Type */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {entityType === 'lead' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="e.g. Rahul"
              />
              <Input
                label="Last Name"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="e.g. Verma"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="rahul@company.com"
              />
              <Input
                label="Phone Number"
                required
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 98200 12345"
              />
            </div>
            <Input
              label="Company Name"
              value={formData.companyName || ''}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="e.g. Acme FinTech India"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City / Location"
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="e.g. Bengaluru"
              />
              <Input
                label="Street / Area"
                value={formData.street || ''}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder="e.g. Indiranagar, 100ft Rd"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Select
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Lead Source</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingSource(true)}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer normal-case"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Source
                      </button>
                    </div>
                  }
                  value={formData.source || 'Website'}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingSource(true);
                    } else {
                      handleInputChange('source', e.target.value);
                    }
                  }}
                >
                  {sourcesList.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                  <option value="__add_new__" className="font-semibold text-indigo-600 bg-indigo-50">
                    + Add New Source...
                  </option>
                </Select>

                {isAddingSource && (
                  <div className="p-3 bg-gradient-to-b from-indigo-50/90 to-slate-50 border border-indigo-200 rounded-xl shadow-xs space-y-2 mt-2">
                    <span className="text-[11px] font-bold text-indigo-950 block">
                      New Lead Source
                    </span>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      placeholder="e.g. Trade Expo, YouTube"
                      value={newSourceInput}
                      onChange={(e) => setNewSourceInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewSource();
                        } else if (e.key === 'Escape') {
                          setIsAddingSource(false);
                          setNewSourceInput('');
                        }
                      }}
                    />
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setIsAddingSource(false);
                          setNewSourceInput('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        type="button"
                        onClick={handleAddNewSource}
                        className="px-3 py-1 font-semibold"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Input
                label="Est. Value (₹)"
                type="number"
                value={formData.estimatedValue || ''}
                onChange={(e) => handleInputChange('estimatedValue', e.target.value)}
                placeholder="500000"
              />
            </div>
          </>
        )}

        {entityType === 'deal' && (
          <>
            <Input
              label="Opportunity Title"
              required
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. TechCorp CRM Expansion"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Deal Value (₹)"
                type="number"
                required
                value={formData.value || ''}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="750000"
              />
              <Select
                label="Initial Stage"
                value={formData.stage || 'Qualified'}
                onChange={(e) => handleInputChange('stage', e.target.value)}
                options={[
                  { value: 'New Lead', label: 'New Lead (10%)' },
                  { value: 'Contacted', label: 'Contacted (25%)' },
                  { value: 'Qualified', label: 'Qualified (40%)' },
                  { value: 'Discovery & Demo', label: 'Discovery & Demo (60%)' },
                  { value: 'Negotiation', label: 'Negotiation (80%)' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Expected Close Date"
                type="date"
                value={formData.expectedCloseDate || ''}
                onChange={(e) => handleInputChange('expectedCloseDate', e.target.value)}
              />
              <Select
                label="Priority"
                value={formData.priority || 'Medium'}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Urgent', label: 'Urgent' },
                ]}
              />
            </div>
          </>
        )}

        {entityType === 'task' && (
          <>
            <Input
              label="Task Title"
              required
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Send revised commercial proposal"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Due Date"
                type="date"
                required
                value={formData.dueDate || ''}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
              <Select
                label="Priority"
                value={formData.priority || 'Medium'}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Urgent', label: 'Urgent' },
                ]}
              />
            </div>
          </>
        )}

        {entityType === 'followup' && (
          <>
            <Input
              label="Follow-up Title"
              required
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Check procurement review status"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Scheduled Date & Time"
                type="datetime-local"
                required
                value={formData.scheduledDate || ''}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
              />
              <Select
                label="Type"
                value={formData.type || 'call'}
                onChange={(e) => handleInputChange('type', e.target.value)}
                options={[
                  { value: 'call', label: 'Phone Call' },
                  { value: 'email', label: 'Email' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'meeting', label: 'Meeting' },
                ]}
              />
            </div>
          </>
        )}

        {entityType === 'contact' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                required
                value={formData.firstName || ''}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Rohan"
              />
              <Input
                label="Last Name"
                value={formData.lastName || ''}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Deshmukh"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="rohan@enterprise.in"
              />
              <Input
                label="Phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 98111 22334"
              />
            </div>
            <Input
              label="Job Title"
              value={formData.jobTitle || ''}
              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
              placeholder="Director of Sales"
            />
          </>
        )}

        {entityType === 'database' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Company Name"
                required
                value={formData.companyName || ''}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="e.g. Acme FinTech India"
              />
              <Input
                label="Contact Person"
                value={formData.contactPerson || ''}
                onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                placeholder="e.g. Rahul Verma"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Designation / Job Title"
                value={formData.designation || ''}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                placeholder="e.g. VP Sales"
              />
              <Input
                label="Industry"
                value={formData.industry || ''}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                placeholder="e.g. Real Estate, IT, Finance"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Mobile No"
                value={formData.mobileNo || ''}
                onChange={(e) => handleInputChange('mobileNo', e.target.value)}
                placeholder="+91 98200 12345"
              />
              <Input
                label="Email ID"
                type="email"
                value={formData.emailId || ''}
                onChange={(e) => handleInputChange('emailId', e.target.value)}
                placeholder="rahul@company.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Select
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Source</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingSource(true)}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer normal-case"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Source
                      </button>
                    </div>
                  }
                  value={formData.source || 'Website'}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsAddingSource(true);
                    } else {
                      handleInputChange('source', e.target.value);
                    }
                  }}
                >
                  {sourcesList.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                  <option value="__add_new__" className="font-semibold text-indigo-600 bg-indigo-50">
                    + Add New Source...
                  </option>
                </Select>

                {isAddingSource && (
                  <div className="p-3 bg-gradient-to-b from-indigo-50/90 to-slate-50 border border-indigo-200 rounded-xl shadow-xs space-y-2 mt-2">
                    <span className="text-[11px] font-bold text-indigo-950 block">
                      New Source
                    </span>
                    <input
                      type="text"
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      placeholder="e.g. Trade Expo, YouTube"
                      value={newSourceInput}
                      onChange={(e) => setNewSourceInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewSource();
                        } else if (e.key === 'Escape') {
                          setIsAddingSource(false);
                          setNewSourceInput('');
                        }
                      }}
                    />
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setIsAddingSource(false);
                          setNewSourceInput('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        type="button"
                        onClick={handleAddNewSource}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Select
                label="Status"
                value={formData.status || 'New'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'New', label: 'New' },
                  { value: 'Interested', label: 'Interested' },
                  { value: 'Not Interested', label: 'Not Interested' },
                  { value: 'Callback Requested', label: 'Callback Requested' },
                  { value: 'Not picking', label: 'Not picking' },
                  { value: 'Did not turn up', label: 'Did not turn up' },
                  { value: 'Meeting Scheduled', label: 'Meeting Scheduled' },
                  { value: 'Lost', label: 'Lost' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Rating"
                value={formData.rating || ''}
                onChange={(e) => handleInputChange('rating', e.target.value)}
                placeholder="e.g. 4.5"
              />
              <Input
                label="Date"
                type="date"
                value={formData.date || new Date().toISOString().split('T')[0]}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </div>
            <Input
              label="Address / Location"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="e.g. Unit 402, Cyber City, Gurugram"
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={formData.remarks || ''}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                placeholder="Additional notes or remarks..."
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
