import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const StatusChangeModal = ({
  isOpen,
  onClose,
  companyName = 'Prospect',
  currentStatus = 'New',
  newStatusValue,
  setNewStatusValue,
  statusChangeNote,
  setStatusChangeNote,
  onConfirm,
  isUpdating = false,
  statusOptions = [],
  getStatusBadgeStyle = () => 'bg-slate-50 text-slate-700 border-slate-300',
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isUpdating && onClose()}
      title="Update Company Status"
      subtitle={`Company: ${companyName} • Change interest & lifecycle stage`}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isUpdating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            {isUpdating ? 'Updating...' : 'Save Status Change'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onConfirm} className="space-y-4">
        {/* Status Transition Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Current Status
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeStyle(
                currentStatus
              )}`}
            >
              {currentStatus}
            </span>
          </div>
          <span className="text-slate-400 font-bold text-base">→</span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              New Status
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeStyle(
                newStatusValue
              )}`}
            >
              {newStatusValue || 'Select'}
            </span>
          </div>
        </div>

        {/* Select Status */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Select Status / Stage <span className="text-rose-500">*</span>
          </label>
          <select
            value={newStatusValue}
            onChange={(e) => setNewStatusValue(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            required
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Optional Note / Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Reason / Note (Optional)
          </label>
          <textarea
            value={statusChangeNote}
            onChange={(e) => setStatusChangeNote(e.target.value)}
            placeholder="e.g. Spoke with decision maker, requested demo next week..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs leading-relaxed"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This note will be logged in the company's status history audit trail.
          </p>
        </div>
      </form>
    </Modal>
  );
};
