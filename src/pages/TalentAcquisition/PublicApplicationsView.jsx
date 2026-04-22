import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
    ArrowRight,
    CheckCircle,
    Clock,
    FileText,
    Globe,
    Loader,
    MoreVertical,
    RefreshCw,
    Search,
    XCircle
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';

const statusColor = (status) => {
    switch (status) {
        case 'Shortlisted':
            return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'Rejected':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'Transferred':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Pending Review':
            return 'bg-amber-100 text-amber-700 border-amber-200';
        default:
            return 'bg-slate-100 text-slate-500 border-slate-200';
    }
};

const metricStyles = {
    blue: { border: 'border-b-blue-500', icon: 'text-blue-600' },
    amber: { border: 'border-b-amber-500', icon: 'text-amber-600' },
    sky: { border: 'border-b-sky-500', icon: 'text-sky-600' },
    rose: { border: 'border-b-rose-500', icon: 'text-rose-600' }
};

const MetricCard = ({ label, val, icon, color, onClick }) => {
    const styles = metricStyles[color] || metricStyles.blue;

    return (
        <div
            onClick={onClick}
            className={`bg-white border border-slate-200 border-b-4 ${styles.border} shadow-sm p-4 relative overflow-hidden group hover:bg-slate-50 transition-all cursor-pointer active:scale-95 rounded-xl`}
        >
            <div className="relative z-10">
                <span className="block text-[28px] font-light text-slate-800 leading-none mb-1.5 tracking-tight">{val}</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-[1px]">{label}</span>
            </div>
            <div className={`absolute -right-2 top-1/2 -translate-y-1/2 ${styles.icon} opacity-[0.06] transition-all group-hover:scale-110 group-hover:opacity-10 group-hover:-rotate-12`}>
                {React.cloneElement(icon, { size: 64 })}
            </div>
        </div>
    );
};

const PublicApplicationsView = ({ hiringRequestId }) => {
    const { user } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState({});
    const [actionLoading, setActionLoading] = useState(null);
    const [transferTarget, setTransferTarget] = useState(null);
    const [activeRequests, setActiveRequests] = useState([]);
    const [selectedTargetId, setSelectedTargetId] = useState(hiringRequestId);

    const canEdit = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.edit');

    const fetchApplications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/ta/hiring-request/${hiringRequestId}/public-applications`);
            setApplications(res.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load public applications');
        } finally {
            setLoading(false);
        }
    }, [hiringRequestId]);

    const fetchActiveRequests = useCallback(async () => {
        try {
            const res = await api.get('/ta/hiring-request?status=Approved');
            setActiveRequests(res.data?.requests || res.data || []);
        } catch (error) {
            console.error('Failed to fetch active requests', error);
        }
    }, []);

    useEffect(() => {
        fetchApplications();
        fetchActiveRequests();
    }, [fetchApplications, fetchActiveRequests]);

    const metrics = {
        total: applications.length,
        pending: applications.filter((application) => application.reviewStatus === 'Pending Review').length,
        shortlisted: applications.filter((application) => application.reviewStatus === 'Shortlisted').length,
        transferred: applications.filter((application) => application.reviewStatus === 'Transferred').length,
        rejected: applications.filter((application) => application.reviewStatus === 'Rejected').length,
    };

    const filtered = applications.filter((application) => {
        if (filterStatus !== 'All' && application.reviewStatus !== filterStatus) {
            return false;
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                application.candidateName?.toLowerCase().includes(query) ||
                application.email?.toLowerCase().includes(query) ||
                application.mobile?.includes(query)
            );
        }

        return true;
    });

    const toggleMenu = (event, appId) => {
        event.stopPropagation();
        if (activeMenu === appId) {
            setActiveMenu(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 200;
        const position = { right: window.innerWidth - rect.right };

        if (spaceBelow < menuHeight && rect.top > menuHeight) {
            position.bottom = window.innerHeight - rect.top + 5;
        } else {
            position.top = rect.bottom + 5;
        }

        setMenuPosition(position);
        setActiveMenu(appId);
    };

    const handleReview = async (appId, reviewStatus) => {
        setActionLoading(appId);
        setActiveMenu(null);

        try {
            const res = await api.patch(`/ta/hiring-request/${hiringRequestId}/public-applications/${appId}/review`, { reviewStatus });
            setApplications((current) => current.map((application) => (
                application._id === appId ? { ...application, ...res.data } : application
            )));
            toast.success(`Marked as ${reviewStatus}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(null);
        }
    };

    const openTransferModal = (application) => {
        setActiveMenu(null);
        setSelectedTargetId(hiringRequestId);
        setTransferTarget({ appId: application._id, appName: application.candidateName });
    };

    const handleTransfer = async () => {
        if (!transferTarget) {
            return;
        }

        setActionLoading(transferTarget.appId);

        try {
            await api.post(
                `/ta/hiring-request/${hiringRequestId}/public-applications/${transferTarget.appId}/transfer`,
                { targetHiringRequestId: selectedTargetId }
            );
            toast.success(`${transferTarget.appName} transferred to active request successfully.`);
            setTransferTarget(null);
            fetchApplications();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Transfer failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-16 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    if (applications.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Globe className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No Public Applications Yet</h3>
                <p className="text-slate-400 text-sm">
                    When this job is published to <strong>talentcio.in/jobs</strong> and candidates apply, they will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-600" />
                    <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">
                        Public Job Board Applications — {applications.length} Total
                    </h3>
                </div>
                <button
                    onClick={fetchApplications}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard label="Total" val={metrics.total} icon={<Globe />} color="blue" onClick={() => setFilterStatus('All')} />
                <MetricCard label="Pending Review" val={metrics.pending} icon={<Clock />} color="amber" onClick={() => setFilterStatus('Pending Review')} />
                <MetricCard label="Shortlisted" val={metrics.shortlisted} icon={<CheckCircle />} color="sky" onClick={() => setFilterStatus('Shortlisted')} />
                <MetricCard label="Transferred" val={metrics.transferred} icon={<ArrowRight />} color="blue" onClick={() => setFilterStatus('Transferred')} />
                <MetricCard label="Rejected" val={metrics.rejected} icon={<XCircle />} color="rose" onClick={() => setFilterStatus('Rejected')} />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Status</label>
                    <select
                        value={filterStatus}
                        onChange={(event) => setFilterStatus(event.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                        {['All', 'Pending Review', 'Shortlisted', 'Rejected', 'Transferred'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-[2] min-w-[200px]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Search</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Name, email, or phone..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                {(filterStatus !== 'All' || searchQuery) && (
                    <button
                        onClick={() => {
                            setFilterStatus('All');
                            setSearchQuery('');
                        }}
                        className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                        Clear
                    </button>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Search className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Matches Found</h3>
                    <p className="text-slate-500">Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Applicant</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">CTC Details</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Applied On</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((application) => (
                                    <tr key={application._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="text-[13px] font-bold text-slate-800">{application.candidateName}</span>
                                                {application.reviewStatus === 'Transferred' && (
                                                    <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">TRANSFERRED</span>
                                                )}
                                                {application.coverNote && (
                                                    <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-[200px]" title={application.coverNote}>
                                                        "{application.coverNote}"
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[12px] text-slate-500">
                                                <div>{application.email}</div>
                                                <div>{application.mobile}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-[12px] text-slate-600 space-y-0.5">
                                                {application.currentCTC && <div>Current: <span className="font-semibold">{application.currentCTC} LPA</span></div>}
                                                {application.expectedCTC && <div>Expected: <span className="font-semibold">{application.expectedCTC} LPA</span></div>}
                                                {application.noticePeriod !== undefined && <div>Notice: <span className="font-semibold">{application.noticePeriod}d</span></div>}
                                                {!application.currentCTC && !application.expectedCTC && <span className="text-slate-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[12px] text-slate-500">
                                                {format(new Date(application.createdAt), 'MMM dd, yyyy')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${statusColor(application.reviewStatus)}`}>
                                                {application.reviewStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {actionLoading === application._id ? (
                                                <Loader size={16} className="animate-spin text-blue-500 mx-auto" />
                                            ) : (
                                                <button
                                                    onClick={(event) => toggleMenu(event, application._id)}
                                                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                            )}

                                            {activeMenu === application._id && typeof document !== 'undefined' && createPortal(
                                                <div
                                                    className="fixed z-[9999] w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1"
                                                    style={menuPosition}
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    {application.resumeUrl && (
                                                        <a
                                                            href={application.resumeUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                            onClick={() => setActiveMenu(null)}
                                                        >
                                                            <FileText size={15} className="text-slate-500" />
                                                            View Resume
                                                        </a>
                                                    )}

                                                    {canEdit && application.reviewStatus !== 'Transferred' && (
                                                        <>
                                                            <div className="border-t border-slate-100 my-1" />

                                                            {application.reviewStatus !== 'Shortlisted' && (
                                                                <button
                                                                    onClick={() => handleReview(application._id, 'Shortlisted')}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 transition-colors text-left font-semibold"
                                                                >
                                                                    <CheckCircle size={15} className="text-sky-500" />
                                                                    Mark Shortlisted
                                                                </button>
                                                            )}

                                                            {application.reviewStatus !== 'Rejected' && (
                                                                <button
                                                                    onClick={() => handleReview(application._id, 'Rejected')}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors text-left font-semibold"
                                                                >
                                                                    <XCircle size={15} className="text-red-500" />
                                                                    Mark Rejected
                                                                </button>
                                                            )}

                                                            {application.reviewStatus !== 'Pending Review' && (
                                                                <button
                                                                    onClick={() => handleReview(application._id, 'Pending Review')}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors text-left"
                                                                >
                                                                    <Clock size={15} className="text-amber-500" />
                                                                    Reset to Pending
                                                                </button>
                                                            )}

                                                            <div className="border-t border-slate-100 my-1" />

                                                            <button
                                                                onClick={() => openTransferModal(application)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left font-semibold"
                                                            >
                                                                <ArrowRight size={15} className="text-blue-500" />
                                                                Transfer to Active Req.
                                                            </button>
                                                        </>
                                                    )}
                                                </div>,
                                                document.body
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {transferTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Transfer Applicant</h3>
                        <p className="text-sm text-slate-500 mb-5">
                            Transfer <strong>{transferTarget.appName}</strong> to an active hiring request as a new candidate.
                        </p>

                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Target Request</label>
                        <select
                            value={selectedTargetId}
                            onChange={(event) => setSelectedTargetId(event.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all mb-6"
                        >
                            {activeRequests.map((request) => (
                                <option key={request._id} value={request._id}>
                                    {request.roleDetails?.title} — {request.client} ({request.requestId})
                                    {request._id === hiringRequestId ? ' (This Request)' : ''}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-3">
                            <button
                                onClick={handleTransfer}
                                disabled={actionLoading === transferTarget.appId}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                            >
                                {actionLoading === transferTarget.appId
                                    ? <><Loader size={14} className="animate-spin" /> Transferring...</>
                                    : <><ArrowRight size={14} /> Transfer</>
                                }
                            </button>
                            <button
                                onClick={() => setTransferTarget(null)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicApplicationsView;
