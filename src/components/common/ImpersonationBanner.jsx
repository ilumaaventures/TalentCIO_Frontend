import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeftCircle, Loader2 } from 'lucide-react';
import useAuth from '@/features/auth/hooks/useAuth';
import toast from 'react-hot-toast';

const ImpersonationBanner = () => {
  const { impersonation, user, endImpersonation } = useAuth();
  const [timeLeft, setTimeLeft] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (!impersonation?.active || !impersonation?.expiresAt) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const expiresAtEpoch = new Date(impersonation.expiresAt).getTime();
      const diffMs = expiresAtEpoch - Date.now();

      if (diffMs <= 0) {
        setTimeLeft('00:00');
        if (!isEnding) {
          handleReturnToAdmin(true);
        }
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [impersonation?.active, impersonation?.expiresAt]);

  const handleReturnToAdmin = async (isAutoExpire = false) => {
    if (isEnding) return;
    setIsEnding(true);
    const toastId = isAutoExpire
      ? toast.loading('Impersonation expired. Returning to admin...')
      : toast.loading('Ending impersonation session...');

    try {
      const result = await endImpersonation();
      if (result?.isSuperAdmin) {
        toast.success('Impersonation ended. Please switch back to Super Admin console.', { id: toastId });
      } else {
        toast.success('Returned to admin session.', { id: toastId });
      }
    } catch (error) {
      console.error('Failed to end impersonation:', error);
      toast.error(error?.message || 'Failed to return to admin.', { id: toastId });
    } finally {
      setIsEnding(false);
    }
  };

  if (!impersonation?.active) {
    return null;
  }

  const targetName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'User';
  const targetEmail = user?.email || '';
  const actorName = impersonation.actorName || (impersonation.tier === 'super_admin' ? 'Super Admin' : 'Workspace Admin');

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium shadow-md flex items-center justify-between gap-3 sticky top-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert size={18} className="text-amber-100 shrink-0 animate-pulse" />
        <div className="truncate">
          <span className="font-bold">Viewing as {targetName}</span>
          {targetEmail && <span className="opacity-90 ml-1">({targetEmail})</span>}
          <span className="mx-2 opacity-75">•</span>
          <span className="opacity-95">
            Impersonated by <span className="font-semibold">{actorName}</span>
            {impersonation.tier === 'super_admin' ? ' (Super Admin)' : ''}
          </span>
          {timeLeft && (
            <>
              <span className="mx-2 opacity-75">•</span>
              <span className="font-mono font-bold bg-amber-700/60 px-1.5 py-0.5 rounded text-amber-100">
                Expires in {timeLeft}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => handleReturnToAdmin(false)}
        disabled={isEnding}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-white text-amber-800 hover:bg-amber-50 rounded-md font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isEnding ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <ArrowLeftCircle size={14} className="text-amber-700" />
        )}
        <span>Return to Admin</span>
      </button>
    </div>
  );
};

export default ImpersonationBanner;
