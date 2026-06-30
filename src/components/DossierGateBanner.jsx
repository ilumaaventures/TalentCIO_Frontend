import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isAdminUser } from "../constants/accessPolicies";

/**
 * DossierGateBanner
 * Renders a dismissible sticky banner below the Topbar when the current
 * user has an incomplete dossier and is not an admin / bypass-permissioned user.
 */
const DossierGateBanner = () => {
  const navigate = useNavigate();
  const { user, isDossierComplete, dossierMissingSections } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Admins and bypass-permissioned users never see the banner
  if (!user) return null;
  const hasBypass =
    isAdminUser(user) ||
    user.permissions?.includes("dossier.bypass_completeness_gate");
  if (hasBypass) return null;

  // Hide if complete or manually dismissed
  if (isDossierComplete || dismissed) return null;

  const sectionLabel =
    dossierMissingSections.length === 1
      ? dossierMissingSections[0]
      : `${dossierMissingSections.length} sections`;

  return (
    <div
      id="dossier-gate-banner"
      className="relative flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm"
      role="alert"
    >
      {/* Icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle size={14} />
      </div>

      {/* Text */}
      <p className="flex-1 min-w-0 text-amber-800 font-medium">
        <span className="font-bold">Your employee profile is incomplete.</span>{" "}
        Missing: <span className="italic">{sectionLabel}</span>. Attendance, timesheet, and leave actions are locked until you complete it.
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={() => navigate("/profile?tab=hris")}
        className="shrink-0 flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
      >
        Complete Now <ArrowRight size={12} />
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-full p-1 text-amber-500 hover:text-amber-800 hover:bg-amber-100 transition-colors"
        aria-label="Dismiss banner"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default DossierGateBanner;
