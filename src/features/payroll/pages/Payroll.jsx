import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Settings, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import SalaryCalculator from './SalaryCalculator';
import PayrollSettings from '@/features/settings/pages/PayrollSettings';
import PayrollSyncSettings from '../components/PayrollSyncSettings';
import PayrollPayslips from '../components/PayrollPayslips';

const Payroll = ({ defaultTab = 'calculator' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || defaultTab;
  const currentTab = rawTab === 'payslip' ? 'payslips' : rawTab;
  const { user } = useAuth();

  const isAdmin = user?.roles?.some(role => ['Admin', 'Super Admin', 'System Admin'].includes(role))
    || user?.permissions?.includes('*');
  const canManageConfig = isAdmin || user?.permissions?.includes('payroll.config.manage');

  const tabs = [
    { id: 'calculator', name: 'Salary Calculator', icon: Calculator },
    { id: 'payslips', name: 'Payslips', icon: FileText },
    ...(canManageConfig ? [
      { id: 'settings', name: 'Payroll Settings', icon: Settings },
      { id: 'sync', name: 'Flance Sync Settings', icon: RefreshCw }
    ] : [])
  ];

  const handleTabChange = (id) => {
    setSearchParams({ tab: id });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Payroll
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Simulate compensation structures, view payslips, enforce statutory rules, and manage Flance sync permissions.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {currentTab === 'calculator' && <SalaryCalculator embedded={true} />}
        {currentTab === 'payslips' && <PayrollPayslips />}
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
