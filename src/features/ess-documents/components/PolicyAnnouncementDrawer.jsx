import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Loader2, Megaphone, Search, X } from 'lucide-react';
import AnnouncementAvatar from '@/features/announcements/components/AnnouncementAvatar';
import {
  AUDIENCE_TYPE_LABELS,
  getCategoryTheme,
  getDisplayName,
  ANNOUNCEMENT_CATEGORIES,
  DEFAULT_COMPOSER_SETUP,
} from '@/features/announcements/utils/announcementUtils';
import api from '@/lib/apiClient';

/**
 * PeoplePicker for specific-employee audience selection.
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
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
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
                    ? 'border-indigo-200 bg-indigo-50'
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
                  isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-transparent'
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
 * PolicyAnnouncementDrawer:
 * Allows configuring all announcement fields exactly like AnnouncementComposerDrawer,
 * EXCEPT attachment and recurrence schedule.
 */
const PolicyAnnouncementDrawer = ({
  open,
  form,
  onChange,
  onClose,
  onApply,
  fallbackUsers = [],
  fallbackDepts = [],
}) => {
  const drawerRef = useRef(null);
  const titleInputRef = useRef(null);

  const [setup, setSetup] = useState(DEFAULT_COMPOSER_SETUP);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoadingSetup(true);

    api.get('/announcements/composer-setup')
      .then((res) => {
        if (isMounted && res.data) {
          setSetup((prev) => ({
            ...prev,
            ...res.data,
            categories: res.data.categories?.length ? res.data.categories : ANNOUNCEMENT_CATEGORIES,
            departments: res.data.departments?.length ? res.data.departments : fallbackDepts,
            users: res.data.users?.length ? res.data.users : fallbackUsers,
          }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setSetup((prev) => ({
            ...prev,
            departments: fallbackDepts.length ? fallbackDepts : prev.departments,
            users: fallbackUsers.length ? fallbackUsers : prev.users,
          }));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingSetup(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, fallbackDepts, fallbackUsers]);

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

  const categoryTheme = getCategoryTheme(form.category || 'Policy');

  const handleSave = () => {
    const errs = {};
    if (!form.title?.trim()) {
      errs.title = 'Title is required.';
    } else if (form.title.trim().length > 160) {
      errs.title = 'Title cannot exceed 160 characters.';
    }

    if (!form.content?.trim()) {
      errs.content = 'Content is required.';
    } else if (form.content.trim().length > 8000) {
      errs.content = 'Content cannot exceed 8000 characters.';
    }

    if (form.audienceType === 'departments' && (!form.audienceDepartments || form.audienceDepartments.length === 0)) {
      errs.audienceDepartments = 'Select at least one department.';
    }

    if (form.audienceType === 'employmentTypes' && (!form.audienceEmploymentTypes || form.audienceEmploymentTypes.length === 0)) {
      errs.audienceEmploymentTypes = 'Select at least one employment type.';
    }

    if (form.audienceType === 'specificUsers' && (!form.audienceUserIds || form.audienceUserIds.length === 0)) {
      errs.audienceUserIds = 'Select at least one employee.';
    }

    setLocalErrors(errs);

    if (Object.keys(errs).length === 0) {
      onApply?.();
    }
  };

  const categories = setup?.categories?.length ? setup.categories : ANNOUNCEMENT_CATEGORIES;
  const audienceTypes = setup?.audienceTypes?.length ? setup.audienceTypes : ['all', 'departments', 'employmentTypes', 'specificUsers'];
  const departments = setup?.departments?.length ? setup.departments : fallbackDepts;
  const employmentTypes = setup?.employmentTypes?.length ? setup.employmentTypes : [];
  const users = setup?.users?.length ? setup.users : fallbackUsers;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-end bg-slate-950/40 backdrop-blur-[2px] md:items-stretch animate-in fade-in duration-150">
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
        aria-label="Configure Announcement"
        className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:max-h-screen md:w-[600px] md:rounded-none md:rounded-l-[32px]"
      >
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4 md:px-6 bg-slate-50/50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                <Megaphone size={13} />
                <span>Policy Announcement</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Announcement Details
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                This announcement will be published to the company feed alongside this document (no emails sent).
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label="Close composer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loadingSetup ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
              {/* Preview Theme Card */}
              <div className={`rounded-2xl border px-4 py-4 transition-all ${categoryTheme.softCardClassName}`}>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Feed Preview</div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${categoryTheme.badgeClassName}`}>
                    {form.category || 'Policy'}
                  </span>
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900 line-clamp-1">
                  {form.title || 'Your announcement title'}
                </div>
                <div className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {form.summary || 'A short summary will appear here on the employee feed.'}
                </div>
              </div>

              {/* Title */}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Title *</span>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={form.title || ''}
                  onChange={(e) => {
                    onChange({ title: e.target.value });
                    if (localErrors.title) setLocalErrors((p) => ({ ...p, title: null }));
                  }}
                  maxLength={160}
                  className={`w-full rounded-2xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition ${
                    localErrors.title ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                  }`}
                  placeholder="Example: New Company Policy: Remote Work & Data Security"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-red-500">{localErrors.title || ''}</span>
                  <span className="text-[11px] text-slate-400">{String(form.title || '').length}/160</span>
                </div>
              </label>

              {/* Summary */}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Summary</span>
                <textarea
                  rows={2}
                  value={form.summary || ''}
                  onChange={(e) => onChange({ summary: e.target.value })}
                  maxLength={240}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  placeholder="Concise context line displayed on the feed preview..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">Brief preview on cards</span>
                  <span className="text-[11px] text-slate-400">{String(form.summary || '').length}/240</span>
                </div>
              </label>

              {/* Content */}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Content *</span>
                <textarea
                  rows={7}
                  value={form.content || ''}
                  onChange={(e) => {
                    onChange({ content: e.target.value });
                    if (localErrors.content) setLocalErrors((p) => ({ ...p, content: null }));
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none transition ${
                    localErrors.content ? 'border-red-300 bg-red-50 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                  }`}
                  placeholder="Write the full announcement text as employees should read it..."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-red-500">{localErrors.content || ''}</span>
                  <span className="text-[11px] text-slate-400">{String(form.content || '').length}/8000</span>
                </div>
              </label>

              {/* Category & Expiry Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Category</span>
                  <select
                    value={form.category || 'Policy'}
                    onChange={(e) => onChange({ category: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Expiry Date (Optional)</span>
                  <div className="relative">
                    <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.expiresAt || ''}
                      onChange={(e) => onChange({ expiresAt: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </label>
              </div>

              {/* Pin this announcement */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Pin this announcement</div>
                    <div className="mt-0.5 text-xs text-slate-500">Pinned announcements stay at the top of the company feed.</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(form.pinned)}
                    onClick={() => onChange({ pinned: !form.pinned })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      form.pinned ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        form.pinned ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Audience */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Audience</div>
                  <p className="mt-0.5 text-xs text-slate-500">Select who can see this announcement in their feed.</p>
                </div>

                <div className="grid gap-2">
                  {audienceTypes.map((typeKey) => (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => onChange({
                        audienceType: typeKey,
                        audienceDepartments: typeKey === 'departments' ? form.audienceDepartments || [] : [],
                        audienceEmploymentTypes: typeKey === 'employmentTypes' ? form.audienceEmploymentTypes || [] : [],
                        audienceUserIds: typeKey === 'specificUsers' ? form.audienceUserIds || [] : [],
                      })}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        form.audienceType === typeKey
                          ? 'border-indigo-300 bg-indigo-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {AUDIENCE_TYPE_LABELS[typeKey] || typeKey}
                      </span>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        form.audienceType === typeKey ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        <Check size={12} />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Departments Picker */}
                {form.audienceType === 'departments' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">Select Departments</div>
                    <div className="flex flex-wrap gap-2">
                      {departments.map((dept) => {
                        const isSelected = (form.audienceDepartments || []).includes(dept);
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              const current = form.audienceDepartments || [];
                              onChange({
                                audienceDepartments: isSelected
                                  ? current.filter((d) => d !== dept)
                                  : [...current, dept],
                              });
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? 'border-indigo-300 bg-indigo-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {dept}
                          </button>
                        );
                      })}
                    </div>
                    {localErrors.audienceDepartments && (
                      <p className="text-xs text-red-500">{localErrors.audienceDepartments}</p>
                    )}
                  </div>
                )}

                {/* Employment Types Picker */}
                {form.audienceType === 'employmentTypes' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">Select Employment Types</div>
                    <div className="flex flex-wrap gap-2">
                      {employmentTypes.map((type) => {
                        const isSelected = (form.audienceEmploymentTypes || []).includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              const current = form.audienceEmploymentTypes || [];
                              onChange({
                                audienceEmploymentTypes: isSelected
                                  ? current.filter((t) => t !== type)
                                  : [...current, type],
                              });
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? 'border-indigo-300 bg-indigo-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                    {localErrors.audienceEmploymentTypes && (
                      <p className="text-xs text-red-500">{localErrors.audienceEmploymentTypes}</p>
                    )}
                  </div>
                )}

                {/* Specific Users Picker */}
                {form.audienceType === 'specificUsers' && (
                  <div className="space-y-2">
                    <PeoplePicker
                      users={users}
                      selectedUserIds={form.audienceUserIds || []}
                      onChange={(nextIds) => onChange({ audienceUserIds: nextIds })}
                    />
                    {localErrors.audienceUserIds && (
                      <p className="text-xs text-red-500">{localErrors.audienceUserIds}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 md:px-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Check size={16} />
                <span>Apply Announcement</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default PolicyAnnouncementDrawer;
