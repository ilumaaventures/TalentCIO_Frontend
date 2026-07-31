import React, { useState, useEffect } from 'react';
import { 
    History, Settings, Shield, DollarSign, Trash2, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Button from '../../components/Button';
import { buildMasterSalaryStructure, fmtMoney } from '../../utils/payroll';
import { Field, PendingHighlight, SectionCard } from '../EmployeeDossier/DossierHelpers';

import CTCSnapshotCard from './CTCSnapshotCard';
import ReviseSalaryModal from './ReviseSalaryModal';
import PayslipModal from './PayslipModal';
import AddPayrollModal from './AddPayrollModal';

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
    pendingUpdates,
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
        const payType = data.compensation?.payType || breakup.payType || 'salaried';
        const source = {
            monthlyCTC: data.compensation?.ctc || 0,
            compensationType: breakup.compensationType || data.compensation?.compensationType || payType || 'monthly_salary',
            attendanceMode: data.attendanceMode || breakup.attendanceMode || 'attendance',
            pfEnabled: breakup.pfEnabled !== false,
            esiEnabled: breakup.esiEnabled !== false,
            ptEnabled: breakup.ptEnabled !== false,
            lwfEnabled: breakup.lwfEnabled !== false,
            gratuityEnabled: breakup.gratuityEnabled !== false,
            tdsEnabled: breakup.tdsEnabled !== false,
            ptState: breakup.ptState || 'MH',
            includePfInCTC: breakup.includePfInCTC === true,
            includeGratuityInCTC: breakup.includeGratuityInCTC !== false,
            basicPercent: breakup.basicPercent !== undefined && breakup.basicPercent !== null ? Number(breakup.basicPercent) : null,
            hraPercent: breakup.hraPercent !== undefined && breakup.hraPercent !== null ? Number(breakup.hraPercent) : null,
            vpfPercent: breakup.vpfPercent !== undefined && breakup.vpfPercent !== null ? Number(breakup.vpfPercent) : null,
            customAllowances: breakup.customAllowances || breakup.otherAllowances || [],
            customDeductions: breakup.customDeductions || breakup.otherDeductions || [],
            rateCard: breakup.rateCard || [],
            insuranceAmount: data.compensation?.insuranceAmount || 0,
            employerNPS: data.compensation?.employerNPS || 0,
            employmentType: data.employment?.employmentType || 'Full Time',
            payType,
            hourlyRate: data.compensation?.hourlyRate || breakup.hourlyRate || 0,
            hoursWorked: data.compensation?.hoursWorked || breakup.hoursWorked || 160,
            useSalaryComponents: payType !== 'flat' && payType !== 'hourly' && breakup.useSalaryComponents !== false
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
            compensationType: getBreakupField('compensationType', comp.compensationType || (getBreakupField('payType') === 'hourly' ? 'hourly' : getBreakupField('payType') === 'flat' ? 'flat_project' : 'monthly_salary')),
            attendanceMode: getBreakupField('attendanceMode', comp.attendanceMode || 'attendance'),
            tdsEnabled: getBreakupField('tdsEnabled', true),
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
                compensationType: merged.compensationType || 'monthly_salary',
                attendanceMode: merged.attendanceMode || 'attendance',
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
        const isSalaried = revisionDraft?.payType !== 'hourly' && revisionDraft?.payType !== 'flat' && revisionDraft?.useSalaryComponents !== false;

        const rows = [
            { name: 'Total Monthly CTC', current: current.monthlyCTC || 0, revised: revised.monthlyCTC || 0, isHeader: true }
        ];

        if (isSalaried) {
            if ((current.basicMaster || 0) > 0 || (revised.basicMaster || 0) > 0) {
                rows.push({ name: 'Basic Salary', current: current.basicMaster || 0, revised: revised.basicMaster || 0 });
            }
            if ((current.hraMaster || 0) > 0 || (revised.hraMaster || 0) > 0) {
                rows.push({ name: 'HRA', current: current.hraMaster || 0, revised: revised.hraMaster || 0 });
            }
            if (payrollConfig?.salaryComponents?.some(c => c.id === 'special') && ((current.specialAllowance || current.special || 0) > 0 || (revised.specialAllowance || revised.special || 0) > 0)) {
                rows.push(
                    { name: 'Special Allowance', current: current.specialAllowance || current.special || 0, revised: revised.specialAllowance || revised.special || 0 }
                );
            }
            if ((current.flexi || 0) > 0 || (revised.flexi || 0) > 0) {
                rows.push(
                    { name: 'Flexi Allowance', current: current.flexi || 0, revised: revised.flexi || 0 }
                );
            }
            if (Array.isArray(revised.customAllowances) || Array.isArray(current.customAllowances)) {
                const allowances = revised.customAllowances || current.customAllowances || [];
                allowances.forEach(item => {
                    if (Number(item.amount) > 0) {
                        rows.push({ name: item.name || 'Custom Allowance', current: 0, revised: item.amount });
                    }
                });
            }
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
            compensationType: revisionDraft.compensationType || 'monthly_salary',
            attendanceMode: revisionDraft.attendanceMode || 'attendance',
            tdsEnabled: revisionDraft.tdsEnabled !== false,
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
                compensationType: revisionDraft.compensationType || 'monthly_salary',
                attendanceMode: revisionDraft.attendanceMode || 'attendance',
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

    const activeBreakup = getBreakupData(editMode);
    const pend = pendingUpdates || {};

    return (
        <div className="space-y-6">
            {/* CTC Snapshot Section */}
            <CTCSnapshotCard 
                breakup={activeBreakup}
                payrollConfig={payrollConfig}
                handleDownloadBreakup={handleDownloadBreakup}
            />

            {/* Statutory & Bank Configurations Card */}
            <SectionCard title="Salary & Statutory Details" icon={Settings} canEdit={canEdit} editMode={editMode} setEditMode={setEditMode} sectionName="salary" onSave={handleSave}>
                <PendingHighlight isPending={!!pend['compensation.salaryBreakup']}>
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statutory & Ratio Configurations</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-1">PF Enabled</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${activeBreakup?.pfEnabled !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {activeBreakup?.pfEnabled !== false ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">Include PF in CTC</span>
                                <span className="font-semibold text-slate-700">{activeBreakup?.includePfInCTC ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">ESI Enabled</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${activeBreakup?.esiEnabled !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {activeBreakup?.esiEnabled !== false ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">PT Enabled</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${activeBreakup?.ptEnabled !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {activeBreakup?.ptEnabled !== false ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">LWF Enabled</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${activeBreakup?.lwfEnabled !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {activeBreakup?.lwfEnabled !== false ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">Gratuity Enabled</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${activeBreakup?.gratuityEnabled !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {activeBreakup?.gratuityEnabled !== false ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">Include Gratuity in CTC</span>
                                <span className="font-semibold text-slate-700">{activeBreakup?.includeGratuityInCTC !== false ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">Basic Salary Override (%)</span>
                                <span className="font-semibold text-slate-700">{profile?.compensation?.salaryBreakup?.basicPercent || 'null'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-1">HRA Override (% of Basic)</span>
                                <span className="font-semibold text-slate-700">{profile?.compensation?.salaryBreakup?.hraPercent || 'null'}</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bank & UAN Details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <Field label="UAN Number" value={profile?.compensation?.uanNumber} editMode={editMode} onChange={(v) => handleBreakupChange('uanNumber', v)} />
                                <Field label="Bank Account Number" value={profile?.compensation?.bankDetails?.accountNumber} editMode={editMode} onChange={(v) => handleBreakupChange('bankDetails.accountNumber', v)} />
                                <Field label="Bank Name" value={profile?.compensation?.bankDetails?.bankName} editMode={editMode} onChange={(v) => handleBreakupChange('bankDetails.bankName', v)} />
                                <Field label="IFSC Code" value={profile?.compensation?.bankDetails?.ifscCode} editMode={editMode} onChange={(v) => handleBreakupChange('bankDetails.ifscCode', v)} />
                                <Field label="Account Holder Name" value={profile?.compensation?.bankDetails?.accountHolderName} editMode={editMode} onChange={(v) => handleBreakupChange('bankDetails.accountHolderName', v)} />
                                <Field label="Branch Address" value={profile?.compensation?.bankDetails?.branchAddress} editMode={editMode} onChange={(v) => handleBreakupChange('bankDetails.branchAddress', v)} />
                            </div>
                        </div>

                        {editMode && (
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <Button onClick={() => handleSave('salary')} disabled={savingSection === 'salary'} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {savingSection === 'salary' ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        )}
                    </div>
                </PendingHighlight>
            </SectionCard>

            {/* Salary Revision History */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <History className="text-blue-500" size={20} />
                        <h3 className="font-bold text-slate-800 text-lg">Salary Revision History</h3>
                    </div>
                    {canEdit && (
                        <button
                            onClick={openAddRevisionModal}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs py-1.5 px-3 rounded font-semibold transition-colors cursor-pointer"
                        >
                            + Add Revision
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Effective Date</th>
                                <th className="px-4 py-3">Previous CTC</th>
                                <th className="px-4 py-3">New CTC</th>
                                <th className="px-4 py-3">Reason</th>
                                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(!profile?.compensation?.salaryRevisions || profile.compensation.salaryRevisions.length === 0) ? (
                                <tr>
                                    <td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-slate-400 font-medium">
                                        No salary revisions recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                profile.compensation.salaryRevisions.map((rev) => (
                                    <tr key={rev._id || rev.effectiveDate} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                            {rev.effectiveDate ? format(new Date(rev.effectiveDate), 'MMM dd, yyyy') : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{fmtMoney(rev.previousCTC)}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600">{fmtMoney(rev.newCTC)}</td>
                                        <td className="px-4 py-3 text-slate-600">{rev.reason || '—'}</td>
                                        {canEdit && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteRevision(rev._id)}
                                                    className="text-rose-500 hover:text-rose-700 font-semibold transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payroll History */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <Shield className="text-blue-500" size={20} />
                        <h3 className="font-bold text-slate-800 text-lg">Payroll History</h3>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setShowPayrollModal(true)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs py-1.5 px-3 rounded font-semibold transition-colors cursor-pointer"
                        >
                            + Add Payroll Record
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Period</th>
                                <th className="px-4 py-3">Net Salary</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Payslip</th>
                                {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(!profile?.compensation?.payrollHistory || profile.compensation.payrollHistory.length === 0) ? (
                                <tr>
                                    <td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-slate-400 font-medium">
                                        No payroll records yet.
                                    </td>
                                </tr>
                            ) : (
                                profile.compensation.payrollHistory.map((pay) => (
                                    <tr key={pay._id || pay.period} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{pay.period}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{fmtMoney(pay.netSalary)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pay.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : pay.status === 'Processing' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                                                {pay.status || 'Paid'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setViewingPayslip(pay)}
                                                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                                            >
                                                <FileText size={14} /> View Statement
                                            </button>
                                        </td>
                                        {canEdit && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeletePayroll(pay._id)}
                                                    className="text-rose-500 hover:text-rose-700 font-semibold transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Subcomponent Modals */}
            <ReviseSalaryModal
                showRevisionModal={showRevisionModal}
                setShowRevisionModal={setShowRevisionModal}
                revisionDraft={revisionDraft}
                setRevisionDraft={setRevisionDraft}
                handleDraftChange={handleDraftChange}
                draftSalaryPreview={draftSalaryPreview}
                calculating={calculating}
                payrollConfig={payrollConfig}
                getComparisonRows={getComparisonRows}
                handleRevisionSubmit={handleRevisionSubmit}
            />

            <PayslipModal
                viewingPayslip={viewingPayslip}
                setViewingPayslip={setViewingPayslip}
                profile={profile}
                getPayslipComponents={getPayslipComponents}
            />

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
        </div>
    );
};

export default SalaryTab;
