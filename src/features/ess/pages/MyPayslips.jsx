import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Banknote, FileText, Download, Calendar,
    CheckCircle2, Clock, Loader, Search, RefreshCw, ShieldCheck, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import { fmtMoney } from '@/features/payroll/utils/payroll';
import PayslipModal from '@/features/payroll/components/PayslipModal';

const MyPayslips = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [profile, setProfile]             = useState(null);
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [loading, setLoading]             = useState(true);
    const [search, setSearch]               = useState('');
    const [viewingPayslip, setViewingPayslip] = useState(null);

    const loadData = useCallback(async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const [dossierRes, configRes] = await Promise.allSettled([
                api.get(`/dossier/${user._id}`),
                api.get('/payroll/config')
            ]);

            if (dossierRes.status === 'fulfilled') {
                setProfile(dossierRes.value.data);
            }
            if (configRes.status === 'fulfilled') {
                setPayrollConfig(configRes.value.data);
            }
        } catch (err) {
            console.error('Failed to load payslip data:', err);
            toast.error('Failed to load payslips.');
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getBreakupData = () => {
        if (!profile) return null;

        const breakup = profile.compensation?.salaryBreakup || {};
        const payType = profile.compensation?.payType || breakup.payType || 'salaried';
        
        return {
            monthlyCTC: profile.compensation?.ctc || 0,
            basicMaster: breakup.basicMaster || ((profile.compensation?.ctc || 0) * 0.4),
            hraMaster: breakup.hraMaster || ((profile.compensation?.ctc || 0) * 0.2),
            flexi: breakup.flexi || ((profile.compensation?.ctc || 0) * 0.3),
            pfEmployee: breakup.pfEmployee || 1800,
            esiEmployee: breakup.esiEmployee || 0,
            professionalTax: breakup.professionalTax || 200,
            tds: breakup.tds || 0,
            totalEarnings: breakup.totalEarnings || (profile.compensation?.ctc || 0),
            totalDeductions: breakup.totalDeductions || 2000,
            netTakeHome: breakup.netTakeHome || ((profile.compensation?.ctc || 0) - 2000),
            pfEnabled: breakup.pfEnabled !== false,
            esiEnabled: breakup.esiEnabled !== false,
            ptEnabled: breakup.ptEnabled !== false
        };
    };

    const getPayslipComponents = (payrollItem) => {
        if (!profile || !payrollItem) return null;

        const activeBreakup = getBreakupData();
        if (!activeBreakup) return null;

        const activeNet = activeBreakup.netTakeHome || 1;
        const scale = (payrollItem.netSalary || payrollItem.netPay || activeNet) / activeNet;

        return {
            basic: Math.round((activeBreakup.basicMaster || 20000) * scale),
            hra: Math.round((activeBreakup.hraMaster || 10000) * scale),
            flexi: Math.round((activeBreakup.flexi || 15000) * scale),
            pfEmployee: Math.round((activeBreakup.pfEmployee || 1800) * scale),
            esiEmployee: Math.round((activeBreakup.esiEmployee || 0) * scale),
            pt: Math.round((activeBreakup.professionalTax || 200) * scale),
            tds: Math.round((activeBreakup.tds || 0) * scale),
            gross: Math.round((activeBreakup.totalEarnings || 45000) * scale),
            deductions: Math.round((activeBreakup.totalDeductions || 2000) * scale),
            net: payrollItem.netSalary || payrollItem.netPay || 43000
        };
    };

    const history = profile?.compensation?.payrollHistory || profile?.payrollHistory || [];
    
    // Sort history chronologically descending
    const sortedHistory = [...history].sort((a, b) => new Date(b.processedDate || b.createdAt || 0) - new Date(a.processedDate || a.createdAt || 0));

    const filtered = search.trim()
        ? sortedHistory.filter(p => p.period?.toLowerCase().includes(search.toLowerCase()))
        : sortedHistory;

    const latest = sortedHistory[0] || null;
    const annualCTC = (profile?.compensation?.ctc || 0) * 12;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-100 bg-white px-6 py-4">
                <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/ess')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 shrink-0"
                            aria-label="Back to My Space"
                            title="Back to My Space"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">My Payslips & Salary Statements</h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Official monthly salary statements and tax deduction slips
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by pay period (e.g. August 2026)..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                {/* Payslips Row-wise List */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/60 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-800">Monthly Salary Statements</h2>
                        <span className="text-xs font-semibold text-slate-500">{filtered.length} Record{filtered.length === 1 ? '' : 's'}</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size={32} className="animate-spin text-blue-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
                                <FileText size={28} />
                            </div>
                            <p className="text-base font-semibold text-slate-700">No payslips available</p>
                            <p className="mt-1 text-sm text-slate-400 max-w-sm">
                                Your monthly payslips will be published here once processed by the Finance & HR department.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((pay) => {
                                const comps = getPayslipComponents(pay);
                                return (
                                    <div
                                        key={pay._id || pay.period}
                                        onClick={() => setViewingPayslip(pay)}
                                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-105 transition-all">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {pay.period}
                                                    </h3>
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border
                                                        ${pay.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                          pay.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                          'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                        <CheckCircle2 size={11} className={pay.status === 'Paid' ? 'text-emerald-500' : 'text-slate-400'} />
                                                        {pay.status || 'Paid'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {pay.processedDate ? `Disbursed on ${format(new Date(pay.processedDate), 'dd MMMM yyyy')}` : 'Direct Bank Transfer'}
                                                    {pay.paymentMode ? ` · ${pay.paymentMode}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <div className="text-left sm:text-right">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Take-Home</span>
                                                <span className="text-base font-extrabold text-slate-900">
                                                    {fmtMoney(pay.netSalary || pay.netPay)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {pay.payslipUrl && (
                                                    <a
                                                        href={pay.payslipUrl.startsWith('http') ? pay.payslipUrl : `${api.defaults?.baseURL?.replace('/api/v1', '') || ''}${pay.payslipUrl}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                                                        title="Download Official Payslip PDF"
                                                    >
                                                        <Download size={14} />
                                                        PDF
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingPayslip(pay);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                                                >
                                                    <FileText size={14} />
                                                    View Statement
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Payslip Modal */}
            {viewingPayslip && (
                <PayslipModal
                    viewingPayslip={viewingPayslip}
                    setViewingPayslip={setViewingPayslip}
                    profile={profile}
                    getPayslipComponents={getPayslipComponents}
                />
            )}
        </div>
    );
};

export default MyPayslips;
