import React from 'react';
import { Send } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

export const ConvertToLeadModal = ({
  isOpen,
  onClose,
  convertTarget,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!isOpen || !convertTarget) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title="Convert to Lead"
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-600 hover:text-slate-800"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Send}
            isLoading={isSubmitting}
            onClick={onConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
          >
            {convertTarget.type === 'single'
              ? 'Convert to Lead'
              : `Convert (${convertTarget.count})`}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 py-1 text-xs text-slate-600">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {convertTarget.type === 'single'
                ? `Convert "${convertTarget.row?.companyName || 'this record'}" into a Lead?`
                : `Convert ${convertTarget.count} selected record${convertTarget.count === 1 ? '' : 's'} into Leads?`}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {convertTarget.type === 'single'
                ? 'Are you sure you want to convert this into a lead? It will be added to your active CRM Leads pipeline.'
                : `Are you sure you want to convert these ${convertTarget.count} records into leads? They will be added to your active CRM Leads pipeline.`}
            </p>
          </div>
        </div>

        {convertTarget.type === 'single' && convertTarget.row && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600 mt-2">
            {convertTarget.row.companyName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Company:</span>
                <span className="font-semibold text-slate-800">{convertTarget.row.companyName}</span>
              </div>
            )}
            {convertTarget.row.contactPerson && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contact:</span>
                <span className="font-medium text-slate-700">{convertTarget.row.contactPerson}</span>
              </div>
            )}
            {convertTarget.row.mobileNo && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mobile:</span>
                <span className="font-mono text-slate-700">{convertTarget.row.mobileNo}</span>
              </div>
            )}
            {convertTarget.row.emailId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-700">{convertTarget.row.emailId}</span>
              </div>
            )}
            {convertTarget.row.industry && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Industry:</span>
                <span className="text-slate-700">{convertTarget.row.industry}</span>
              </div>
            )}
          </div>
        )}

        {convertTarget.type === 'bulk' && convertTarget.rows && (
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/80 text-[11px] text-emerald-900 mt-2">
            <p className="font-semibold text-emerald-950 mb-1.5">
              Ready to convert {convertTarget.count} companies:
            </p>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {convertTarget.rows.slice(0, 5).map((r, i) => (
                <div key={r.id || i} className="flex items-center justify-between text-slate-700">
                  <span className="font-medium truncate max-w-[200px]">{r.companyName || 'Untitled'}</span>
                  <span className="text-slate-500 font-mono text-[10px]">{r.mobileNo || r.emailId || '—'}</span>
                </div>
              ))}
              {convertTarget.rows.length > 5 && (
                <p className="text-[10px] text-emerald-700 italic pt-1">
                  + {convertTarget.rows.length - 5} more companies...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
