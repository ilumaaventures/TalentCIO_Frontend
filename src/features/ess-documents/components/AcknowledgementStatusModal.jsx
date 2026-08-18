import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle2, Clock, Search, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { getDocumentAcknowledgements } from '../api/essDocumentApi';
import toast from 'react-hot-toast';

/**
 * Directly mirrors AnnouncementReadStatusModal.jsx — same layout, same data shape,
 * different data source (ESS Document instead of Announcement).
 */
const AcknowledgementStatusModal = ({ documentId, documentTitle, onClose }) => {
    const [data, setData]           = useState({ read: [], unread: [] });
    const [loading, setLoading]     = useState(true);
    const [activeTab, setActiveTab] = useState('read');
    const [search, setSearch]       = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getDocumentAcknowledgements(documentId);
                setData(res.data || { read: [], unread: [] });
            } catch {
                toast.error('Failed to load acknowledgement report.');
            } finally {
                setLoading(false);
            }
        };
        if (documentId) fetch();
    }, [documentId]);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose(); };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', h);
        return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', h); };
    }, [onClose]);

    const list = (activeTab === 'read' ? data.read : data.unread) || [];
    const total = (data.read?.length || 0) + (data.unread?.length || 0);
    const pct   = total > 0 ? Math.round(((data.read?.length || 0) / total) * 100) : 0;

    const filtered = search.trim()
        ? list.filter(item => {
            const u = item.user;
            if (!u) return false;
            const q = search.toLowerCase();
            return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                   (u.email || '').toLowerCase().includes(q) ||
                   (u.department || '').toLowerCase().includes(q);
          })
        : list;

    const Avatar = ({ user }) => (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 text-sm font-bold">
            {user?.profilePicture
                ? <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                : (user?.firstName?.charAt(0) || '?')}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Users size={18} /></div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Acknowledgement Report</h2>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">{documentTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center py-16">
                        <Loader size={28} className="animate-spin text-blue-500" />
                    </div>
                ) : (
                    <>
                        {/* Progress bar */}
                        <div className="px-6 py-5 border-b border-slate-50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700">{pct}% acknowledged</span>
                                <span className="text-xs text-slate-400">{data.read?.length || 0} of {total} employees</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 px-6">
                            <button
                                onClick={() => setActiveTab('read')}
                                className={`flex items-center gap-2 pb-3 pt-4 text-sm font-semibold border-b-2 mr-6 transition-colors
                                    ${activeTab === 'read' ? 'border-green-500 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <CheckCircle2 size={15} />
                                Read ({data.read?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('unread')}
                                className={`flex items-center gap-2 pb-3 pt-4 text-sm font-semibold border-b-2 transition-colors
                                    ${activeTab === 'unread' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Clock size={15} />
                                Unread ({data.unread?.length || 0})
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-3 border-b border-slate-50">
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or department..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {filtered.length === 0 ? (
                                <p className="py-10 text-center text-sm text-slate-400">No employees found.</p>
                            ) : (
                                <div className="space-y-2">
                                    {filtered.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-50 bg-slate-50/50 px-4 py-3">
                                            <Avatar user={item.user} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {item.user?.firstName} {item.user?.lastName}
                                                </p>
                                                <p className="truncate text-xs text-slate-400">{item.user?.department} · {item.user?.email}</p>
                                            </div>
                                            {activeTab === 'read' && item.acknowledgedAt && (
                                                <div className="text-right shrink-0">
                                                    <CheckCircle2 size={14} className="text-green-500 ml-auto mb-0.5" />
                                                    <p className="text-[10px] text-slate-400">{format(new Date(item.acknowledgedAt), 'dd MMM, h:mm a')}</p>
                                                </div>
                                            )}
                                            {activeTab === 'unread' && (
                                                <Clock size={14} className="shrink-0 text-amber-400" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AcknowledgementStatusModal;
