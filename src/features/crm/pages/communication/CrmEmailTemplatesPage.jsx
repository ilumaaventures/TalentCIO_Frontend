import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  FileText,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { crmEmailTemplateService } from '../../services/crmApi';
import {
  CRM_EMAIL_TEMPLATE_PLACEHOLDERS,
  renderTemplateBody,
  resolveTemplate,
  validateTemplateSyntax,
  getSupportedPlaceholderTokens
} from '@/features/email/utils/templatePlaceholders';

const CRM_SAMPLE_DATA = {
  companyName: 'Apex Infotech Ltd',
  contactPerson: 'Vikram Malhotra',
  firstName: 'Vikram',
  lastName: 'Malhotra',
  fullName: 'Vikram Malhotra',
  email: 'vikram.m@apexinfo.com',
  emailId: 'vikram.m@apexinfo.com',
  mobileNo: '+91 98201 54321',
  phoneNumber: '+91 98201 54321',
  phone: '+91 98201 54321',
  designation: 'VP of Human Resources',
  industry: 'Information Technology & Services',
  address: 'DLF Cyber City, Tower 4B, Gurugram, India',
  rating: '5',
  status: 'Qualified Prospect',
  leadStatus: 'Qualified Prospect',
  source: 'Website Lead',
  leadSource: 'Website Lead',
  remarks: 'Evaluating enterprise HRMS and payroll automation solutions.',
  senderName: 'Sales Director',
  senderEmail: 'sales@talentcio.in',
  senderPhone: '+91 80000 12345',
  senderCompany: 'TalentCIO Solutions',
  senderDesignation: 'Enterprise Account Executive',
  senderRole: 'Sales Specialist',
  meetingLink: 'https://meet.talentcio.in/demo-session',
  proposalDetails: 'Enterprise Tier - 500 Employee Licenses with On-prem & Cloud Dual Deployment and Dedicated SLA.',
  customNote: 'As agreed in our call, please find the product overview and pilot proposal below.',
  currentDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  currentYear: String(new Date().getFullYear())
};

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'sales_pitch', label: 'Sales Pitch' },
  { id: 'meeting_invite', label: 'Demo / Meeting Invite' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'quote_proposal', label: 'Quote / Proposal' },
  { id: 'cold_outreach', label: 'Cold Outreach' },
  { id: 'general', label: 'General' },
];

const DEFAULT_FORM = {
  name: '',
  category: 'sales_pitch',
  subject: '',
  htmlBody: '',
  isActive: true,
};

const TemplateEditorModal = ({ isOpen, template, onClose, onSaved, canManage }) => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      template
        ? {
            name: template.name || '',
            category: template.category || 'sales_pitch',
            subject: template.subject || '',
            htmlBody: template.htmlBody || '',
            isActive: template.isActive !== false,
          }
        : DEFAULT_FORM
    );
  }, [isOpen, template]);

  const insertPlaceholder = (field, placeholder) => {
    const token = `{{${placeholder}}}`;
    const ref = field === 'subject' ? subjectRef.current : bodyRef.current;

    if (!ref) {
      setForm((prev) => ({ ...prev, [field]: `${prev[field]}${token}` }));
      return;
    }

    const start = ref.selectionStart ?? ref.value.length;
    const end = ref.selectionEnd ?? ref.value.length;

    setForm((prev) => ({
      ...prev,
      [field]: `${prev[field].slice(0, start)}${token}${prev[field].slice(end)}`,
    }));

    window.requestAnimationFrame(() => {
      ref.focus();
      const nextPos = start + token.length;
      ref.setSelectionRange(nextPos, nextPos);
    });
  };

  const previewSubject = useMemo(
    () => resolveTemplate(form.subject, CRM_SAMPLE_DATA),
    [form.subject]
  );
  const previewHtml = useMemo(
    () => renderTemplateBody(form.htmlBody, CRM_SAMPLE_DATA),
    [form.htmlBody]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;

    if (!form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
      toast.error('Template Name, Subject, and Email Body are required.');
      return;
    }

    const subjectValidation = validateTemplateSyntax(form.subject, CRM_EMAIL_TEMPLATE_PLACEHOLDERS);
    if (!subjectValidation.valid) {
      toast.error(`Subject syntax error: ${subjectValidation.message}`);
      return;
    }

    const bodyValidation = validateTemplateSyntax(form.htmlBody, CRM_EMAIL_TEMPLATE_PLACEHOLDERS);
    if (!bodyValidation.valid) {
      toast.error(`Body syntax error: ${bodyValidation.message}`);
      return;
    }

    try {
      setSaving(true);
      if (template?._id) {
        await crmEmailTemplateService.updateTemplate(template._id, form);
        toast.success('Sales email template updated');
      } else {
        await crmEmailTemplateService.createTemplate(form);
        toast.success('Sales email template created');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Failed to save template', error);
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Sales CRM Communication</p>
              <h3 className="text-lg font-bold text-slate-900">{template ? 'Edit Email Template' : 'Create Sales Email Template'}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="grid gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Form Fields */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Solution Pitch"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                >
                  <option value="sales_pitch">Sales Pitch</option>
                  <option value="meeting_invite">Demo / Meeting Invite</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="quote_proposal">Quote / Proposal</option>
                  <option value="cold_outreach">Cold Outreach</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            {/* Subject Line Field */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Email Subject *</label>
                <span className="text-[10px] text-slate-400 font-medium">Click a variable below to insert</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {['companyName', 'contactPerson', 'designation', 'senderCompany', 'industry'].map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertPlaceholder('subject', placeholder)}
                    className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    {`{{${placeholder}}}`}
                  </button>
                ))}
              </div>
              <input
                ref={subjectRef}
                type="text"
                required
                placeholder="e.g. Solution Overview for {{companyName}}"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Email Body Field */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Email Body (HTML / Formatted Text) *</label>
                <span className="text-[10px] text-slate-400 font-medium">Auto-formats line breaks & supports HTML</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {CRM_EMAIL_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertPlaceholder('htmlBody', placeholder)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                  >
                    {`{{${placeholder}}}`}
                  </button>
                ))}
              </div>
              <textarea
                ref={bodyRef}
                rows={12}
                required
                value={form.htmlBody}
                onChange={(e) => setForm((prev) => ({ ...prev, htmlBody: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                placeholder="Write your email template message. You can use standard HTML or normal text formatting."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Template Status</p>
                <p className="text-[11px] text-slate-400">Active templates appear in the CRM email composer selector.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Right Column: Real-time Live Preview */}
          <div className="space-y-4">
            <div className="sticky top-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Client Preview</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Realtime
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolved Subject</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-900 break-words">
                    {previewSubject || <span className="text-slate-400 italic">Subject will appear here...</span>}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Resolved Email Body</p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 max-h-[380px] overflow-y-auto text-xs text-slate-800 leading-relaxed">
                    <div
                      className="prose prose-sm max-w-none text-xs text-slate-800"
                      dangerouslySetInnerHTML={{
                        __html: previewHtml || '<p class="text-slate-400 italic">Body preview will appear here...</p>',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200/70 p-3 text-[11px] text-amber-900 leading-normal flex items-start gap-2">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Dynamic variables like <code className="font-bold bg-amber-100/80 px-1 py-0.5 rounded text-[10px] text-amber-950">&#123;&#123;companyName&#125;&#125;</code> will be automatically replaced with the prospect's actual data when composing an email.
                </span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="lg:col-span-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canManage}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export const CrmEmailTemplatesPage = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const canManage =
    user?.roles?.some((r) => ['Admin', 'Super Admin', 'System Admin'].includes(r)) ||
    user?.permissions?.includes('crm.growth.manage') ||
    user?.permissions?.includes('crm.communication.send') ||
    user?.permissions?.includes('crm.admin') ||
    user?.permissions?.includes('*');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await crmEmailTemplateService.getTemplates();
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch CRM templates', error);
      toast.error('Failed to load CRM email templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleArchive = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete/archive this CRM email template?')) return;
    try {
      await crmEmailTemplateService.deleteTemplate(templateId);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template', error);
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await crmEmailTemplateService.updateTemplate(template._id, {
        isActive: !template.isActive,
      });
      fetchTemplates();
      toast.success(`Template marked as ${!template.isActive ? 'Active' : 'Archived'}`);
    } catch (error) {
      console.error('Failed to toggle status', error);
      toast.error(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Mail size={16} />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Sales Email Templates</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create and maintain tailored outreach, follow-up, pitch, and demo email templates for Sales CRM.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus size={16} />
            <span>New Template</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Table / Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Template Details</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Subject Line</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-medium">
                    Loading CRM email templates...
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No email templates found</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {searchQuery ? 'Try changing your search terms' : 'Click "New Template" above to create your first CRM email template.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tmpl) => (
                  <tr key={tmpl._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{tmpl.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Updated {new Date(tmpl.updatedAt || tmpl.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {tmpl.category?.replace(/_/g, ' ') || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate font-medium text-slate-700">
                      {tmpl.subject}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => handleToggleActive(tmpl)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                          tmpl.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tmpl.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{tmpl.isActive ? 'Active' : 'Archived'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <button
                            type="button"
                            title="Edit template"
                            onClick={() => {
                              setEditingTemplate(tmpl);
                              setEditorOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            title="Delete template"
                            onClick={() => handleArchive(tmpl._id)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TemplateEditorModal
        isOpen={editorOpen}
        template={editingTemplate}
        onClose={() => setEditorOpen(false)}
        onSaved={fetchTemplates}
        canManage={canManage}
      />
    </div>
  );
};

export default CrmEmailTemplatesPage;
