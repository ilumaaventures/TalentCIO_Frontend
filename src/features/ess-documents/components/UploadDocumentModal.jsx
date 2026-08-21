import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, ChevronDown, Loader, FileText, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadDocument } from '../api/essDocumentApi';
import UserMultiSelect from '@/components/common/UserMultiSelect';
import api from '@/lib/apiClient';

const CATEGORIES = ['Policy', 'Form', 'Circular', 'Other'];
const MAX_FILE_MB = 5;
const MAX_FILES = 10;
const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/webp'
]);

const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UploadDocumentModal = ({ onClose, onSuccess }) => {
    const [form, setForm] = useState({
        title: '', description: '', category: 'Policy',
        requiresAcknowledgement: false,
        visibilityType: 'All'
    });
    const [files, setFiles]             = useState([]);
    const [dragging, setDragging]       = useState(false);
    const [submitting, setSubmitting]   = useState(false);
    const [errors, setErrors]           = useState({});
    const [allUsers, setAllUsers]       = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [allDepts, setAllDepts]       = useState([]);
    const [selectedDepts, setSelectedDepts] = useState([]);
    const fileInputRef = useRef(null);

    // Load users for Custom visibility picker
    useEffect(() => {
        api.get('/admin/users')
            .then(res => setAllUsers(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
            .catch(() => {});
        api.get('/admin/users?select=department')
            .then(res => {
                const users = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                const depts = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
                setAllDepts(depts);
            })
            .catch(() => {});
    }, []);

    const addFiles = (newFiles) => {
        if (!newFiles || newFiles.length === 0) return;
        const valid = [];
        for (const f of newFiles) {
            if (files.length + valid.length >= MAX_FILES) {
                toast.error(`Maximum of ${MAX_FILES} documents can be uploaded at once.`);
                break;
            }
            if (!ALLOWED_MIME.has(f.type)) {
                toast.error(`"${f.name}" is not supported. Use PDF, Word, Excel, or images.`);
                continue;
            }
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                toast.error(`"${f.name}" exceeds ${MAX_FILE_MB} MB limit.`);
                continue;
            }
            valid.push(f);
        }
        if (valid.length > 0) {
            setFiles(prev => [...prev, ...valid]);
            // If only 1 file and title is empty, prefill title from filename
            if (files.length === 0 && valid.length === 1 && !form.title.trim()) {
                const cleanName = valid[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                setForm(p => ({ ...p, title: cleanName }));
            }
            setErrors(prev => ({ ...prev, file: null }));
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const validate = () => {
        const e = {};
        if (files.length === 0) e.file = 'Please select at least one document to upload.';
        if (files.length === 1 && !form.title.trim()) e.title = 'Document title is required.';
        if (form.visibilityType === 'Custom' && selectedUserIds.length === 0) e.visibility = 'Select at least one employee.';
        if (form.visibilityType === 'Department' && selectedDepts.length === 0) e.visibility = 'Select at least one department.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const fd = new FormData();
        files.forEach(f => fd.append('files', f));
        if (files[0]) fd.append('file', files[0]);

        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('category', form.category);
        fd.append('requiresAcknowledgement', String(form.requiresAcknowledgement));
        fd.append('visibilityType', form.visibilityType);
        if (form.visibilityType === 'Department') {
            selectedDepts.forEach(d => fd.append('targetDepartments', d));
        }
        if (form.visibilityType === 'Custom') {
            selectedUserIds.forEach(id => fd.append('targetUserIds', id));
        }

        try {
            setSubmitting(true);
            const res = await uploadDocument(fd);
            const msg = res.data?.message || (files.length > 1 ? `${files.length} documents published successfully!` : 'Document published successfully!');
            toast.success(msg);
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to publish documents.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = (field) =>
        `w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
        ${errors[field] ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm px-0 sm:px-4 py-0 sm:py-8 animate-in fade-in duration-150"
        >
            <div className="w-full sm:max-w-xl max-h-[95vh] flex flex-col bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Upload Company Documents</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Publish single or multiple policies, circulars, and forms</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/70 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {/* Document Upload Area */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                Documents * <span className="font-normal text-slate-400">(Max {MAX_FILES} files)</span>
                            </label>
                            {files.length > 0 && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                    {files.length} selected
                                </span>
                            )}
                        </div>

                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => { e.preventDefault(); setDragging(false); addFiles([...e.dataTransfer.files]); }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all
                                ${dragging ? 'border-indigo-500 bg-indigo-50/60' : errors.file ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                                onChange={e => addFiles([...e.target.files])}
                            />
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs text-indigo-600 border border-slate-200">
                                <Upload size={20} />
                            </div>
                            <p className="text-sm font-semibold text-slate-800">
                                Drag & drop or <span className="text-indigo-600 underline underline-offset-2">browse files</span>
                            </p>
                            <p className="text-xs text-slate-400">PDF, Word, Excel, Image — up to {MAX_FILE_MB} MB each</p>
                        </div>
                        {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}

                        {/* Selected Files List */}
                        {files.length > 0 && (
                            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-indigo-600">
                                                <FileText size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-slate-800">{f.name}</p>
                                                <p className="text-[10px] text-slate-400">{formatBytes(f.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                            title="Remove file"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                            {files.length > 1 ? 'Document Group / Title Prefix (Optional)' : 'Document Title *'}
                        </label>
                        <input
                            type="text"
                            maxLength={160}
                            placeholder={files.length > 1 ? 'e.g. Company Circular 2026 (Optional)' : 'e.g. Leave Policy 2026'}
                            className={inputClass('title')}
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        />
                        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                        {files.length > 1 && (
                            <p className="mt-1 text-[11px] text-slate-400">
                                Each file will be published as an individual document using its filename (or title prefix if provided).
                            </p>
                        )}
                    </div>

                    {/* Category + Acknowledgement */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Category</label>
                            <div className="relative">
                                <select
                                    className={`${inputClass('category')} appearance-none pr-8 bg-white`}
                                    value={form.category}
                                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:border-indigo-300 transition-colors">
                                <div className={`h-5 w-5 flex items-center justify-center rounded-md border-2 transition-all
                                    ${form.requiresAcknowledgement ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                    {form.requiresAcknowledgement && (
                                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={form.requiresAcknowledgement}
                                    onChange={e => setForm(p => ({ ...p, requiresAcknowledgement: e.target.checked }))}
                                />
                                <span className="text-xs font-semibold text-slate-700">Requires acknowledgement</span>
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Description</label>
                        <textarea
                            rows={2}
                            maxLength={1000}
                            placeholder="Brief summary of this document (optional)..."
                            className={`${inputClass('description')} resize-none`}
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>

                    {/* Visibility */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Audience</label>
                        <div className="flex gap-2 flex-wrap">
                            {['All', 'Department', 'Custom'].map(v => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, visibilityType: v }))}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all border
                                        ${form.visibilityType === v
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                >
                                    {v === 'All' ? '🌐 All Employees' : v === 'Department' ? '🏢 By Department' : '👥 Custom'}
                                </button>
                            ))}
                        </div>

                        {form.visibilityType === 'Department' && (
                            <div className="mt-3">
                                <div className="flex flex-wrap gap-2">
                                    {allDepts.map(d => (
                                        <label
                                            key={d}
                                            className={`cursor-pointer flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all
                                                ${selectedDepts.includes(d) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={selectedDepts.includes(d)}
                                                onChange={() => setSelectedDepts(prev =>
                                                    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                                                )}
                                            />
                                            {d}
                                        </label>
                                    ))}
                                </div>
                                {errors.visibility && <p className="mt-1 text-xs text-red-600">{errors.visibility}</p>}
                            </div>
                        )}

                        {form.visibilityType === 'Custom' && (
                            <div className="mt-3">
                                <UserMultiSelect
                                    users={allUsers}
                                    selectedUserIds={selectedUserIds}
                                    onChange={setSelectedUserIds}
                                    placeholder="Select specific employees..."
                                />
                                {errors.visibility && <p className="mt-1 text-xs text-red-600">{errors.visibility}</p>}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || files.length === 0}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-all"
                    >
                        {submitting && <Loader size={15} className="animate-spin" />}
                        {submitting
                            ? 'Publishing...'
                            : files.length > 1
                                ? `Publish ${files.length} Documents`
                                : 'Publish Document'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadDocumentModal;
