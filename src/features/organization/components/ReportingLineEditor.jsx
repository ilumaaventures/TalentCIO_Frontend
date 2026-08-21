import React, { useState, useEffect } from 'react';
import { X, UserCheck, ArrowUpRight, ExternalLink, ShieldAlert, Users, CornerDownRight, UserMinus } from 'lucide-react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const ReportingLineEditor = ({
    selectedNode,
    onClose,
    canManageReportingLine = false,
    onReportingLineUpdated
}) => {
    const [reportingLineData, setReportingLineData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!selectedNode?._id) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const [lineRes, empRes] = await Promise.all([
                    api.get(`/organization/org-chart/${selectedNode._id}/reporting-line`),
                    api.get('/organization/departments').catch(() => ({ data: [] }))
                ]);
                setReportingLineData(lineRes.data);
                const initialMgr = lineRes.data?.user?.reportingManagers?.[0];
                const mgrId = typeof initialMgr === 'object' && initialMgr?._id ? String(initialMgr._id) : (initialMgr ? String(initialMgr) : '');
                setSelectedManagerId(mgrId);

                // Fetch available employees for manager dropdown
                const usersRes = await api.get('/admin/users?limit=200').catch(() => ({ data: { users: [] } }));
                const userList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || [];
                setEmployees(userList.filter((u) => String(u._id) !== String(selectedNode._id)));
            } catch (err) {
                console.error('Failed to load reporting line details:', err);
                toast.error('Failed to load reporting details');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [selectedNode]);

    const handleSaveManager = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading('Updating reporting line...');

        try {
            await api.put(`/organization/org-chart/${selectedNode._id}/manager`, {
                managerId: selectedManagerId || null
            });
            toast.success('Reporting line updated successfully', { id: toastId });
            onReportingLineUpdated?.();
            onClose?.();
        } catch (error) {
            console.error('Update manager error:', error);
            const msg = error.response?.data?.message || 'Failed to update manager';
            toast.error(msg, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedNode) return null;

    const user = reportingLineData?.user || selectedNode;
    const managerChain = reportingLineData?.managerChain || [];
    const directReports = reportingLineData?.directReports || [];

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Employee Details</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Profile Card */}
                <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                    {user.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt={user.firstName}
                            className="w-14 h-14 rounded-full object-cover border border-slate-200"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center">
                            {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                            {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{user.designation || 'Team Member'}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {user.department || 'Unassigned'}
                            </span>
                            <Link
                                to={`/users/${user._id}`}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 ml-auto"
                            >
                                <span>Profile</span>
                                <ExternalLink size={12} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Manager Assignment Form (if permitted) */}
                {canManageReportingLine && (
                    <form onSubmit={handleSaveManager} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                        <label className="block text-xs font-bold text-slate-700">
                            Primary Reporting Manager
                        </label>
                        <select
                            value={selectedManagerId}
                            onChange={(e) => setSelectedManagerId(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                        >
                            <option value="">-- No Manager (Root / Executive) --</option>
                            {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.firstName} {emp.lastName} ({emp.email})
                                </option>
                            ))}
                        </select>
                        <div className="flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Update Manager'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Upward Manager Hierarchy */}
                <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                        Reporting Line (Upward)
                    </h5>
                    {managerChain.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No manager assigned (Top-level position)</p>
                    ) : (
                        <div className="space-y-2">
                            {managerChain.map((mgr, index) => (
                                <div key={mgr._id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <CornerDownRight size={13} className="text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">
                                            {mgr.firstName} {mgr.lastName}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                            {mgr.designationRef?.title || mgr.department || 'Manager'}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                        L{index + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Downward Direct Reports */}
                <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                        Direct Reports ({directReports.length})
                    </h5>
                    {directReports.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No direct reports</p>
                    ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {directReports.map((report) => (
                                <div key={report._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                        {(report.firstName?.[0] || '') + (report.lastName?.[0] || '')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                            {report.firstName} {report.lastName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            {report.designationRef?.title || report.department || ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportingLineEditor;
