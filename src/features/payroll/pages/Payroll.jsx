import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Settings, RefreshCw, FileText, History, PlayCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import SalaryCalculator from './SalaryCalculator';
import PayrollSettings from '@/features/settings/pages/PayrollSettings';
import PayrollSyncSettings from '../components/PayrollSyncSettings';
import PayrollPayslips from '../components/PayrollPayslips';
import ReviseSalaryDetailsTab from '../components/ReviseSalaryDetailsTab';
import PayrollProcessing from '../components/PayrollProcessing';

const Payroll = ({ defaultTab = 'calculator' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || defaultTab;
  const currentTab = rawTab === 'payslip' ? 'payslips' : rawTab;
  const { user } = useAuth();

  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin', 'HR Admin'].includes(role))
    || user?.permissions?.includes('*');
  const canManageConfig = isAdmin || user?.permissions?.includes('payroll.config.manage');
  const canManageRevisions = isAdmin || canManageConfig
    || user?.permissions?.includes('payroll.salary.manage')
    || user?.permissions?.includes('employee.revision.manage')
    || user?.permissions?.includes('employee.revision.create');
  const canProcessPayroll = isAdmin || canManageConfig || user?.permissions?.includes('payroll.salary.manage');

  const tabs = [
    { id: 'calculator', name: 'Salary Calculator', icon: Calculator },
    ...(canProcessPayroll ? [
      { id: 'process', name: 'Process Payroll', icon: PlayCircle }
    ] : []),
    { id: 'payslips', name: 'Payslips', icon: FileText },
    ...(canManageRevisions ? [
      { id: 'revisions', name: 'Revise Salary Details', icon: History }
    ] : []),
    ...(canManageConfig ? [
      { id: 'settings', name: 'Payroll Settings', icon: Settings },
      { id: 'sync', name: 'Flance Sync Settings', icon: RefreshCw }
    ] : [])
  ];

  const handleTabChange = (id) => {
    setSearchParams({ tab: id });
  };

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Payroll
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Simulate compensation structures, revise employee salaries, view payslips, enforce statutory rules, and manage Flance sync.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon size={14} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {currentTab === 'calculator' && <SalaryCalculator embedded={true} />}
        {currentTab === 'process' && canProcessPayroll && <PayrollProcessing />}
        {currentTab === 'payslips' && <PayrollPayslips />}
        {currentTab === 'revisions' && canManageRevisions && (
          <ReviseSalaryDetailsTab />
        )}
        {currentTab === 'settings' && canManageConfig && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <PayrollSettings embed={true} />
          </div>
        )}
        {currentTab === 'sync' && canManageConfig && (
          <PayrollSyncSettings />
        )}
      </div>
    </div>
  );
};

export default Payroll;
