import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    ArrowLeft,
    LifeBuoy,
    BarChart2,
    CheckCircle,
    AlertTriangle,
    FileText,
    TrendingUp,
    AlertOctagon,
    Clock,
    Activity,
    Layers,
    ListTodo
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';

const STATUS_COLORS = {
    'New': '#f59e0b',
    'In Progress': '#3b82f6',
    'Pending': '#8b5cf6',
    'Escalated': '#ef4444',
    'Resolved': '#10b981',
    'Closed': '#64748b'
};

const PRIORITY_COLORS = {
    'Low': '#94a3b8',
    'Medium': '#3b82f6',
    'High': '#f97316',
    'Urgent': '#ef4444'
};

const HelpdeskAnalytics = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await api.get('/helpdesk/analytics/dashboard');
            if (res.data.success) {
                setAnalytics(res.data.data);
            } else {
                toast.error(res.data.message || 'Failed to fetch analytics');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error(error.response?.data?.message || 'Server Error. Failed to load analytics dashboard.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Loading Help Desk Analytics...</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10 flex flex-col items-center justify-center text-slate-400 gap-4">
                <LifeBuoy size={64} className="text-slate-200" />
                <p className="text-lg font-medium text-slate-600">Failed to load analytics data.</p>
                <button
                    onClick={() => navigate('/helpdesk')}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                    Back to Help Desk
                </button>
            </div>
        );
    }

    // Format Status Data for PieChart
    const statusPieData = Object.entries(analytics.statusSummary).map(([name, value]) => ({
        name,
        value
    })).filter(item => item.value > 0);

    // Format Priority Data for BarChart
    const priorityBarData = Object.entries(analytics.prioritySummary).map(([name, value]) => ({
        name,
        value
    }));

    // Format Trend Data for AreaChart
    const trendData = analytics.trendBreakdown.map(item => ({
        date: item._id,
        Queries: item.count
    }));

    // Format Query Types breakdown
    const queryTypesData = analytics.queryTypeBreakdown.map(item => ({
        name: item.name,
        Count: item.count
    }));

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 sm:p-10">
            {/* Back Button */}
            <button
                onClick={() => navigate('/helpdesk')}
                className="flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-6 group outline-none"
            >
                <ArrowLeft size={16} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
                Back to Help Desk
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        Help Desk Analytics
                    </h1>
                    <p className="text-sm font-semibold text-slate-500 mt-1">
                        Overview metrics, distribution reports, and query resolution metrics.
                    </p>
                </div>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Queries */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shadow-slate-100/40 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Queries</span>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <FileText size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{analytics.totalQueries}</div>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Overall tickets raised</p>
                </div>

                {/* Active Queries */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shadow-slate-100/40 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Queries</span>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">
                        {analytics.totalQueries - (analytics.statusSummary.Closed || 0) - (analytics.statusSummary.Resolved || 0)}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mt-1">New, In Progress, Pending</p>
                </div>

                {/* Closed Queries */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shadow-slate-100/40 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Closed Queries</span>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">
                        {(analytics.statusSummary.Closed || 0) + (analytics.statusSummary.Resolved || 0)}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Resolved & Closed tickets</p>
                </div>

                {/* Escalated Queries */}
                <div className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow ${analytics.escalatedQueriesCount > 0 ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Escalated Queries</span>
                        <div className={`p-3 rounded-xl ${analytics.escalatedQueriesCount > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                            <AlertOctagon size={20} />
                        </div>
                    </div>
                    <div className={`text-3xl font-extrabold ${analytics.escalatedQueriesCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {analytics.escalatedQueriesCount}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mt-1">SLA breached tickets</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 1. Trend Over Time (Area Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-600" />
                        Ticket Inflow Trend (Past 30 Days)
                    </h3>
                    <div className="h-72 w-full">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis allowDecimals={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Area type="monotone" dataKey="Queries" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQueries)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LifeBuoy size={36} className="text-slate-200 mb-2" />
                                <p className="text-sm font-semibold">No recent activity found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Queries Status Distribution (Pie Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <ListTodo size={18} className="text-indigo-600" />
                        Query Status Distribution
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-72 items-center">
                        <div className="h-full w-full relative">
                            {statusPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {statusPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <LifeBuoy size={36} className="text-slate-200 mb-2" />
                                    <p className="text-sm font-semibold">No active data</p>
                                </div>
                            )}
                        </div>
                        {/* Status Legend */}
                        <div className="space-y-3 pr-4">
                            {Object.entries(analytics.statusSummary).map(([status, count]) => {
                                const percentage = analytics.totalQueries > 0
                                    ? Math.round((count / analytics.totalQueries) * 100)
                                    : 0;
                                return (
                                    <div key={status} className="flex items-center justify-between text-xs font-semibold">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#cbd5e1' }} />
                                            <span>{status}</span>
                                        </div>
                                        <span className="text-slate-500 font-bold">{count} ({percentage}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 3. Priority Breakdown (Bar Chart) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <BarChart2 size={18} className="text-indigo-600" />
                        Query Priority Distribution
                    </h3>
                    <div className="h-72 w-full">
                        {priorityBarData.some(p => p.value > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                                    <YAxis allowDecimals={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                    />
                                    <Bar dataKey="value" name="Tickets count">
                                        {priorityBarData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#cbd5e1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <LifeBuoy size={36} className="text-slate-200 mb-2" />
                                <p className="text-sm font-semibold">No priority metrics available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Query Distribution by Type List & Graph */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-600" />
                            Distribution by Query Type
                        </h3>
                        <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                            {queryTypesData.length > 0 ? (
                                queryTypesData.map((item, idx) => {
                                    const percentage = analytics.totalQueries > 0
                                        ? Math.round((item.Count / analytics.totalQueries) * 100)
                                        : 0;
                                    return (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold text-slate-700">
                                                <span>{item.name}</span>
                                                <span>{item.Count} Tickets ({percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <LifeBuoy size={36} className="text-slate-200 mb-2" />
                                    <p className="text-sm font-semibold">No query types mapped</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpdeskAnalytics;
