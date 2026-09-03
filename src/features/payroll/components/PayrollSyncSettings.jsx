import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Filter,
  RotateCcw
} from 'lucide-react';
import api from '@/lib/apiClient';

const PayrollSyncSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncConfig, setSyncConfig] = useState({
    enabled: false,
    externalTenantId: '',
    webhookUrl: '',
    syncMode: 'selected',
    allowedEmployeeIds: [],
    employees: []
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [syncMode, setSyncMode] = useState('selected');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/sync-settings');
      const data = res.data || {};
      setSyncConfig(data);
      setSyncMode(data.syncMode || 'selected');
      setSelectedIds(new Set((data.allowedEmployeeIds || []).map(String)));
    } catch (err) {
      console.error('Failed to load payroll sync settings', err);
      toast.error(err.response?.data?.message || 'Failed to load sync settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const availableRoles = useMemo(() => {
    const roles = new Set();
    (syncConfig.employees || []).forEach((e) => {
      (e.roles || []).forEach((r) => roles.add(r));
    });
    return Array.from(roles).sort();
  }, [syncConfig.employees]);

  const availableDepts = useMemo(() => {
    const depts = new Set();
    (syncConfig.employees || []).forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [syncConfig.employees]);

  const filteredEmployees = useMemo(() => {
    const list = syncConfig.employees || [];
    const term = searchTerm.toLowerCase().trim();

    return list.filter((e) => {
      if (term) {
        const matchesSearch =
          e.fullName?.toLowerCase().includes(term) ||
          e.email?.toLowerCase().includes(term) ||
          e.employeeCode?.toLowerCase().includes(term) ||
          e.department?.toLowerCase().includes(term) ||
          (e.roles || []).some((r) => r.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      if (roleFilter !== 'all') {
        const hasRole = (e.roles || []).includes(roleFilter);
        if (!hasRole) return false;
      }

      if (deptFilter !== 'all') {
        if (e.department !== deptFilter) return false;
      }

      if (statusFilter !== 'all') {
        const isAllowed = syncMode === 'all' || selectedIds.has(String(e._id));
        if (statusFilter === 'allowed' && !isAllowed) return false;
        if (statusFilter === 'excluded' && isAllowed) return false;
      }

      return true;
    });
  }, [syncConfig.employees, searchTerm, roleFilter, deptFilter, statusFilter, selectedIds, syncMode]);

  const hasActiveFilters = searchTerm || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setDeptFilter('all');
    setStatusFilter('all');
  };

  const toggleEmployee = (id) => {
    const strId = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFiltered = filteredEmployees.map((e) => String(e._id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allFiltered.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    const allFiltered = new Set(filteredEmployees.map((e) => String(e._id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allFiltered.forEach((id) => next.delete(id));
      return next;
    });
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredEmployees.length === 0) return false;
    return filteredEmployees.every((e) => syncMode === 'all' || selectedIds.has(String(e._id)));
  }, [filteredEmployees, selectedIds, syncMode]);

  const isSomeFilteredSelected = useMemo(() => {
    if (filteredEmployees.length === 0) return false;
    return filteredEmployees.some((e) => syncMode === 'all' || selectedIds.has(String(e._id)));
  }, [filteredEmployees, selectedIds, syncMode]);

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      handleDeselectAll();
    } else {
      handleSelectAll();
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        syncMode,
        allowedEmployeeIds: Array.from(selectedIds)
      };
      await api.put('/payroll/sync-settings', payload);
      toast.success('Sync settings saved successfully');
    } catch (err) {
      console.error('Failed to update sync settings', err);
      toast.error(err.response?.data?.message || 'Failed to save sync settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isEnabled = syncConfig.enabled === true;
  const totalEmployees = syncConfig.employees?.length || 0;
  const allowedCount = syncMode === 'all' ? totalEmployees : selectedIds.size;

  return (
    <div className="space-y-6">
      {/* Header card with status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Flance / MyBill Integration Sync</h2>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {isEnabled ? 'Integration Active' : 'Integration Standby'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Control which employee profiles from TalentCIO are permitted to sync over to Flance.
              {syncConfig.externalTenantId && (
                <span className="ml-2 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  Tenant: {syncConfig.externalTenantId}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* Sync Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sync Scope</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setSyncMode('selected')}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              syncMode === 'selected'
                ? 'border-blue-600 bg-blue-50/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'selected'}
                onChange={() => setSyncMode('selected')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-slate-800">Selected Employees Only (Recommended)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-5">
              Only employees explicitly checked below will be synced to Flance. All other profiles will remain local to TalentCIO.
            </p>
          </div>

          <div
            onClick={() => setSyncMode('all')}
            className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${
              syncMode === 'all'
                ? 'border-blue-600 bg-blue-50/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'all'}
                onChange={() => setSyncMode('all')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-slate-800">All Active Employees</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-5">
              All active employees in this workspace will be automatically synced to Flance during payroll sync cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Employee Selection Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-800">
              Sync Permissions
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {allowedCount} of {totalEmployees} allowed
            </span>
            {filteredEmployees.length !== totalEmployees && (
              <span className="text-xs text-slate-400">
                ({filteredEmployees.length} matching filter)
              </span>
            )}
          </div>

          {syncMode === 'selected' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
              >
                Select Filtered
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs font-semibold text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 transition-colors"
              >
                Deselect Filtered
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, code, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                <option value="all">All Roles</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    Role: {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                <option value="all">All Departments</option>
                {availableDepts.map((dept) => (
                  <option key={dept} value={dept}>
                    Dept: {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                <option value="all">All Sync Statuses</option>
                <option value="allowed">Sync Enabled Only</option>
                <option value="excluded">Excluded Only</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Showing {filteredEmployees.length} of {totalEmployees} employees</span>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Table Column Header with Select All Master Checkbox */}
        <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-checkbox"
              checked={isAllFilteredSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
              }}
              disabled={syncMode === 'all' || filteredEmployees.length === 0}
              onChange={toggleSelectAllFiltered}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
            />
            <label
              htmlFor="select-all-checkbox"
              className={`cursor-pointer select-none text-xs font-bold uppercase tracking-wider ${
                syncMode === 'all' || filteredEmployees.length === 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              Select All at Once ({filteredEmployees.length})
            </label>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Sync Status
          </span>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No employees found matching the selected filter criteria.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isChecked = syncMode === 'all' || selectedIds.has(String(emp._id));
              const isDisabled = syncMode === 'all';

              return (
                <div
                  key={emp._id}
                  onClick={() => !isDisabled && toggleEmployee(emp._id)}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    isDisabled ? 'cursor-default bg-slate-50/40' : 'cursor-pointer hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && toggleEmployee(emp._id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{emp.fullName}</span>
                        {emp.employeeCode && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {emp.employeeCode}
                          </span>
                        )}
                        {emp.roles && emp.roles.length > 0 && (
                          emp.roles.map((r) => (
                            <span key={r} className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{emp.email}</span>
                        {emp.department && (
                          <>
                            <span>•</span>
                            <span>{emp.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isChecked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <CheckCircle2 size={12} /> Sync Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        Excluded
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollSyncSettings;
