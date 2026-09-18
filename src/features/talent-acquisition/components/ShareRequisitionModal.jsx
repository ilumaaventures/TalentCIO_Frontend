import React, { useState, useEffect, useCallback } from 'react';
import { X, Share2, Globe, Trash2, CheckCircle, CheckCircle2, AlertCircle, Loader, Shield, Users, Layers, ExternalLink, Eye, UserCheck } from 'lucide-react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SHARE_OPTIONS = [
    {
        id: 'all',
        title: 'Share All Data',
        description: 'Grants access to full requisition details, all candidate phases (Phase 1, Phase 2, Offer) and public applications.',
        icon: Users,
        color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
        id: 'phase1',
        title: 'Share Phase 1 Data',
        description: 'Grants access to requisition details and candidate sourcing / screening pipeline in Phase 1 only.',
        icon: Layers,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
        id: 'phase2',
        title: 'Share Phase 2 Data',
        description: 'Grants access to requisition details and client-ready / shortlisted candidate pipeline in Phase 2 only.',
        icon: Shield,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
        id: 'public_applications',
        title: 'Share Only Public Applications',
        description: 'Grants access to requisition details and candidates who applied via the public career / job board.',
        icon: Globe,
        color: 'text-purple-600 bg-purple-50 border-purple-200'
    }
];

const ShareRequisitionModal = ({ isOpen, onClose, hiringRequestId, onShareUpdated }) => {
    const [targetUrl, setTargetUrl] = useState('');
    const [shareType, setShareType] = useState('all');
    const [accessLevel, setAccessLevel] = useState('full_access');
    const [submitting, setSubmitting] = useState(false);
    const [loadingShares, setLoadingShares] = useState(false);
    const [shares, setShares] = useState([]);
    const [updatingTenantId, setUpdatingTenantId] = useState(null);

    const fetchShares = useCallback(async () => {
        if (!hiringRequestId) return;
        try {
            setLoadingShares(true);
            const res = await api.get(`/ta/hiring-request/${hiringRequestId}/shares`);
            setShares(res.data?.sharedTenants || []);
        } catch (err) {
            console.error('Failed to fetch requisition shares:', err);
        } finally {
            setLoadingShares(false);
        }
    }, [hiringRequestId]);

    useEffect(() => {
        if (isOpen) {
            fetchShares();
            setTargetUrl('');
            setShareType('all');
            setAccessLevel('full_access');
        }
    }, [isOpen, fetchShares]);

    if (!isOpen) return null;

    const handleShareSubmit = async (e) => {
        e.preventDefault();
        const trimmedUrl = targetUrl.trim();
        if (!trimmedUrl) {
            toast.error('Please enter a workspace URL or subdomain (e.g. rg.talentcio.in or rg)');
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post(`/ta/hiring-request/${hiringRequestId}/share`, {
                targetUrl: trimmedUrl,
                shareType,
                accessLevel
            });
            toast.success(res.data?.message || 'Requisition shared successfully');
            setTargetUrl('');
            setShares(res.data?.sharedTenants || []);
            if (onShareUpdated) onShareUpdated(res.data?.sharedTenants);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || 'Failed to share requisition');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevokeShare = async (companyId, tenantName) => {
        if (!window.confirm(`Revoke shared access for "${tenantName || 'this workspace'}"? They will no longer see this requisition.`)) {
            return;
        }

        try {
            setUpdatingTenantId(companyId);
            const res = await api.delete(`/ta/hiring-request/${hiringRequestId}/share/${companyId}`);
            toast.success(res.data?.message || 'Share access revoked');
            setShares(res.data?.sharedTenants || []);
            if (onShareUpdated) onShareUpdated(res.data?.sharedTenants);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to revoke share');
        } finally {
            setUpdatingTenantId(null);
        }
    };

    const handleUpdateShareType = async (companyId, newShareType) => {
        try {
            setUpdatingTenantId(companyId);
            const res = await api.put(`/ta/hiring-request/${hiringRequestId}/share/${companyId}`, {
                shareType: newShareType
            });
            toast.success(res.data?.message || 'Share scope updated');
            setShares(res.data?.sharedTenants || []);
            if (onShareUpdated) onShareUpdated(res.data?.sharedTenants);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to update scope');
        } finally {
            setUpdatingTenantId(null);
        }
    };

    const handleUpdateAccessLevel = async (companyId, newAccessLevel) => {
        try {
            setUpdatingTenantId(companyId);
            const res = await api.put(`/ta/hiring-request/${hiringRequestId}/share/${companyId}`, {
                accessLevel: newAccessLevel
            });
            toast.success(res.data?.message || 'Access permissions updated');
            setShares(res.data?.sharedTenants || []);
            if (onShareUpdated) onShareUpdated(res.data?.sharedTenants);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to update permissions');
        } finally {
            setUpdatingTenantId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Share2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Share Requisition Across Workspaces</h3>
                            <p className="text-xs text-slate-500">Live multi-tenant sync without data duplication or manual export</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Share Form */}
                    <form onSubmit={handleShareSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Target Workspace URL or Subdomain <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Globe size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="e.g. rg.talentcio.in or rg"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                                Enter the tenant domain (e.g. <span className="font-semibold text-slate-700">rg.talentcio.in</span>) or workspace subdomain (<span className="font-semibold text-slate-700">rg</span>). Works for all tenant workspaces.
                            </p>
                        </div>

                        {/* Scope Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Select Data Sharing Scope <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {SHARE_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const isSelected = shareType === opt.id;
                                    return (
                                        <button
                                            type="button"
                                            key={opt.id}
                                            onClick={() => setShareType(opt.id)}
                                            className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-100'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${opt.color}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                                    {opt.title}
                                                    {isSelected && <CheckCircle size={14} className="text-indigo-600 shrink-0 ml-1" />}
                                                </p>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                                    {opt.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Candidate Access Level (Full Access vs View Only) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Candidate Access Permissions <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setAccessLevel('full_access')}
                                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                                        accessLevel === 'full_access'
                                            ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-100'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                        accessLevel === 'full_access' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                        <UserCheck size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                            Full Access (Can Manage)
                                            {accessLevel === 'full_access' && <CheckCircle size={14} className="text-emerald-600 shrink-0 ml-1" />}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                            Can add candidates, edit profiles, advance stages, schedule interviews, and delete candidates.
                                        </p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAccessLevel('view_only')}
                                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                                        accessLevel === 'view_only'
                                            ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-100'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                        accessLevel === 'view_only' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                        <Eye size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                            View Only (Read-Only)
                                            {accessLevel === 'view_only' && <CheckCircle size={14} className="text-amber-600 shrink-0 ml-1" />}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                            Can only view candidates, details, and resumes. Cannot add, edit, or delete candidates.
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !targetUrl.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {submitting ? <Loader size={16} className="animate-spin" /> : <Share2 size={16} />}
                                {submitting ? 'Sharing Requisition...' : 'Share Requisition'}
                            </button>
                        </div>
                    </form>

                    {/* Active Shares Section */}
                    <div className="pt-5 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>Currently Shared Workspaces</span>
                            <span className="text-[11px] font-semibold text-slate-400 lowercase font-normal">
                                {shares.length} active {shares.length === 1 ? 'workspace' : 'workspaces'}
                            </span>
                        </h4>

                        {loadingShares ? (
                            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Loader size={16} className="animate-spin text-indigo-500" />
                                Loading shared workspaces...
                            </div>
                        ) : shares.length === 0 ? (
                            <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                                <Share2 size={24} className="mx-auto text-slate-300 mb-1.5" />
                                <p className="text-xs font-semibold text-slate-600">Not shared with any external workspaces yet</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Use the form above to grant access to another tenant workspace.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {shares.map((share) => {
                                    const companyId = share.companyId?._id || share.companyId;
                                    const tenantName = share.tenantName || share.companyId?.name || share.tenantSubdomain;
                                    const subdomain = share.tenantSubdomain || share.companyId?.subdomain || '';
                                    const isCurrentUpdating = updatingTenantId === companyId;

                                    return (
                                        <div
                                            key={companyId}
                                            className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                    {tenantName.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-xs font-bold text-slate-800">{tenantName}</span>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                            {subdomain}.talentcio.in
                                                        </span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                            (share.accessLevel || 'full_access') === 'view_only'
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        }`}>
                                                            {(share.accessLevel || 'full_access') === 'view_only' ? 'View Only' : 'Full Access'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        Shared on {share.sharedAt ? format(new Date(share.sharedAt), 'dd MMM yyyy, hh:mm a') : '-'}
                                                        {share.sharedBy?.firstName ? ` by ${share.sharedBy.firstName} ${share.sharedBy.lastName || ''}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                                                <select
                                                    value={share.shareType || 'all'}
                                                    disabled={isCurrentUpdating}
                                                    onChange={(e) => handleUpdateShareType(companyId, e.target.value)}
                                                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                                                    title="Data Scope"
                                                >
                                                    <option value="all">Share All Data</option>
                                                    <option value="phase1">Share Phase 1 Data</option>
                                                    <option value="phase2">Share Phase 2 Data</option>
                                                    <option value="public_applications">Public Applications Only</option>
                                                </select>

                                                <select
                                                    value={share.accessLevel || 'full_access'}
                                                    disabled={isCurrentUpdating}
                                                    onChange={(e) => handleUpdateAccessLevel(companyId, e.target.value)}
                                                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
                                                    title="Candidate Access Permissions"
                                                >
                                                    <option value="full_access">Full Access</option>
                                                    <option value="view_only">View Only</option>
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRevokeShare(companyId, tenantName)}
                                                    disabled={isCurrentUpdating}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                                    title="Revoke shared access"
                                                >
                                                    {isCurrentUpdating ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                        <CheckCircle size={13} className="text-emerald-500" />
                        Updates reflect live on all shared workspaces.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareRequisitionModal;
