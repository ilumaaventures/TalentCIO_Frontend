import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, CheckCircle, XCircle, Clock, User, Building, MapPin, DollarSign, Send, ThumbsUp, ThumbsDown, Briefcase, Edit, Loader, FileText, Paperclip, Globe } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import CandidateList from './CandidateList';
import LegacyApplicationsView from './LegacyApplicationsView';
import PublicApplicationsView from './PublicApplicationsView';
import Skeleton from '../../components/Skeleton';
import { createNoCacheRequestConfig, invalidateTACaches, refreshTAClientsCache } from '../../utils/taCache';

const DetailRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
        <span className="text-slate-500 font-medium text-sm">{label}</span>
        <span className="text-slate-800 font-semibold text-sm text-right">{value || '-'}</span>
    </div>
);

const formatBudgetLabel = (budgetRange = {}) => {
    if (budgetRange?.isOpen) {
        return 'Open';
    }

    const currency = budgetRange?.currency || 'INR';
    const min = budgetRange?.min !== undefined && budgetRange?.min !== null
        ? Number(budgetRange.min).toLocaleString('en-IN')
        : '-';
    const max = budgetRange?.max !== undefined && budgetRange?.max !== null
        ? Number(budgetRange.max).toLocaleString('en-IN')
        : '-';

    return `${currency} ${min} to ${max}`;
};

const getHiringPositionSummary = (request) => {
    const openPositions = Math.max(Number(request?.hiringDetails?.openPositions) || 0, 0);
    const storedClosedPositions = Math.max(Number(request?.hiringDetails?.closedPositions) || 0, 0);
    const storedOriginalPositions = Math.max(Number(request?.hiringDetails?.originalOpenPositions) || 0, 0);

    if (request?.status === 'Closed') {
        const requestedPositions = Math.max(storedOriginalPositions, storedClosedPositions, openPositions, 1);
        return {
            requested: requestedPositions,
            open: 0,
            closed: requestedPositions
        };
    }

    const requestedPositions = Math.max(
        storedOriginalPositions,
        openPositions + storedClosedPositions,
        openPositions,
        1
    );

    return {
        requested: requestedPositions,
        open: openPositions,
        closed: Math.max(storedClosedPositions, requestedPositions - openPositions, 0)
    };
};

const HiringRequestDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approvalComment, setApprovalComment] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [togglingVisibility, setTogglingVisibility] = useState(false);
    const [togglingResourceGateway, setTogglingResourceGateway] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeMode, setCloseMode] = useState('all');
    const [partialCloseCount, setPartialCloseCount] = useState(1);
    const [activeTab, setActiveTab] = useState('overview'); // overview, applications, reviews

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const fetchRequest = useCallback(async ({ force = false } = {}) => {
        try {
            setLoading(true);
            const res = await api.get(`/ta/hiring-request/${id}`, force ? createNoCacheRequestConfig() : undefined);
            setRequest(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load request details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRequest({ force: true });
    }, [fetchRequest]);

    const isDynamic = request?.approvalChain && request?.approvalChain?.length > 0;

    const currentStep = isDynamic
        ? request.approvalChain[request.currentApprovalLevel - 1]
        : null;

    const hasSuperApprove = user?.permissions?.includes('ta.super_approve') || user?.permissions?.includes('*');
    const canManageVisibility = user?.roles?.includes('Admin')
        || user?.permissions?.includes('ta.config.manage')
        || user?.permissions?.includes('ta.edit');
    const resourceGatewayEnabledForCompany = Boolean(user?.company?.settings?.careers?.enableResourceGatewayPublishing);
    const positionSummary = getHiringPositionSummary(request);
    const canPartialClose = positionSummary.open > 1;

    const canApprove = request && isDynamic
        ? (
            (request.status === 'Pending_Approval' || request.status === 'Submitted') &&
            currentStep &&
            currentStep.status === 'Pending' &&
            (
                hasSuperApprove ||
                (currentStep.approvers && currentStep.approvers.some(a => a._id === user?._id || a === user?._id))
            )
        )
        : request && (request.status === 'Pending_L1' || request.status === 'Pending_Final');

    const handleApproval = async (action) => {
        // Only require comment for rejection
        if (action === 'REJECT' && !approvalComment.trim()) {
            return toast.error('Please add a comment for rejection');
        }

        try {
            setActionLoading(true);
            const payload = { comments: approvalComment };

            if (!isDynamic) {
                if (request.status === 'Pending_L1') payload.level = 'L1';
                else if (request.status === 'Pending_Final') payload.level = 'Final';
            }

            if (action === 'APPROVE') {
                const response = await api.patch(`/ta/hiring-request/${id}/approve`, payload);
                const updatedRequest = response.data;
                setRequest(updatedRequest);
                toast.success('Approved successfully');
                invalidateTACaches({ requestId: id, client: updatedRequest?.client || request?.client });
            } else {
                const response = await api.patch(`/ta/hiring-request/${id}/reject`, payload);
                const updatedRequest = response.data;
                setRequest(updatedRequest);
                toast.success('Rejected successfully');
                invalidateTACaches({ requestId: id, client: updatedRequest?.client || request?.client });
            }

            setApprovalComment('');
            refreshTAClientsCache().catch((cacheError) => {
                console.error('Failed to refresh TA client cache after approval action:', cacheError);
            });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = async () => {
        const closeCount = closeMode === 'partial' ? Number(partialCloseCount) : positionSummary.open;
        if (!Number.isFinite(closeCount) || closeCount <= 0) {
            return toast.error('No open positions are available to close.');
        }
        if (closeMode === 'partial' && closeCount > positionSummary.open) {
            return toast.error(`You can close at most ${positionSummary.open} positions.`);
        }
        try {
            setActionLoading(true);
            const response = await api.patch(`/ta/hiring-request/${id}/close`, closeMode === 'partial'
                ? { mode: 'partial', closeCount }
                : { mode: 'all' });
            const updatedRequest = response.data;
            setRequest(updatedRequest);
            setShowCloseModal(false);
            setCloseMode('all');
            setPartialCloseCount(1);
            if (updatedRequest.status === 'Closed') {
                toast.success('Request closed successfully');
            } else {
                const remainingOpenPositions = Math.max(Number(updatedRequest?.hiringDetails?.openPositions) || 0, 0);
                toast.success(`${closeCount} position${closeCount === 1 ? '' : 's'} closed. ${remainingOpenPositions} still open.`);
            }
            invalidateTACaches({ requestId: id, client: updatedRequest?.client || request?.client });
            refreshTAClientsCache().catch((cacheError) => {
                console.error('Failed to refresh TA client cache after close:', cacheError);
            });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to close request');
        } finally {
            setActionLoading(false);
        }
    };

    const openCloseModal = () => {
        if (positionSummary.open <= 0) {
            toast.error('There are no open positions left to close.');
            return;
        }
        setCloseMode('all');
        setPartialCloseCount(1);
        setShowCloseModal(true);
    };

    const handleEdit = () => {
        navigate(`/ta/edit-request/${id}`);
    };

    const handleTogglePublic = async () => {
        if (!request) return;
        const newValue = !request.isPublic;
        const confirmMsg = newValue
            ? 'Publish this job to talentcio.in/jobs? It will be visible to the public.'
            : 'Unpublish this job? It will no longer appear on talentcio.in/jobs.';
        if (!window.confirm(confirmMsg)) return;

        try {
            setTogglingVisibility(true);
            const res = await api.patch(`/ta/hiring-request/${id}/visibility`, { isPublic: newValue });
            setRequest((prev) => ({ ...prev, ...res.data.job }));
            toast.success(res.data.message);
            invalidateTACaches({ requestId: id, client: res.data?.job?.client || request?.client });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update visibility');
        } finally {
            setTogglingVisibility(false);
        }
    };

    const handleToggleResourceGateway = async () => {
        if (!request) return;

        if (!resourceGatewayEnabledForCompany) {
            toast.error('This company is not enabled for Resource Gateway publishing. Ask Super Admin to enable it in Company Settings.');
            return;
        }

        if (!request.isPublic) {
            toast.error('Publish the job to the main job board first.');
            return;
        }

        const newValue = !request.isResourceGatewayPublic;
        const confirmMsg = newValue
            ? 'Publish this job on resourcegateway.in/careers as well?'
            : 'Remove this job from resourcegateway.in/careers?';

        if (!window.confirm(confirmMsg)) return;

        try {
            setTogglingResourceGateway(true);
            const res = await api.patch(`/ta/hiring-request/${id}/visibility`, {
                isResourceGatewayPublic: newValue
            });
            setRequest((prev) => ({ ...prev, ...res.data.job }));
            toast.success(res.data.message);
            invalidateTACaches({ requestId: id, client: res.data?.job?.client || request?.client });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update Resource Gateway visibility');
        } finally {
            setTogglingResourceGateway(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-12">
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div>
                                    <Skeleton className="h-5 w-48 mb-1" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <div className="hidden md:flex gap-2">
                                <Skeleton className="h-8 w-24 rounded-lg" />
                                <Skeleton className="h-8 w-24 rounded-lg" />
                            </div>
                            <div className="w-24" />
                        </div>
                    </div>
                </div>
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 space-y-8">
                            <Skeleton className="h-64 w-full rounded-2xl" />
                            <Skeleton className="h-64 w-full rounded-2xl" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-48 w-full rounded-2xl" />
                            <Skeleton className="h-32 w-full rounded-2xl" />
                            <Skeleton className="h-32 w-full rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (!request) return <div className="p-10 text-center">Request not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Sticky Navbar - Glassmorphism effect */}
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm transition-all duration-300">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Left: Back button + Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/ta/hiring-requests/${encodeURIComponent(request.client)}`)}
                                className="p-2 hover:bg-slate-100/80 rounded-full text-slate-500 hover:text-slate-700 transition-all duration-200 group"
                                aria-label="Go back"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-slate-900 leading-tight">{request.roleDetails.title}</h1>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                    <span className="flex items-center gap-1"><Building size={10} /> {request.roleDetails.department}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span>#{request.requestId.slice(-6).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Center: Tabs with Pill Design */}
                        <div className="hidden md:flex bg-slate-100/50 p-1 rounded-xl">
                            {['overview', ...((request.status === 'Approved' || request.status === 'Closed') ? ['applications'] : []), ...((request.status === 'Approved') && request.isPublic ? ['public applications'] : []), ...(request.previousRequestId ? ['legacy applications'] : [])].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${activeTab === tab
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Right: placeholder to keep flex layout balanced */}
                        <div className="w-24" />
                    </div>
                </div>
            </div>

            {/* Tab Content Container */}
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Main Content Column */}
                        <div className="xl:col-span-2 space-y-8">

                            {/* Role Information Card */}
                            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                            <Briefcase size={14} />
                                        </div>
                                        Role Information
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${request.hiringDetails.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                                        request.hiringDetails.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            'bg-blue-50 text-blue-600 border border-blue-100'
                                        }`}>
                                        {request.hiringDetails.priority} Priority
                                    </span>
                                </div>
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                    <div className="group">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Client / Project</h4>
                                        <p className="text-slate-900 font-bold text-base">{request.client}</p>
                                        {request.clientConfidential ? (
                                            <p className="mt-1 text-xs font-semibold text-amber-600">Public listing will hide the client name.</p>
                                        ) : null}
                                    </div>
                                    <div className="group">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Job Title</h4>
                                        <p className="text-slate-800 font-semibold text-sm">{request.roleDetails.title}</p>
                                    </div>
                                    <div className="group">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Department</h4>
                                        <p className="text-slate-800 font-medium text-sm">{request.roleDetails.department}</p>
                                    </div>
                                    <div className="group">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Employment Type</h4>
                                        <p className="text-slate-800 font-medium text-sm flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                            {request.roleDetails.employmentType}
                                        </p>
                                    </div>
                                    <div className="group">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Interview Template</h4>
                                        <p className="text-slate-800 font-medium text-sm">{request.interviewWorkflowId?.name || 'Custom (None)'}</p>
                                    </div>
                                    <div className="group">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-600 transition-colors">Hiring Purpose</h4>
                                        <p className="text-slate-800 font-medium text-sm">{request.purpose}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Requirements Card */}
                            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <CheckCircle size={14} />
                                        </div>
                                        Requirements
                                    </h3>
                                </div>
                                <div className="p-5 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Must-Have Skills (Technical)</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(Array.isArray(request.requirements.mustHaveSkills) ? request.requirements.mustHaveSkills : request.requirements.mustHaveSkills?.technical)?.map(s => (
                                                    <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold shadow-sm hover:shadow transition-shadow cursor-default">
                                                        {s}
                                                    </span>
                                                ))}
                                                {(!(Array.isArray(request.requirements.mustHaveSkills) ? request.requirements.mustHaveSkills : request.requirements.mustHaveSkills?.technical)?.length) && (
                                                    <span className="text-slate-400 italic text-xs">None specified</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Must-Have Skills (Soft Skills)</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {request.requirements.mustHaveSkills?.softSkills?.map(s => (
                                                    <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold shadow-sm hover:shadow transition-shadow cursor-default">
                                                        {s}
                                                    </span>
                                                ))}
                                                {!request.requirements.mustHaveSkills?.softSkills?.length && (
                                                    <span className="text-slate-400 italic text-xs">None specified</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nice-To-Have Skills</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {request.requirements.niceToHaveSkills?.map(s => (
                                                <span key={s} className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-xs font-medium hover:bg-slate-100 transition-colors cursor-default">
                                                    {s}
                                                </span>
                                            ))}
                                            {!request.requirements.niceToHaveSkills?.length && <span className="text-slate-400 italic text-xs">None specified</span>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience Range</h4>
                                            <p className="text-slate-900 font-bold text-sm">{request.requirements.experienceMin} - {request.requirements.experienceMax} <span className="text-xs font-medium text-slate-500">Years</span></p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</h4>
                                            <div className="flex items-center gap-1.5 text-slate-900 font-medium text-sm">
                                                <MapPin size={13} className="text-slate-400" />
                                                {request.requirements.location}
                                                {request.requirements.shift && <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">({request.requirements.shift})</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Job Description Card */}
                            {(request.jobDescription || request.jobDescriptionFile) && (
                                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                    <div className="px-5 py-3.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                                <FileText size={14} />
                                            </div>
                                            Detailed Job Description
                                        </h3>
                                        {request.jobDescriptionFile && (
                                            <a
                                                href={request.jobDescriptionFile}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                <Paperclip size={12} /> View JD File
                                            </a>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        {request.jobDescription ? (
                                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                {request.jobDescription}
                                            </div>
                                        ) : (
                                            <div className="text-slate-400 italic text-sm py-4 text-center">
                                                No text description provided. Please refer to the attached file.
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Approval History - Enhanced Timeline */}
                            {(isDynamic || request.approvals?.l1?.status !== 'Pending' || request.approvals?.final?.status !== 'Pending') && (
                                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
                                    <div className="px-5 py-3.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                                <Clock size={14} />
                                            </div>
                                            Approval Timeline
                                        </h3>
                                    </div>
                                    <div className="p-5">
                                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-5">
                                            {request.approvalChain.map((step, index) => (
                                                <div key={index} className="relative">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute -left-[21px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${step.status === 'Approved' ? 'bg-emerald-500 ring-4 ring-emerald-50' :
                                                        step.status === 'Rejected' ? 'bg-red-500 ring-4 ring-red-50' :
                                                            'bg-slate-300 ring-4 ring-slate-50'
                                                        }`}></div>

                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">
                                                                Level {step.level} <span className="font-normal text-slate-500 mx-1">/</span> {step.roleName || 'Approver'}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {step.status === 'Pending' ? 'Waiting for:' : 'Assigned to:'} <span className="font-medium text-slate-700">{step.approvers?.map(a => `${a.firstName} ${a.lastName}`).join(', ')}</span>
                                                            </p>
                                                            {step.status !== 'Pending' && (
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {step.status} by <span className="font-medium text-slate-700">{step.approvedBy?.firstName} {step.approvedBy?.lastName}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${step.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                                            step.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {step.status}
                                                        </span>
                                                    </div>

                                                    {step.date && (
                                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                            <Clock size={12} /> {format(new Date(step.date), 'MMM dd, yyyy • hh:mm a')}
                                                        </p>
                                                    )}

                                                    {step.comments && (
                                                        <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 italic relative">
                                                            <span className="absolute top-2 left-2 text-slate-300 text-xl font-serif">"</span>
                                                            <span className="pl-4">{step.comments}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            {/* Hiring Details Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
                                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md">
                                        <DollarSign size={14} />
                                    </div>
                                    Hiring Specifics
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-slate-500 text-xs font-medium">Requested Positions</span>
                                        <span className="text-slate-900 font-bold text-xs bg-slate-100 px-2 py-0.5 rounded">{positionSummary.requested}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-slate-500 text-xs font-medium">Open Positions</span>
                                        <span className="text-slate-900 font-bold text-xs bg-slate-100 px-2 py-0.5 rounded group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{positionSummary.open}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-slate-500 text-xs font-medium">Closed Positions</span>
                                        <span className="text-slate-900 font-bold text-xs bg-slate-100 px-2 py-0.5 rounded">{positionSummary.closed}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-xs font-medium">Expected Joining</span>
                                        <span className="text-slate-900 font-semibold text-xs text-right">{request.hiringDetails.expectedJoiningDate ? format(new Date(request.hiringDetails.expectedJoiningDate), 'MMM dd, yyyy') : '-'}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-50">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1.5">Budget Range</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-bold text-slate-800">{formatBudgetLabel(request.hiringDetails?.budgetRange)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Position Created By Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                                        <User size={14} />
                                    </div>
                                    Created By
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-blue-50">
                                        {request.createdBy?.firstName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{request.createdBy?.firstName} {request.createdBy?.lastName}</p>
                                        <p className="text-xs text-slate-500">{request.createdBy?.email}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            on {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {Array.isArray(request.assignedUsers) && request.assignedUsers.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                                            <User size={14} />
                                        </div>
                                        Assigned Access
                                    </h3>
                                    <div className="space-y-2">
                                        {request.assignedUsers.map((assignedUser) => (
                                            <div key={assignedUser._id || assignedUser.email} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs font-bold text-slate-800">
                                                    {[assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(' ') || assignedUser.email}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    {assignedUser.email || assignedUser.employeeCode || 'Assigned user'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {Array.isArray(request.analyticsViewers) && request.analyticsViewers.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b border-slate-50">
                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md">
                                            <User size={14} />
                                        </div>
                                        Performance Viewers
                                    </h3>
                                    <div className="space-y-2">
                                        {request.analyticsViewers.map((viewer) => (
                                            <div key={viewer._id || viewer.email} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-xs font-bold text-slate-800">
                                                    {[viewer.firstName, viewer.lastName].filter(Boolean).join(' ') || viewer.email}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    {viewer.email || viewer.employeeCode || 'Analytics viewer'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 pb-3 border-b border-slate-50">
                                    <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md">
                                        <CheckCircle size={14} />
                                    </div>
                                    Status
                                </h3>
                                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${request.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    request.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                        request.status === 'Closed' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                            request.status === 'Pending_L1' || request.status === 'Pending_Approval' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                request.status === 'Pending_Final' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                    {request.status.replace(/_/g, ' ')}
                                </div>
                            </div>

                            {canManageVisibility && request.status === 'Approved' && (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2 pb-3 border-b border-slate-50">
                                        <div className={`p-1.5 rounded-md ${request.isPublic ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                            <Globe size={14} />
                                        </div>
                                        Job Board Visibility
                                    </h3>
                                    <div className="space-y-3">
                                        <div className={`rounded-xl border px-3 py-3 ${request.isPublic ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                                            <p className={`text-xs font-bold uppercase tracking-wider ${request.isPublic ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                {request.isPublic ? 'Public on Job Board ✓' : 'Private (not listed)'}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Public jobs appear on `talentcio.in/jobs` once the requisition is approved.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleTogglePublic}
                                            disabled={togglingVisibility}
                                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${request.isPublic
                                                ? 'bg-white border border-slate-200 text-slate-700 hover:border-red-200 hover:text-red-600 hover:bg-red-50'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
                                                }`}
                                        >
                                            {togglingVisibility ? <Loader className="animate-spin" size={16} /> : <Globe size={16} />}
                                            {request.isPublic ? 'Unpublish from Job Board' : 'Publish to Job Board'}
                                        </button>

                                        {resourceGatewayEnabledForCompany && (
                                            <div className="space-y-2">
                                                <button
                                                    onClick={handleToggleResourceGateway}
                                                    disabled={togglingResourceGateway || !request.isPublic}
                                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border shadow-sm ${
                                                        request.isResourceGatewayPublic
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    {togglingResourceGateway
                                                        ? <Loader size={14} className="animate-spin" />
                                                        : request.isResourceGatewayPublic
                                                            ? <><Globe size={14} /> Posted on Resource Gateway</>
                                                            : <><Globe size={14} /> Post on Resource Gateway</>
                                                    }
                                                </button>

                                                {!request.isPublic && (
                                                    <p className="text-[11px] leading-4 text-slate-500">
                                                        Publish to the main job board first, then this role can also go live on Resource Gateway.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-sm font-bold text-slate-800 mb-3">Actions</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={handleEdit}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow"
                                    >
                                        <Edit size={16} /> Edit Request
                                    </button>

                                    {request.status !== 'Closed' && (
                                        <button
                                            onClick={openCloseModal}
                                            disabled={actionLoading || positionSummary.open <= 0}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {actionLoading ? <Loader className="animate-spin" size={16} /> : <XCircle size={16} />} Close Request
                                        </button>
                                    )}

                                    {request.status === 'Closed' && !request.reopenedToId && (
                                        <button
                                            onClick={() => navigate(`/ta/create-request?reopenFrom=${id}`)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl font-medium text-sm transition-all shadow-sm"
                                        >
                                            <Briefcase size={16} /> Reopen Requisition
                                        </button>
                                    )}

                                    {request.reopenedToId && (
                                        <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center shadow-inner">
                                            <p className="text-xs font-semibold text-slate-600 mb-2">Superseded By</p>
                                            <button
                                                onClick={() => navigate(`/ta/view/${request.reopenedToId}`)}
                                                className="text-blue-600 hover:text-blue-800 font-bold text-sm underline transition-colors"
                                            >
                                                View Active Requisition
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Approval Action */}
                            {canApprove && (
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-200 p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Send size={64} />
                                    </div>
                                    <h3 className="font-bold text-white mb-2 relative z-10 text-lg">Approval Required</h3>
                                    <p className="text-xs text-blue-100 mb-4 relative z-10">Please review the details and take action.</p>

                                    <textarea
                                        value={approvalComment}
                                        onChange={(e) => setApprovalComment(e.target.value)}
                                        placeholder="Add comments (required for rejection)..."
                                        className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-sm mb-4 outline-none focus:bg-white/20 placeholder-blue-200 text-white transition-all backdrop-blur-sm"
                                        rows={3}
                                    />

                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                        <button
                                            onClick={() => handleApproval('APPROVE')}
                                            disabled={actionLoading}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {actionLoading ? <Loader className="animate-spin" size={16} /> : <ThumbsUp size={16} />} Approve
                                        </button>
                                        <button
                                            onClick={() => handleApproval('REJECT')}
                                            disabled={actionLoading}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-xl font-bold text-sm transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {actionLoading ? <Loader className="animate-spin" size={16} /> : <ThumbsDown size={16} />} Reject
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'applications' && (
                    <CandidateList hiringRequestId={id} positionName={request?.positionName} requestMeta={request} />
                )}

                {activeTab === 'public applications' && (
                    <PublicApplicationsView hiringRequestId={id} />
                )}

                {activeTab === 'legacy applications' && request.previousRequestId && (
                    <LegacyApplicationsView hiringRequestId={id} />
                )}

            </div>

            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Close Positions</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Choose whether to close all open positions or only some of them for this requisition.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCloseModal(false)}
                                disabled={actionLoading}
                                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${closeMode === 'all' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="close-mode"
                                    value="all"
                                    checked={closeMode === 'all'}
                                    onChange={() => setCloseMode('all')}
                                    className="mt-0.5"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Close all open positions</p>
                                    <p className="text-xs text-slate-500">
                                        This will close all {positionSummary.open} remaining position{positionSummary.open === 1 ? '' : 's'} and mark the requisition as closed.
                                    </p>
                                </div>
                            </label>

                            {canPartialClose && (
                                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${closeMode === 'partial' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="close-mode"
                                        value="partial"
                                        checked={closeMode === 'partial'}
                                        onChange={() => setCloseMode('partial')}
                                        className="mt-0.5"
                                    />
                                    <div className="w-full">
                                        <p className="text-sm font-semibold text-slate-800">Close some positions</p>
                                        <p className="text-xs text-slate-500">
                                            Reduce the open positions without closing the entire requisition.
                                        </p>

                                        {closeMode === 'partial' && (
                                            <div className="mt-3 space-y-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={positionSummary.open}
                                                    value={partialCloseCount}
                                                    onChange={(e) => setPartialCloseCount(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                                />
                                                <p className="text-xs text-slate-500">
                                                    After closing {Math.min(Math.max(Number(partialCloseCount) || 0, 0), positionSummary.open)} position{Number(partialCloseCount) === 1 ? '' : 's'}, {Math.max(positionSummary.open - (Number(partialCloseCount) || 0), 0)} will remain open.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            )}
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCloseModal(false)}
                                disabled={actionLoading}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={actionLoading}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : closeMode === 'partial' ? 'Close Selected Positions' : 'Close All Positions'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HiringRequestDetails;
