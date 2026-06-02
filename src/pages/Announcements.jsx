import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  Cake,
  ChevronDown,
  Heart,
  Loader2,
  Megaphone,
  MessageCircle,
  Pin,
  Plus,
  Save,
  Sparkles,
  ThumbsUp,
  Trash2,
  UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  title: '',
  summary: '',
  content: '',
  category: 'General',
  status: 'draft',
  pinned: false,
  audienceType: 'all',
  audienceDepartments: [],
  audienceEmploymentTypes: [],
  audienceUserIds: [],
  expiresAt: ''
};

const AUDIENCE_LABELS = {
  all: 'All employees',
  departments: 'Departments',
  employmentTypes: 'Employment types',
  specificUsers: 'Specific users'
};

const REACTION_META = {
  like: {
    label: 'Thumbs Up',
    Icon: ThumbsUp,
    activeClassName: 'border-blue-200 bg-blue-50 text-blue-700'
  },
  celebrate: {
    label: 'Clap',
    Icon: Sparkles,
    activeClassName: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  support: {
    label: 'Heart',
    Icon: Heart,
    activeClassName: 'border-rose-200 bg-rose-50 text-rose-700'
  }
};

const canManageAnnouncements = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return (
    roles.some((role) => ['Admin', 'Manager', 'HR Admin', 'System Admin'].includes(role))
    || permissions.includes('announcement.manage')
    || permissions.includes('*')
  );
};

const formatDateLabel = (value) => {
  if (!value) return 'Not scheduled';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return 'Not scheduled';
  }
};

const formatShortDate = (value) => {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short'
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const formatDateInputValue = (value) => {
  if (!value) return '';

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const getDisplayName = (person) => {
  if (!person) return 'Team Member';
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return fullName || person.name || person.email || 'Team Member';
};

const getInitials = (person) => {
  const displayName = getDisplayName(person);
  return displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'TM';
};

const renderUserAvatar = (person, sizeClassName = 'h-11 w-11') => {
  if (person?.profilePicture) {
    return (
      <img
        src={person.profilePicture}
        alt={getDisplayName(person)}
        className={`${sizeClassName} rounded-full border border-slate-200 object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeClassName} flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600`}>
      {getInitials(person)}
    </div>
  );
};

const truncateName = (value = '', maxLength = 12) => (
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
);

const Announcements = () => {
  const { user } = useAuth();
  const userCanManage = useMemo(() => canManageAnnouncements(user), [user]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [reactionLoadingId, setReactionLoadingId] = useState('');
  const [commentingId, setCommentingId] = useState('');
  const [commentDeletingId, setCommentDeletingId] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [reactionPickerId, setReactionPickerId] = useState('');
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
  const [manageAnnouncements, setManageAnnouncements] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [bootstrap, setBootstrap] = useState({
    canManage: false,
    categories: ['General', 'HR', 'Policy', 'Product', 'Celebration', 'Alert'],
    audienceTypes: ['all', 'departments', 'employmentTypes', 'specificUsers'],
    reactionTypes: ['like', 'celebrate', 'support'],
    departments: [],
    employmentTypes: [],
    users: []
  });
  const [communityData, setCommunityData] = useState({
    birthdays: { currentMonth: [], today: [], count: 0 },
    workAnniversaries: { currentMonth: [], today: [], count: 0 },
    newJoinees: { currentMonth: [], count: 0 }
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [composerSetupLoaded, setComposerSetupLoaded] = useState(false);
  const [composerSetupLoading, setComposerSetupLoading] = useState(false);

  const reactionTypes = bootstrap.reactionTypes?.length ? bootstrap.reactionTypes : ['like', 'celebrate', 'support'];

  const loadData = async () => {
    try {
      setLoading(true);
      const requests = [
        api.get('/announcements'),
        api.get('/announcements/community')
      ];

      if (userCanManage) {
        requests.push(api.get('/announcements?scope=manage&limit=50'));
      }

      const [visibleResponse, communityResponse, manageResponse] = await Promise.all(requests);

      setVisibleAnnouncements(Array.isArray(visibleResponse.data?.announcements) ? visibleResponse.data.announcements : []);
      setCommunityData({
        birthdays: communityResponse.data?.birthdays || { currentMonth: [], today: [], count: 0 },
        workAnniversaries: communityResponse.data?.workAnniversaries || { currentMonth: [], today: [], count: 0 },
        newJoinees: communityResponse.data?.newJoinees || { currentMonth: [], count: 0 }
      });
      setBootstrap((current) => {
        const nextState = {
          ...current,
          reactionTypes: Array.isArray(visibleResponse.data?.reactionTypes) && visibleResponse.data.reactionTypes.length
            ? visibleResponse.data.reactionTypes
            : current.reactionTypes
        };
        return nextState;
      });
      setManageAnnouncements(Array.isArray(manageResponse?.data?.announcements) ? manageResponse.data.announcements : []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userCanManage]);

  const resetForm = () => {
    setEditingId('');
    setForm(EMPTY_FORM);
  };

  const syncAnnouncement = (updatedAnnouncement) => {
    if (!updatedAnnouncement?._id) return;

    setVisibleAnnouncements((current) => current.map((announcement) => (
      announcement._id === updatedAnnouncement._id ? updatedAnnouncement : announcement
    )));

    setManageAnnouncements((current) => current.map((announcement) => (
      announcement._id === updatedAnnouncement._id ? updatedAnnouncement : announcement
    )));
  };

  const ensureComposerSetup = async () => {
    if (!userCanManage || composerSetupLoaded || composerSetupLoading) {
      return composerSetupLoaded;
    }

    try {
      setComposerSetupLoading(true);
      const response = await api.get('/announcements/composer-setup');
      setBootstrap((current) => ({
        ...current,
        ...(response.data || {})
      }));
      setComposerSetupLoaded(true);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load announcement setup');
      return false;
    } finally {
      setComposerSetupLoading(false);
    }
  };

  const openStudioForNewPost = async () => {
    if (!userCanManage) {
      toast('Only managers can create wall posts.');
      return;
    }

    const setupReady = await ensureComposerSetup();
    if (!setupReady) return;

    resetForm();
    setShowComposer(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAudienceMultiSelect = (field) => (event) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setForm((current) => ({ ...current, [field]: values }));
  };

  const handleEdit = async (announcement) => {
    const setupReady = await ensureComposerSetup();
    if (!setupReady) return;

    setShowComposer(true);
    setEditingId(announcement._id);
    setForm({
      title: announcement.title || '',
      summary: announcement.summary || '',
      content: announcement.content || '',
      category: announcement.category || 'General',
      status: announcement.status || 'draft',
      pinned: Boolean(announcement.pinned),
      audienceType: announcement.audienceType || 'all',
      audienceDepartments: announcement.audienceDepartments || [],
      audienceEmploymentTypes: announcement.audienceEmploymentTypes || [],
      audienceUserIds: (announcement.audienceUserIds || []).map((value) => String(value)),
      expiresAt: formatDateInputValue(announcement.expiresAt)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null
      };

      if (editingId) {
        await api.put(`/announcements/${editingId}`, payload);
        toast.success(form.status === 'published' ? 'Wall post updated' : 'Draft updated');
      } else {
        await api.post('/announcements', payload);
        toast.success(form.status === 'published' ? 'Posted to wall' : 'Draft created');
      }

      resetForm();
      await loadData();
      setShowComposer(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save wall post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm('Delete this wall post?')) return;

    try {
      setDeletingId(announcementId);
      await api.delete(`/announcements/${announcementId}`);
      toast.success('Wall post deleted');

      if (editingId === announcementId) {
        resetForm();
      }

      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete wall post');
    } finally {
      setDeletingId('');
    }
  };

  const handleReaction = async (announcementId, type) => {
    try {
      setReactionLoadingId(`${announcementId}:${type}`);
      const response = await api.post(`/announcements/${announcementId}/react`, { type });
      syncAnnouncement(response.data?.announcement);
      setReactionPickerId('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update reaction');
    } finally {
      setReactionLoadingId('');
    }
  };

  const handleCommentSubmit = async (announcementId) => {
    const text = String(commentDrafts[announcementId] || '').trim();
    if (!text) {
      toast.error('Write a comment first');
      return;
    }

    try {
      setCommentingId(announcementId);
      const response = await api.post(`/announcements/${announcementId}/comments`, { text });
      syncAnnouncement(response.data?.announcement);
      setCommentDrafts((current) => ({ ...current, [announcementId]: '' }));
      setExpandedComments((current) => ({ ...current, [announcementId]: true }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommentingId('');
    }
  };

  const handleCommentDelete = async (announcementId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      setCommentDeletingId(commentId);
      const response = await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
      syncAnnouncement(response.data?.announcement);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    } finally {
      setCommentDeletingId('');
    }
  };

  const renderFeedCard = (announcement) => {
    const author = announcement.createdBy || {};
    const commentOpen = Boolean(expandedComments[announcement._id]);
    const selectedReactionMeta = REACTION_META[announcement.viewerReaction] || null;
    const reactionButtonLoading = reactionLoadingId.startsWith(`${announcement._id}:`);
    const reactionButtonLabel = selectedReactionMeta ? selectedReactionMeta.label : 'React';
    const reactionButtonClassName = selectedReactionMeta
      ? selectedReactionMeta.activeClassName
      : 'border-slate-200 text-slate-600 hover:bg-slate-50';

    return (
      <article key={announcement._id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex items-start gap-4">
            {renderUserAvatar(author)}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-900">{announcement.title}</h3>
                {announcement.pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    <Pin size={12} />
                    Pinned
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{getDisplayName(author)}</span>
                <span>{formatDateLabel(announcement.publishedAt || announcement.createdAt)}</span>
              </div>
            </div>
          </div>

          {announcement.summary ? (
            <p className="mt-4 text-sm font-semibold text-slate-700">{announcement.summary}</p>
          ) : null}
          <div className={`whitespace-pre-wrap text-sm leading-7 text-slate-700 ${announcement.summary ? 'mt-2' : 'mt-4'}`}>
            {announcement.content}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-slate-100 py-3 text-xs text-slate-500">
            {reactionTypes.map((type) => {
              const meta = REACTION_META[type] || REACTION_META.like;
              const count = announcement.reactionCounts?.[type] || 0;
              if (!count) return null;

              return (
                <span key={`${announcement._id}:${type}:count`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                  <meta.Icon size={13} />
                  {count}
                </span>
              );
            })}
            <span className="ml-auto">
              {announcement.commentCount || 0} comment{announcement.commentCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="border-b border-slate-100 py-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReactionPickerId((current) => (current === announcement._id ? '' : announcement._id))}
                disabled={reactionButtonLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${reactionButtonClassName} ${reactionButtonLoading ? 'opacity-60' : ''}`}
              >
                {reactionButtonLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedReactionMeta ? (
                  <selectedReactionMeta.Icon size={16} />
                ) : (
                  <ThumbsUp size={16} />
                )}
                {reactionButtonLabel}
                <ChevronDown size={16} className={`transition ${reactionPickerId === announcement._id ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setExpandedComments((current) => ({ ...current, [announcement._id]: !current[announcement._id] }))}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <MessageCircle size={16} />
                Comment
              </button>
            </div>

            {reactionPickerId === announcement._id ? (
              <div className="mt-3 grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                {reactionTypes.map((type) => {
                  const meta = REACTION_META[type] || REACTION_META.like;
                  const isActive = announcement.viewerReaction === type;
                  const loadingKey = `${announcement._id}:${type}`;

                  return (
                    <button
                      key={`${announcement._id}:${type}`}
                      type="button"
                      onClick={() => handleReaction(announcement._id, type)}
                      disabled={reactionLoadingId === loadingKey}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? meta.activeClassName
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      } ${reactionLoadingId === loadingKey ? 'opacity-60' : ''}`}
                    >
                      {reactionLoadingId === loadingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <meta.Icon size={16} />}
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {commentOpen ? (
            <div className="space-y-4 pt-4">
              <div className="flex gap-3">
                <div className="pt-1">
                  {renderUserAvatar(user, 'h-10 w-10')}
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={commentDrafts[announcement._id] || ''}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [announcement._id]: event.target.value }))}
                    className="min-h-[88px] w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Write a comment"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCommentSubmit(announcement._id)}
                      disabled={commentingId === announcement._id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {commentingId === announcement._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle size={16} />}
                      Comment
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(announcement.comments || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No comments yet.
                  </div>
                ) : announcement.comments.map((comment) => (
                  <div key={comment._id} className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                    <div className="flex items-start gap-3">
                      {renderUserAvatar(comment.author, 'h-10 w-10')}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{getDisplayName(comment.author)}</span>
                          <span className="text-xs text-slate-500">{formatDateLabel(comment.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.text}</p>
                      </div>
                      {comment.canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleCommentDelete(announcement._id, comment._id)}
                          disabled={commentDeletingId === comment._id}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          {commentDeletingId === comment._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 size={13} />}
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  const renderPeopleCard = (sectionKey, title, emptyLabel) => {
    const section = communityData[sectionKey] || { currentMonth: [], today: [], count: 0 };
    const spotlight = Array.isArray(section.today) && section.today.length > 0
      ? section.today[0]
      : (section.currentMonth || [])[0] || null;

    return (
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          {sectionKey === 'birthdays' ? <Cake size={17} className="text-rose-500" /> : null}
          {sectionKey === 'anniversaries' ? <BadgeCheck size={17} className="text-amber-500" /> : null}
          {sectionKey === 'joinees' ? <UserPlus size={17} className="text-emerald-500" /> : null}
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{section?.count || 0}</span>
        </div>

        {spotlight ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            {renderUserAvatar(spotlight, 'h-12 w-12')}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{getDisplayName(spotlight)}</div>
              <div className="mt-1 text-xs text-slate-500">
                {sectionKey === 'anniversaries'
                  ? `${spotlight.yearsCompleted} year${spotlight.yearsCompleted === 1 ? '' : 's'} completed`
                  : sectionKey === 'joinees'
                    ? `Added ${spotlight.dateLabel || 'this month'}`
                    : 'Wish them today'}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current Month</div>
          {(section?.currentMonth || []).length === 0 ? (
            <div className="mt-3 text-sm text-slate-400">No upcoming records.</div>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {section.currentMonth.slice(0, 6).map((employee) => (
                <div key={`${sectionKey}:${employee._id}`} className="text-center">
                  <div className="mx-auto mb-2 flex justify-center">
                    {renderUserAvatar(employee, 'h-12 w-12')}
                  </div>
                  <div className="text-xs font-medium text-slate-800">{truncateName(getDisplayName(employee), 12)}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {sectionKey === 'anniversaries'
                      ? `${employee.yearsCompleted} yr`
                      : employee.dateLabel || ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudio = () => {
    const audienceHint = AUDIENCE_LABELS[form.audienceType] || 'Audience';

    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Wall Post' : 'Create Wall Post'}</h2>
                <p className="mt-1 text-sm text-slate-500">Create a post, save it as draft, or publish it directly to the wall.</p>
              </div>
              {!editingId ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Plus size={14} />
                  Add Post
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Example: Q3 Townhall updates and action items"
                  maxLength={160}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Summary</span>
                <input
                  value={form.summary}
                  onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Short line shown in wall cards and notifications"
                  maxLength={240}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Category</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {bootstrap.categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publish now</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Audience</span>
                <select
                  value={form.audienceType}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    audienceType: event.target.value,
                    audienceDepartments: [],
                    audienceEmploymentTypes: [],
                    audienceUserIds: []
                  }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {bootstrap.audienceTypes.map((audienceType) => (
                    <option key={audienceType} value={audienceType}>{AUDIENCE_LABELS[audienceType] || audienceType}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Expiry Date</span>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Pin this post</div>
                  <div className="text-xs text-slate-500">Pinned posts stay at the top of the wall.</div>
                </div>
              </label>

              {form.audienceType === 'departments' && (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">{audienceHint}</span>
                  <select
                    multiple
                    value={form.audienceDepartments}
                    onChange={handleAudienceMultiSelect('audienceDepartments')}
                    className="h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {bootstrap.departments.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">Use Ctrl or Cmd to select multiple departments.</p>
                </label>
              )}

              {form.audienceType === 'employmentTypes' && (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">{audienceHint}</span>
                  <select
                    multiple
                    value={form.audienceEmploymentTypes}
                    onChange={handleAudienceMultiSelect('audienceEmploymentTypes')}
                    className="h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {bootstrap.employmentTypes.map((employmentType) => (
                      <option key={employmentType} value={employmentType}>{employmentType}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">Use Ctrl or Cmd to select multiple employment types.</p>
                </label>
              )}

              {form.audienceType === 'specificUsers' && (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">{audienceHint}</span>
                  <select
                    multiple
                    value={form.audienceUserIds}
                    onChange={handleAudienceMultiSelect('audienceUserIds')}
                    className="h-48 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {bootstrap.users.map((employee) => {
                      const name = [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim();
                      return (
                        <option key={employee._id} value={employee._id}>
                          {name} {employee.department ? `- ${employee.department}` : ''} {employee.email ? `- ${employee.email}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500">Use Ctrl or Cmd to select multiple employees.</p>
                </label>
              )}

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Post Body</span>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  className="min-h-[240px] w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Write the post exactly as employees should see it on the wall."
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-slate-800">
                <Sparkles size={17} className="text-amber-500" />
                <h3 className="text-base font-bold">Wall Publishing Notes</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>Publishing sends an in-app notification to the selected audience.</li>
                <li>Pinned posts float to the top of the wall.</li>
                <li>Expiry hides the post automatically after the chosen date.</li>
                <li>Employees can react and comment directly on the wall.</li>
              </ul>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800">Actions</h3>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  {editingId ? 'Save Changes' : form.status === 'published' ? 'Post To Wall' : 'Create Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowComposer(false);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {editingId ? 'Cancel Editing' : 'Close Composer'}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manage Wall Posts</h2>
            <p className="mt-1 text-sm text-slate-500">Drafts, published posts, and expired wall updates.</p>
          </div>

          <div className="mt-5 space-y-3">
            {manageAnnouncements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No wall posts created yet.
              </div>
            ) : manageAnnouncements.map((announcement) => (
              <div key={announcement._id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-900">{announcement.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        announcement.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {announcement.status}
                      </span>
                      {announcement.pinned ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Pinned
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{announcement.audienceSummary?.label || 'Audience'} - {announcement.category}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {announcement.status === 'published'
                        ? `Published ${formatDateLabel(announcement.publishedAt || announcement.createdAt)}`
                        : `Last updated ${formatDateLabel(announcement.updatedAt || announcement.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(announcement)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(announcement._id)}
                      disabled={deletingId === announcement._id}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {deletingId === announcement._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 size={13} />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center gap-2 text-slate-900">
        <Megaphone size={18} className="text-blue-600" />
        <h1 className="text-xl font-semibold">Organization Wall</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.42fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
                <p className="mt-1 text-sm text-slate-500">
                  View company updates on the left and use the create option to publish a new announcement.
                </p>
              </div>
              {userCanManage ? (
                <button
                  type="button"
                  onClick={() => {
                    if (showComposer) {
                      setShowComposer(false);
                    } else {
                      openStudioForNewPost();
                    }
                  }}
                  disabled={composerSetupLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {composerSetupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                  {showComposer ? 'Hide Creator' : 'Create Announcement'}
                </button>
              ) : null}
            </div>
          </div>

          {showComposer && userCanManage ? renderStudio() : null}

          {visibleAnnouncements.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">
              No announcements are available right now.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleAnnouncements.map(renderFeedCard)}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {renderPeopleCard('birthdays', 'Birthdays', 'No birthdays today.')}
          {renderPeopleCard('anniversaries', 'Work Anniversaries', 'No work anniversaries today.')}
          {renderPeopleCard('joinees', 'New Joinees', 'No new joinees right now.')}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
