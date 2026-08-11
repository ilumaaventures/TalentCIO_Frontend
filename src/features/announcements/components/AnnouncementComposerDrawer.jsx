import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Loader2, Paperclip, Search, Sparkles, X } from 'lucide-react';
import AnnouncementAvatar from './AnnouncementAvatar';
import {
  ANNOUNCEMENT_ATTACHMENT_ACCEPT,
  formatFileSize,
  getAnnouncementAttachmentTypeLabel,
  AUDIENCE_TYPE_LABELS,
  getCategoryTheme,
  getDisplayName,
} from './announcementUtils';

const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
};

/**
 * @param {object} props
 * @param {object[]} props.users - Available employees for specific-person targeting.
 * @param {string[]} props.selectedUserIds - Selected employee ids.
 * @param {(nextUserIds: string[]) => void} props.onChange - Selection change handler.
 */
const PeoplePicker = ({ users, selectedUserIds, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => (
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(query)
      || String(user.email || '').toLowerCase().includes(query)
      || String(user.department || '').toLowerCase().includes(query)
      || String(user.employmentType || '').toLowerCase().includes(query)
    ));
  }, [searchTerm, users]);

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((value) => value !== userId));
      return;
    }

    onChange([...selectedUserIds, userId]);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search employees by name, email, or team"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
        {filteredUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
            No employees matched your search.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = selectedUserIds.includes(user._id);

            return (
              <button
                key={user._id}
                type="button"
                onClick={() => toggleUser(user._id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isSelected
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AnnouncementAvatar person={user} sizeClassName="h-10 w-10" textClassName="text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{getDisplayName(user)}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {[user.department, user.employmentType, user.email].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'
                }`}>
                  <Check size={12} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * @param {object} props
 * @param {boolean} props.open - Whether the drawer is visible.
 * @param {boolean} [props.loading] - Whether setup data is currently loading.
 * @param {boolean} [props.saving] - Whether a submit action is currently running.
 * @param {boolean} [props.isEditing] - Whether the drawer is editing an existing announcement.
 * @param {object} props.form - Current announcement form state.
 * @param {object} props.errors - Validation errors keyed by field name.
 * @param {object} props.setup - Composer bootstrap payload.
 * @param {(patch: object) => void} props.onChange - Form change handler.
 * @param {() => void} props.onClose - Drawer close handler.
 * @param {() => void} props.onSaveDraft - Draft submit handler.
 * @param {() => void} props.onPublish - Publish submit handler.
 */
const AnnouncementComposerDrawer = ({
  open,
  loading = false,
  saving = false,
  isEditing = false,
  form,
  errors,
  setup,
  onChange,
  onClose,
  onSaveDraft,
  onPublish,
}) => {
  const drawerRef = useRef(null);
  const titleInputRef = useRef(null);
  const attachmentInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 80);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusableElements = getFocusableElements(drawerRef.current);
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
  }, [open, onClose]);

  if (!open) return null;

  const categoryTheme = getCategoryTheme(form.category);
  const hasErrors = Object.keys(errors || {}).length > 0;
  const activeAttachment = form?.attachmentFile || (form?.removeAttachment ? null : form?.attachment);
  const attachmentSize = activeAttachment?.size ? formatFileSize(activeAttachment.size) : '';
  const attachmentTypeLabel = activeAttachment ? getAnnouncementAttachmentTypeLabel(activeAttachment) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/35 backdrop-blur-[2px] md:items-stretch">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit announcement' : 'Create announcement'}
        className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-h-screen md:w-[600px] md:rounded-none md:rounded-l-[32px]"
      >
        <div className="border-b border-slate-200 px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Announcement Composer</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {isEditing ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Draft internally or publish immediately to the company feed.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close composer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6">
              <div className={`rounded-2xl border px-4 py-4 ${categoryTheme.softCardClassName}`}>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Preview theme</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{form.title || 'Your announcement title'}</div>
                <div className="mt-1 text-sm text-slate-600">{form.summary || 'A short summary will appear here.'}</div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Title *</span>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={form.title}
                  onChange={(event) => onChange({ title: event.target.value })}
                  maxLength={160}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    errors.title ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                  } focus:ring-2`}
                  placeholder="Example: Q3 company townhall updates"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-red-500">{errors.title || ''}</span>
                  <span className="text-xs text-slate-400">{String(form.title || '').length}/160</span>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Summary</span>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(event) => onChange({ summary: event.target.value })}
                  maxLength={240}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-700 outline-none transition ${
                    errors.summary ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                  } focus:ring-2`}
                  placeholder="Add a concise context line for the feed preview and notifications."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-red-500">{errors.summary || ''}</span>
                  <span className="text-xs text-slate-400">{String(form.summary || '').length}/240</span>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Content *</span>
                <textarea
                  rows={10}
                  value={form.content}
                  onChange={(event) => onChange({ content: event.target.value })}
                  className={`w-full rounded-3xl border px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition ${
                    errors.content ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                  } focus:ring-2`}
                  placeholder="Write the full announcement exactly as employees should read it."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-red-500">{errors.content || ''}</span>
                  <span className="text-xs text-slate-400">{String(form.content || '').length}/8000</span>
                </div>
              </label>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Attachment</div>
                    <p className="mt-1 text-xs text-slate-500">PDF, Word, Excel, or image up to 5 MB.</p>
                  </div>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept={ANNOUNCEMENT_ATTACHMENT_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      onChange({
                        attachmentFile: nextFile,
                        removeAttachment: false,
                      });
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Paperclip size={15} />
                    {activeAttachment ? 'Replace file' : 'Attach file'}
                  </button>
                </div>

                {activeAttachment ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800" title={activeAttachment?.name || 'Attachment'}>
                          {activeAttachment?.name || 'Attachment'}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {attachmentTypeLabel ? <span>{attachmentTypeLabel}</span> : null}
                          {attachmentSize ? <span>{attachmentSize}</span> : null}
                          {form?.attachmentFile ? <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">New upload</span> : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onChange(
                          form?.attachmentFile
                            ? { attachmentFile: null }
                            : { removeAttachment: true }
                        )}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <X size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                    No attachment selected.
                  </div>
                )}

                <div className="text-xs text-red-500">{errors.attachmentFile || ''}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Category</span>
                  <select
                    value={form.category}
                    onChange={(event) => onChange({ category: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    {(setup?.categories || []).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>                 <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Expiry date</span>
                  <div className="relative">
                    <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.expiresAt || ''}
                      onChange={(event) => onChange({ expiresAt: event.target.value })}
                      className={`w-full rounded-2xl border py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition ${
                        errors.expiresAt ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                      } focus:ring-2`}
                    />
                  </div>
                  <span className="text-xs text-red-500">
                    {errors.expiresAt || ''}
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Recurrence Schedule</div>
                    <div className="mt-1 text-xs text-slate-500">Automatically activate this announcement periodically.</div>
                  </div>
                  <select
                    value={form.recurringInterval || 'none'}
                    onChange={(event) => {
                      onChange({ recurringInterval: event.target.value });
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="none">None (One-time)</option>
                    <option value="monthly">Repeat Monthly</option>
                    <option value="quarterly">Repeat Quarterly</option>
                    <option value="yearly">Repeat Yearly</option>
                  </select>
                </div>

                {form.recurringInterval && form.recurringInterval !== 'none' && (
                  <div className="mt-3 block space-y-2 border-t border-slate-200 pt-3">
                    <span className="text-sm font-semibold text-slate-700">Recurring Day of Month (1–31) *</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={form.recurringDayOfMonth || ''}
                      onChange={(event) => onChange({ recurringDayOfMonth: event.target.value })}
                      className={`w-full rounded-2xl border px-4 py-2.5 text-sm text-slate-700 outline-none transition ${
                        errors.recurringDayOfMonth ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                      } focus:ring-2`}
                      placeholder="e.g. 15"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-red-500">{errors.recurringDayOfMonth || ''}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-xs text-slate-400">
                        {form.recurringInterval === 'monthly' && `Will publish on day ${form.recurringDayOfMonth || 'X'} of every month.`}
                        {form.recurringInterval === 'quarterly' && `Will publish on day ${form.recurringDayOfMonth || 'X'} every 3 months.`}
                        {form.recurringInterval === 'yearly' && `Will publish on day ${form.recurringDayOfMonth || 'X'} of the launch month every year.`}
                      </span>
                      {form.recurringDayOfMonth && parseInt(form.recurringDayOfMonth, 10) > 28 && (
                        <span className="text-xs text-amber-600 font-medium">
                          Note: In shorter months (e.g. February, April), this day will be skipped.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Pin this announcement</div>
                    <div className="mt-1 text-xs text-slate-500">Pinned announcements stay in a dedicated section at the top of the feed.</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(form.pinned)}
                    onClick={() => onChange({ pinned: !form.pinned })}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      form.pinned ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        form.pinned ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Audience</div>
                  <p className="mt-1 text-xs text-slate-500">Choose who should receive and see this announcement.</p>
                </div>
                <div className="grid gap-2">
                  {(setup?.audienceTypes || []).map((audienceType) => (
                    <button
                      key={audienceType}
                      type="button"
                      onClick={() => onChange({
                        audienceType,
                        audienceDepartments: [],
                        audienceEmploymentTypes: [],
                        audienceUserIds: [],
                      })}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        form.audienceType === audienceType
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{AUDIENCE_TYPE_LABELS[audienceType] || audienceType}</div>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        form.audienceType === audienceType ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        <Check size={12} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.audienceType === 'departments' ? (
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Departments</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(setup?.departments || []).map((department) => {
                      const isSelected = form.audienceDepartments.includes(department);
                      return (
                        <button
                          key={department}
                          type="button"
                          onClick={() => onChange({
                            audienceDepartments: isSelected
                              ? form.audienceDepartments.filter((value) => value !== department)
                              : [...form.audienceDepartments, department],
                          })}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            isSelected
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {department}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-red-500">{errors.audienceDepartments || ''}</div>
                </div>
              ) : null}

              {form.audienceType === 'employmentTypes' ? (
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Employment Types</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(setup?.employmentTypes || []).map((employmentType) => {
                      const isSelected = form.audienceEmploymentTypes.includes(employmentType);
                      return (
                        <button
                          key={employmentType}
                          type="button"
                          onClick={() => onChange({
                            audienceEmploymentTypes: isSelected
                              ? form.audienceEmploymentTypes.filter((value) => value !== employmentType)
                              : [...form.audienceEmploymentTypes, employmentType],
                          })}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            isSelected
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {employmentType}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-red-500">{errors.audienceEmploymentTypes || ''}</div>
                </div>
              ) : null}

              {form.audienceType === 'specificUsers' ? (
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">Specific People</div>
                  <PeoplePicker
                    users={setup?.users || []}
                    selectedUserIds={form.audienceUserIds || []}
                    onChange={(audienceUserIds) => onChange({ audienceUserIds })}
                  />
                  <div className="mt-2 text-xs text-red-500">{errors.audienceUserIds || ''}</div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 text-amber-500" />
                  <div className="space-y-1 text-sm text-slate-600">
                    <div className="font-semibold text-slate-800">Publishing notes</div>
                    <p>Employees will receive an in-app notification when you publish.</p>
                    <p>Drafts stay visible only inside the manager workspace.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4 md:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={saving || hasErrors}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={saving || hasErrors}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Publish Now'}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default AnnouncementComposerDrawer;
