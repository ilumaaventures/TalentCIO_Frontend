import React, { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useOrgChartData } from '../hooks/useOrgChartData';
import OrgChartCanvas from '../components/OrgChartCanvas';
import OrgSearchFilterBar from '../components/OrgSearchFilterBar';
import ReportingLineEditor from '../components/ReportingLineEditor';
import { Users, Network, UserCheck, ChevronRight } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { getEmploymentTypeStyle, getEmploymentTypeBadgeStyle } from '../utils/employmentTypeColors';
import { canAccessBusinessUnits, canManageOrgChart, canViewOrgChartStats } from '@/config/accessPolicies';

const OrgChart = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [businessUnitId, setBusinessUnitId] = useState('');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [employmentTypes, setEmploymentTypes] = useState([]);
    const [showReportingManagers, setShowReportingManagers] = useState(false);
    const [viewMode, setViewMode] = useState('tree');
    const [selectedNode, setSelectedNode] = useState(null);

    const handleEmploymentTypesChange = (types) => {
        setEmploymentTypes(types);
        if (!types || types.length === 0) {
            setShowReportingManagers(false);
        }
    };

    const handleNodeClick = (node) => {
        const userId = node?._id || node?.id;
        if (userId) {
            navigate(`/users/${userId}`);
        }
    };

    const isAdmin = user?.roles?.some((r) => ['Admin', 'Super Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('*')
        || Boolean(user?.hasAllPermissions);

    const isGlobalViewer = isAdmin || user?.permissions?.includes('org_chart.view') || user?.permissions?.includes('org.chart.view');

    const canManageReportingLine = canManageOrgChart(user);

    const canViewStatsCards = canViewOrgChartStats(user);

    const canViewBusinessUnits = canAccessBusinessUnits(user);

    const {
        treeData,
        stats,
        loading,
        departments,
        businessUnits,
        availableEmploymentTypes,
        refetch
    } = useOrgChartData({
        departmentId,
        businessUnitId: canViewBusinessUnits ? businessUnitId : '',
        search,
        includeInactive,
        employmentTypes,
        showReportingManagers,
        canViewBusinessUnits,
        canManageOrgChart: canManageReportingLine,
        canViewStats: canViewStatsCards
    });

    // Flatten tree for list view grouped by department
    const flatEmployees = useMemo(() => {
        const list = [];
        const walk = (nodes) => {
            for (const n of nodes) {
                if (employmentTypes.length === 0 || showReportingManagers || n.isMatch) {
                    list.push(n);
                }
                if (n.children) walk(n.children);
            }
        };
        walk(treeData);
        return list;
    }, [treeData, employmentTypes, showReportingManagers]);

    const groupedByDepartment = useMemo(() => {
        const groups = {};
        for (const emp of flatEmployees) {
            const dept = emp.department || 'Unassigned';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(emp);
        }
        return groups;
    }, [flatEmployees]);

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
                            <Network className="text-blue-600" size={28} />
                            Organization Chart
                        </h1>
                        {!isGlobalViewer && (
                            <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                My Team & Subordinates
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {isGlobalViewer
                            ? 'Interactive hierarchy visualization and department reporting lines'
                            : 'Showing your subordinate hierarchy and reporting line (users reporting directly or indirectly to you)'}
                    </p>
                </div>
            </div>

            {/* Statistics Bar - only visible with org_chart.view or org_chart.manage (or Admin) */}
            {canViewStatsCards && stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Total Workforce</p>
                            <h3 className="text-lg font-bold text-slate-800">{stats.totalWorkforce ?? stats.totalHeadcount ?? stats.totalEmployees ?? 0}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">People Managers</p>
                            <h3 className="text-lg font-bold text-slate-800">{stats.managersCount || 0}</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <OrgSearchFilterBar
                search={search}
                onSearchChange={setSearch}
                departmentId={departmentId}
                onDepartmentChange={setDepartmentId}
                businessUnitId={businessUnitId}
                onBusinessUnitChange={setBusinessUnitId}
                includeInactive={includeInactive}
                onIncludeInactiveChange={setIncludeInactive}
                employmentTypes={employmentTypes}
                onEmploymentTypesChange={handleEmploymentTypesChange}
                showReportingManagers={showReportingManagers}
                onShowReportingManagersChange={setShowReportingManagers}
                availableEmploymentTypes={availableEmploymentTypes}
                departments={departments}
                businessUnits={businessUnits}
                canViewBusinessUnits={canViewBusinessUnits}
                canManageOrgChart={canManageReportingLine}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />

            {/* Main Content Area */}
            {loading ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <Skeleton className="h-10 w-48 rounded-xl" />
                    <div className="flex justify-center items-center py-20">
                        <Skeleton className="h-64 w-80 rounded-2xl" />
                    </div>
                </div>
            ) : viewMode === 'tree' ? (
                <OrgChartCanvas
                    tree={treeData}
                    selectedNode={selectedNode}
                    onSelectNode={handleNodeClick}
                    showReportingManagers={showReportingManagers}
                    onShowReportingManagersChange={setShowReportingManagers}
                    canShowReportingManagers={canManageReportingLine && employmentTypes.length > 0}
                />
            ) : (
                /* Grouped Department List Fallback */
                <div className="space-y-6">
                    {Object.keys(groupedByDepartment).length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl text-center text-slate-500 text-xs">
                            No employees match your search criteria.
                        </div>
                    ) : (
                        Object.entries(groupedByDepartment).map(([deptName, members]) => (
                            <div key={deptName} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                        <span>{deptName}</span>
                                        <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                            {members.length}
                                        </span>
                                    </h3>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {members.map((m) => {
                                        const empStyle = getEmploymentTypeStyle(m.employmentType);
                                        return (
                                            <div
                                                key={m._id}
                                                onClick={() => handleNodeClick(m)}
                                                title={`View ${m.firstName} ${m.lastName}'s Profile`}
                                                className={`px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer border-l-4 ${empStyle.listBorder}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {m.profilePicture ? (
                                                        <img src={m.profilePicture} alt={m.firstName} className={`w-8 h-8 rounded-full object-cover ring-2 ${empStyle.avatarRing}`} />
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${empStyle.avatarGradient} text-white text-xs font-bold flex items-center justify-center shadow-xs`}>
                                                            {(m.firstName?.[0] || '') + (m.lastName?.[0] || '')}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-bold text-slate-800">{m.firstName} {m.lastName}</h4>
                                                            <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${empStyle.badge}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${empStyle.dot}`} />
                                                                <span>{m.employmentType || 'Full Time'}</span>
                                                            </span>
                                                        </div>
                                                        <p className={`text-[11px] font-medium ${empStyle.text}`}>{m.designation || 'Team Member'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {m.directReportsCount > 0 && (
                                                        <span className="text-[11px] font-medium text-slate-500">
                                                            {m.directReportsCount} reports
                                                        </span>
                                                    )}
                                                    <ChevronRight size={14} className="text-slate-400" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Side Reporting Line Inspector / Editor */}
            {selectedNode && (
                <ReportingLineEditor
                    selectedNode={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    canManageReportingLine={canManageReportingLine}
                    onReportingLineUpdated={() => refetch(true)}
                />
            )}
        </div>
    );
};

export default OrgChart;
