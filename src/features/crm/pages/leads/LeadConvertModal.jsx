import React, { useState } from 'react';
import { UserCheck, Building2, Briefcase } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { leadsService } from '../../services/api';

export const LeadConvertModal = ({ isOpen, onClose, lead, onSuccess }) => {
  const [createContact, setCreateContact] = useState(true);
  const [createCompany, setCreateCompany] = useState(true);
  const [createDeal, setCreateDeal] = useState(true);

  const [dealTitle, setDealTitle] = useState(
    lead ? `${lead.companyName || lead.fullName} - Sales Opportunity` : ''
  );
  const [dealValue, setDealValue] = useState(lead?.estimatedValue || 500000);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConvert = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await leadsService.convertLead(lead._id, {
        createContact,
        createCompany,
        createDeal,
        dealTitle,
        dealValue: Number(dealValue) || 0,
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Lead"
      subtitle={`Transform ${lead?.fullName} into structured account records`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} isLoading={isLoading}>
            Convert & Create Records
          </Button>
        </>
      }
    >
      <form onSubmit={handleConvert} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <p className="text-xs text-slate-500">
          Converting will preserve all interaction timeline history, activities, notes, and automatically associate newly created entities.
        </p>

        {/* Record Selection Checkboxes */}
        <div className="space-y-3 pt-2">
          {/* Contact */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={createContact}
              onChange={(e) => setCreateContact(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
            />
            <div className="text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Create Contact: {lead?.fullName}</span>
              </div>
              <p className="text-slate-500 mt-0.5">{lead?.email} • {lead?.phone}</p>
            </div>
          </label>

          {/* Company */}
          {lead?.companyName && (
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={createCompany}
                onChange={(e) => setCreateCompany(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
              />
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Create Account / Company: {lead?.companyName}</span>
                </div>
                <p className="text-slate-500 mt-0.5">Will match existing company if name exists</p>
              </div>
            </label>
          )}

          {/* Deal / Opportunity */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={createDeal}
              onChange={(e) => setCreateDeal(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
            />
            <div className="text-xs flex-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Create Sales Opportunity (Deal)</span>
              </div>
              <p className="text-slate-500 mt-0.5">Places new deal into active Sales Pipeline</p>

              {createDeal && (
                <div className="mt-3 space-y-3 pt-2 border-t border-slate-100">
                  <Input
                    label="Deal Title"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="Opportunity Title"
                  />
                  <Input
                    label="Opportunity Value (₹)"
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                  />
                </div>
              )}
            </div>
          </label>
        </div>
      </form>
    </Modal>
  );
};
