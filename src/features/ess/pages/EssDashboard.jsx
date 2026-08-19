import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar, Clock, ReceiptText, LifeBuoy,
    CalendarDays, CheckCircle2,
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

// ─── Compact Card Primitive ───────────────────────────────────────────────────

const PremiumCard = ({ children, className = '', to, onClick, hoverable = true }) => {
    const baseClasses = `group relative overflow-hidden rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200/80 shadow-xs transition-all duration-200 ${
        hoverable ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300' : ''
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
    <div className="flex items-center justify-between gap-1.5 mb-3">
        <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${iconGradient} text-white shadow-2xs`}>
                <Icon size={14} />
            </div>
            <div>
                <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-none">{title}</h3>
                {badge && <div className="mt-0.5">{badge}</div>}
            </div>
        </div>
        {action}
    </div>
);

const CardActionLink = ({ to, label = 'View All' }) => (
    <Link
        to={to}
        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors group-hover:translate-x-0.5"
    >
        <span>{label}</span>
        <ChevronRight size={11} />
    </Link>
);

const LoadingSkeleton = () => (
    <div className="space-y-2 animate-pulse pt-1">
        <div className="h-2.5 rounded bg-slate-100 w-3/4" />
        <div className="h-2.5 rounded bg-slate-100 w-1/2" />
        <div className="h-6 rounded bg-slate-100 w-full" />
    </div>
);

// ─── Shift & Attendance Tile ───────────────────────────────────────────────────

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
                <div className="space-y-2.5">
                    {/* Date and Status pill */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-1.5 px-2.5">
                        <div className="flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-orange-500" />
                            <span className="text-[11px] font-bold text-slate-700">
                                {format(new Date(), 'dd MMM yyyy')}
                            </span>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
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
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-1.5 text-center">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Check In</span>
                            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                                {today?.clockIn ? format(new Date(today.clockIn), 'hh:mm a') : '—'}
                            </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-1.5 text-center">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">Check Out</span>
                            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                                {today?.clockOut ? format(new Date(today.clockOut), 'hh:mm a') : isClockedIn ? 'Active' : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Action button */}
                    <div>
                        {isNotStarted && (
                            <button
                                type="button"
                                onClick={handleClockIn}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all cursor-pointer"
                            >
                                {actionLoading ? <Loader size={12} className="animate-spin" /> : <Clock size={12} />}
                                Check In Now
                            </button>
                        )}

                        {isClockedIn && (
                            <button
                                type="button"
                                onClick={handleClockOut}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-2 text-xs font-bold text-white shadow-xs hover:from-rose-700 hover:to-amber-700 disabled:opacity-60 transition-all cursor-pointer"
                            >
                                {actionLoading ? <Loader size={12} className="animate-spin" /> : <LogOut size={12} />}
                                Check Out
                            </button>
                        )}

                        {isClockedOut && (
                            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 border border-purple-100 py-1.5 text-xs font-bold text-purple-700">
                                <CheckCircle2 size={13} className="text-purple-600" />
                                Shift Completed
                            </div>
                        )}
                    </div>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Circular Leave Gauge Primitive ──────────────────────────────────────────

const CircularLeaveGauge = ({ label, remaining, total = 12, ringColor = 'text-emerald-500', trackColor = 'text-slate-100', isUnlimited }) => {
    const size = 46;
    const strokeWidth = 3.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = isUnlimited ? 100 : Math.min(100, Math.max(8, (remaining / (total || 12)) * 100));
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div className="flex flex-col items-center text-center shrink-0 w-[72px]">
            <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
                <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className={trackColor}
                        fill="transparent"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={`${ringColor} transition-all duration-500 ease-out`}
                        fill="transparent"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-extrabold text-[11px] text-slate-800 leading-none">
                        {isUnlimited ? '∞' : `${remaining}d`}
                    </span>
                    {!isUnlimited && (
                        <span className="text-[7px] font-semibold text-slate-400 leading-none mt-0.5">
                            of {total}d
                        </span>
                    )}
                </div>
            </div>
            <span
                className="mt-1 text-[9.5px] font-bold text-slate-700 leading-[1.15] text-center line-clamp-2 px-0.5 w-full break-words"
                title={label}
            >
                {label}
            </span>
        </div>
    );
};

// ─── Leave & Time Off Tile ─────────────────────────────────────────────────────

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

    const totalAvailable = balances.reduce((acc, b) => {
        if (b.policyAccrualAmount === 0) return acc;
        const total = (b.openingBalance || 0) + (b.accrued || 0) || b.policyAccrualAmount || b.allocated || 0;
        const rem = b.closingBalance ?? b.remaining ?? (Math.max(total - (b.utilized || 0), 0)) ?? b.balance ?? 0;
        return acc + (typeof rem === 'number' ? rem : 0);
    }, 0);

    const RING_COLORS = [
        { ring: 'text-emerald-500', track: 'text-emerald-100/60' },
        { ring: 'text-teal-500', track: 'text-teal-100/60' },
        { ring: 'text-indigo-500', track: 'text-indigo-100/60' },
        { ring: 'text-purple-500', track: 'text-purple-100/60' },
        { ring: 'text-cyan-500', track: 'text-cyan-100/60' }
    ];

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
            ) : balances.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <Calendar size={18} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">No leave policies allocated yet.</p>
                    <Link to="/leaves" className="mt-1 inline-flex text-xs font-bold text-indigo-600 hover:underline">
                        View Balance Details →
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Complete Total Balance Banner */}
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-100/90 p-1.5 px-2.5">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Total Leave Balance</span>
                        <span className="rounded-full bg-emerald-600 text-white px-2 py-0.2 text-[10px] font-black shadow-2xs">
                            {totalAvailable} Days
                        </span>
                    </div>

                    {/* Flexible Circular Breakdown Across All Policies */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-100/80 p-2 overflow-x-auto scrollbar-none">
                        <div className={`flex items-start gap-2.5 py-0.5 min-w-max ${balances.length <= 3 ? 'justify-around w-full' : 'justify-start'}`}>
                            {balances.map((b, i) => {
                                const total = (b.openingBalance || 0) + (b.accrued || 0) || b.policyAccrualAmount || b.allocated || 12;
                                const remaining = b.closingBalance ?? b.remaining ?? (Math.max(total - (b.utilized || 0), 0)) ?? b.balance ?? 0;
                                const isUnlimited = b.policyAccrualAmount === 0;
                                const colors = RING_COLORS[i % RING_COLORS.length];

                                return (
                                    <CircularLeaveGauge
                                        key={i}
                                        label={b.policyName || b.leaveType || b.type}
                                        remaining={remaining}
                                        total={total}
                                        isUnlimited={isUnlimited}
                                        ringColor={colors.ring}
                                        trackColor={colors.track}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Expense Claims Tile ───────────────────────────────────────────────────────

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
                <div className="space-y-2.5">
                    {/* Financial Metrics Strip */}
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-2 text-center">
                            <span className="text-sm font-black text-amber-800">{stats?.pending || 0}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 block mt-0.5">Pending</span>
                        </div>
                        <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-2 text-center">
                            <span className="text-sm font-black text-purple-800">{formatINR(stats?.totalClaimed || 0)}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-purple-600 block mt-0.5">Claimed</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onSubmit}
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-xs font-bold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 transition-all cursor-pointer"
                    >
                        <Plus size={12} /> Submit Claim
                    </button>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Payroll & Payslip Tile ────────────────────────────────────────────────────

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
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMasked(!masked);
                            }}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title={masked ? 'Show amount' : 'Hide amount'}
                        >
                            {masked ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <CardActionLink to="/ess/payslips" label="Statements" />
                    </div>
                }
            />

            {loading ? (
                <LoadingSkeleton />
            ) : latest ? (
                <div className="space-y-2">
                    <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-2.5 px-3 text-white shadow-inner">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                            Net Take-Home
                        </span>
                        <span className="font-mono text-sm sm:text-base font-extrabold text-white mt-0.5 block">
                            {masked ? '₹ •••••••' : formatINR(netAmount)}
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-0.5">
                            {latest.period || (latest.month && latest.year ? `${format(new Date(latest.year, latest.month - 1), 'MMM yyyy')}` : 'Latest Statement')}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-600">
                        <span>Gross Salary:</span>
                        <span className="font-bold text-slate-900">
                            {masked ? '₹ •••••' : formatINR(grossAmount)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <Banknote size={18} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">Access and download your monthly salary slips.</p>
                    <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-indigo-600 hover:underline">
                        Open Archive <ArrowRight size={11} />
                    </span>
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Helpdesk Support Tile ─────────────────────────────────────────────────────

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
            ) : queries.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <LifeBuoy size={18} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">No active support tickets.</p>
                    <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-indigo-600 hover:underline">
                        Raise a Query →
                    </span>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {queries.slice(0, 2).map((q) => (
                        <div key={q._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-2 border border-slate-100">
                            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800 pr-1.5">
                                {q.subject || q.title || q.queryType}
                            </p>
                            <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLORS[q.status] || STATUS_COLORS['Open']}`}>
                                {q.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Upcoming Holidays Tile ───────────────────────────────────────────────────

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
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <CalendarDays size={18} className="mx-auto text-slate-300 mb-1" />
                    <p className="text-xs text-slate-500">No upcoming company holidays found.</p>
                    <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-indigo-600 hover:underline">
                        View Calendar →
                    </span>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {upcoming.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50/60 p-1.5 px-2 border border-slate-100">
                            <div className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-lg bg-cyan-100/60 text-cyan-800 font-bold border border-cyan-200">
                                <span className="text-[6px] uppercase tracking-wider text-cyan-700 leading-none">{format(new Date(h.date), 'MMM')}</span>
                                <span className="text-xs font-black leading-none mt-0.5">{format(new Date(h.date), 'dd')}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-slate-900 leading-tight">{h.name}</p>
                                <p className="text-[9px] text-slate-400 leading-tight">{format(new Date(h.date), 'EEEE')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PremiumCard>
    );
};

// ─── Main ESS Dashboard Component ─────────────────────────────────────────────

const EssDashboard = () => {
    const { user, hasModule } = useAuth();
    const [showSubmitClaim, setShowSubmitClaim] = useState(false);

    const showLeave         = hasModule('leaves');
    const showAttendance    = hasModule('attendance');
    const showReimburse     = hasModule('reimbursements');
    const showHelpdesk      = hasModule('helpdesk');
    const showHolidays      = hasModule('holidays');

    return (
        <div className="bg-[#F8FAFC] min-h-[calc(100vh-4rem)] p-3 sm:p-5 lg:p-6">
            <div className="mx-auto max-w-6xl">
                {/* 2x3 Compact Responsive Grid */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
