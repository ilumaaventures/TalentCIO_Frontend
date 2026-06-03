import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Megaphone, PencilLine, Pin, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AnnouncementCommunitySidebar from '../components/announcements/AnnouncementCommunitySidebar';
import AnnouncementComposerDrawer from '../components/announcements/AnnouncementComposerDrawer';
import AnnouncementFeedCard from '../components/announcements/AnnouncementFeedCard';
import {
  buildAnnouncementPayload,
  createOptimisticComment,
  DEFAULT_COMPOSER_SETUP,
  EMPTY_ANNOUNCEMENT_FORM,
  formatAnnouncementDate,
  formatDateInputValue,
  getAnnouncementValidationErrors,
  isAnnouncementManager,
  sortAnnouncementsByPublishedAt,
} from '../components/announcements/announcementUtils';

const EMPTY_COMMUNITY_DATA = {
  month: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  birthdays: { currentMonth: [], today: [], count: 0 },
  workAnniversaries: { currentMonth: [], today: [], count: 0 },
  newJoinees: { currentMonth: [], count: 0 },
};

const replaceAnnouncementInList = (announcements, updatedAnnouncement) => (
  announcements.map((announcement) => (
    announcement._id === updatedAnnouncement._id ? updatedAnnouncement : announcement
  ))
);

const patchAnnouncementInList = (announcements, announcementId, updater) => (
  announcements.map((announcement) => (
    announcement._id === announcementId ? updater(announcement) : announcement
  ))
);

const removeAnnouncementFromList = (announcements, announcementId) => (
  announcements.filter((announcement) => announcement._id !== announcementId)
);

const buildFormFromAnnouncement = (announcement = {}) => ({
  title: announcement.title || '',
  summary: announcement.summary || '',
  content: announcement.content || '',
  category: announcement.category || 'General',
  pinned: Boolean(announcement.pinned),
  audienceType: announcement.audienceType || 'all',
  audienceDepartments: announcement.audienceDepartments || [],
  audienceEmploymentTypes: announcement.audienceEmploymentTypes || [],
  audienceUserIds: (announcement.audienceUserIds || []).map((value) => String(value?._id || value)),
  expiresAt: formatDateInputValue(announcement.expiresAt),
});

const isManageOnlyAnnouncement = (announcement = {}) => (
  announcement.status !== 'published' || announcement.isExpired
);

const Announcements = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userCanManage = useMemo(() => isAnnouncementManager(user), [user]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerSetupLoaded, setComposerSetupLoaded] = useState(false);
  const [composerSaving, setComposerSaving] = useState(false);
  const [reactionLoadingKey, setReactionLoadingKey] = useState('');
  const [commentSubmittingId, setCommentSubmittingId] = useState('');
  const [commentDeletingId, setCommentDeletingId] = useState('');
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState('');
  const [pinningAnnouncementId, setPinningAnnouncementId] = useState('');
  const [highlightedAnnouncementId, setHighlightedAnnouncementId] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
  const [manageAnnouncements, setManageAnnouncements] = useState([]);
  const [communityData, setCommunityData] = useState(EMPTY_COMMUNITY_DATA);
  const [composerSetup, setComposerSetup] = useState(DEFAULT_COMPOSER_SETUP);
  const [form, setForm] = useState(EMPTY_ANNOUNCEMENT_FORM);

  const formErrors = useMemo(() => getAnnouncementValidationErrors(form), [form]);
  const reactionTypes = composerSetup.reactionTypes?.length ? composerSetup.reactionTypes : DEFAULT_COMPOSER_SETUP.reactionTypes;

  const syncAnnouncementEverywhere = useCallback((updatedAnnouncement) => {
    if (!updatedAnnouncement?._id) return;

    setVisibleAnnouncements((current) => replaceAnnouncementInList(current, updatedAnnouncement));
    setManageAnnouncements((current) => replaceAnnouncementInList(current, updatedAnnouncement));
  }, []);

  const loadPageData = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setFeedLoading(true);
      }

      const requests = [
        api.get('/announcements'),
        api.get('/announcements/community'),
      ];

      if (userCanManage) {
        requests.push(api.get('/announcements?scope=manage&limit=50'));
      }

      const [visibleResponse, communityResponse, manageResponse] = await Promise.all(requests);
      setVisibleAnnouncements(Array.isArray(visibleResponse.data?.announcements) ? visibleResponse.data.announcements : []);
      setCommunityData(communityResponse.data || EMPTY_COMMUNITY_DATA);
      setComposerSetup((current) => ({
        ...current,
        reactionTypes: Array.isArray(visibleResponse.data?.reactionTypes) && visibleResponse.data.reactionTypes.length
          ? visibleResponse.data.reactionTypes
          : current.reactionTypes,
      }));

      if (userCanManage) {
        setManageAnnouncements(Array.isArray(manageResponse?.data?.announcements) ? manageResponse.data.announcements : []);
      } else {
        setManageAnnouncements([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load announcements.');
    } finally {
      setFeedLoading(false);
      setRefreshing(false);
    }
  }, [userCanManage]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    const state = location.state || {};

    if (!state.highlightAnnouncementId && !state.refreshAnnouncements) {
      return;
    }

    if (state.highlightAnnouncementId) {
      setHighlightedAnnouncementId(state.highlightAnnouncementId);
    }

    if (state.refreshAnnouncements) {
      void loadPageData(true);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [loadPageData, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!highlightedAnnouncementId) return undefined;

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`announcement-${highlightedAnnouncementId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);

    const clearTimer = window.setTimeout(() => setHighlightedAnnouncementId(''), 3000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedAnnouncementId, visibleAnnouncements]);

  const ensureComposerSetup = useCallback(async () => {
    if (!userCanManage) return false;
    if (composerSetupLoaded) return true;

    try {
      setComposerLoading(true);
      const response = await api.get('/announcements/composer-setup');
      setComposerSetup((current) => ({
        ...current,
        ...response.data,
      }));
      setComposerSetupLoaded(true);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load announcement setup.');
      return false;
    } finally {
      setComposerLoading(false);
    }
  }, [composerSetupLoaded, userCanManage]);

  const openComposerForNewAnnouncement = useCallback(async () => {
    const ready = await ensureComposerSetup();
    if (!ready) return;

    setEditingAnnouncement(null);
    setForm(EMPTY_ANNOUNCEMENT_FORM);
    setComposerOpen(true);
  }, [ensureComposerSetup]);

  const openComposerForEdit = useCallback(async (announcement) => {
    const ready = await ensureComposerSetup();
    if (!ready) return;

    setEditingAnnouncement(announcement);
    setForm(buildFormFromAnnouncement(announcement));
    setComposerOpen(true);
  }, [ensureComposerSetup]);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setEditingAnnouncement(null);
    setForm(EMPTY_ANNOUNCEMENT_FORM);
  }, []);

  const handleComposerChange = useCallback((patch) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const submitAnnouncement = useCallback(async (status) => {
    const validationErrors = getAnnouncementValidationErrors(form);
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the highlighted fields before saving.');
      return;
    }

    const payload = {
      ...form,
      status,
      expiresAt: form.expiresAt || null,
    };

    try {
      setComposerSaving(true);

      if (editingAnnouncement?._id) {
        await api.put(`/announcements/${editingAnnouncement._id}`, payload);
        toast.success(status === 'published' ? 'Announcement updated and published.' : 'Draft updated.');
      } else {
        await api.post('/announcements', payload);
        toast.success(status === 'published' ? 'Announcement published successfully.' : 'Draft saved.');
      }

      closeComposer();
      await loadPageData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save the announcement.');
    } finally {
      setComposerSaving(false);
    }
  }, [closeComposer, editingAnnouncement?._id, form, loadPageData]);

  const handleDeleteAnnouncement = useCallback(async (announcementId) => {
    if (!window.confirm('Delete this announcement?')) return;

    try {
      setDeletingAnnouncementId(announcementId);
      await api.delete(`/announcements/${announcementId}`);
      setVisibleAnnouncements((current) => removeAnnouncementFromList(current, announcementId));
      setManageAnnouncements((current) => removeAnnouncementFromList(current, announcementId));
      toast.success('Announcement deleted.');

      if (editingAnnouncement?._id === announcementId) {
        closeComposer();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete the announcement.');
    } finally {
      setDeletingAnnouncementId('');
    }
  }, [closeComposer, editingAnnouncement?._id]);

  const handleTogglePin = useCallback(async (announcement) => {
    try {
      setPinningAnnouncementId(announcement._id);
      const payload = buildAnnouncementPayload(announcement, {
        pinned: !announcement.pinned,
        expiresAt: announcement.expiresAt ? formatDateInputValue(announcement.expiresAt) : null,
      });
      const response = await api.put(`/announcements/${announcement._id}`, payload);
      syncAnnouncementEverywhere(response.data?.announcement);
      toast.success(response.data?.announcement?.pinned ? 'Announcement pinned.' : 'Announcement unpinned.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pin status.');
    } finally {
      setPinningAnnouncementId('');
    }
  }, [syncAnnouncementEverywhere]);

  const handleReaction = useCallback(async (announcementId, reactionType) => {
    try {
      setReactionLoadingKey(`${announcementId}:${reactionType}`);
      const response = await api.post(`/announcements/${announcementId}/react`, { type: reactionType });
      syncAnnouncementEverywhere(response.data?.announcement);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update reaction.');
    } finally {
      setReactionLoadingKey('');
    }
  }, [syncAnnouncementEverywhere]);

  const handleAddComment = useCallback(async (announcementId, text) => {
    const optimisticComment = createOptimisticComment({ text, user });
    const rollbackVisible = visibleAnnouncements;
    const rollbackManage = manageAnnouncements;

    setVisibleAnnouncements((current) => patchAnnouncementInList(current, announcementId, (announcement) => ({
      ...announcement,
      comments: [...(announcement.comments || []), optimisticComment],
      commentCount: (announcement.commentCount || 0) + 1,
    })));
    setManageAnnouncements((current) => patchAnnouncementInList(current, announcementId, (announcement) => ({
      ...announcement,
      comments: [...(announcement.comments || []), optimisticComment],
      commentCount: (announcement.commentCount || 0) + 1,
    })));

    try {
      setCommentSubmittingId(announcementId);
      const response = await api.post(`/announcements/${announcementId}/comments`, { text });
      syncAnnouncementEverywhere(response.data?.announcement);
      return true;
    } catch (error) {
      setVisibleAnnouncements(rollbackVisible);
      setManageAnnouncements(rollbackManage);
      toast.error(error.response?.data?.message || 'Failed to add comment.');
      return false;
    } finally {
      setCommentSubmittingId('');
    }
  }, [manageAnnouncements, syncAnnouncementEverywhere, user, visibleAnnouncements]);

  const handleDeleteComment = useCallback(async (announcementId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      setCommentDeletingId(commentId);
      const response = await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
      syncAnnouncementEverywhere(response.data?.announcement);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment.');
    } finally {
      setCommentDeletingId('');
    }
  }, [syncAnnouncementEverywhere]);

  const sortedVisibleAnnouncements = useMemo(
    () => sortAnnouncementsByPublishedAt(visibleAnnouncements),
    [visibleAnnouncements],
  );
  const pinnedAnnouncements = useMemo(
    () => sortedVisibleAnnouncements.filter((announcement) => announcement.pinned),
    [sortedVisibleAnnouncements],
  );
  const feedAnnouncements = useMemo(
    () => sortedVisibleAnnouncements.filter((announcement) => !announcement.pinned),
    [sortedVisibleAnnouncements],
  );
  const managerDrafts = useMemo(
    () => sortAnnouncementsByPublishedAt(manageAnnouncements.filter(isManageOnlyAnnouncement)),
    [manageAnnouncements],
  );

  return (
    <>
      <div className="min-h-full bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Community Feed</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Announcements</h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Company updates, people moments, and team communication in one clean feed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadPageData(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {refreshing ? <Loader2 size={16} className="animate-spin" /> : 'Refresh'}
                </button>
                {userCanManage ? (
                  <button
                    type="button"
                    onClick={() => void openComposerForNewAnnouncement()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    New Announcement
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_360px]">
            <div className="space-y-6">
              {userCanManage && managerDrafts.length > 0 ? (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <PencilLine size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Drafts & Expiring Items</h2>
                      <p className="text-sm text-slate-500">Quick access to announcements that still need manager attention.</p>
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          <th className="px-3 py-3">Announcement</th>
                          <th className="px-3 py-3">Category</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Expires</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {managerDrafts.slice(0, 6).map((announcement) => (
                          <tr key={announcement._id} className="bg-white text-sm text-slate-700">
                            <td className="px-3 py-4">
                              <div className="flex items-start gap-2">
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900">{announcement.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {announcement.summary || 'No summary added yet.'}
                                  </div>
                                </div>
                                {announcement.pinned ? <Pin size={14} className="mt-0.5 shrink-0 text-amber-500" /> : null}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-slate-600">{announcement.category}</td>
                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  announcement.status === 'draft'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {announcement.status === 'draft' ? 'Draft' : 'Needs review'}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-slate-600">
                              {announcement.expiresAt ? formatAnnouncementDate(announcement.expiresAt) : 'No expiry'}
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => void openComposerForEdit(announcement)}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteAnnouncement(announcement._id)}
                                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {false && userCanManage && managerDrafts.length > 0 ? (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <PencilLine size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Drafts & Expiring Items</h2>
                      <p className="text-sm text-slate-500">Quick access to announcements that still need manager attention.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {managerDrafts.slice(0, 6).map((announcement) => (
                      <div key={announcement._id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{announcement.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {announcement.status === 'draft' ? 'Draft' : 'Needs review'} • {announcement.category}
                            </div>
                          </div>
                          {announcement.pinned ? <Pin size={14} className="text-amber-500" /> : null}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openComposerForEdit(announcement)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAnnouncement(announcement._id)}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {feedLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                          <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                      <div className="mt-5 h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
                      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-slate-100" />
                      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : sortedVisibleAnnouncements.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Megaphone size={28} />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-slate-900">No announcements yet</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    {userCanManage
                      ? 'Your company feed is empty right now. Publish the first announcement to get everyone aligned.'
                      : 'There are no live announcements for you yet. Check back soon for company updates.'}
                  </p>
                  {userCanManage ? (
                    <button
                      type="button"
                      onClick={() => void openComposerForNewAnnouncement()}
                      className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Plus size={16} />
                      Create your first announcement
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  {pinnedAnnouncements.length > 0 ? (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Pin size={16} className="text-amber-500" />
                        <h2 className="text-lg font-semibold text-slate-900">Pinned</h2>
                      </div>
                      {pinnedAnnouncements.map((announcement) => (
                        <AnnouncementFeedCard
                          key={announcement._id}
                          announcement={announcement}
                          currentUser={user}
                          reactionTypes={reactionTypes}
                          isHighlighted={highlightedAnnouncementId === announcement._id}
                          reactionLoadingKey={reactionLoadingKey}
                          commentSubmitting={commentSubmittingId === announcement._id}
                          commentDeletingId={commentDeletingId}
                          pinToggling={pinningAnnouncementId === announcement._id}
                          deleting={deletingAnnouncementId === announcement._id}
                          onReact={handleReaction}
                          onAddComment={handleAddComment}
                          onDeleteComment={handleDeleteComment}
                          onEdit={openComposerForEdit}
                          onDelete={handleDeleteAnnouncement}
                          onTogglePin={handleTogglePin}
                        />
                      ))}
                    </section>
                  ) : null}

                  <section className="space-y-4">
                    {pinnedAnnouncements.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Megaphone size={16} className="text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-900">Latest Updates</h2>
                      </div>
                    ) : null}
                    {feedAnnouncements.map((announcement) => (
                      <AnnouncementFeedCard
                        key={announcement._id}
                        announcement={announcement}
                        currentUser={user}
                        reactionTypes={reactionTypes}
                        isHighlighted={highlightedAnnouncementId === announcement._id}
                        reactionLoadingKey={reactionLoadingKey}
                        commentSubmitting={commentSubmittingId === announcement._id}
                        commentDeletingId={commentDeletingId}
                        pinToggling={pinningAnnouncementId === announcement._id}
                        deleting={deletingAnnouncementId === announcement._id}
                        onReact={handleReaction}
                        onAddComment={handleAddComment}
                        onDeleteComment={handleDeleteComment}
                        onEdit={openComposerForEdit}
                        onDelete={handleDeleteAnnouncement}
                        onTogglePin={handleTogglePin}
                      />
                    ))}
                  </section>
                </>
              )}
            </div>

            <AnnouncementCommunitySidebar
              communityData={communityData}
              loading={feedLoading}
            />
          </div>
        </div>
      </div>

      <AnnouncementComposerDrawer
        open={composerOpen}
        loading={composerLoading}
        saving={composerSaving}
        isEditing={Boolean(editingAnnouncement)}
        form={form}
        errors={formErrors}
        setup={composerSetup}
        onChange={handleComposerChange}
        onClose={closeComposer}
        onSaveDraft={() => void submitAnnouncement('draft')}
        onPublish={() => void submitAnnouncement('published')}
      />
    </>
  );
};

export default Announcements;
