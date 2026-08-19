import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar, Clock, ReceiptText, LifeBuoy,
    CalendarDays, User, CheckCircle2,
    ChevronRight, Loader, LogOut,
    Banknote, Eye, EyeOff, Plus, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import { getMyClaims, getMyStats as getReimbStats } from '@/features/reimbursement/api/reimbursementApi';
import { formatINR } from '@/features/reimbursement/utils/reimbursementConstants';
import SubmitClaimModal from '@/features/reimbursement/components/SubmitClaimModal';

// ─── Compact Card Primitive (Unscrollable Viewport Fit) ───────────────────────

const PremiumCard = ({ children, className = '', to, onClick, hoverable = true }) => {
    const baseClasses = `group relative overflow-hidden rounded-xl bg-white p-2.5 sm:p-3 border border-slate-100 shadow-[0_1px_6px_-2px_rgba(0,0,0,0.03)] transition-all duration-200 flex flex-col justify-between h-full ${
        hoverable ? 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-3px_rgba(0,0,0,0.06)] hover:border-slate-200' : ''
    } ${to || onClick ? 'cursor-pointer' : ''} ${className}`;

    if (to) {
        return (
            <Link to={to} className={baseClasses}>
                {children}
            </Link>
        );
    }
    if (onClick) {
        return (
            <div onClick={onClick} className={baseClasses}>
                {children}
            </div>
        );
    }
    return <div className={baseClasses}>{children}</div>;
};

const CardHeader = ({ icon: Icon, title, iconGradient = 'from-blue-600 to-indigo-600', badge, action }) => (
    <div className="flex items-center justify-between gap-1.5 mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${iconGradient} text-white shadow-2xs`}>
                <Icon size={12} />
            </div>
            <div>
                <h3 className="text-[11px] font-bold text-slate-800 tracking-tight leading-none">{title}</h3>
                {badge && <div className="mt-0.5">{badge}</div>}
            </div>
        </div>
        {action}
    </div>
);

const CardActionLink = ({ to, label = 'View All' }) => (
    <Link
        to={to}
        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors group-hover:translate-x-0.5"
    >
        <span>{label}</span>
        <ChevronRight size={10} />
    </Link>
);

const LoadingSkeleton = () => (
    <div className="space-y-1.5 animate-pulse pt-0.5 flex-1 flex flex-col justify-center">
        <div className="h-2 rounded bg-slate-100 w-3/4" />
        <div className="h-2 rounded bg-slate-100 w-1/2" />
        <div className="h-4 rounded bg-slate-100 w-full" />
    </div>
);

// ─── Compact Attendance Tile ───────────────────────────────────────────────────

const AttendanceTile = () => {
    const [today, setToday] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchToday = useCallback(() => {
        api.get('/attendance/today')
            .then(r => setToday(r.data?.attendance || r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchToday();
    }, [fetchToday]);

    const handleClockIn = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setActionLoading(true);

        const execute = async (loc = null) => {
            try {
                const payload = loc ? { location: loc } : {};
                const res = await api.post('/attendance/clock-in', payload);
                setToday(res.data?.attendance || res.data);
                toast.success('Checked in successfully.');
                fetchToday();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to check in');
            } finally {
                setActionLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => execute({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                () => execute(),
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            execute();
        }
    };

    const handleClockOut = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setActionLoading(true);

        const execute = async (loc = null) => {
            try {
                const payload = loc ? { location: loc } : {};
                const res = await api.post('/attendance/clock-out', payload);
                setToday(res.data?.attendance || res.data);
                toast.success('Checked out successfully.');
                fetchToday();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to check out');
            } finally {
                setActionLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => execute({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                () => execute(),
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            execute();
        }
    };

    const isClockedIn  = today?.clockIn && !today?.clockOut;
    const isClockedOut = today?.clockIn && today?.clockOut;
    const isNotStarted = !today?.clockIn;

    return (
        <PremiumCard>
            <CardHeader
                icon={Clock}
                title="Shift & Attendance"
                iconGradient="from-amber-500 to-orange-600"
                action={<CardActionLink to="/attendance" label="Details" />}
            />

            {loading ? (
                <LoadingSkeleton />
            ) : (
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    {/* Status Badge Strip */}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 p-1 px-2">
                        <div className="flex items-center gap-1">
                            <CalendarDays size={10} className="text-orange-500" />
                            <span className="text-[10px] font-bold text-slate-700">
                                {format(new Date(), 'dd MMM yyyy')}
                            </span>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[8px] font-bold border ${
                                isClockedIn
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isClockedOut
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    isClockedIn ? 'bg-emerald-500 animate-pulse' : isClockedOut ? 'bg-purple-500' : 'bg-rose-400'
                                }`}
                            />
                            {isClockedIn ? 'Clocked In' : isClockedOut ? 'Completed' : 'Not Clocked In'}
                        </span>
                    </div>

                    {/* Punch Times Metrics */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-1 text-center">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Check In</span>
                            <span className="text-[10px] font-bold text-slate-800 mt-0.2 block">
                                {today?.clockIn ? format(new Date(today.clockIn), 'hh:mm a') : '—'}
                            </span>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-1 text-center">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Check Out</span>
                            <span className="text-[10px] font-bold text-slate-800 mt-0.2 block">
                                {today?.clockOut ? format(new Date(today.clockOut), 'hh:mm a') : isClockedIn ? 'Active' : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Primary Action Button */}
                    <div className="shrink-0">
                        {isNotStarted && (
                            <button
                                type="button"
                                onClick={handleClockIn}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 py-1.5 text-[10px] font-bold text-white shadow-2xs hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            >
                                {actionLoading ? <Loader size={10} className="animate-spin" /> : <Clock size={10} />}
                                Check In Now
                            </button>
                        )}

                        {isClockedIn && (
                            <button
                                type="button"
                                onClick={handleClockOut}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 py-1.5 text-[10px] font-bold text-white shadow-2xs hover:from-rose-700 hover:to-amber-700 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            >
                                {actionLoading ? <Loader size={10} className="animate-spin" /> : <LogOut size={10} />}
                                Check Out
                            </button>
                        )}

                        {isClockedOut && (
                            <div className="flex items-center justify-center gap-1 rounded-lg bg-purple-50 border border-purple-100 py-1 text-[10px] font-bold text-purple-700">
                                <CheckCircle2 size={11} className="text-purple-600" />
                                Shift Completed
                            </div>
                        )}
                    </div>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Compact Leave & Time Off Tile ─────────────────────────────────────────────

const LeaveTile = () => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/leaves/bootstrap')
            .then(r => {
                const list = r.data?.balances || (Array.isArray(r.data) ? r.data : []);
                setBalances(list);
            })
            .catch(() => {
                api.get('/leaves/balance')
                    .then(r => {
                        const list = Array.isArray(r.data) ? r.data : (r.data?.balances || []);
                        setBalances(list);
                    })
                    .catch(() => {});
            })
            .finally(() => setLoading(false));
    }, []);

    const types = Array.isArray(balances) ? balances.slice(0, 3) : [];

    return (
        <PremiumCard to="/leaves">
            <CardHeader
                icon={Calendar}
                title="Leave & Time Off"
                iconGradient="from-emerald-500 to-green-600"
                action={<CardActionLink to="/leaves" label="Balances" />}
            />

            {loading ? (
                <LoadingSkeleton />
            ) : types.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center flex-1 flex flex-col justify-center items-center">
                    <Calendar size={16} className="text-slate-300 mb-1" />
                    <p className="text-[10px] text-slate-500">No leave balance data.</p>
                    <Link to="/leaves" className="mt-0.5 text-[9px] font-bold text-indigo-600 hover:underline">
                        Check History →
                    </Link>
                </div>
            ) : (
                <div className="space-y-1 flex-1 flex flex-col justify-around">
                    {types.map((b, i) => {
                        const remaining = b.closingBalance ?? b.remaining ?? b.balance ?? 0;
                        const isUnlimited = b.policyAccrualAmount === 0;

                        return (
                            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-1 px-1.5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[10px] font-semibold text-slate-800 truncate">
                                        {b.policyName || b.leaveType || b.type}
                                    </span>
                                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-1 py-0.2 text-[8px] font-bold">
                                        {isUnlimited ? 'Unlimited' : `${remaining}d`}
                                    </span>
                                </div>
                                {!isUnlimited && (
                                    <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                            style={{ width: `${Math.min(100, Math.max(10, remaining * 5))}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Compact Reimbursements Tile ───────────────────────────────────────────────

const ReimbursementTile = ({ onSubmit }) => {
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getReimbStats(), getMyClaims({ page: 1, limit: 2 })])
            .then(([sr, cr]) => {
                setStats(sr.data?.stats);
                setRecent(cr.data?.claims || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const STATUS_COLORS = {
        'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
        'L1 Approved': 'bg-blue-50 text-blue-700 border-blue-200',
        'L2 Approved': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Rejected': 'bg-rose-50 text-rose-700 border-rose-200',
        'Reimbursed': 'bg-purple-50 text-purple-700 border-purple-200',
        'Cancelled': 'bg-slate-100 text-slate-500 border-slate-200'
    };

    return (
        <PremiumCard>
            <CardHeader
                icon={ReceiptText}
                title="Expense Claims"
                iconGradient="from-purple-600 to-indigo-600"
                action={<CardActionLink to="/ess/reimbursements" label="Manage" />}
            />

            {loading ? (
                <LoadingSkeleton />
            ) : (
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    {/* Financial Metrics Strip */}
                    <div className="grid grid-cols-2 gap-1">
                        <div className="rounded-lg bg-amber-50/70 border border-amber-100 p-1 text-center">
                            <span className="text-xs font-black text-amber-800">{stats?.pending || 0}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 block">Pending</span>
                        </div>
                        <div className="rounded-lg bg-purple-50/70 border border-purple-100 p-1 text-center">
                            <span className="text-xs font-black text-purple-800">{formatINR(stats?.totalClaimed || 0)}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-purple-600 block">Claimed</span>
                        </div>
                    </div>

                    {/* Recent mini items */}
                    {recent.length > 0 && (
                        <div className="space-y-0.5">
                            {recent.slice(0, 1).map((c) => (
                                <div key={c._id} className="flex items-center justify-between rounded-md bg-slate-50 p-1 px-1.5 border border-slate-100">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-slate-800 truncate">{c.category}</p>
                                        <span className={`inline-flex items-center rounded px-1 text-[7px] font-bold border ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-900 shrink-0 ml-1">
                                        {formatINR(c.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onSubmit}
                        className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-1 text-[10px] font-bold text-white shadow-2xs hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                        <Plus size={10} /> Submit Claim
                    </button>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Compact Payslip & Earnings Tile ───────────────────────────────────────────

const PayslipTile = () => {
    const [latest, setLatest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [masked, setMasked] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user?._id) return;
        api.get(`/dossier/${user._id}`)
            .then(r => {
                const history = r.data?.compensation?.payrollHistory || r.data?.payrollHistory || [];
                if (history.length > 0) {
                    const sorted = [...history].sort((a, b) => new Date(b.processedDate || b.createdAt || 0) - new Date(a.processedDate || a.createdAt || 0));
                    setLatest(sorted[0]);
                } else if (r.data?.compensation?.ctc) {
                    setLatest({
                        period: 'Active Structure',
                        netSalary: r.data.compensation?.salaryBreakup?.netTakeHome || Math.round(r.data.compensation.ctc * 0.88),
                        grossSalary: r.data.compensation.ctc,
                        totalDeductions: r.data.compensation?.salaryBreakup?.totalDeductions || Math.round(r.data.compensation.ctc * 0.12)
                    });
                }
            })
            .catch(() => {
                api.get('/v1/payroll-results/latest')
                    .then(r => setLatest(r?.data || null))
                    .catch(() => {});
            })
            .finally(() => setLoading(false));
    }, [user?._id]);

    const netAmount = latest?.netSalary || latest?.netPay || 0;
    const grossAmount = latest?.grossSalary || latest?.gross || (latest?.netSalary ? Math.round(latest.netSalary * 1.12) : 0);

    return (
        <PremiumCard to="/ess/payslips">
            <CardHeader
                icon={Banknote}
                title="Payroll & Payslip"
                iconGradient="from-teal-500 to-emerald-600"
                action={
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMasked(!masked);
                            }}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title={masked ? 'Show amount' : 'Hide amount'}
                        >
                            {masked ? <Eye size={11} /> : <EyeOff size={11} />}
                        </button>
                        <CardActionLink to="/ess/payslips" label="Statements" />
                    </div>
                }
            />

            {loading ? (
                <LoadingSkeleton />
            ) : latest ? (
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div className="rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 p-1.5 px-2 text-white shadow-inner">
                        <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 block">
                            Net Take-Home
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-white block">
                            {masked ? '₹ •••••••' : formatINR(netAmount)}
                        </span>
                        <span className="text-[7px] text-slate-400 block">
                            {latest.period || (latest.month && latest.year ? `${format(new Date(latest.year, latest.month - 1), 'MMM yyyy')}` : 'Latest Statement')}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] px-0.5 text-slate-600">
                        <span>Gross:</span>
                        <span className="font-bold text-slate-900">
                            {masked ? '₹ •••••' : formatINR(grossAmount)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="space-y-1 text-center py-1 flex-1 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500">Access your monthly salary slips.</p>
                    <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-bold text-indigo-600 hover:underline">
                        Open Archive <ArrowRight size={9} />
                    </span>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Compact Helpdesk Support Tile ─────────────────────────────────────────────

const HelpdeskTile = () => {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/helpdesk/my-queries?limit=2')
            .then(r => setQueries(r.data?.queries || r.data?.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const STATUS_COLORS = {
        Open: 'bg-blue-50 text-blue-700 border-blue-200',
        Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Closed: 'bg-slate-100 text-slate-600 border-slate-200'
    };

    return (
        <PremiumCard to="/helpdesk">
            <CardHeader
                icon={LifeBuoy}
                title="Helpdesk Support"
                iconGradient="from-rose-500 to-pink-600"
                action={<CardActionLink to="/helpdesk" label="Tickets" />}
            />

            {loading ? (
                <LoadingSkeleton />
            ) : (
                <div className="space-y-1 flex-1 flex flex-col justify-center">
                    {queries.length === 0 ? (
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                            <LifeBuoy size={16} className="mx-auto text-slate-300 mb-0.5" />
                            <p className="text-[10px] text-slate-500">No active support tickets.</p>
                            <span className="text-[9px] font-bold text-indigo-600">
                                Raise a Query →
                            </span>
                        </div>
                    ) : (
                        queries.slice(0, 2).map((q) => (
                            <div key={q._id} className="flex items-center justify-between rounded-md bg-slate-50 p-1 px-1.5 border border-slate-100">
                                <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-800 pr-1">
                                    {q.subject || q.title || q.queryType}
                                </p>
                                <span className={`inline-flex shrink-0 items-center rounded border px-1 py-0.2 text-[7px] font-bold ${STATUS_COLORS[q.status] || STATUS_COLORS['Open']}`}>
                                    {q.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Compact Upcoming Holidays Tile ───────────────────────────────────────────

const HolidaysTile = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        api.get(`/holidays?from=${today}&limit=2`)
            .then(r => setHolidays(Array.isArray(r.data) ? r.data : (r.data?.holidays || [])))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const upcoming = holidays
        .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
        .slice(0, 2);

    return (
        <PremiumCard to="/holidays">
            <CardHeader
                icon={CalendarDays}
                title="Upcoming Holidays"
                iconGradient="from-cyan-500 to-blue-600"
                action={<CardActionLink to="/holidays" label="Calendar" />}
            />

            {loading ? (
                <LoadingSkeleton />
            ) : upcoming.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center flex-1 flex items-center justify-center">
                    <p className="text-[10px] text-slate-400">No upcoming company holidays.</p>
                </div>
            ) : (
                <div className="space-y-1 flex-1 flex flex-col justify-around">
                    {upcoming.map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5 rounded-lg bg-slate-50/60 p-1 px-1.5 border border-slate-100">
                            <div className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-md bg-cyan-100/60 text-cyan-800 font-bold border border-cyan-200">
                                <span className="text-[6px] uppercase tracking-wider text-cyan-700 leading-none">{format(new Date(h.date), 'MMM')}</span>
                                <span className="text-[11px] font-black leading-none mt-0.2">{format(new Date(h.date), 'dd')}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-bold text-slate-900 leading-tight">{h.name}</p>
                                <p className="text-[8px] text-slate-400 leading-tight">{format(new Date(h.date), 'EEEE')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Main ESS Dashboard (Unscrollable Viewport-Fit Layout) ─────────────────────

const EssDashboard = () => {
    const { user, hasModule } = useAuth();
    const [showSubmitClaim, setShowSubmitClaim] = useState(false);

    const showLeave         = hasModule('leaves');
    const showAttendance    = hasModule('attendance');
    const showReimburse     = hasModule('reimbursements');
    const showHelpdesk      = hasModule('helpdesk');
    const showHolidays      = hasModule('holidays');

    return (
        <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-[#F8FAFC] p-2.5 sm:p-3.5 flex flex-col justify-between">
            <div className="mx-auto max-w-7xl w-full h-full flex flex-col justify-between gap-2.5">
                {/* Responsive Compact Grid - Clean 2x3 Grid */}
                <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 flex-1 min-h-0 items-stretch">
                    {showAttendance  && <AttendanceTile />}
                    {showLeave       && <LeaveTile />}
                    {showReimburse   && <ReimbursementTile onSubmit={() => setShowSubmitClaim(true)} />}
                    <PayslipTile />
                    {showHelpdesk    && <HelpdeskTile />}
                    {showHolidays    && <HolidaysTile />}
                </div>
            </div>

            {/* Modal Dialog */}
            {showSubmitClaim && (
                <SubmitClaimModal onClose={() => setShowSubmitClaim(false)} onSuccess={() => {}} />
            )}
        </div>
    );
};

export default EssDashboard;
