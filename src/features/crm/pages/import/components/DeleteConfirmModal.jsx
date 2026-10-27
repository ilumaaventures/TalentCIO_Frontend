import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  deleteTarget,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen || !deleteTarget) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title="Confirm Deletion"
      subtitle="Move data to Recycle Bin"
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={Trash2}
            isLoading={isDeleting}
            onClick={onConfirm}
            className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-semibold"
          >
            {deleteTarget.type === 'single'
              ? 'Delete Record'
              : `Delete (${deleteTarget.count})`}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 py-1 text-xs text-slate-600">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {deleteTarget.type === 'single'
                ? `Delete "${deleteTarget.row?.companyName || 'this record'}"?`
                : `Delete ${deleteTarget.count} selected record${deleteTarget.count === 1 ? '' : 's'}?`}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {deleteTarget.type === 'single'
                ? 'This record will be removed from your active workspace and moved to the Recycle Bin.'
                : `All ${deleteTarget.count} selected records will be removed from your workspace and moved to the Recycle Bin.`}
            </p>
          </div>
        </div>

        {deleteTarget.type === 'single' && deleteTarget.row && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600 mt-2">
            {deleteTarget.row.companyName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Company:</span>
                <span className="font-semibold text-slate-800">{deleteTarget.row.companyName}</span>
              </div>
            )}
            {deleteTarget.row.contactPerson && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contact:</span>
                <span className="font-medium text-slate-700">{deleteTarget.row.contactPerson}</span>
              </div>
            )}
            {deleteTarget.row.mobileNo && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mobile:</span>
                <span className="font-mono text-slate-700">{deleteTarget.row.mobileNo}</span>
              </div>
            )}
            {deleteTarget.row.emailId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-700">{deleteTarget.row.emailId}</span>
              </div>
            )}
            {deleteTarget.row.industry && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Industry:</span>
                <span className="text-slate-700">{deleteTarget.row.industry}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
