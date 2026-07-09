import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, Download, History, Calendar, Settings, Shield, DollarSign, Trash2, X, FileText, Info 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Button from '../../components/Button';
import { buildMasterSalaryStructure, fmtMoney, PT_STATE_LIST } from '../../utils/payroll';
import { Field, PendingHighlight, SectionCard } from './DossierHelpers';

export const SalaryTab = ({
    profile,
    userId,
    canViewSalaryTab,
    canEdit,
    editMode,
    setEditMode,
    formData,
    handleSave,
    savingSection,
    fetchDossier,
    currentUser,
    pendingUpdates,
    canApprove,
    isSelf,
    handleBreakupChange
}) => {
    // Local State
    const [payrollConfig, setPayrollConfig] = useState(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionDraft, setRevisionDraft] = useState(null);
    const [draftSalaryPreview, setDraftSalaryPreview] = useState(null);
    const [calculating, setCalculating] = useState(false);

    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [payPeriod, setPayPeriod] = useState('');
    const [payNetSalary, setPayNetSalary] = useState('');
    const [payStatus, setPayStatus] = useState('Paid');

    const [viewingPayslip, setViewingPayslip] = useState(null);

    // Fetch payroll config on mount
    useEffect(() => {
        const fetchPayrollConfig = async () => {
            try {
                const res = await api.get('/payroll/config');
                setPayrollConfig(res.data);
            } catch (err) {
                console.error('Failed to load payroll config:', err);
            }
        };
        fetchPayrollConfig();
    }, []);

    if (!canViewSalaryTab) return null;

    const getBreakupData = (useForm = false) => {
        const data = useForm ? formData : profile;
        if (!data) return null;

        const breakup = data.compensation?.salaryBreakup || {};
        const source = {
            monthlyCTC: data.compensation?.ctc || 0,
            pfEnabled: breakup.pfEnabled !== false,
            esiEnabled: breakup.esiEnabled !== false,
            ptEnabled: breakup.ptEnabled !== false,
            lwfEnabled: breakup.lwfEnabled !== false,
            gratuityEnabled: breakup.gratuityEnabled !== false,
            includePfInCTC: breakup.includePfInCTC === true,
            includeGratuityInCTC: breakup.includeGratuityInCTC !== false,
            basicPercent: breakup.basicPercent !== undefined ? Number(breakup.basicPercent) : 50,
            hraPercent: breakup.hraPercent !== undefined ? Number(breakup.hraPercent) : 50,
            insuranceAmount: data.compensation?.insuranceAmount || 0,
            employerNPS: data.compensation?.employerNPS || 0,
            employmentType: data.employment?.employmentType || 'Full Time',
            payType: data.compensation?.payType || breakup.payType || 'salaried',
            hourlyRate: data.compensation?.hourlyRate || breakup.hourlyRate || 0,
            hoursWorked: data.compensation?.hoursWorked || breakup.hoursWorked || 160,
            useSalaryComponents: (data.compensation?.payType || breakup.payType || 'salaried') !== 'flat' && (data.compensation?.payType || breakup.payType || 'salaried') !== 'hourly' && breakup.useSalaryComponents !== false
        };

        if (payrollConfig?.salaryComponents) {
            payrollConfig.salaryComponents.forEach(c => {
                if (c.linkedTo === 'fixed') {
                    const rawVal = breakup[c.id] !== undefined ? breakup[c.id] : 0;
                    source[c.id] = parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0;
                }
            });
        }

        return buildMasterSalaryStructure(source, payrollConfig || {});
    };

    const handleDownloadBreakup = (breakup) => {
        if (!breakup) return;
        
        const rows = [
            ["Component", "Monthly Amount", "Annual Amount"],
            ["Monthly CTC", breakup.monthlyCTC, breakup.monthlyCTC * 12],
            ["Gross Salary", breakup.totalEarnings, breakup.totalEarnings * 12],
        ];

        const hasDynamicComponents = payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0;
        if (hasDynamicComponents) {
            payrollConfig.salaryComponents
                .filter(c => c.type === 'earning')
                .forEach(c => {
                    const val = breakup.earningsMap?.[c.id] || 0;
                    rows.push([c.name, val, val * 12]);
                });
        } else {
            rows.push(["Basic Salary", breakup.basicMaster, breakup.basicMaster * 12]);
            rows.push(["HRA", breakup.hraMaster, breakup.hraMaster * 12]);
            if (breakup.specialAllowance > 0) {
                rows.push(["Special Allowance", breakup.specialAllowance, breakup.specialAllowance * 12]);
            }
        }

        if (breakup.pfEmployer > 0) rows.push(["PF Employer Cost", breakup.pfEmployer, breakup.pfEmployer * 12]);
        if (breakup.gratuity > 0) rows.push(["Gratuity Accrual", breakup.gratuity, breakup.gratuity * 12]);
        if (breakup.esiEmployer > 0) rows.push(["ESI Employer Cost", breakup.esiEmployer, breakup.esiEmployer * 12]);
        if (breakup.lwfEmployer > 0) rows.push(["LWF Employer Cost", breakup.lwfEmployer, breakup.lwfEmployer * 12]);

        if (breakup.pfEmployee > 0) rows.push(["Employee PF", breakup.pfEmployee, breakup.pfEmployee * 12]);
        if (breakup.esiEmployee > 0) rows.push(["Employee ESI", breakup.esiEmployee, breakup.esiEmployee * 12]);
        if (breakup.lwfEmployee > 0) rows.push(["Employee LWF", breakup.lwfEmployee, breakup.lwfEmployee * 12]);
        if (breakup.professionalTax > 0) rows.push(["Professional Tax (PT)", breakup.professionalTax, breakup.professionalTax * 12]);
        if (breakup.tds > 0) rows.push(["Income Tax (TDS)", breakup.tds, breakup.tds * 12]);

        rows.push(["Net Take-Home", breakup.netTakeHome, breakup.netTakeHome * 12]);

        const csvContent = rows
            .map(e => e.map(val => typeof val === 'string' ? `"${val}"` : val).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${profile?.personal?.fullName || 'Employee'}_Salary_Breakup.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openAddRevisionModal = () => {
        const comp = profile.compensation || {};
        const breakup = comp.salaryBreakup || {};
        
        const getBreakupField = (key, def) => {
            if (breakup instanceof Map) {
                return breakup.get(key) !== undefined ? breakup.get(key) : def;
            }
            return breakup[key] !== undefined ? breakup[key] : def;
        };

        const currentMonthly = comp.ctc || 0;

        const draft = {
            role: '',
            payType: getBreakupField('payType', 'salaried'),
            hourlyRate: comp.hourlyRate || getBreakupField('hourlyRate', 0),
            hoursWorked: getBreakupField('hoursWorked', 160),
            employmentType: profile.employment?.employmentType === 'Full Time' ? 'full-time' : 'contract',
            newAnnualCTC: currentMonthly * 12,
            newCTC: currentMonthly,
            effectiveDate: format(new Date(), 'yyyy-MM-dd'),
            reason: '',
            pfEnabled: getBreakupField('pfEnabled', true),
            esiEnabled: getBreakupField('esiEnabled', true),
            ptEnabled: getBreakupField('ptEnabled', true),
            ptState: getBreakupField('ptState', 'MH'),
            lwfEnabled: getBreakupField('lwfEnabled', true),
            gratuityEnabled: getBreakupField('gratuityEnabled', true),
            useSalaryComponents: getBreakupField('useSalaryComponents', true),
            includePfInCTC: getBreakupField('includePfInCTC', false),
            includeGratuityInCTC: getBreakupField('includeGratuityInCTC', true),
            basicPercent: getBreakupField('basicPercent', null),
            hraPercent: getBreakupField('hraPercent', null),
            salaryStructure: {
                basic: getBreakupField('basic', ''),
                hra: getBreakupField('hra', ''),
                specialAllowance: getBreakupField('specialAllowance', ''),
                conveyance: getBreakupField('conveyance', 0),
                medicalAllowance: getBreakupField('medicalAllowance', 0),
                otherAllowances: getBreakupField('otherAllowances', [])
            },
            flexiAmount: getBreakupField('flexiAmount', 0),
            broadband: getBreakupField('broadband', 0),
            petrol: getBreakupField('petrol', 0),
            lta: getBreakupField('lta', 0),
            insuranceAmount: comp.insuranceAmount || 0,
            employerNPS: comp.employerNPS || 0,
            deductions: {
                professionalTax: getBreakupField('professionalTax', 0),
                tds: getBreakupField('tds', 0),
                otherDeductions: getBreakupField('otherDeductions', [])
            },
            joiningBonus: 0
        };

        if (payrollConfig?.salaryComponents) {
            payrollConfig.salaryComponents.forEach(c => {
                if (c.type === 'earning' && c.linkedTo === 'fixed' && !['basic', 'hra'].includes(c.id)) {
                    draft[c.id] = getBreakupField(c.id, 0);
                }
            });
        }

        setRevisionDraft(draft);
        setShowRevisionModal(true);
        calculateDraftSalary(draft);
    };

    const calculateDraftSalary = async (draftObj) => {
        const merged = draftObj || revisionDraft;
        if (!merged) return;

        const monthlyCTC = Number(merged.newCTC) || 0;
        if (!monthlyCTC) return;

        try {
            setCalculating(true);
            const payload = {
                monthlyCTC,
                employmentType: merged.employmentType,
                payType: merged.payType || 'salaried',
                hourlyRate: Number(merged.hourlyRate) || 0,
                hoursWorked: Number(merged.hoursWorked) || 0,
                basicPercent: merged.basicPercent === null || merged.basicPercent === '' ? null : Number(merged.basicPercent),
                hraPercent: merged.hraPercent === null || merged.hraPercent === '' ? null : Number(merged.hraPercent),
                basic: Number(merged.salaryStructure?.basic) || undefined,
                hra: Number(merged.salaryStructure?.hra) || undefined,
                specialAllowance: Number(merged.salaryStructure?.specialAllowance) || undefined,
                useSalaryComponents: merged.useSalaryComponents !== false,
                flexiAmount: Number(merged.flexiAmount) || 0,
                insuranceAmount: Number(merged.insuranceAmount) || 0,
                employerNPS: Number(merged.employerNPS) || 0,
                ptState: merged.ptState || '',
                professionalTax: merged.ptState === 'custom' ? (Number(merged.deductions?.professionalTax) || 0) : 0,
                tds: Number(merged.deductions?.tds) || 0,
                otherDeductions: (merged.deductions?.otherDeductions || []).map((d) => ({
                    name: d.name,
                    amount: Number(d.amount) || 0,
                })),
                otherAllowances: (merged.salaryStructure?.otherAllowances || []).map((allowance) => ({
                    name: allowance.name,
                    amount: Number(allowance.amount) || 0,
                })),
                pfEnabled: merged.pfEnabled !== false,
                esiEnabled: merged.esiEnabled !== false,
                ptEnabled: merged.ptEnabled !== false,
                lwfEnabled: merged.lwfEnabled !== false,
                gratuityEnabled: merged.gratuityEnabled !== false,
                includePfInCTC: merged.includePfInCTC === true,
                includeGratuityInCTC: merged.includeGratuityInCTC !== false,
            };

            if (payrollConfig?.salaryComponents) {
                payrollConfig.salaryComponents.forEach(c => {
                    if (c.type === 'earning' && c.linkedTo === 'fixed' && !['basic', 'hra'].includes(c.id)) {
                        payload[c.id] = (merged[c.id] !== undefined && merged[c.id] !== '') ? Number(merged[c.id]) : (Number(merged.salaryStructure?.[c.id]) || 0);
                    }
                });
            }

            const res = await api.post('/payroll/calculate-salary', payload);
            
            const master = res.data.master;
            setDraftSalaryPreview(master);
        } catch (error) {
            console.error('Calculation error:', error);
        } finally {
            setCalculating(false);
        }
    };

    const handleDraftChange = (path, value) => {
        setRevisionDraft(prev => {
            const copy = JSON.parse(JSON.stringify(prev || {}));
            
            if (path.includes('.')) {
                const parts = path.split('.');
                let current = copy;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            } else {
                copy[path] = value;
            }
            
            if (path === 'newCTC') {
                copy.newAnnualCTC = value === '' ? '' : Math.round(value * 12 * 100) / 100;
            } else if (path === 'newAnnualCTC') {
                copy.newCTC = value === '' ? '' : Math.round((value / 12) * 100) / 100;
            }

            setTimeout(() => {
                calculateDraftSalary(copy);
            }, 0);

            return copy;
        });
    };

    const getComparisonRows = () => {
        const current = getBreakupData() || {};
        const revised = draftSalaryPreview || {};
        const isSalaried = revisionDraft?.payType !== 'hourly' && revisionDraft?.payType !== 'flat';

        const rows = [
            { name: 'Total Monthly CTC', current: current.monthlyCTC || 0, revised: revised.monthlyCTC || 0, isHeader: true }
        ];

        if (isSalaried) {
            rows.push(
                { name: 'Basic Salary', current: current.basicMaster || 0, revised: revised.basicMaster || 0 },
                { name: 'HRA', current: current.hraMaster || 0, revised: revised.hraMaster || 0 }
            );
            if (payrollConfig?.salaryComponents?.some(c => c.id === 'special')) {
                rows.push(
                    { name: 'Special Allowance', current: current.specialAllowance || current.special || 0, revised: revised.specialAllowance || revised.special || 0 }
                );
            }
            rows.push(
                { name: 'Flexi Allowance', current: current.flexi || 0, revised: revised.flexi || 0 }
            );
        }

        rows.push(
            { name: 'Gross Earnings (Total)', current: current.totalEarnings || current.grossSalary || 0, revised: revised.totalEarnings || revised.grossSalary || 0, isHeader: true },
            { name: 'Est. Net Take-Home Pay', current: current.netTakeHome || 0, revised: revised.netTakeHome || 0, isHeader: true }
        );

        return rows;
    };

    const handleRevisionSubmit = async () => {
        if (!revisionDraft.effectiveDate || !revisionDraft.newCTC) {
            toast.error('Please enter effective date and new CTC');
            return;
        }

        const newRevision = {
            effectiveDate: new Date(revisionDraft.effectiveDate),
            previousCTC: profile.compensation?.ctc || 0,
            newCTC: Number(revisionDraft.newCTC) || 0,
            reason: revisionDraft.reason || 'Salary Revised',
        };

        const salaryBreakupUpdates = {
            payType: revisionDraft.payType || 'salaried',
            hourlyRate: Number(revisionDraft.hourlyRate) || 0,
            hoursWorked: Number(revisionDraft.hoursWorked) || 0,
            pfEnabled: revisionDraft.pfEnabled !== false,
            esiEnabled: revisionDraft.esiEnabled !== false,
            ptEnabled: revisionDraft.ptEnabled !== false,
            ptState: revisionDraft.ptState || '',
            professionalTax: revisionDraft.ptState === 'custom' ? (Number(revisionDraft.deductions?.professionalTax) || 0) : 0,
            lwfEnabled: revisionDraft.lwfEnabled !== false,
            gratuityEnabled: revisionDraft.gratuityEnabled !== false,
            useSalaryComponents: revisionDraft.useSalaryComponents !== false,
            includePfInCTC: revisionDraft.includePfInCTC === true,
            includeGratuityInCTC: revisionDraft.includeGratuityInCTC !== false,
            basicPercent: revisionDraft.basicPercent === null || revisionDraft.basicPercent === '' ? undefined : Number(revisionDraft.basicPercent),
            hraPercent: revisionDraft.hraPercent === null || revisionDraft.hraPercent === '' ? undefined : Number(revisionDraft.hraPercent),
            
            flexiAmount: Number(revisionDraft.flexiAmount) || 0,
            otherAllowances: revisionDraft.salaryStructure?.otherAllowances || [],
            otherDeductions: revisionDraft.deductions?.otherDeductions || []
        };

        if (payrollConfig?.salaryComponents) {
            payrollConfig.salaryComponents.forEach(c => {
                if (c.type === 'earning' && c.linkedTo === 'fixed' && !['basic', 'hra'].includes(c.id)) {
                    salaryBreakupUpdates[c.id] = (revisionDraft[c.id] !== undefined && revisionDraft[c.id] !== '') ? Number(revisionDraft[c.id]) : (Number(revisionDraft.salaryStructure?.[c.id]) || 0);
                }
            });
        }

        const existingRevisions = profile.compensation?.salaryRevisions || [];
        const updatedRevisions = [...existingRevisions, newRevision].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

        try {
            const updates = {
                ...profile.compensation,
                ctc: newRevision.newCTC,
                payType: revisionDraft.payType || 'salaried',
                hourlyRate: Number(revisionDraft.hourlyRate) || 0,
                hoursWorked: Number(revisionDraft.hoursWorked) || 0,
                insuranceAmount: Number(revisionDraft.insuranceAmount) || 0,
                employerNPS: Number(revisionDraft.employerNPS) || 0,
                salaryBreakup: {
                    ...(profile.compensation?.salaryBreakup || {}),
                    ...salaryBreakupUpdates
                },
                salaryRevisions: updatedRevisions
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Salary revision saved successfully');
            setShowRevisionModal(false);
            fetchDossier();
        } catch (err) {
            console.error('Error saving salary revision:', err);
            toast.error('Failed to save salary revision');
        }
    };

    const handleDeleteRevision = async (revId) => {
        if (!window.confirm('Are you sure you want to delete this salary revision?')) return;

        const existingRevisions = profile.compensation?.salaryRevisions || [];
        const updatedRevisions = existingRevisions.filter(r => String(r._id) !== String(revId));

        let newCTC = profile.compensation?.ctc;
        if (updatedRevisions.length > 0) {
            const sorted = [...updatedRevisions].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
            newCTC = sorted[sorted.length - 1].newCTC;
        }

        try {
            const updates = {
                ...profile.compensation,
                ctc: newCTC,
                salaryRevisions: updatedRevisions
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Salary revision deleted successfully');
            fetchDossier();
        } catch (err) {
            console.error('Error deleting salary revision:', err);
            toast.error('Failed to delete salary revision');
        }
    };

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

        const existingPayroll = profile.compensation?.payrollHistory || [];
        const updatedPayroll = [...existingPayroll, newPayroll].sort((a, b) => b.period.localeCompare(a.period));

        try {
            const updates = {
                ...profile.compensation,
                payrollHistory: updatedPayroll
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Payroll history record added successfully');
            setShowPayrollModal(false);
            fetchDossier();
        } catch (err) {
            console.error('Error saving payroll history:', err);
            toast.error('Failed to add payroll history record');
        }
    };

    const handleDeletePayroll = async (payId) => {
        if (!window.confirm('Are you sure you want to delete this payroll record?')) return;

        const existingPayroll = profile.compensation?.payrollHistory || [];
        const updatedPayroll = existingPayroll.filter(p => String(p._id) !== String(payId));

        try {
            const updates = {
                ...profile.compensation,
                payrollHistory: updatedPayroll
            };

            await api.patch(`/dossier/${userId}/compensation`, updates);
            toast.success('Payroll record deleted successfully');
            fetchDossier();
        } catch (err) {
            console.error('Error deleting payroll record:', err);
            toast.error('Failed to delete payroll record');
        }
    };

    const getPayslipComponents = (payrollItem) => {
        if (!profile || !payrollItem) return null;
        
        const activeBreakup = getBreakupData();
        if (!activeBreakup) return null;

        const activeNet = activeBreakup.netTakeHome || 1;
        const scale = payrollItem.netSalary / activeNet;

        return {
            basic: Math.round(activeBreakup.basicMaster * scale),
            hra: Math.round(activeBreakup.hraMaster * scale),
            flexi: Math.round(activeBreakup.flexi * scale),
            pfEmployee: Math.round(activeBreakup.pfEmployee * scale),
            esiEmployee: Math.round(activeBreakup.esiEmployee * scale),
            pt: Math.round(activeBreakup.professionalTax * scale),
            tds: Math.round(activeBreakup.tds * scale),
            gross: Math.round(activeBreakup.totalEarnings * scale),
            deductions: Math.round(activeBreakup.totalDeductions * scale),
            net: payrollItem.netSalary
        };
    };

    const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
        str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
        str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
        str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
        str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only' : 'Only';
        return str;
    };

    const renderCTCSnapshot = (breakup) => {
        if (!breakup) return null;
        
        const hasDynamicComponents = payrollConfig?.salaryComponents && payrollConfig.salaryComponents.length > 0;
        
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                        <TrendingUp size={20} className="text-blue-500" />
                        <h3 className="font-bold text-slate-800 text-lg">CTC Snapshot</h3>
                    </div>
                    <button 
                        onClick={() => handleDownloadBreakup(breakup)}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 flex items-center text-xs py-1.5 px-3 rounded shadow-sm transition-colors"
                    >
                        <Download size={14} className="mr-1.5" /> Download Breakup
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Monthly CTC</span>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{fmtMoney(breakup.monthlyCTC)}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Gross Salary</span>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{fmtMoney(breakup.totalEarnings)}</div>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    {/* 1. Monthly Earnings Breakup */}
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Earnings</div>
                        <div className="space-y-2">
                            {hasDynamicComponents ? (
                                payrollConfig.salaryComponents
                                    .filter(c => c.type === 'earning')
                                    .map(c => {
                                        const val = breakup.earningsMap?.[c.id] || 0;
                                        return (
                                            <div key={c.id} className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                                <span>{c.name}</span>
                                                <span className="font-semibold text-slate-800">{fmtMoney(val)}</span>
                                            </div>
                                        );
                                    })
                            ) : (
                                <>
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Basic Salary</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.basicMaster)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>HRA</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.hraMaster)}</span>
                                    </div>
                                    {breakup.specialAllowance > 0 && (
                                        <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                            <span>Special Allowance</span>
                                            <span className="font-semibold text-slate-800">{fmtMoney(breakup.specialAllowance)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* 2. Employer Contributions */}
                    {(breakup.pfEmployer > 0 || breakup.gratuity > 0 || breakup.esiEmployer > 0 || breakup.lwfEmployer > 0) && (
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">Employer Contributions</div>
                            <div className="space-y-2">
                                {breakup.pfEmployer > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>PF Employer Cost</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.pfEmployer)}</span>
                                    </div>
                                )}
                                {breakup.gratuity > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Gratuity Accrual</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.gratuity)}</span>
                                    </div>
                                )}
                                {breakup.esiEmployer > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>ESI Employer Cost</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.esiEmployer)}</span>
                                    </div>
                                )}
                                {breakup.lwfEmployer > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>LWF Employer Cost</span>
                                        <span className="font-semibold text-slate-800">{fmtMoney(breakup.lwfEmployer)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. Employee Deductions */}
                    {(breakup.pfEmployee > 0 || breakup.esiEmployee > 0 || breakup.lwfEmployee > 0 || breakup.professionalTax > 0 || breakup.tds > 0) && (
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">Employee Deductions</div>
                            <div className="space-y-2">
                                {breakup.pfEmployee > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Employee PF</span>
                                        <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.pfEmployee)}</span>
                                    </div>
                                )}
                                {breakup.esiEmployee > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Employee ESI</span>
                                        <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.esiEmployee)}</span>
                                    </div>
                                )}
                                {breakup.lwfEmployee > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Employee LWF</span>
                                        <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.lwfEmployee)}</span>
                                    </div>
                                )}
                                {breakup.professionalTax > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Professional Tax (PT)</span>
                                        <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.professionalTax)}</span>
                                    </div>
                                )}
                                {breakup.tds > 0 && (
                                    <div className="flex justify-between text-sm text-slate-600 border-b border-slate-50 pb-1.5">
                                        <span>Income Tax (TDS)</span>
                                        <span className="font-semibold text-slate-800 text-rose-600">{fmtMoney(breakup.tds)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-slate-800 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100/50 mt-4">
                        <span className="flex items-center"><Info size={16} className="text-blue-500 mr-2" /> Net Take-Home</span>
                        <span className="text-blue-600">{fmtMoney(breakup.netTakeHome)}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderPayslipModal = () => {
        if (!viewingPayslip) return null;
        const comps = getPayslipComponents(viewingPayslip);
        if (!comps) return null;

        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:p-0">
                <style type="text/css" media="print">
                    {`
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #payslip-print-area, #payslip-print-area * {
                            visibility: visible !important;
                        }
                        #payslip-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                        }
                    }
                    `}
                </style>
                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 print:shadow-none print:border-none print:my-0">
                    {/* Header */}
                    <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center print:hidden">
                        <div className="flex items-center space-x-2">
                            <FileText className="text-blue-600" size={20} />
                            <h3 className="font-bold text-slate-800">Payslip Statement — {viewingPayslip.period}</h3>
                        </div>
                        <button onClick={() => setViewingPayslip(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Payslip Content (Printable) */}
                    <div className="p-8 space-y-6 print:p-0 print:m-0" id="payslip-print-area">
                        {/* Company Logo & Header */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">TALENTCIO SERVICES PVT LTD</h2>
                                <p className="text-xs text-slate-500 mt-1">102, Hitech City, Hyderabad, TS, 500081</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-blue-100 text-blue-800 font-bold text-xs uppercase px-2.5 py-1 rounded-full print:border print:border-blue-800">
                                    Payslip Statement
                                </span>
                                <p className="text-xs text-slate-500 mt-2">Pay Period: <strong className="text-slate-700">{viewingPayslip.period}</strong></p>
                            </div>
                        </div>

                        {/* Employee Details Grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs border-b border-slate-200 pb-4">
                            <div>
                                <span className="text-slate-400">Employee Name:</span> <strong className="text-slate-700 ml-1">{profile?.personal?.fullName || (profile?.user ? `${profile.user.firstName} ${profile.user.lastName}` : 'N/A')}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Employee Code:</span> <strong className="text-slate-700 ml-1">{profile?.user?.employeeCode || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Department:</span> <strong className="text-slate-700 ml-1">{profile?.employment?.department || profile?.user?.department || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Designation:</span> <strong className="text-slate-700 ml-1">{profile?.employment?.designation || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">UAN:</span> <strong className="text-slate-700 ml-1">{profile?.compensation?.uanNumber || 'N/A'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Bank Account No:</span> <strong className="text-slate-700 ml-1">{"XXXX" + (profile?.compensation?.bankDetails?.accountNumber || "").slice(-4)}</strong>
                            </div>
                        </div>

                        {/* Earnings & Deductions Tables */}
                        <div className="grid grid-cols-2 gap-8 text-xs">
                            {/* Earnings Column */}
                            <div className="space-y-2 border-r border-slate-200 pr-4 print:border-slate-300">
                                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Earnings</h4>
                                <div className="flex justify-between">
                                    <span>Basic Salary</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.basic)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>House Rent Allowance (HRA)</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.hra)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Flexi Allowance</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.flexi)}</strong>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                                    <span>Gross Earnings</span>
                                    <span>{fmtMoney(comps.gross)}</span>
                                </div>
                            </div>

                            {/* Deductions Column */}
                            <div className="space-y-2 pl-4">
                                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Deductions</h4>
                                <div className="flex justify-between">
                                    <span>Employee PF Contribution</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.pfEmployee)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>ESI Contribution</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.esiEmployee)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Professional Tax (PT)</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.pt)}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>TDS (Income Tax)</span>
                                    <strong className="text-slate-700">{fmtMoney(comps.tds)}</strong>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                                    <span>Total Deductions</span>
                                    <span>{fmtMoney(comps.deductions)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Salary Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center mt-6 print:border-slate-800">
                            <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Net Take-Home (Net Salary)</span>
                                <h3 className="text-lg font-bold text-blue-700 mt-1">{fmtMoney(comps.net)}</h3>
                            </div>
                            <div className="text-right max-w-xs">
                                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Amount in Words</span>
                                <p className="text-[10px] font-semibold text-slate-600 mt-1 italic leading-relaxed capitalize">{numberToWords(comps.net)}</p>
                            </div>
                        </div>

                        {/* Footer Signature Note */}
                        <div className="flex justify-between items-end pt-8 text-[9px] text-slate-400">
                            <div>
                                <p>Note: This is a computer generated payslip statement and does not require a physical signature.</p>
                            </div>
                            <div className="text-center w-32 border-t border-slate-300 pt-1">
                                <span className="text-slate-500 font-semibold uppercase">Authorized Signatory</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end space-x-3 print:hidden">
                        <Button variant="ghost" onClick={() => setViewingPayslip(null)}>
                            Close
                        </Button>
                        <Button 
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center"
                        >
                            <Download size={16} className="mr-2" /> Print / Save PDF
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const pend = pendingUpdates || {};
    const showPending = !!(canApprove && !isSelf && !editMode && pendingUpdates);
    const breakup = getBreakupData(editMode);
    
    const salaryRevisions = profile.compensation?.salaryRevisions || [];
    const payrollHistory = profile.compensation?.payrollHistory || [];
    const isCurrentUserAdmin = currentUser?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : r?.name;
        return ['Admin', 'System Admin', 'Super Admin'].includes(roleName);
    }) || currentUser?.hasAllPermissions || currentUser?.permissions?.includes('payroll.salary.manage');
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: CTC Snapshot */}
                <div className="lg:col-span-1">
                    {renderCTCSnapshot(breakup)}
                </div>

                {/* Right Column: Salary & Statutory Details */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionCard
                        title="Salary & Statutory Details"
                        sectionName="compensation"
                        icon={DollarSign}
                        editMode={editMode}
                        setEditMode={setEditMode}
                        onSave={handleSave}
                        isLoading={savingSection === 'compensation'}
                        canEdit={canEdit}
                        showActions={canEdit}
                    >
                        {(isEditing) => {
                            const isCompEditing = isEditing && isCurrentUserAdmin;
                            return (
                                <div className="space-y-6">
                                    {/* Statutory Overrides */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                            <Settings size={18} className="text-blue-500" />
                                            <h3 className="font-bold text-slate-700">Statutory & Ratio Configurations</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <PendingHighlight show={showPending} label="PF Enabled" liveValue={profile.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.pfEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="PF Enabled" field="pfEnabled"
                                                    value={profile.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.pfEnabled !== false ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('pfEnabled', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="Include PF in CTC" liveValue={profile.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.includePfInCTC === undefined ? undefined : (pend.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="Include PF in CTC" field="includePfInCTC"
                                                    value={profile.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.includePfInCTC ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('includePfInCTC', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="ESI Enabled" liveValue={profile.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.esiEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="ESI Enabled" field="esiEnabled"
                                                    value={profile.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.esiEnabled !== false ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('esiEnabled', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="PT Enabled" liveValue={profile.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.ptEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="PT Enabled" field="ptEnabled"
                                                    value={profile.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.ptEnabled !== false ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('ptEnabled', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="LWF Enabled" liveValue={profile.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.lwfEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="LWF Enabled" field="lwfEnabled"
                                                    value={profile.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.lwfEnabled !== false ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('lwfEnabled', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="Gratuity Enabled" liveValue={profile.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.gratuityEnabled === undefined ? undefined : (pend.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="Gratuity Enabled" field="gratuityEnabled"
                                                    value={profile.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('gratuityEnabled', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="Include Gratuity in CTC" liveValue={profile.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'} pendingValue={pend.compensation?.salaryBreakup?.includeGratuityInCTC === undefined ? undefined : (pend.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No')}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="Include Gratuity in CTC" field="includeGratuityInCTC"
                                                    value={profile.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'}
                                                    options={['No', 'Yes']}
                                                    onChangeOverride={(e) => handleBreakupChange('includeGratuityInCTC', e.target.value === 'Yes')}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="Basic Override %" liveValue={profile.compensation?.salaryBreakup?.basicPercent !== undefined ? `${profile.compensation.salaryBreakup.basicPercent}%` : '50%'} pendingValue={pend.compensation?.salaryBreakup?.basicPercent === undefined ? undefined : `${pend.compensation.salaryBreakup.basicPercent}%`}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="Basic Salary Override (%)" field="basicPercent"
                                                    value={profile.compensation?.salaryBreakup?.basicPercent !== undefined ? String(profile.compensation.salaryBreakup.basicPercent) : '50'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.basicPercent !== undefined ? String(formData.compensation.salaryBreakup.basicPercent) : '50'}
                                                    onChangeOverride={(e) => handleBreakupChange('basicPercent', e.target.value)}
                                                />
                                            </PendingHighlight>
                                            <PendingHighlight show={showPending} label="HRA Override %" liveValue={profile.compensation?.salaryBreakup?.hraPercent !== undefined ? `${profile.compensation.salaryBreakup.hraPercent}%` : '50%'} pendingValue={pend.compensation?.salaryBreakup?.hraPercent === undefined ? undefined : `${pend.compensation.salaryBreakup.hraPercent}%`}>
                                                <Field
                                                    section="compensation" isEditing={isCompEditing} label="HRA Override (% of Basic)" field="hraPercent"
                                                    value={profile.compensation?.salaryBreakup?.hraPercent !== undefined ? String(profile.compensation.salaryBreakup.hraPercent) : '50'}
                                                    valueOverride={formData.compensation?.salaryBreakup?.hraPercent !== undefined ? String(formData.compensation.salaryBreakup.hraPercent) : '50'}
                                                    onChangeOverride={(e) => handleBreakupChange('hraPercent', e.target.value)}
                                                />
                                            </PendingHighlight>
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    </SectionCard>

                    {/* Bank & UAN Details Card - View Only */}
                    <SectionCard
                        title="Bank & UAN Details"
                        sectionName="compensation_bank_uan"
                        icon={DollarSign}
                        canEdit={false}
                        showActions={false}
                    >
                        {() => (
                            <div className="space-y-6 text-xs">
                                {/* UAN Settings */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                        <Shield size={18} className="text-blue-500" />
                                        <h3 className="font-bold text-slate-700">UAN (Universal Account Number) Settings</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">UAN Applicable?</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.isUanApplicable ? 'Yes' : 'No'}</strong>
                                        </div>
                                        {profile.compensation?.isUanApplicable && (
                                            <div>
                                                <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">UAN Number</span>
                                                <strong className="text-slate-700 font-bold">{profile.compensation?.uanNumber || 'N/A'}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bank Details */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                                        <DollarSign size={18} className="text-blue-500" />
                                        <h3 className="font-bold text-slate-700">Bank Account Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                                        <div>
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Account Number</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.accountNumber || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">IFSC Code</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.ifscCode || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Bank Name</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.bankName || 'N/A'}</strong>
                                        </div>
                                        <div>
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Account Holder Name</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.accountHolderName || 'N/A'}</strong>
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Branch Address</span>
                                            <strong className="text-slate-700 font-bold">{profile.compensation?.bankDetails?.branchAddress || 'N/A'}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>

            {/* Salary Revision History Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                        <History size={20} className="text-blue-500" />
                        <h3 className="font-bold text-slate-800 text-lg">Salary Revision History</h3>
                    </div>
                    {isCurrentUserAdmin && (
                        <button 
                            onClick={openAddRevisionModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs py-1.5 px-3 rounded flex items-center font-semibold transition-colors"
                        >
                            + Add Revision
                        </button>
                    )}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold bg-slate-50/50">
                                <th className="py-3 px-4">Effective Date</th>
                                <th className="py-3 px-4">Previous CTC</th>
                                <th className="py-3 px-4">New CTC</th>
                                <th className="py-3 px-4">Reason</th>
                                {isCurrentUserAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {salaryRevisions.length > 0 ? (
                                salaryRevisions.map((rev, idx) => (
                                    <tr key={rev._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3.5 px-4 font-medium text-slate-800">
                                            {rev.effectiveDate ? format(new Date(rev.effectiveDate), 'dd MMM yyyy') : 'N/A'}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 font-semibold">{fmtMoney(rev.previousCTC)}</td>
                                        <td className="py-3.5 px-4 text-blue-600 font-bold">{fmtMoney(rev.newCTC)}</td>
                                        <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate" title={rev.reason}>
                                            {rev.reason || 'No reason specified'}
                                        </td>
                                        {isCurrentUserAdmin && (
                                            <td className="py-3.5 px-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteRevision(rev._id)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isCurrentUserAdmin ? 5 : 4} className="py-8 text-center text-slate-400 italic">
                                        No salary revisions recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payroll History Card */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                        <Calendar size={20} className="text-blue-500" />
                        <h3 className="font-bold text-slate-800 text-lg">Payroll History</h3>
                    </div>
                    {isCurrentUserAdmin && (
                        <button 
                            onClick={() => {
                                setPayPeriod('');
                                setPayNetSalary('');
                                setPayStatus('Paid');
                                setShowPayrollModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs py-1.5 px-3 rounded flex items-center font-semibold transition-colors"
                        >
                            + Add Payroll Record
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold bg-slate-50/50">
                                <th className="py-3 px-4">Period</th>
                                <th className="py-3 px-4">Net Salary</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Payslip</th>
                                {isCurrentUserAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {payrollHistory.length > 0 ? (
                                payrollHistory.map((pay, idx) => (
                                    <tr key={pay._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-slate-800">{pay.period}</td>
                                        <td className="py-3.5 px-4 font-bold text-emerald-600">{fmtMoney(pay.netSalary)}</td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                pay.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                pay.status === 'Processing' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                pay.status === 'Approved' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                'bg-slate-50 text-slate-700 border border-slate-200'
                                            }`}>
                                                {pay.status || 'Paid'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <button 
                                                onClick={() => setViewingPayslip(pay)}
                                                className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 hover:text-blue-700 px-3 py-1 rounded flex items-center font-semibold text-[11px] shadow-sm transition-colors"
                                            >
                                                <Download size={12} className="mr-1" /> View Payslip
                                            </button>
                                        </td>
                                        {isCurrentUserAdmin && (
                                            <td className="py-3.5 px-4 text-right">
                                                <button 
                                                    onClick={() => handleDeletePayroll(pay._id)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isCurrentUserAdmin ? 5 : 4} className="py-8 text-center text-slate-400 italic">
                                        No payroll records yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALS */}
            {/* 1. Add Salary Revision Modal */}
            {showRevisionModal && revisionDraft && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-xs">
                        {/* Sticky Header */}
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                            <div className="flex items-center space-x-2">
                                <History className="text-blue-600" size={20} />
                                <h3 className="font-bold text-slate-800 text-lg">Revise Salary</h3>
                            </div>
                            <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Row 1: Template & Employment Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Pay Type</label>
                                    <select
                                        value={revisionDraft.payType || 'salaried'}
                                        onChange={(e) => handleDraftChange('payType', e.target.value)}
                                        className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium bg-white"
                                    >
                                        <option value="salaried">Salaried (Monthly Base)</option>
                                        <option value="hourly">Hourly Contractor</option>
                                        <option value="flat">Flat Salary — No Component Breakdown</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Employment Type</label>
                                    <select
                                        value={revisionDraft.employmentType}
                                        onChange={(e) => handleDraftChange('employmentType', e.target.value)}
                                        className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium"
                                    >
                                        <option value="full-time">Full Time</option>
                                        <option value="part-time">Part Time</option>
                                        <option value="contract">Contract</option>
                                        <option value="intern">Intern / Trainee</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Annual & Monthly CTC / Hourly Contractor / Flat Salary */}
                            {revisionDraft.payType === 'hourly' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Hourly Rate (INR)</label>
                                        <input 
                                            type="number"
                                            required
                                            value={revisionDraft.hourlyRate || ''} 
                                            onChange={(e) => {
                                                const rate = e.target.value === '' ? '' : Number(e.target.value);
                                                const hours = Number(revisionDraft.hoursWorked) || 160;
                                                const monthly = rate === '' ? '' : Math.round(rate * hours * 100) / 100;
                                                setRevisionDraft(prev => {
                                                    const copy = { ...prev, hourlyRate: rate, newCTC: monthly, newAnnualCTC: monthly === '' ? '' : monthly * 12 };
                                                    setTimeout(() => calculateDraftSalary(copy), 0);
                                                    return copy;
                                                });
                                            }}
                                            placeholder="e.g. 500" 
                                            className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-semibold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Estimated Monthly Hours</label>
                                        <input 
                                            type="number"
                                            required
                                            value={revisionDraft.hoursWorked || '160'} 
                                            onChange={(e) => {
                                                const hours = e.target.value === '' ? '' : Number(e.target.value);
                                                const rate = Number(revisionDraft.hourlyRate) || 0;
                                                const monthly = hours === '' ? '' : Math.round(rate * hours * 100) / 100;
                                                setRevisionDraft(prev => {
                                                    const copy = { ...prev, hoursWorked: hours, newCTC: monthly, newAnnualCTC: monthly === '' ? '' : monthly * 12 };
                                                    setTimeout(() => calculateDraftSalary(copy), 0);
                                                    return copy;
                                                });
                                            }}
                                            placeholder="e.g. 160" 
                                            className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-semibold" 
                                        />
                                    </div>
                                </div>
                            ) : revisionDraft.payType === 'flat' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Flat Monthly Salary</label>
                                        <div className="relative rounded shadow-sm">
                                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                            <input 
                                                type="number"
                                                required
                                                value={revisionDraft.newCTC || ''} 
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                                    setRevisionDraft(prev => {
                                                        const copy = { ...prev, newCTC: val, newAnnualCTC: val === '' ? '' : val * 12 };
                                                        setTimeout(() => calculateDraftSalary(copy), 0);
                                                        return copy;
                                                    });
                                                }} 
                                                placeholder="e.g. 50,000" 
                                                className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 text-xs font-semibold" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">New Annual CTC</label>
                                        <div className="relative rounded shadow-sm">
                                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={revisionDraft.newAnnualCTC}
                                                onChange={(e) => handleDraftChange('newAnnualCTC', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">New Monthly CTC</label>
                                        <div className="relative rounded shadow-sm">
                                            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium">₹</span>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={revisionDraft.newCTC}
                                                onChange={(e) => handleDraftChange('newCTC', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full border border-slate-200 rounded p-2 pl-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Row 3: Effective Date & Reason */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Effective Date</label>
                                    <input
                                        type="date"
                                        value={revisionDraft.effectiveDate}
                                        onChange={(e) => handleDraftChange('effectiveDate', e.target.value)}
                                        className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 font-medium text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5 text-[10px]">Reason</label>
                                    <input
                                        type="text"
                                        value={revisionDraft.reason}
                                        onChange={(e) => handleDraftChange('reason', e.target.value)}
                                        placeholder="e.g. Annual Appraisal / Promotion"
                                        className="w-full border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500 text-xs font-medium"
                                    />
                                </div>
                            </div>

                            {revisionDraft.payType !== 'hourly' && revisionDraft.payType !== 'flat' && (
                                <>
                                    {/* CTC Components Summary box */}
                                    {(() => {
                                        const preview = draftSalaryPreview || {};
                                        return (
                                            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                    <h4 className="font-bold text-slate-800 text-sm">CTC Components</h4>
                                                    <span className="text-[10px] text-slate-400">Synced with payroll settings</span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">PF Employer</span>
                                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.pfEmployer || 0)}</strong>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Gratuity</span>
                                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.gratuity || 0)}</strong>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">LWF Employer</span>
                                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.lwfEmployer || 0)}</strong>
                                                    </div>
                                                    {preview.esiEmployer > 0 && (
                                                        <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                            <span className="text-[10px] text-slate-500 uppercase font-semibold">ESI Employer</span>
                                                            <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.esiEmployer || 0)}</strong>
                                                        </div>
                                                    )}
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Annual CTC</span>
                                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney((Number(revisionDraft.newCTC) || 0) * 12)}</strong>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Gross Salary</span>
                                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.totalEarnings || preview.grossSalary || 0)}</strong>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded border border-slate-100 text-center">
                                                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Net Take-Home Estimate</span>
                                                        <strong className="text-xs text-slate-700 mt-1 block font-bold">{fmtMoney(preview.netTakeHome || 0)}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Statutory Components & Contribution Toggles */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                        <div className="border-b border-slate-100 pb-2">
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <span>Statutory Components & Contribution Toggles</span>
                                                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold uppercase">Statutory Toggles</span>
                                            </h4>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Enable or disable specific statutory contributions for this employee. Disabling a component will zero out its values in salary calculations immediately.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                            {/* Use Salary Components Toggle */}
                                            <label className="flex flex-col border border-blue-100 rounded-xl p-3 bg-blue-50/20 cursor-pointer select-none">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-blue-900">Use Salary Components</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.useSalaryComponents}
                                                        onChange={(e) => handleDraftChange('useSalaryComponents', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1">Distribute CTC into Basic, HRA, and Special Allowance.</span>
                                            </label>

                                            {/* PF Toggle */}
                                            <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-700">Provident Fund (PF)</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.pfEnabled}
                                                        onChange={(e) => handleDraftChange('pfEnabled', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1">Both Employee & Employer PF contributions.</span>
                                            </label>

                                            {/* ESI Toggle */}
                                            <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-700">State Insurance (ESI)</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.esiEnabled}
                                                        onChange={(e) => handleDraftChange('esiEnabled', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1">Employee State Insurance (ESI) deductions.</span>
                                            </label>

                                            {/* PT Toggle */}
                                            <div className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                                                <label className="flex justify-between items-center cursor-pointer select-none">
                                                    <span className="font-semibold text-slate-700">Professional Tax (PT)</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.ptEnabled}
                                                        onChange={(e) => handleDraftChange('ptEnabled', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </label>
                                                {revisionDraft.ptEnabled && (
                                                    <div className="mt-2 space-y-2">
                                                        <select
                                                            value={revisionDraft.ptState || 'MH'}
                                                            onChange={(e) => handleDraftChange('ptState', e.target.value)}
                                                            className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                        >
                                                            <optgroup label="── No PT / Manual">
                                                                <option value="">None — use manual override below</option>
                                                                <option value="custom">Custom Override</option>
                                                            </optgroup>
                                                            <optgroup label="── States that levy PT">
                                                                {PT_STATE_LIST.filter(s => s.leviesPT).map(s => (
                                                                    <option key={s.code} value={s.code}>{s.name}</option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label="── States with no PT">
                                                                {PT_STATE_LIST.filter(s => s.code && !s.leviesPT).map(s => (
                                                                    <option key={s.code} value={s.code}>{s.name}</option>
                                                                ))}
                                                            </optgroup>
                                                        </select>
                                                        {revisionDraft.ptState === 'custom' && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-500">Amount (₹):</span>
                                                                <input
                                                                    type="number"
                                                                    value={revisionDraft.deductions?.professionalTax || 0}
                                                                    onChange={(e) => handleDraftChange('deductions.professionalTax', e.target.value === '' ? '' : Number(e.target.value))}
                                                                    className="w-24 text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* LWF Toggle */}
                                            <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-700">Welfare Fund (LWF)</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.lwfEnabled}
                                                        onChange={(e) => handleDraftChange('lwfEnabled', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1">Labour Welfare Fund contributions.</span>
                                            </label>

                                            {/* Gratuity Toggle */}
                                            <label className="flex flex-col border border-slate-100 rounded-xl p-3 bg-slate-50/30 cursor-pointer select-none">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-700">Gratuity Provision</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={revisionDraft.gratuityEnabled}
                                                        onChange={(e) => handleDraftChange('gratuityEnabled', e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1">Accrual of statutory gratuity amount.</span>
                                            </label>
                                        </div>

                                        {/* Sub toggles: Include PF / Gratuity in CTC */}
                                        {(revisionDraft.pfEnabled || revisionDraft.gratuityEnabled) && (
                                            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {revisionDraft.pfEnabled && (
                                                    <label className="flex items-center gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/20 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={revisionDraft.includePfInCTC}
                                                            onChange={(e) => handleDraftChange('includePfInCTC', e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <span className="text-xs font-semibold text-slate-700 block">Include PF in CTC</span>
                                                            <span className="text-[10px] text-slate-400">Employer PF inside CTC limit.</span>
                                                        </div>
                                                    </label>
                                                )}
                                                {revisionDraft.gratuityEnabled && (
                                                    <label className="flex items-center gap-3 border border-slate-100 rounded-xl p-3 bg-slate-50/20 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={revisionDraft.includeGratuityInCTC}
                                                            onChange={(e) => handleDraftChange('includeGratuityInCTC', e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <span className="text-xs font-semibold text-slate-700 block">Include Gratuity in CTC</span>
                                                            <span className="text-[10px] text-slate-400">Gratuity inside CTC limit.</span>
                                                        </div>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Employee Salary Ratios (Overrides) */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <span>Employee Salary Ratios (Overrides)</span>
                                                <span className="text-[9px] bg-slate-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Optional</span>
                                            </h4>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                By default, this employee's Basic and HRA are computed using the global company payroll settings. You can set employee-specific overrides below.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Basic Salary % Override</label>
                                                <div className="relative rounded shadow-sm">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="1"
                                                        max="100"
                                                        placeholder="50"
                                                        value={revisionDraft.basicPercent ?? ''}
                                                        onChange={(e) => handleDraftChange('basicPercent', e.target.value === '' ? null : Number(e.target.value))}
                                                        className="w-full border border-slate-200 rounded p-2 pr-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">HRA % Override (of Basic)</label>
                                                <div className="relative rounded shadow-sm">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="1"
                                                        max="100"
                                                        placeholder="50"
                                                        value={revisionDraft.hraPercent ?? ''}
                                                        onChange={(e) => handleDraftChange('hraPercent', e.target.value === '' ? null : Number(e.target.value))}
                                                        className="w-full border border-slate-200 rounded p-2 pr-7 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salary Component Inputs */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                        <h4 className="font-bold text-slate-800 text-sm">Salary Component Inputs</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Basic */}
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Basic Salary</label>
                                                <input
                                                    type="number"
                                                    disabled
                                                    value={draftSalaryPreview?.basicMaster || 0}
                                                    className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                                />
                                            </div>
                                            {/* HRA */}
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">HRA</label>
                                                <input
                                                    type="number"
                                                    disabled
                                                    value={draftSalaryPreview?.hraMaster || 0}
                                                    className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                                />
                                            </div>
                                            {/* Special Allowance */}
                                            {payrollConfig?.salaryComponents?.some(c => c.id === 'special') && (
                                                <div>
                                                    <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Special Allowance</label>
                                                    <input
                                                        type="number"
                                                        disabled
                                                        value={draftSalaryPreview?.specialAllowance || draftSalaryPreview?.special || 0}
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                                    />
                                                </div>
                                            )}
                                            {/* Flexi */}
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Flexi Allowance</label>
                                                <input
                                                    type="number"
                                                    disabled
                                                    value={draftSalaryPreview?.flexi || 0}
                                                    className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded p-2 font-semibold cursor-not-allowed text-xs"
                                                />
                                            </div>
                                            {/* Dynamic Fixed Earning Components */}
                                            {payrollConfig?.salaryComponents && (
                                                payrollConfig.salaryComponents
                                                    .filter(c => c.type === 'earning' && c.linkedTo === 'fixed' && !['basic', 'hra'].includes(c.id))
                                                    .map(c => (
                                                        <div key={c.id}>
                                                            <label className="block text-slate-500 font-semibold mb-1 text-[10px]">{c.name}</label>
                                                            <input
                                                                type="number"
                                                                value={revisionDraft[c.id] !== undefined ? revisionDraft[c.id] : ''}
                                                                onChange={(e) => handleDraftChange(c.id, e.target.value === '' ? '' : Number(e.target.value))}
                                                                className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                                            />
                                                        </div>
                                                    ))
                                            )}
                                            {/* Insurance Amount */}
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Insurance Amount</label>
                                                <input
                                                    type="number"
                                                    value={revisionDraft.insuranceAmount || ''}
                                                    onChange={(e) => handleDraftChange('insuranceAmount', e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                                />
                                            </div>
                                            {/* Employer NPS */}
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Employer NPS</label>
                                                <input
                                                    type="number"
                                                    value={revisionDraft.employerNPS || ''}
                                                    onChange={(e) => handleDraftChange('employerNPS', e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                                />
                                            </div>
                                            {/* TDS */}
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Income Tax (TDS) / Tax Amount</label>
                                                <input
                                                    type="number"
                                                    value={revisionDraft.deductions.tds || ''}
                                                    onChange={(e) => handleDraftChange('deductions.tds', e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Allowances (Other Earnings) */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <span>Custom Allowances</span>
                                                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Other Earnings</span>
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allowances = revisionDraft.salaryStructure.otherAllowances || [];
                                                    handleDraftChange('salaryStructure.otherAllowances', [...allowances, { name: '', amount: 0 }]);
                                                }}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                + Add Custom Allowance
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-normal">
                                            Define additional custom allowance types for this employee (e.g. Children Education, Uniform Allowance). These will increase Gross Salary and be balanced under Special Allowance.
                                        </p>
                                        {(!revisionDraft.salaryStructure.otherAllowances || revisionDraft.salaryStructure.otherAllowances.length === 0) ? (
                                            <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 italic text-[11px] bg-slate-50/30">
                                                No custom allowances defined. Click "+ Add Custom Allowance" above to add one.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {revisionDraft.salaryStructure.otherAllowances.map((allowance, index) => (
                                                    <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-2.5 rounded border border-slate-200">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Allowance Name</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="e.g. Children Education"
                                                                value={allowance.name}
                                                                onChange={(e) => {
                                                                    const updated = [...revisionDraft.salaryStructure.otherAllowances];
                                                                    updated[index] = { ...updated[index], name: e.target.value };
                                                                    handleDraftChange('salaryStructure.otherAllowances', updated);
                                                                }}
                                                                className="w-full border border-slate-200 rounded p-1.5 text-xs font-medium"
                                                            />
                                                        </div>
                                                        <div className="w-1/3">
                                                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Monthly Amount (₹)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                required
                                                                value={allowance.amount}
                                                                onChange={(e) => {
                                                                    const updated = [...revisionDraft.salaryStructure.otherAllowances];
                                                                    updated[index] = { ...updated[index], amount: Number(e.target.value) || 0 };
                                                                    handleDraftChange('salaryStructure.otherAllowances', updated);
                                                                }}
                                                                className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = revisionDraft.salaryStructure.otherAllowances.filter((_, idx) => idx !== index);
                                                                handleDraftChange('salaryStructure.otherAllowances', updated);
                                                            }}
                                                            className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Custom Deductions (Other Deductions) */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <span>Custom Deductions</span>
                                                <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">Other Deductions</span>
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const deductions = revisionDraft.deductions.otherDeductions || [];
                                                    handleDraftChange('deductions.otherDeductions', [...deductions, { name: '', amount: 0 }]);
                                                }}
                                                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                                            >
                                                + Add Custom Deduction
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-normal">
                                            Define additional custom monthly deductions for this employee (e.g. Car Lease, Corporate Accommodation). These will automatically reduce the Net Take-Home Salary estimate.
                                        </p>
                                        {(!revisionDraft.deductions.otherDeductions || revisionDraft.deductions.otherDeductions.length === 0) ? (
                                            <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 italic text-[11px] bg-slate-50/30">
                                                No custom deductions defined. Click "+ Add Custom Deduction" above to add one.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {revisionDraft.deductions.otherDeductions.map((deduction, index) => (
                                                    <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-2.5 rounded border border-slate-200">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Deduction Name</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="e.g. Car Lease"
                                                                value={deduction.name}
                                                                onChange={(e) => {
                                                                    const updated = [...revisionDraft.deductions.otherDeductions];
                                                                    updated[index] = { ...updated[index], name: e.target.value };
                                                                    handleDraftChange('deductions.otherDeductions', updated);
                                                                }}
                                                                className="w-full border border-slate-200 rounded p-1.5 text-xs font-medium"
                                                            />
                                                        </div>
                                                        <div className="w-1/3">
                                                            <label className="text-[9px] font-bold text-slate-500 mb-1 block">Monthly Amount (₹)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                required
                                                                value={deduction.amount}
                                                                onChange={(e) => {
                                                                    const updated = [...revisionDraft.deductions.otherDeductions];
                                                                    updated[index] = { ...updated[index], amount: Number(e.target.value) || 0 };
                                                                    handleDraftChange('deductions.otherDeductions', updated);
                                                                }}
                                                                className="w-full border border-slate-200 rounded p-1.5 text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = revisionDraft.deductions.otherDeductions.filter((_, idx) => idx !== index);
                                                                handleDraftChange('deductions.otherDeductions', updated);
                                                            }}
                                                            className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-semibold hover:bg-red-100 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* One-Time Pay */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                        <h4 className="font-bold text-slate-800 text-sm">One-Time Pay</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-500 font-semibold mb-1 text-[10px]">Joining Bonus</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={revisionDraft.joiningBonus || ''}
                                                    onChange={(e) => handleDraftChange('joiningBonus', e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full border border-slate-200 rounded p-2 text-xs font-semibold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Comparison Preview Table */}
                            {(() => {
                                const rows = getComparisonRows();
                                return (
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wider">
                                            Salary Structure Preview & Comparison
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                                                        <th className="px-4 py-2">Component</th>
                                                        <th className="px-3 py-2 text-right">Current</th>
                                                        <th className="px-3 py-2 text-right">Revised</th>
                                                        <th className="px-4 py-2 text-right">Change</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-xs">
                                                    {rows.map((row, idx) => {
                                                        const diff = (row.revised || 0) - (row.current || 0);
                                                        const isBold = row.isHeader;
                                                        return (
                                                            <tr key={idx} className={`${isBold ? 'bg-slate-200/40 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50/80'} transition-all`}>
                                                                <td className="px-4 py-2">{row.name}</td>
                                                                <td className="px-3 py-2 text-right">{fmtMoney(row.current)}</td>
                                                                <td className="px-3 py-2 text-right">{fmtMoney(row.revised)}</td>
                                                                <td className="px-4 py-2 text-right font-semibold">
                                                                    {diff > 0 ? (
                                                                        <span className="text-emerald-600 font-bold">+{fmtMoney(diff)}</span>
                                                                    ) : diff < 0 ? (
                                                                        <span className="text-rose-600 font-bold">-{fmtMoney(Math.abs(diff))}</span>
                                                                    ) : (
                                                                        <span className="text-slate-400 font-normal">—</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Sticky Footer */}
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end space-x-3 shrink-0">
                            <Button 
                                variant="ghost" 
                                disabled={calculating} 
                                onClick={() => setShowRevisionModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                disabled={calculating} 
                                onClick={handleRevisionSubmit} 
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                            >
                                {calculating ? 'Calculating...' : 'Save Revision'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Add Payroll Record Modal */}
            {showPayrollModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Add Payroll Record</h3>
                            <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Pay Period</label>
                                <input 
                                    type="text" 
                                    value={payPeriod} 
                                    onChange={(e) => setPayPeriod(e.target.value)}
                                    placeholder="e.g. June 2026"
                                    className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Net Salary Received (₹)</label>
                                <input 
                                    type="number" 
                                    value={payNetSalary} 
                                    onChange={(e) => setPayNetSalary(e.target.value)}
                                    placeholder="e.g. 45000"
                                    className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                                <select 
                                    value={payStatus} 
                                    onChange={(e) => setPayStatus(e.target.value)}
                                    className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Processing">Processing</option>
                                    <option value="Approved">Approved</option>
                                </select>
                            </div>
                        </div>
                        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end space-x-3">
                            <Button variant="ghost" onClick={() => setShowPayrollModal(false)}>Cancel</Button>
                            <Button onClick={handleAddPayrollSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Save Record</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. View Payslip Modal */}
            {viewingPayslip && renderPayslipModal()}
        </div>
    );
};
