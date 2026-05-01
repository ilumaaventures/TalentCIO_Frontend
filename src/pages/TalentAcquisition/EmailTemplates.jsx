import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Eye, Plus, Trash2, X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
    renderTemplateBody,
    TEMPLATE_PLACEHOLDERS,
    resolveTemplate,
    validateTemplateSyntax
} from '../../utils/templatePlaceholders';

const SAMPLE_DATA = {
    candidateName: 'Aarav Mehta',
    email: 'aarav@example.com',
    mobile: '9876543210',
    jobTitle: 'Frontend Engineer',
    client: 'Demo Client',
    department: 'Engineering',
    recruiterName: 'Talent Acquisition Team',
    companyName: 'TalentCIO',
    requestId: 'HRR-2026-001',
    currentStatus: 'Interested',
    interviewDate: '10 May 2026, 04:00 PM',
    interviewLink: 'https://meet.example.com/interview',
    customNote: 'Please join 10 minutes early.'
};

const DEFAULT_FORM = {
    name: '',
    category: 'general',
    subject: '',
    htmlBody: '',
    isActive: true
};

const TemplateEditorModal = ({ isOpen, template, onClose, onSaved, canManage }) => {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const subjectRef = useRef(null);
    const bodyRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setForm(template ? {
            name: template.name || '',
            category: template.category || 'general',
            subject: template.subject || '',
            htmlBody: template.htmlBody || '',
            isActive: template.isActive !== false
        } : DEFAULT_FORM);
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
            [field]: `${prev[field].slice(0, start)}${token}${prev[field].slice(end)}`
        }));

        window.requestAnimationFrame(() => {
            ref.focus();
            const nextPos = start + token.length;
            ref.setSelectionRange(nextPos, nextPos);
        });
    };

    const previewSubject = useMemo(() => resolveTemplate(form.subject, SAMPLE_DATA), [form.subject]);
    const previewHtml = useMemo(() => renderTemplateBody(form.htmlBody, SAMPLE_DATA), [form.htmlBody]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage) return;

        if (!form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
            toast.error('Name, subject, and body are required.');
            return;
        }

        const subjectValidation = validateTemplateSyntax(form.subject, TEMPLATE_PLACEHOLDERS);
        if (!subjectValidation.valid) {
            toast.error(`Subject error: ${subjectValidation.message}`);
            return;
        }

        const bodyValidation = validateTemplateSyntax(form.htmlBody, TEMPLATE_PLACEHOLDERS);
        if (!bodyValidation.valid) {
            toast.error(`HTML body error: ${bodyValidation.message}`);
            return;
        }

        try {
            setSaving(true);
            if (template?._id) {
                await api.put(`/ta/email-templates/${template._id}`, form);
                toast.success('Template updated');
            } else {
                await api.post('/ta/email-templates', form);
                toast.success('Template created');
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/30 bg-slate-50 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Email Template</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-900">{template ? 'Edit template' : 'Create template'}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Category</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="general">General</option>
                                    <option value="interview_invite">Interview Invite</option>
                                    <option value="rejection">Rejection</option>
                                    <option value="offer">Offer</option>
                                    <option value="shortlist">Shortlist</option>
                                </select>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex flex-wrap gap-2">
                                {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                                    <button key={placeholder} type="button" onClick={() => insertPlaceholder('subject', placeholder)} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                        {`{{${placeholder}}}`}
                                    </button>
                                ))}
                            </div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
                            <input
                                ref={subjectRef}
                                type="text"
                                value={form.subject}
                                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex flex-wrap gap-2">
                                {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                                    <button key={placeholder} type="button" onClick={() => insertPlaceholder('htmlBody', placeholder)} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                        {`{{${placeholder}}}`}
                                    </button>
                                ))}
                            </div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Email Body</label>
                            <textarea
                                ref={bodyRef}
                                rows={16}
                                value={form.htmlBody}
                                onChange={(e) => setForm((prev) => ({ ...prev, htmlBody: e.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Write your mail exactly as it should appear. Spaces and blank lines will be preserved."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Eye size={16} className="text-blue-600" />
                                <h4 className="text-sm font-bold text-slate-800">Preview</h4>
                            </div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sample Subject</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{previewSubject || 'Preview subject will appear here'}</p>
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>Preview content will appear here.</p>' }} />
                            </div>
                            <p className="mt-3 text-xs text-slate-500">Plain text-style content keeps its spaces and skipped lines. HTML content still renders as HTML.</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                Active template
                            </label>
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || !canManage} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const EmailTemplates = () => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const canManage = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.email_template.manage') || user?.permissions?.includes('ta.edit');

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await api.get('/ta/email-templates');
            setTemplates(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch templates', error);
            toast.error('Failed to load email templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleArchive = async (templateId) => {
        if (!window.confirm('Archive this email template?')) return;
        try {
            await api.delete(`/ta/email-templates/${templateId}`);
            toast.success('Template archived');
            fetchTemplates();
        } catch (error) {
            console.error('Failed to archive template', error);
            toast.error(error.response?.data?.message || 'Failed to archive template');
        }
    };

    const handleToggleActive = async (template) => {
        try {
            await api.put(`/ta/email-templates/${template._id}`, {
                name: template.name,
                category: template.category,
                subject: template.subject,
                htmlBody: template.htmlBody,
                isActive: !template.isActive
            });
            fetchTemplates();
        } catch (error) {
            console.error('Failed to update template state', error);
            toast.error(error.response?.data?.message || 'Failed to update template');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Email Templates</h1>
                        <p className="mt-1 text-sm text-slate-500">Manage reusable talent acquisition email templates.</p>
                    </div>
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingTemplate(null);
                                setEditorOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            <Plus size={16} />
                            New Template
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Subject</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Active</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">Loading templates...</td>
                                    </tr>
                                ) : templates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No email templates created yet.</td>
                                    </tr>
                                ) : templates.map((template) => (
                                    <tr key={template._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{template.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{template.category}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{template.subject}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                disabled={!canManage}
                                                onClick={() => handleToggleActive(template)}
                                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${template.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                            >
                                                {template.isActive ? 'Active' : 'Archived'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingTemplate(template);
                                                            setEditorOpen(true);
                                                        }}
                                                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleArchive(template._id)}
                                                        className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

export default EmailTemplates;
