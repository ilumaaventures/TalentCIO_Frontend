import React, { useState } from 'react';
import { UserCheck, X, AlertTriangle, Loader2 } from 'lucide-react';

const ImpersonateConfirmModal = ({ isOpen, onClose, targetUser, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !targetUser) return null;

  const displayName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email;
  const userRole = Array.isArray(targetUser.roles)
    ? targetUser.roles.map(r => typeof r === 'string' ? r : r?.name).join(', ')
    : (targetUser.role || 'Employee');

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(targetUser._id, reason.trim());
      onClose();
    } catch (error) {
      console.error('Impersonation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Switch User (Impersonate)</h3>
              <p className="text-xs text-slate-500">View TalentCIO exactly as this employee</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Target User Info Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800 text-sm">{displayName}</p>
                <p className="text-xs text-slate-500">{targetUser.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-700">
                {userRole}
              </span>
            </div>
            {targetUser.department && (
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                Department: <span className="font-medium text-slate-700">{targetUser.department}</span>
              </p>
            )}
          </div>

          {/* Warning Notice */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-semibold text-amber-900">30-Minute Temporary Session</p>
              <p className="text-amber-800">
                All actions will be audited. You can return to your admin account at any time using the top banner.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Reason / Ticket Reference <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Investigating timesheet approval issue reported in ticket #1234"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              <span>{loading ? 'Switching...' : 'Switch User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImpersonateConfirmModal;
