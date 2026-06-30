import React from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

/**
 * DossierIncompleteModal
 * Shows which sections are missing and directs the user to their dossier.
 *
 * Props:
 *   open         boolean   - whether the modal is visible
 *   onClose      () => void
 *   missingSections string[]
 *   missingFields   {section, label}[]
 */
const SECTION_ICONS = {
  "Personal Info": "👤",
  "Contact Details": "📞",
  "Employment Details": "🏢",
  "Emergency Contact": "🚨",
  "Identity Details": "🪪",
  "Mandatory Documents": "📁",
  "Submission Required": "📤"
};

const DossierIncompleteModal = ({ open, onClose, missingSections = [], missingFields = [] }) => {
  const navigate = useNavigate();

  if (!open) return null;

  const handleGoToDossier = () => {
    onClose();
    navigate("/profile?tab=hris");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-label="Dossier Incomplete"
      >
        {/* Header */}
        <div className="flex items-start gap-4 bg-amber-50 border-b border-amber-100 px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">Profile Incomplete</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Please fill in the required fields to unlock this action.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Simple Message */}
        <div className="px-6 py-6">
          <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5 flex flex-col items-center text-center space-y-2">
            <span className="text-3xl">📋</span>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              Your profile is incomplete and attach your documents.
            </p>
            <p className="text-xs text-slate-500">
              Please complete all mandatory details and upload the required documents in the EIS tab to unlock this action.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={handleGoToDossier}
            id="dossier-incomplete-go-btn"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Complete My Profile <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DossierIncompleteModal;
