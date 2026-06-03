import React, { useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import AnnouncementAvatar from './AnnouncementAvatar';
import {
  formatAnnouncementDateTime,
  getCategoryTheme,
} from './announcementUtils';

const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hasAttribute('disabled'));
};

/**
 * @param {object} props
 * @param {object[]} props.announcements - Unread announcements to step through.
 * @param {number} props.activeIndex - Current announcement index.
 * @param {boolean} props.acknowledged - Whether the checkbox is ticked for the current slide.
 * @param {(checked: boolean) => void} props.onAcknowledgedChange - Checkbox state setter.
 * @param {() => void} props.onContinue - Advance handler after acknowledgement.
 * @param {() => void} props.onSkip - Skip handler for the current login session.
 */
const AnnouncementUnreadModal = ({
  announcements,
  activeIndex,
  acknowledged,
  onAcknowledgedChange,
  onContinue,
  onSkip,
}) => {
  const modalRef = useRef(null);
  const checkboxRef = useRef(null);
  const activeAnnouncement = announcements[activeIndex];
  const categoryTheme = getCategoryTheme(activeAnnouncement?.category);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => checkboxRef.current?.focus(), 80);

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const progressLabel = useMemo(
    () => `${activeIndex + 1} of ${announcements.length}`,
    [activeIndex, announcements.length],
  );

  if (!activeAnnouncement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-gate-title"
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/talentcio-logo.png" alt="TalentCIO" className="h-10 w-auto" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Unread Announcement</div>
                <h1 id="announcement-gate-title" className="mt-1 text-xl font-semibold text-slate-900">
                  Please review before continuing
                </h1>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{progressLabel}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-label={`Category ${activeAnnouncement.category}`}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${categoryTheme.badgeClassName}`}
            >
              {activeAnnouncement.category}
            </span>
            {activeAnnouncement.isExpired ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                <AlertTriangle size={12} />
                Expired
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{activeAnnouncement.title}</h2>
          {activeAnnouncement.summary ? (
            <p className="mt-3 text-base text-slate-600">{activeAnnouncement.summary}</p>
          ) : null}

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <AnnouncementAvatar person={activeAnnouncement.createdBy} sizeClassName="h-11 w-11" textClassName="text-xs" />
            <div>
              <div className="text-sm font-semibold text-slate-800">{activeAnnouncement.createdBy?.name || 'TalentCIO Team'}</div>
              <div className="text-xs text-slate-500">{formatAnnouncementDateTime(activeAnnouncement.publishedAt || activeAnnouncement.createdAt)}</div>
            </div>
          </div>

          <div className="mt-5 max-h-[38vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-700 shadow-inner">
            <div className="whitespace-pre-wrap">{activeAnnouncement.content}</div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => onAcknowledgedChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">I have read and understood this announcement.</span>
          </label>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-800"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={!acknowledged}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeIndex === announcements.length - 1 ? 'Continue to dashboard' : 'Continue'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementUnreadModal;
