import React, { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useOrgChartData } from '../hooks/useOrgChartData';
import OrgChartCanvas from '../components/OrgChartCanvas';
import OrgSearchFilterBar from '../components/OrgSearchFilterBar';
import ReportingLineEditor from '../components/ReportingLineEditor';
import { Users, Network, TrendingUp, Layers, UserCheck, ChevronRight } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import { Link } from 'react-router-dom';

const OrgChart = () => {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [businessUnitId, setBusinessUnitId] = useState('');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [viewMode, setViewMode] = useState('tree');
    const [selectedNode, setSelectedNode] = useState(null);

    const isAdmin = user?.roles?.some((r) => ['Admin', 'Super Admin', 'System Admin'].includes(typeof r === 'string' ? r : r?.name))
        || user?.permissions?.includes('*')
        || Boolean(user?.hasAllPermissions);

    const isGlobalViewer = isAdmin || user?.permissions?.includes('org_chart.view');

    const canManageReportingLine = isAdmin || user?.permissions?.includes('org_chart.manage');

    const {
        treeData,
        stats,
        loading,
        departments,
        businessUnits,
        refetch
    } = useOrgChartData({
        departmentId,
        businessUnitId,
        search,
        includeInactive
    });

    // Flatten tree for list view grouped by department
    const flatEmployees = useMemo(() => {
        const list = [];
        const walk = (nodes) => {
            for (const n of nodes) {
                list.push(n);
                if (n.children) walk(n.children);
            }
        };
        walk(treeData);
        return list;
    }, [treeData]);

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
                            ? 'Interactive hierarchy visualization, department reporting lines, and span of control'
                            : 'Showing your subordinate hierarchy and reporting line (users reporting directly or indirectly to you)'}
                    </p>
                </div>
            </div>

            {/* Statistics Bar */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Total Headcount</p>
                            <h3 className="text-lg font-bold text-slate-800">{stats.totalHeadcount || 0}</h3>
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

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Avg Span of Control</p>
                            <h3 className="text-lg font-bold text-slate-800">{stats.averageSpanOfControl || 0}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Layers size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Departments</p>
                            <h3 className="text-lg font-bold text-slate-800">{departments.length}</h3>
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
                departments={departments}
                businessUnits={businessUnits}
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
                    onSelectNode={(node) => setSelectedNode(node)}
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
                                    {members.map((m) => (
                                        <div
                                            key={m._id}
                                            onClick={() => setSelectedNode(m)}
                                            className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                {m.profilePicture ? (
                                                    <img src={m.profilePicture} alt={m.firstName} className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                                                        {(m.firstName?.[0] || '') + (m.lastName?.[0] || '')}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-800">{m.firstName} {m.lastName}</h4>
                                                    <p className="text-[11px] text-slate-500">{m.designation || 'Team Member'}</p>
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
                                    ))}
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
