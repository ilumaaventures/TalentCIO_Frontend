import React, { useMemo, useState } from 'react';
import { ChevronDown, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import AnnouncementAvatar from './AnnouncementAvatar';
import { getDisplayName } from './announcementUtils';

const SECTION_META = {
  birthdays: {
    title: 'Birthdays This Month',
    emoji: '🎂',
    accentClassName: 'text-pink-600',
    emptyLabel: 'No birthdays lined up this month.',
  },
  anniversaries: {
    title: 'Work Anniversaries',
    emoji: '🏆',
    accentClassName: 'text-amber-600',
    emptyLabel: 'No work anniversaries this month.',
  },
  joinees: {
    title: 'New Joiners',
    emoji: '👋',
    accentClassName: 'text-emerald-600',
    emptyLabel: 'No new joiners this month.',
  },
};

const buildSectionItems = (sectionKey, communityData = {}) => {
  if (sectionKey === 'birthdays') {
    return {
      items: communityData?.birthdays?.currentMonth || [],
      todayIds: new Set((communityData?.birthdays?.today || []).map((person) => String(person._id))),
      count: communityData?.birthdays?.count || 0,
    };
  }

  if (sectionKey === 'anniversaries') {
    return {
      items: communityData?.workAnniversaries?.currentMonth || [],
      todayIds: new Set((communityData?.workAnniversaries?.today || []).map((person) => String(person._id))),
      count: communityData?.workAnniversaries?.count || 0,
    };
  }

  return {
    items: communityData?.newJoinees?.currentMonth || [],
    todayIds: new Set(),
    count: communityData?.newJoinees?.count || 0,
  };
};

/**
 * @param {object} props
 * @param {'birthdays'|'anniversaries'|'joinees'} props.sectionKey - Active community section key.
 * @param {number} [props.yearsCompleted] - Completed years for anniversary badges.
 */
const TodayBadge = ({ sectionKey, yearsCompleted = 0 }) => {
  if (sectionKey === 'birthdays') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-pink-700">
        <PartyPopper size={12} />
        Today
      </span>
    );
  }

  if (sectionKey === 'anniversaries') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
        <Trophy size={12} />
        {yearsCompleted} {yearsCompleted === 1 ? 'Year' : 'Years'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
      <Sparkles size={12} />
      New
    </span>
  );
};

/**
 * @param {object} props
 * @param {object} props.communityData - Community payload from the backend.
 * @param {boolean} [props.loading] - Whether sidebar content is still loading.
 */
const AnnouncementCommunitySidebar = ({ communityData, loading = false }) => {
  const [expandedSections, setExpandedSections] = useState({
    birthdays: true,
    anniversaries: true,
    joinees: true,
  });
  const [showAllSections, setShowAllSections] = useState({
    birthdays: false,
    anniversaries: false,
    joinees: false,
  });

  const sections = useMemo(() => (['birthdays', 'anniversaries', 'joinees'].map((sectionKey) => ({
    sectionKey,
    ...buildSectionItems(sectionKey, communityData),
  }))), [communityData]);

  if (loading) {
    return (
      <aside className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="space-y-4">
      {sections.map(({ sectionKey, items, todayIds, count }) => {
        const meta = SECTION_META[sectionKey];
        const isExpanded = expandedSections[sectionKey];
        const showAll = showAllSections[sectionKey];
        const displayedItems = showAll ? items : items.slice(0, 5);

        return (
          <section key={sectionKey} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }))}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">People & Events</div>
                <h2 className={`mt-2 flex items-center gap-2 text-base font-semibold ${meta.accentClassName}`}>
                  <span aria-hidden="true">{meta.emoji}</span>
                  <span>{meta.title}</span>
                </h2>
                <p className="mt-1 text-sm text-slate-500">{count} this month</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded ? (
              <div className="mt-4 space-y-3">
                {displayedItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    {meta.emptyLabel}
                  </div>
                ) : (
                  displayedItems.map((person) => {
                    const isTodayItem = todayIds.has(String(person._id));
                    return (
                      <div
                        key={`${sectionKey}-${person._id}`}
                        className={`rounded-2xl border px-3 py-3 transition ${
                          isTodayItem
                            ? 'border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white shadow-sm'
                            : 'border-transparent bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <AnnouncementAvatar person={person} sizeClassName="h-11 w-11" textClassName="text-xs" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">{getDisplayName(person)}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {sectionKey === 'anniversaries'
                                ? `${person.yearsCompleted} ${person.yearsCompleted === 1 ? 'year' : 'years'} • ${person.dateLabel}`
                                : person.dateLabel}
                            </div>
                            {person.department ? (
                              <div className="mt-1 truncate text-[11px] text-slate-400">{person.department}</div>
                            ) : null}
                          </div>
                          {isTodayItem ? (
                            <TodayBadge sectionKey={sectionKey} yearsCompleted={person.yearsCompleted} />
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}

                {items.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }))}
                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    {showAll ? 'View less' : `View all (${items.length})`}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </aside>
  );
};

export default AnnouncementCommunitySidebar;
