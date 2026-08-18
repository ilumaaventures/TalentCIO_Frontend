import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar, Clock, FileText, ReceiptText, FileStack, LifeBuoy,
    CalendarDays, Megaphone, User, CheckCircle2, AlertCircle,
    ChevronRight, Loader, Sun, TrendingUp, Bell, Gift, ArrowUpRight,
    Banknote, BookOpen, LogOut, UserPlus, Timer
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import { getMyClaims, getMyStats as getReimbStats } from '@/features/reimbursement/api/reimbursementApi';
import { getEmployeeDocuments } from '@/features/ess-documents/api/essDocumentApi';
import { formatINR } from '@/features/reimbursement/utils/reimbursementConstants';
import SubmitClaimModal from '@/features/reimbursement/components/SubmitClaimModal';

// ─── Tile primitives ──────────────────────────────────────────────────────────

const Tile = ({ children, className = '', onClick, to }) => {
    const base = `rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 ${onClick || to ? 'cursor-pointer' : ''} ${className}`;
    if (to) return <Link to={to} className={base}>{children}</Link>;
    if (onClick) return <div className={base} onClick={onClick}>{children}</div>;
    return <div className={base}>{children}</div>;
};

const TileHeader = ({ icon: Icon, title, iconBg = 'bg-blue-100', iconColor = 'text-blue-600', action }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                <Icon size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
        </div>
        {action}
    </div>
);

const TileLink = ({ to, children }) => (
    <Link to={to} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
        {children} <ChevronRight size={12} />
    </Link>
);

const LoadingShim = () => (
    <div className="space-y-2 animate-pulse">
        <div className="h-3 rounded bg-slate-100 w-3/4" />
        <div className="h-3 rounded bg-slate-100 w-1/2" />
    </div>
);

// ─── Greeting header ──────────────────────────────────────────────────────────

const GreetingHeader = ({ user }) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const hour = time.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="rounded-2xl bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 p-5 text-white shadow-md shadow-slate-400/20">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-slate-300 text-xs font-medium">{greeting} 👋</p>
                    <h1 className="mt-0.5 text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
                    <p className="mt-1 text-slate-300 text-xs">
                        {user?.designation || user?.department || 'Team Member'} · {format(time, 'EEEE, dd MMMM yyyy')}
                    </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-white/10 bg-white/10">
                    {user?.profilePicture
                        ? <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                        : <span className="text-lg font-bold">{user?.firstName?.charAt(0)}</span>}
                </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <Timer size={11} />
                <span>{format(time, 'h:mm a')}</span>
            </div>
        </div>
    );
};

// ─── Leave Tile ───────────────────────────────────────────────────────────────

const LeaveTile = () => {
    const [balances, setBalances]   = useState([]);
    const [loading, setLoading]     = useState(true);

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
        <Tile to="/leaves" className="p-5">
            <TileHeader icon={Calendar} title="Leave" iconBg="bg-green-100" iconColor="text-green-600"
                action={<TileLink to="/leaves">View All</TileLink>} />
            {loading ? <LoadingShim /> : types.length === 0 ? (
                <p className="text-xs text-slate-400">No leave balance data.</p>
            ) : (
                <div className="space-y-2.5">
                    {types.map((b, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600 truncate">{b.policyName || b.leaveType || b.type}</span>
                            <span className="ml-2 rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                {b.policyAccrualAmount === 0 ? 'Unlimited' : `${b.closingBalance ?? b.remaining ?? b.balance ?? 0} days`}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Tile>
    );
};

// ─── Attendance Tile ──────────────────────────────────────────────────────────

const AttendanceTile = () => {
    const [today, setToday]             = useState(null);
    const [loading, setLoading]         = useState(true);
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
                toast.success('Checked In successfully! Have a great day.');
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
                toast.success('Checked Out successfully! See you tomorrow.');
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
        <Tile className="p-5">
            <TileHeader
                icon={Clock}
                title="Attendance"
                iconBg="bg-orange-100"
                iconColor="text-orange-600"
                action={<TileLink to="/attendance">Details</TileLink>}
            />

            {loading ? (
                <LoadingShim />
            ) : (
                <div className="space-y-3">
                    {/* Today's Date Banner */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={14} className="text-orange-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-700">
                                {format(new Date(), 'EEEE, dd MMM yyyy')}
                            </span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border
                            ${isClockedIn  ? 'bg-green-50 text-green-700 border-green-200' :
                              isClockedOut ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-rose-50 text-rose-600 border-rose-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isClockedIn ? 'bg-green-500 animate-pulse' : isClockedOut ? 'bg-purple-500' : 'bg-rose-400'}`} />
                            {isClockedIn ? 'Clocked In' : isClockedOut ? 'Clocked Out' : 'Not Clocked In'}
                        </span>
                    </div>

                    {/* Clock In / Out Timing info */}
                    {today?.clockIn && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Check In Time</span>
                                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                                    {format(new Date(today.clockIn), 'hh:mm a')}
                                </span>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Check Out Time</span>
                                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                                    {today.clockOut ? format(new Date(today.clockOut), 'hh:mm a') : '— Active —'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Interactive Action Buttons */}
                    <div>
                        {isNotStarted && (
                            <button
                                type="button"
                                onClick={handleClockIn}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 py-2.5 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-green-700 disabled:opacity-60 transition-all cursor-pointer"
                            >
                                {actionLoading ? <Loader size={14} className="animate-spin" /> : <Clock size={14} />}
                                Check In Now
                            </button>
                        )}

                        {isClockedIn && (
                            <button
                                type="button"
                                onClick={handleClockOut}
                                disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-2.5 text-xs font-bold text-white shadow-sm hover:from-rose-700 hover:to-amber-700 disabled:opacity-60 transition-all cursor-pointer"
                            >
                                {actionLoading ? <Loader size={14} className="animate-spin" /> : <LogOut size={14} />}
                                Check Out
                            </button>
                        )}

                        {isClockedOut && (
                            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 border border-purple-100 py-2 text-xs font-bold text-purple-700">
                                <CheckCircle2 size={14} className="text-purple-600" />
                                Shift Completed for Today
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Tile>
    );
};

// ─── Reimbursement Tile ───────────────────────────────────────────────────────

const ReimbursementTile = ({ onSubmit }) => {
    const [stats, setStats]     = useState(null);
    const [recent, setRecent]   = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getReimbStats(), getMyClaims({ page: 1, limit: 3 })])
            .then(([sr, cr]) => { setStats(sr.data?.stats); setRecent(cr.data?.claims || []); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const STATUS_COLORS = {
        'Pending': 'text-amber-600', 'L1 Approved': 'text-blue-600', 'L2 Approved': 'text-indigo-600',
        'Approved': 'text-green-600', 'Rejected': 'text-red-600', 'Reimbursed': 'text-purple-600', 'Cancelled': 'text-slate-400'
    };

    return (
        <Tile className="p-5">
            <TileHeader icon={ReceiptText} title="Reimbursements" iconBg="bg-purple-100" iconColor="text-purple-600"
                action={<TileLink to="/ess/reimbursements">View All</TileLink>} />
            {loading ? <LoadingShim /> : (
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <div className="flex-1 rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                            <p className="text-lg font-bold text-amber-700">{stats?.pending || 0}</p>
                            <p className="text-[10px] text-amber-600 font-semibold uppercase">Pending</p>
                        </div>
                        <div className="flex-1 rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
                            <p className="text-lg font-bold text-purple-700">{formatINR(stats?.totalClaimed || 0)}</p>
                            <p className="text-[10px] text-purple-600 font-semibold uppercase">Total Claimed</p>
                        </div>
                    </div>
                    {recent.slice(0, 2).map(c => (
                        <div key={c._id} className="flex items-center justify-between py-1.5 border-t border-slate-50">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{c.category}</p>
                                <p className={`text-[10px] font-bold ${STATUS_COLORS[c.status] || 'text-slate-500'}`}>{c.status}</p>
                            </div>
                            <p className="text-xs font-bold text-slate-800 shrink-0 ml-2">{formatINR(c.amount)}</p>
                        </div>
                    ))}
                    <button
                        onClick={onSubmit}
                        className="w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors"
                    >
                        + Submit Claim
                    </button>
                </div>
            )}
        </Tile>
    );
};

// ─── Documents Tile ───────────────────────────────────────────────────────────

const DocumentsTile = () => {
    const [docs, setDocs]       = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getEmployeeDocuments({ page: 1, limit: 5 })
            .then(r => setDocs(r.data?.documents || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const unread = docs.filter(d => d.requiresAcknowledgement && !d.viewerAcknowledged).length;

    return (
        <Tile to="/ess/documents" className="p-5">
            <TileHeader icon={FileStack} title="Company Docs" iconBg="bg-indigo-100" iconColor="text-indigo-600"
                action={<TileLink to="/ess/documents">View All</TileLink>} />
            {loading ? <LoadingShim /> : (
                <div className="space-y-2">
                    {unread > 0 && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                            <Bell size={13} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700 font-semibold">{unread} document{unread > 1 ? 's' : ''} require{unread === 1 ? 's' : ''} acknowledgement</p>
                        </div>
                    )}
                    {docs.slice(0, 3).map(d => (
                        <div key={d._id} className="flex items-center gap-2 py-1">
                            <FileText size={13} className="text-indigo-400 shrink-0" />
                            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{d.title}</p>
                            {d.viewerAcknowledged
                                ? <CheckCircle2 size={12} className="shrink-0 text-green-500" />
                                : d.requiresAcknowledgement ? <AlertCircle size={12} className="shrink-0 text-amber-500" /> : null}
                        </div>
                    ))}
                    {docs.length === 0 && <p className="text-xs text-slate-400">No documents published yet.</p>}
                </div>
            )}
        </Tile>
    );
};

// ─── Payslip Tile ─────────────────────────────────────────────────────────────

const PayslipTile = () => {
    const [latest, setLatest]   = useState(null);
    const [loading, setLoading] = useState(true);
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
                        period: 'Active Salary Structure',
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

    return (
        <Tile to="/ess/payslips" className="p-5">
            <TileHeader
                icon={Banknote}
                title="Payslip"
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                action={<TileLink to="/ess/payslips">View</TileLink>}
            />
            {loading ? (
                <LoadingShim />
            ) : latest ? (
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Net Pay</span>
                        <span className="text-sm font-bold text-slate-900">{formatINR(latest.netSalary || latest.netPay)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Gross Pay</span>
                        <span className="text-xs font-semibold text-slate-700">{formatINR(latest.grossSalary || latest.gross || (latest.netSalary ? Math.round(latest.netSalary * 1.12) : 0))}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Deductions</span>
                        <span className="text-xs font-semibold text-red-600">{formatINR(latest.totalDeductions || (latest.netSalary ? Math.round(latest.netSalary * 0.12) : 0))}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-50 font-medium">
                        {latest.period || (latest.month && latest.year ? `${format(new Date(latest.year, latest.month - 1), 'MMMM yyyy')}` : 'Latest payslip')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-slate-400">View and download your monthly salary statements.</p>
                    <span className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline">
                        Open Payslips →
                    </span>
                </div>
            )}
        </Tile>
    );
};

// ─── Helpdesk Tile ────────────────────────────────────────────────────────────

const HelpdeskTile = () => {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/helpdesk/my-queries?limit=3')
            .then(r => setQueries(r.data?.queries || r.data?.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const STATUS_COLORS = {
        Open: 'bg-blue-50 text-blue-700 border-blue-100',
        Resolved: 'bg-green-50 text-green-700 border-green-100',
        Closed: 'bg-slate-50 text-slate-500 border-slate-200'
    };

    return (
        <Tile to="/helpdesk" className="p-5">
            <TileHeader icon={LifeBuoy} title="Helpdesk" iconBg="bg-rose-100" iconColor="text-rose-600"
                action={<TileLink to="/helpdesk">View All</TileLink>} />
            {loading ? <LoadingShim /> : (
                <div className="space-y-2">
                    {queries.length === 0
                        ? <p className="text-xs text-slate-400">No open tickets. <Link to="/helpdesk" className="text-blue-600 font-semibold hover:underline">Raise a query?</Link></p>
                        : queries.slice(0, 3).map(q => (
                            <div key={q._id} className="flex items-start gap-2 py-1">
                                <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[q.status] || STATUS_COLORS['Open']}`}>
                                    {q.status}
                                </span>
                                <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{q.subject || q.title || q.queryType}</p>
                            </div>
                        ))}
                </div>
            )}
        </Tile>
    );
};

// ─── Holidays Tile ────────────────────────────────────────────────────────────

const HolidaysTile = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        api.get(`/holidays?from=${today}&limit=4`)
            .then(r => setHolidays(Array.isArray(r.data) ? r.data : (r.data?.holidays || [])))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const upcoming = holidays
        .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
        .slice(0, 3);

    return (
        <Tile to="/holidays" className="p-5">
            <TileHeader icon={CalendarDays} title="Upcoming Holidays" iconBg="bg-teal-100" iconColor="text-teal-600"
                action={<TileLink to="/holidays">Calendar</TileLink>} />
            {loading ? <LoadingShim /> : (
                <div className="space-y-2.5">
                    {upcoming.length === 0
                        ? <p className="text-xs text-slate-400">No upcoming holidays found.</p>
                        : upcoming.map((h, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-center">
                                    <p className="text-[10px] font-bold text-teal-600 leading-none">{format(new Date(h.date), 'MMM')}</p>
                                    <p className="text-sm font-black text-teal-800 leading-none">{format(new Date(h.date), 'dd')}</p>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-slate-800">{h.name}</p>
                                    <p className="text-[10px] text-slate-400">{format(new Date(h.date), 'EEEE')}</p>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </Tile>
    );
};

// ─── Announcements Tile ────────────────────────────────────────────────────────

const AnnouncementsTile = () => {
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/announcements?limit=3')
            .then(r => setItems(r.data?.announcements || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <Tile to="/announcements" className="p-5">
            <TileHeader icon={Megaphone} title="Announcements" iconBg="bg-yellow-100" iconColor="text-yellow-600"
                action={<TileLink to="/announcements">Feed</TileLink>} />
            {loading ? <LoadingShim /> : (
                <div className="space-y-2.5">
                    {items.length === 0
                        ? <p className="text-xs text-slate-400">No recent announcements.</p>
                        : items.map(a => (
                            <div key={a._id} className="pb-2.5 border-b border-slate-50 last:border-0 last:pb-0">
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{a.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {a.publishedAt ? formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true }) : ''}
                                </p>
                            </div>
                        ))}
                </div>
            )}
        </Tile>
    );
};

// ─── Profile & Onboarding Tile ────────────────────────────────────────────────

const ProfileTile = ({ user }) => {
    const [onboarding, setOnboarding] = useState(null);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        // Check if user is in active onboarding/offboarding
        api.get(`/onboarding?employeeId=${user?._id}&status=active&limit=1`)
            .then(r => setOnboarding(r.data?.onboardings?.[0] || null))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user?._id]);

    return (
        <Tile to="/profile" className="p-5">
            <TileHeader icon={User} title="My Profile" iconBg="bg-slate-100" iconColor="text-slate-600"
                action={<TileLink to="/profile">Edit</TileLink>} />
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-blue-600 font-bold text-lg ring-2 ring-blue-100">
                    {user?.profilePicture
                        ? <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                        : user?.firstName?.charAt(0)}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.employeeCode} · {user?.department}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
            </div>
            {!loading && onboarding && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                    <UserPlus size={13} className="text-blue-500 shrink-0" />
                    <p className="text-xs text-blue-700 font-semibold">Onboarding in progress — {onboarding.completionPercentage || 0}% complete</p>
                </div>
            )}
        </Tile>
    );
};

// ─── ESS Dashboard ────────────────────────────────────────────────────────────

const EssDashboard = () => {
    const { user, hasModule } = useAuth();
    const [showSubmitClaim, setShowSubmitClaim] = useState(false);

    const showLeave       = hasModule('leaves');
    const showAttendance  = hasModule('attendance');
    const showReimburse   = hasModule('reimbursements');
    const showDocuments   = hasModule('essDocuments');
    const showHelpdesk    = hasModule('helpdesk');
    const showHolidays    = hasModule('holidays');
    const showAnnouncements = hasModule('announcements');

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
                {/* Greeting */}
                <GreetingHeader user={user} />

                {/* Main grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <ProfileTile user={user} />
                    {showLeave       && <LeaveTile />}
                    {showAttendance  && <AttendanceTile />}
                    {showReimburse   && <ReimbursementTile onSubmit={() => setShowSubmitClaim(true)} />}
                    {showDocuments   && <DocumentsTile />}
                    <PayslipTile />
                    {showHelpdesk    && <HelpdeskTile />}
                    {showHolidays    && <HolidaysTile />}
                    {showAnnouncements && <AnnouncementsTile />}
                </div>

                {/* Quick actions footer */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Links</p>
                    <div className="flex flex-wrap gap-2">
                        {showLeave       && <Link to="/leaves"       className="flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"><Calendar size={13}   /> Apply Leave</Link>}
                        {showReimburse   && <button onClick={() => setShowSubmitClaim(true)} className="flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"><ReceiptText size={13} /> Submit Claim</button>}
                        {showDocuments   && <Link to="/ess/documents" className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"><FileStack size={13}  /> Company Docs</Link>}
                        {showHelpdesk    && <Link to="/helpdesk"      className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"><LifeBuoy size={13}   /> Raise Query</Link>}
                        <Link to="/profile" className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"><User size={13} /> My Profile</Link>
                    </div>
                </div>
            </div>

            {showSubmitClaim && (
                <SubmitClaimModal onClose={() => setShowSubmitClaim(false)} onSuccess={() => {}} />
            )}
        </div>
    );
};

export default EssDashboard;
