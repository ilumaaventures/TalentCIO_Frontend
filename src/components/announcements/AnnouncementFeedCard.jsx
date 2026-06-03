import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  Loader2,
  MessageCircle,
  Pencil,
  Pin,
  Send,
  ThumbsUp,
  Trash2,
  Trophy,
  HeartHandshake,
} from 'lucide-react';
import AnnouncementAvatar from './AnnouncementAvatar';
import {
  formatAnnouncementDate,
  formatAnnouncementDateTime,
  getAnnouncementRelativeTime,
  getAudienceLabel,
  getCategoryTheme,
  getDisplayName,
  getExpiryNotice,
  truncateText,
} from './announcementUtils';

const REACTION_META = {
  like: {
    label: 'Like',
    Icon: ThumbsUp,
    activeClassName: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  celebrate: {
    label: 'Celebrate',
    Icon: Trophy,
    activeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  support: {
    label: 'Support',
    Icon: HeartHandshake,
    activeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

/**
 * @param {object} props
 * @param {number} [props.count] - Numeric reaction count to display.
 * @param {boolean} [props.animate] - Whether the badge should briefly scale.
 */
const CountBadge = ({ count = 0, animate = false }) => (
  <span className={`inline-flex min-w-5 justify-center text-xs font-semibold transition-transform ${animate ? 'scale-count-bump' : ''}`}>
    {count}
  </span>
);

/**
 * @param {object} props
 * @param {object} props.announcement - Announcement payload for a single feed card.
 * @param {object} props.currentUser - Current logged-in user for comment authoring.
 * @param {string[]} props.reactionTypes - Enabled reaction types from backend bootstrap.
 * @param {boolean} [props.isHighlighted] - Whether the card should show the new-announcement highlight state.
 * @param {string} [props.reactionLoadingKey] - Active reaction request key in the form announcementId:type.
 * @param {boolean} [props.commentSubmitting] - Whether a new comment is currently being posted for this announcement.
 * @param {string} [props.commentDeletingId] - Comment id being deleted right now.
 * @param {boolean} [props.pinToggling] - Whether pin state is updating for this card.
 * @param {boolean} [props.deleting] - Whether this card is being deleted.
 * @param {(announcementId: string, reactionType: string) => Promise<void>} props.onReact - Reaction handler.
 * @param {(announcementId: string, text: string) => Promise<boolean>} props.onAddComment - Comment create handler.
 * @param {(announcementId: string, commentId: string) => Promise<void>} props.onDeleteComment - Comment delete handler.
 * @param {(announcement: object) => void} props.onEdit - Edit handler for managers.
 * @param {(announcementId: string) => Promise<void>} props.onDelete - Delete handler for managers.
 * @param {(announcement: object) => Promise<void>} props.onTogglePin - Pin toggle handler for managers.
 */
const AnnouncementFeedCard = ({
  announcement,
  currentUser,
  reactionTypes,
  isHighlighted = false,
  reactionLoadingKey = '',
  commentSubmitting = false,
  commentDeletingId = '',
  pinToggling = false,
  deleting = false,
  onReact,
  onAddComment,
  onDeleteComment,
  onEdit,
  onDelete,
  onTogglePin,
}) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [showReactorPopover, setShowReactorPopover] = useState(false);
  const [animatedTypes, setAnimatedTypes] = useState([]);
  const previousCountsRef = useRef(announcement?.reactionCounts || {});
  const commentInputRef = useRef(null);
  const expiryNotice = getExpiryNotice(announcement?.expiresAt);
  const categoryTheme = getCategoryTheme(announcement?.category);
  const author = announcement?.createdBy || {};
  const authorMeta = [author?.department, author?.employmentType].filter(Boolean).join(' • ') || 'Internal Announcement';
  const contentPreview = truncateText(announcement?.content || '', 200);
  const shouldClampSummary = Boolean(announcement?.summary) && announcement.summary.length > 140;
  const shouldClampContent = (announcement?.content || '').length > 200;

  useEffect(() => {
    const currentCounts = announcement?.reactionCounts || {};
    const changedTypes = reactionTypes.filter(
      (type) => (previousCountsRef.current?.[type] || 0) !== (currentCounts?.[type] || 0),
    );

    if (changedTypes.length > 0) {
      setAnimatedTypes(changedTypes);
      const timer = window.setTimeout(() => setAnimatedTypes([]), 220);
      previousCountsRef.current = currentCounts;
      return () => window.clearTimeout(timer);
    }

    previousCountsRef.current = currentCounts;
    return undefined;
  }, [announcement?.reactionCounts, reactionTypes]);

  useEffect(() => {
    if (!isCommentsOpen || !commentInputRef.current) return;
    commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    commentInputRef.current.focus();
  }, [isCommentsOpen]);

  const previewReactors = useMemo(
    () => Array.isArray(announcement?.reactionPreviewUsers) ? announcement.reactionPreviewUsers.slice(0, 3) : [],
    [announcement?.reactionPreviewUsers],
  );

  const handleCommentSubmit = async () => {
    const text = commentDraft.trim();
    if (!text) return;

    const didSave = await onAddComment(announcement._id, text);
    if (didSave) {
      setCommentDraft('');
      setIsCommentsOpen(true);
    }
  };

  return (
    <article
      id={`announcement-${announcement._id}`}
      className={`rounded-3xl border bg-white p-5 shadow-sm transition md:p-6 ${
        announcement?.pinned ? `${categoryTheme.softCardClassName}` : 'border-slate-200'
      } ${
        isHighlighted ? 'ring-2 ring-blue-300 ring-offset-2 shadow-md' : ''
      }`}
    >
      <style>{`
        .scale-count-bump {
          animation: announcementCountBump 180ms ease-out;
        }

        @keyframes announcementCountBump {
          0% { transform: scale(0.85); }
          55% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-label={`Category ${announcement?.category || 'General'}`}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${categoryTheme.badgeClassName}`}
            >
              {announcement?.category || 'General'}
            </span>
            {announcement?.pinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                <Pin size={12} />
                Pinned
              </span>
            ) : null}
            <span className="text-slate-300">•</span>
            <span className="text-sm text-slate-500">{getAnnouncementRelativeTime(announcement?.publishedAt || announcement?.createdAt)}</span>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <AnnouncementAvatar person={author} sizeClassName="h-12 w-12" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">{getDisplayName(author)}</div>
              <div className="mt-1 text-xs text-slate-500">{authorMeta}</div>
              <div className="mt-1 text-xs text-slate-400">{formatAnnouncementDateTime(announcement?.publishedAt || announcement?.createdAt)}</div>
            </div>
          </div>
        </div>

        {announcement?.canManage ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(announcement)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Edit announcement"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onTogglePin(announcement)}
              disabled={pinToggling}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                announcement?.pinned
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              } ${pinToggling ? 'opacity-60' : ''}`}
              aria-label={announcement?.pinned ? 'Unpin announcement' : 'Pin announcement'}
            >
              {pinToggling ? <Loader2 size={16} className="animate-spin" /> : <Pin size={16} />}
            </button>
            <button
              type="button"
              onClick={() => onDelete(announcement._id)}
              disabled={deleting}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              aria-label="Delete announcement"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <h2 className="text-lg font-semibold text-slate-900">{announcement?.title}</h2>
        {announcement?.summary ? (
          <div className="mt-3">
            <p
              className={`text-sm text-slate-600 ${!isSummaryExpanded && shouldClampSummary ? 'line-clamp-2' : ''}`}
              style={!isSummaryExpanded && shouldClampSummary ? {
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } : undefined}
            >
              {announcement.summary}
            </p>
            {shouldClampSummary ? (
              <button
                type="button"
                onClick={() => setIsSummaryExpanded((current) => !current)}
                className="mt-1 text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                {isSummaryExpanded ? 'Show less' : 'Read more'}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {isContentExpanded || !shouldClampContent ? announcement?.content : contentPreview}
          {shouldClampContent ? (
            <button
              type="button"
              onClick={() => setIsContentExpanded((current) => !current)}
              className="ml-2 inline-flex text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              {isContentExpanded ? 'Show less' : 'Read more'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          <BadgeCheck size={14} />
          {getAudienceLabel(announcement)}
        </span>
        {expiryNotice ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            <CalendarClock size={14} />
            {expiryNotice}
          </span>
        ) : null}
        {announcement?.expiresAt ? (
          <span className="text-xs text-slate-400">Ends {formatAnnouncementDate(announcement.expiresAt)}</span>
        ) : null}
      </div>

      <div className="relative mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {reactionTypes.map((type) => {
            const meta = REACTION_META[type] || REACTION_META.like;
            const isActive = announcement?.viewerReaction === type;
            const count = announcement?.reactionCounts?.[type] || 0;
            const loadingKey = `${announcement._id}:${type}`;

            return (
              <button
                key={`${announcement._id}-${type}`}
                type="button"
                onClick={() => onReact(announcement._id, type)}
                disabled={reactionLoadingKey === loadingKey}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? meta.activeClassName
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                } ${reactionLoadingKey === loadingKey ? 'opacity-60' : ''}`}
              >
                {reactionLoadingKey === loadingKey ? <Loader2 size={15} className="animate-spin" /> : <meta.Icon size={15} />}
                <span>{meta.label}</span>
                <CountBadge count={count} animate={animatedTypes.includes(type)} />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCommentsOpen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <MessageCircle size={15} />
            <span>{announcement?.commentCount || 0} comments</span>
          </button>

          {announcement?.totalReactions > 0 ? (
            <div
              className="relative ml-auto"
              onMouseEnter={() => setShowReactorPopover(true)}
              onMouseLeave={() => setShowReactorPopover(false)}
            >
              <button
                type="button"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200"
              >
                {announcement.totalReactions} reactions
              </button>

              {showReactorPopover && previewReactors.length > 0 ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Top Reactors</div>
                  <div className="mt-3 space-y-2">
                    {previewReactors.map((reactor) => (
                      <div key={`${announcement._id}-${reactor._id}`} className="flex items-center gap-3">
                        <AnnouncementAvatar person={reactor} sizeClassName="h-9 w-9" textClassName="text-[11px]" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-700">{getDisplayName(reactor)}</div>
                          <div className="text-xs text-slate-400 capitalize">{reactor.reactionType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isCommentsOpen ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-4">
          <div className="space-y-3">
            {(announcement?.comments || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Be the first to comment on this announcement.
              </div>
            ) : (
              announcement.comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 rounded-2xl bg-slate-50/80 px-3 py-3">
                  <AnnouncementAvatar person={comment?.author} sizeClassName="h-10 w-10" textClassName="text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{getDisplayName(comment?.author)}</span>
                      <span className="text-xs text-slate-400">{getAnnouncementRelativeTime(comment?.createdAt)}</span>
                      {comment?.isOptimistic ? (
                        <span className="text-xs font-medium text-blue-600">Sending...</span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{comment?.text}</p>
                  </div>
                  {comment?.canDelete ? (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(announcement._id, comment._id)}
                      disabled={commentDeletingId === comment._id || comment?.isOptimistic}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
                      aria-label="Delete comment"
                    >
                      {commentDeletingId === comment._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <AnnouncementAvatar person={currentUser} sizeClassName="h-10 w-10" textClassName="text-xs" />
            <div className="flex-1">
              <textarea
                ref={commentInputRef}
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleCommentSubmit();
                  }
                }}
                rows={3}
                placeholder="Write a comment"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Press Enter to send, Shift+Enter for a new line.</p>
                <button
                  type="button"
                  onClick={() => void handleCommentSubmit()}
                  disabled={commentSubmitting || !commentDraft.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {commentSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {commentSubmitting ? 'Posting...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
};

export default AnnouncementFeedCard;
