import React, { useMemo, useState } from 'react';
import { ChevronDown, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import AnnouncementAvatar from './AnnouncementAvatar';
import { getDisplayName } from '@/features/announcements/utils/announcementUtils';

const SECTION_META = {
  birthdays: {
    title: "Today's Birthdays",
    emoji: '🎂',
    accentClassName: 'text-pink-600',
    emptyLabel: 'No birthdays today.',
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
      items: communityData?.birthdays?.today || [],
      todayIds: new Set((communityData?.birthdays?.today || []).map((person) => String(person._id))),
      count: (communityData?.birthdays?.today || []).length,
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
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pink-700">
        <PartyPopper size={10} />
        Today
      </span>
    );
  }

  if (sectionKey === 'anniversaries') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
        <Trophy size={10} />
        {yearsCompleted} {yearsCompleted === 1 ? 'Yr' : 'Yrs'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
      <Sparkles size={10} />
      New
    </span>
  );
};

/**
 * @param {object} props
 * @param {object} props.communityData - Community payload from the backend.
 * @param {boolean} [props.loading] - Whether sidebar content is still loading.
 * @param {Array<'birthdays'|'anniversaries'|'joinees'>} [props.visibleSections] - Allowed community sections.
 */
const AnnouncementCommunitySidebar = ({
  communityData,
  loading = false,
  visibleSections = ['birthdays', 'anniversaries', 'joinees'],
}) => {
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

  const sections = useMemo(() => (visibleSections.map((sectionKey) => ({
    sectionKey,
    ...buildSectionItems(sectionKey, communityData),
  }))), [communityData, visibleSections]);

  if (sections.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <aside className="space-y-3.5">
        {sections.map(({ sectionKey }) => (
          <div key={sectionKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-2.5">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-2.5 w-14 animate-pulse rounded bg-slate-100" />
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
    <aside className="space-y-3.5">
      {sections.map(({ sectionKey, items, todayIds, count }) => {
        const meta = SECTION_META[sectionKey];
        const isExpanded = expandedSections[sectionKey];
        const showAll = showAllSections[sectionKey];
        const displayedItems = showAll ? items : items.slice(0, 5);
        const countLabel = sectionKey === 'birthdays' ? `${count} today` : `${count} this month`;

        return (
          <section key={sectionKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <button
              type="button"
              onClick={() => setExpandedSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }))}
              className="flex w-full items-center justify-between gap-2.5 text-left cursor-pointer"
            >
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">People & Events</div>
                <h2 className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${meta.accentClassName}`}>
                  <span aria-hidden="true">{meta.emoji}</span>
                  <span>{meta.title}</span>
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500 font-medium">{countLabel}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded ? (
              <div className="mt-3 space-y-2">
                {displayedItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3.5 text-xs text-slate-500">
                    {meta.emptyLabel}
                  </div>
                ) : (
                  displayedItems.map((person) => {
                    const isTodayItem = todayIds.has(String(person._id));
                    return (
                      <div
                        key={`${sectionKey}-${person._id}`}
                        className={`rounded-xl border px-2.5 py-2 transition ${
                          isTodayItem
                            ? 'border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white shadow-2xs'
                            : 'border-transparent bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <AnnouncementAvatar person={person} sizeClassName="h-8 w-8" textClassName="text-[10px]" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-slate-900">{getDisplayName(person)}</div>
                            <div className="mt-0.5 text-[10.5px] text-slate-500">
                              {sectionKey === 'anniversaries'
                                ? `${person.yearsCompleted} ${person.yearsCompleted === 1 ? 'yr' : 'yrs'} • ${person.dateLabel}`
                                : person.dateLabel}
                            </div>
                            {person.department ? (
                              <div className="mt-0.5 truncate text-[9.5px] text-slate-400">{person.department}</div>
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
                    className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 cursor-pointer"
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
