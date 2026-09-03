import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  Download, 
  Search, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Loader2, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building2,
  DollarSign,
  User as UserIcon,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import { fmtMoney } from '@/features/payroll/utils/payroll';
import PayslipModal from './PayslipModal';
import AddPayrollModal from './AddPayrollModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayrollPayslips = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin', 'HR Admin'].includes(role))
    || user?.permissions?.includes('*')
    || user?.permissions?.includes('payroll.salary.manage');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'single'

  // Monthly Roll Data (All eligible employees)
  const [monthlyData, setMonthlyData] = useState({
    period: '',
    totalEligible: 0,
    generatedCount: 0,
    pendingCount: 0,
    totalDisbursed: 0,
    employees: []
  });
  const [loadingRoll, setLoadingRoll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'generated' | 'pending'
  const [deptFilter, setDeptFilter] = useState('all');

  // Single Employee Profile View
  const [selectedUserId, setSelectedUserId] = useState(user?._id || '');
  const [singleProfile, setSingleProfile] = useState(null);
  const [loadingSingle, setLoadingSingle] = useState(false);

  // Modals
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [activeModalProfile, setActiveModalProfile] = useState(null);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [modalTargetUserId, setModalTargetUserId] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [payNetSalary, setPayNetSalary] = useState('');
  const [payStatus, setPayStatus] = useState('Paid');

  // Reset Month for Sync State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingRoll, setResettingRoll] = useState(false);

  // Load Monthly Roll (Eligible employees for selected month)
  const loadMonthlyRoll = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingRoll(true);
    try {
      const res = await api.get(`/payroll/monthly-roll?month=${selectedMonth}&year=${selectedYear}`);
      setMonthlyData(res.data || {});
    } catch (err) {
      console.error('Failed to load monthly payroll roll:', err);
      toast.error('Failed to load eligible employees for payslips.');
    } finally {
      setLoadingRoll(false);
    }
  }, [isAdmin, selectedMonth, selectedYear]);

  // Load single user dossier
  const loadSingleProfile = useCallback(async (targetId) => {
    const uid = targetId || selectedUserId || user?._id;
    if (!uid) return;

    setLoadingSingle(true);
    try {
      const res = await api.get(`/dossier/${uid}`);
      setSingleProfile(res.data);
    } catch (err) {
      console.error('Failed to load employee dossier profile:', err);
      toast.error('Failed to load employee statement history.');
    } finally {
      setLoadingSingle(false);
    }
  }, [selectedUserId, user?._id]);

  useEffect(() => {
    if (isAdmin) {
      loadMonthlyRoll();
    } else {
      loadSingleProfile(user?._id);
    }
  }, [isAdmin, loadMonthlyRoll, loadSingleProfile, user?._id]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const current = new Date();
    setSelectedMonth(current.getMonth() + 1);
    setSelectedYear(current.getFullYear());
  };

  // Departments list for filter
  const departments = useMemo(() => {
    const depts = new Set();
    (monthlyData.employees || []).forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [monthlyData.employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    const list = monthlyData.employees || [];
    const term = searchTerm.toLowerCase().trim();

    return list.filter(emp => {
      if (term) {
        const matches = emp.fullName?.toLowerCase().includes(term)
          || emp.email?.toLowerCase().includes(term)
          || emp.employeeCode?.toLowerCase().includes(term)
          || emp.department?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      if (statusFilter === 'generated' && !emp.hasPayslip) return false;
      if (statusFilter === 'pending' && emp.hasPayslip) return false;

      if (deptFilter !== 'all' && emp.department !== deptFilter) return false;

      return true;
    });
  }, [monthlyData.employees, searchTerm, statusFilter, deptFilter]);

  // Handle opening add payroll modal pre-filled for an employee
  const handleOpenAddPayslip = (emp) => {
    setModalTargetUserId(emp._id);
    setPayPeriod(monthlyData.period || `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`);
    setPayNetSalary(String(emp.estimatedTakeHome || emp.ctc || 50000));
    setPayStatus('Paid');
    setShowPayrollModal(true);
  };

  // Handle save from AddPayrollModal
  const handleAddPayrollSubmit = async () => {
    if (!payPeriod || !payNetSalary) {
      toast.error('Please enter period and net salary');
      return;
    }

    const newPayroll = {
      period: payPeriod,
      netSalary: parseFloat(payNetSalary) || 0,
      status: payStatus,
      payslipUrl: ''
    };

    try {
      const targetId = modalTargetUserId || selectedUserId || user?._id;
      // Fetch target user compensation first
      const dossierRes = await api.get(`/dossier/${targetId}`);
      const profileData = dossierRes.data || {};
      const existingPayroll = profileData.compensation?.payrollHistory || [];
      const updatedPayroll = [...existingPayroll, newPayroll].sort((a, b) => b.period.localeCompare(a.period));

      await api.patch(`/dossier/${targetId}/compensation`, {
        ...profileData.compensation,
        payrollHistory: updatedPayroll
      });

      toast.success('Payslip record generated successfully');
      setShowPayrollModal(false);
      setPayPeriod('');
      setPayNetSalary('');

      if (viewMode === 'monthly') {
        loadMonthlyRoll();
      } else {
        loadSingleProfile(targetId);
      }
    } catch (err) {
      console.error('Error saving payslip record:', err);
      toast.error('Failed to create payslip statement');
    }
  };

  // Handle view statement modal
  const handleViewStatement = async (emp, payslipItem) => {
    try {
      const dossierRes = await api.get(`/dossier/${emp._id}`);
      setActiveModalProfile(dossierRes.data);
      setViewingPayslip(payslipItem || emp.payslip);
    } catch (err) {
      console.error('Failed to load profile for payslip modal', err);
      toast.error('Failed to load full employee payslip statement.');
    }
  };

  // Payslip components breakdown calculation for modal
  const getModalPayslipComponents = (payrollItem) => {
    if (!activeModalProfile || !payrollItem) return null;
    const breakup = activeModalProfile.compensation?.salaryBreakup instanceof Map
      ? Object.fromEntries(activeModalProfile.compensation.salaryBreakup)
      : (activeModalProfile.compensation?.salaryBreakup || {});

    const ctc = Number(activeModalProfile.compensation?.ctc || breakup.monthlyCTC || (Number(breakup.annualCTC) / 12) || 50000);
    const activeNet = Number(breakup.netTakeHome || ctc);

    let net = Number(payrollItem.netSalary || payrollItem.netPay || 0);
    if (!net || net <= 100) {
      net = activeNet;
    }

    const scale = activeNet > 0 ? (net / activeNet) : 1;
    const safeScale = (scale >= 0.05 && scale <= 10) ? scale : 1;

    const rawBasic = Number(breakup.basic || breakup.basicMaster || (ctc * 0.5));
    const rawHra = Number(breakup.hra || breakup.hraMaster || (rawBasic * 0.5));
    const rawFlexi = Number(breakup.flexi) || Number(breakup.specialAllowance) || Math.max(0, ctc - rawBasic - rawHra);

    // If prorated (e.g. scale < 0.99), prorate each component proportionally
    const basic = Math.round(rawBasic * safeScale * 100) / 100;
    const hra = Math.round(rawHra * safeScale * 100) / 100;
    const flexi = Math.round((net - basic - hra) * 100) / 100 > 0
      ? Math.round((net - basic - hra) * 100) / 100
      : Math.round(rawFlexi * safeScale * 100) / 100;

    const isPf = activeModalProfile.compensation?.pfEnabled || breakup.pfEnabled;
    const isEsi = activeModalProfile.compensation?.esiEnabled || breakup.esiEnabled;
    const isPt = activeModalProfile.compensation?.ptEnabled || breakup.ptEnabled;
    const isTds = activeModalProfile.compensation?.tdsEnabled || breakup.tdsEnabled;

    const pfEmployee = isPf ? Math.round(Number(breakup.pfEmployee || 1800) * safeScale) : 0;
    const esiEmployee = isEsi ? Math.round(Number(breakup.esiEmployee || 0) * safeScale) : 0;
    const pt = isPt ? Math.round(Number(breakup.professionalTax || 200) * safeScale) : 0;
    const tds = isTds ? Math.round(Number(breakup.tds || 0) * safeScale) : 0;

    const gross = Math.round((basic + hra + flexi) * 100) / 100;
    const deductions = pfEmployee + esiEmployee + pt + tds;

    return {
      basic,
      hra,
      flexi,
      pfEmployee,
      esiEmployee,
      pt,
      tds,
      gross,
      deductions,
      net: net || (gross - deductions),
      scale: safeScale
    };
  };

  // Switch to single employee history
  const handleInspectEmployee = (empId) => {
    setSelectedUserId(empId);
    setViewMode('single');
    loadSingleProfile(empId);
  };

  const periodLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  const handleResetMonthRoll = async () => {
    setResettingRoll(true);
    try {
      const res = await api.post('/payroll/reset-monthly-roll', {
        month: selectedMonth,
        year: selectedYear
      });
      toast.success(res.data?.message || `Payslips for ${periodLabel} reset successfully.`);
      setShowResetConfirm(false);
      await loadMonthlyRoll();
    } catch (err) {
      console.error('Failed to reset monthly roll:', err);
      toast.error(err.response?.data?.message || 'Failed to reset payslips for this month.');
    } finally {
      setResettingRoll(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Top Bar: Title, Month Selector, and View Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileText size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {viewMode === 'monthly' ? 'Monthly Payslips Directory' : 'Employee Statement History'}
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {periodLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review eligible employees, check payslip generation status, and disburse official statements.
          </p>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-2 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors bg-white cursor-pointer"
          >
            Today
          </button>

          {isAdmin && viewMode === 'monthly' && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={resettingRoll || loadingRoll}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 px-3 py-2 rounded-xl border border-rose-200 hover:border-rose-300 transition-colors bg-rose-50/80 hover:bg-rose-100/80 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={`Reset ${periodLabel} payslips to clear records and prepare for fresh sync from Flance`}
            >
              <RotateCcw size={14} className={resettingRoll ? "animate-spin" : ""} />
              <span>Reset for Sync</span>
            </button>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1 border border-slate-200 p-1 rounded-xl bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Eligible
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('single');
                  loadSingleProfile(selectedUserId || user?._id);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'single'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Single History
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={viewMode === 'monthly' ? loadMonthlyRoll : () => loadSingleProfile(selectedUserId)}
            disabled={loadingRoll || loadingSingle}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loadingRoll || loadingSingle ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* MONTHLY DIRECTORY VIEW (All Eligible Employees) */}
      {viewMode === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly KPI Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Eligible</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{monthlyData.totalEligible || 0}</span>
                <span className="text-xs font-semibold text-slate-400">Employees</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active for {periodLabel}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Payslips Generated</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-600">{monthlyData.generatedCount || 0}</span>
                <span className="text-xs font-semibold text-emerald-600/70">
                  ({monthlyData.totalEligible > 0 ? Math.round((monthlyData.generatedCount / monthlyData.totalEligible) * 100) : 0}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Published statements</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Generation</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600">{monthlyData.pendingCount || 0}</span>
                <span className="text-xs font-semibold text-amber-600/70">Pending</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Awaiting statement creation</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Total Disbursed Net</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-600">{fmtMoney(monthlyData.totalDisbursed || 0)}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Net compensation for month</p>
            </div>
          </div>

          {/* Directory Table Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search name, code, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="all">All Status ({monthlyData.totalEligible || 0})</option>
                  <option value="generated">Generated ({monthlyData.generatedCount || 0})</option>
                  <option value="pending">Pending ({monthlyData.pendingCount || 0})</option>
                </select>

                {/* Department Filter */}
                {departments.length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-xs text-slate-500 font-semibold">
                Showing {filteredEmployees.length} of {monthlyData.totalEligible || 0} eligible users
              </div>
            </div>

            {/* Eligible Users Table */}
            {loadingRoll ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Users size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700">No eligible employees found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {searchTerm || statusFilter !== 'all' || deptFilter !== 'all'
                    ? 'Try adjusting your search query or filter options.'
                    : `No active employees joined on or before ${periodLabel}.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Employee</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4 text-right">Monthly CTC</th>
                      <th className="py-3 px-4 text-right">Net Take-Home</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredEmployees.map((emp) => {
                      const hasSlip = emp.hasPayslip;
                      const slip = emp.payslip;

                      return (
                        <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                                {emp.firstName?.charAt(0) || ''}{emp.lastName?.charAt(0) || ''}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => handleInspectEmployee(emp._id)}>
                                  {emp.fullName}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  {emp.employeeCode && (
                                    <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[10px]">
                                      {emp.employeeCode}
                                    </span>
                                  )}
                                  <span>{emp.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-700">{emp.department || '—'}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {emp.roles && emp.roles.length > 0 ? emp.roles.join(', ') : (emp.designation || 'Staff')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                            {fmtMoney(emp.ctc || 0)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                            {fmtMoney(slip?.netSalary || emp.estimatedTakeHome || 0)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {hasSlip ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle2 size={11} /> {slip?.status || 'Paid'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasSlip ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleViewStatement(emp, slip)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                    title="View Printable Statement"
                                  >
                                    <Eye size={12} />
                                    <span>Statement</span>
                                  </button>
                                  {slip?.payslipUrl && (
                                    <a
                                      href={slip.payslipUrl.startsWith('http') ? slip.payslipUrl : `${api.defaults?.baseURL?.replace('/api/v1', '') || ''}${slip.payslipUrl}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                      title="Download PDF"
                                    >
                                      <Download size={12} />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddPayslip(emp)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                                  title="Generate payslip record for this month"
                                >
                                  <Plus size={12} />
                                  <span>Generate</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleInspectEmployee(emp._id)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                title="View All Month History"
                              >
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE EMPLOYEE HISTORY VIEW */}
      {viewMode === 'single' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Monthly Roll</span>
            </button>

            {isAdmin && monthlyData.employees?.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Switch Employee:</span>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    loadSingleProfile(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                >
                  {monthlyData.employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeCode || emp.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loadingSingle ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Employee Summary Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base">
                    {singleProfile?.firstName?.charAt(0) || ''}{singleProfile?.lastName?.charAt(0) || ''}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {singleProfile?.firstName} {singleProfile?.lastName}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{singleProfile?.email}</span>
                      <span>•</span>
                      <span>{singleProfile?.companyDetails?.department || 'Staff'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly CTC</p>
                    <p className="text-lg font-bold text-slate-800">{fmtMoney(singleProfile?.compensation?.ctc || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Take-Home</p>
                    <p className="text-lg font-bold text-blue-600">{fmtMoney(singleProfile?.compensation?.salaryBreakup?.netTakeHome || (singleProfile?.compensation?.ctc || 0) - 2000)}</p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetUserId(selectedUserId);
                        setPayPeriod(periodLabel);
                        setPayNetSalary(String(singleProfile?.compensation?.salaryBreakup?.netTakeHome || 50000));
                        setShowPayrollModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Add Statement</span>
                    </button>
                  )}
                </div>
              </div>

              {/* History Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Historical Monthly Statements</h4>
                  <span className="text-xs font-semibold text-slate-400">
                    {(singleProfile?.compensation?.payrollHistory || []).length} Records
                  </span>
                </div>

                {(singleProfile?.compensation?.payrollHistory || []).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No payslip statements recorded for this employee.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(singleProfile?.compensation?.payrollHistory || []).map((pay) => (
                      <div key={pay._id || pay.period} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{pay.period}</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {pay.status || 'Paid'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Net Pay: <strong className="text-blue-600">{fmtMoney(pay.netSalary || pay.netPay || 0)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModalProfile(singleProfile);
                              setViewingPayslip(pay);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Payslip Modal */}
      {viewingPayslip && (
        <PayslipModal
          viewingPayslip={viewingPayslip}
          setViewingPayslip={setViewingPayslip}
          profile={activeModalProfile || singleProfile}
          getPayslipComponents={getModalPayslipComponents}
        />
      )}

      {/* Add / Record Payslip Modal */}
      {showPayrollModal && (
        <AddPayrollModal
          showPayrollModal={showPayrollModal}
          setShowPayrollModal={setShowPayrollModal}
          payPeriod={payPeriod}
          setPayPeriod={setPayPeriod}
          payNetSalary={payNetSalary}
          setPayNetSalary={setPayNetSalary}
          payStatus={payStatus}
          setPayStatus={setPayStatus}
          handleAddPayrollSubmit={handleAddPayrollSubmit}
        />
      )}

      {/* Reset Confirmation Modal for Flance Sync */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Payslips for {periodLabel}</h3>
                <p className="text-xs text-slate-500">Prepare for fresh Flance sync</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              This will remove all <strong className="text-slate-900">{monthlyData.generatedCount || 0}</strong> published payslip records for <strong className="text-slate-900">{periodLabel}</strong> from TalentCIO. Eligible employees will revert back to <span className="font-bold text-amber-700">Pending</span>, allowing you to run a clean, fresh sync / publish from Flance without conflicts.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={resettingRoll}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetMonthRoll}
                disabled={resettingRoll}
                className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {resettingRoll ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>{resettingRoll ? 'Resetting...' : 'Confirm Reset for Sync'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPayslips;
