import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Download, CheckCircle2, Clock, Plus, Search, Users,
    Loader, RefreshCw, Trash2, ExternalLink, FileStack, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getEmployeeDocuments, getAdminDocuments, acknowledgeDocument, deleteDocument } from '../api/essDocumentApi';
import UploadDocumentModal from '../components/UploadDocumentModal';
import AcknowledgementStatusModal from '../components/AcknowledgementStatusModal';

const CATEGORIES = ['All', 'Policy', 'Form', 'Circular', 'Other'];

const CATEGORY_STYLES = {
    Policy:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    Form:     { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    Circular: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
    Other:    { bg: 'bg-slate-50',  text: 'text-slate-500',  border: 'border-slate-200'  }
};

const BadgeCat = ({ cat }) => {
    const s = CATEGORY_STYLES[cat] || CATEGORY_STYLES['Other'];
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text} ${s.border}`}>{cat}</span>
    );
};

const DocumentCard = ({ doc, isAdmin, onAcknowledge, onViewReport, onDelete }) => {
    const [acking, setAcking] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleAck = async () => {
        setAcking(true);
        try {
            await acknowledgeDocument(doc._id);
            toast.success('Document acknowledged!');
            onAcknowledge?.(doc._id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to acknowledge.');
        } finally {
            setAcking(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteDocument(doc._id);
            toast.success('Document deleted.');
            onDelete?.(doc._id);
        } catch {
            toast.error('Failed to delete document.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className={`rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${doc.requiresAcknowledgement && !doc.viewerAcknowledged && !isAdmin ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'}`}>
            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm leading-snug truncate">{doc.title}</p>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <BadgeCat cat={doc.category} />
                                {doc.requiresAcknowledgement && (
                                    <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Acknowledgement required</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Read status */}
                    {!isAdmin && doc.requiresAcknowledgement && doc.viewerAcknowledged && (
                        <div className="flex items-center gap-1 shrink-0 text-green-600">
                            <CheckCircle2 size={15} />
                            <span className="text-xs font-semibold">Acknowledged</span>
                        </div>
                    )}
                    {isAdmin && doc.requiresAcknowledgement && (
                        <button
                            onClick={() => onViewReport?.(doc)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors shrink-0"
                        >
                            <Users size={12} /> {doc.acknowledgedCount ?? 0} read
                        </button>
                    )}
                </div>

                {doc.description && (
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2">{doc.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-50 pt-3 flex-wrap">
                    <p className="text-xs text-slate-400">
                        {doc.createdAt ? format(new Date(doc.createdAt), 'dd MMM yyyy') : ''}
                        {doc.uploadedBy?.firstName && <> · by {doc.uploadedBy.firstName} {doc.uploadedBy.lastName || ''}</>}
                    </p>

                    <div className="flex items-center gap-2">
                        {/* View / Download */}
                        {doc.file?.url && (
                            <a href={doc.file.url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors">
                                <ExternalLink size={12} /> View
                            </a>
                        )}

                        {/* Acknowledge */}
                        {!isAdmin && doc.requiresAcknowledgement && !doc.viewerAcknowledged && (
                            <button
                                onClick={handleAck}
                                disabled={acking}
                                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                            >
                                {acking ? <Loader size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                Mark as Read
                            </button>
                        )}

                        {/* Admin delete */}
                        {isAdmin && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-1 rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                            >
                                {deleting ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CompanyDocuments = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.roles?.some(r => ['Admin', 'HR Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('ess_document.manage') || user?.permissions?.includes('*');

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [catFilter, setCatFilter] = useState('All');
    const [search, setSearch]       = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [ackReport, setAckReport]   = useState(null); // { _id, title }

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = isAdmin
                ? await getAdminDocuments({ category: catFilter !== 'All' ? catFilter : undefined })
                : await getEmployeeDocuments({ category: catFilter !== 'All' ? catFilter : undefined });
            setDocuments(res.data?.documents || []);
        } catch {
            toast.error('Failed to load documents.');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, catFilter]);

    useEffect(() => { load(); }, [load]);

    const handleAcknowledged = (id) => {
        setDocuments(prev => prev.map(d => d._id === id ? { ...d, viewerAcknowledged: true } : d));
    };

    const handleDeleted = (id) => {
        setDocuments(prev => prev.filter(d => d._id !== id));
    };

    const filtered = search.trim()
        ? documents.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()))
        : documents;

    const unreadCount = isAdmin ? 0 : documents.filter(d => d.requiresAcknowledgement && !d.viewerAcknowledged).length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-100 bg-white px-6 py-4">
                <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/profile?tab=company-documents')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 shrink-0"
                            aria-label="Back to Profile"
                            title="Back to Profile"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                Company Documents
                                {unreadCount > 0 && (
                                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{unreadCount} unread</span>
                                )}
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">Policies, forms, and circulars from HR & Admin</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50">
                            <RefreshCw size={16} />
                        </button>
                        {isAdmin && (
                            <button onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors">
                                <Plus size={15} /> Upload
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search documents..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {CATEGORIES.map(c => (
                            <button key={c} onClick={() => setCatFilter(c)}
                                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border
                                    ${catFilter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Document list */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                            <FileStack size={24} />
                        </div>
                        <p className="text-base font-semibold text-slate-700">No documents found</p>
                        <p className="mt-1 text-sm text-slate-400">
                            {isAdmin ? 'Upload your first company document to share with employees.' : 'No documents have been published for you yet.'}
                        </p>
                        {isAdmin && (
                            <button onClick={() => setShowUpload(true)}
                                className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                                <Plus size={15} /> Upload Document
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map(d => (
                            <DocumentCard
                                key={d._id}
                                doc={d}
                                isAdmin={isAdmin}
                                onAcknowledge={handleAcknowledged}
                                onViewReport={(doc) => setAckReport({ id: doc._id, title: doc.title })}
                                onDelete={handleDeleted}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showUpload && <UploadDocumentModal onClose={() => setShowUpload(false)} onSuccess={load} />}
            {ackReport && (
                <AcknowledgementStatusModal
                    documentId={ackReport.id}
                    documentTitle={ackReport.title}
                    onClose={() => setAckReport(null)}
                />
            )}
        </div>
    );
};

export default CompanyDocuments;
