import React, { useState } from 'react';
import { MessageSquare, Send, Trash2, Edit2, Check, X, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/features/auth/context/AuthContext';

export const TaskComments = ({
  comments = [],
  employees = [],
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  submitting = false
}) => {
  const { user: currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editMessage, setEditMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    onAddComment(message.trim());
    setMessage('');
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment._id);
    setEditMessage(comment.message);
  };

  const handleSaveEdit = (commentId) => {
    if (!editMessage.trim()) return;
    onUpdateComment(commentId, editMessage.trim());
    setEditingCommentId(null);
  };

  return (
    <div className="space-y-4">
      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative border border-slate-300 focus-within:border-blue-500 rounded-xl overflow-hidden bg-white shadow-xs transition-colors">
          <textarea
            rows={3}
            placeholder="Write a comment or mention team members with @..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 text-sm outline-none resize-none text-slate-800 placeholder:text-slate-400"
          />
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Markdown supported
            </span>
            <button
              type="submit"
              disabled={!message.trim() || submitting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send size={13} /> {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 pt-2">
        {comments.length > 0 ? (
          comments.map((c) => {
            const author = c.user || {};
            const isAuthor = String(author._id) === String(currentUser?._id);
            const isEditing = editingCommentId === c._id;

            return (
              <div
                key={c._id}
                className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs space-y-2"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {author.firstName?.[0] || 'U'}
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {author.firstName} {author.lastName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
                    </span>
                  </div>

                  {/* Actions for author */}
                  {isAuthor && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded"
                        title="Edit comment"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteComment(c._id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Body / Edit Mode */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="w-full p-2 text-sm border border-blue-400 rounded-lg outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleSaveEdit(c._id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                      >
                        <Check size={12} /> Save
                      </button>
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {c.message}
                  </p>
                )}

                {/* Attachments if any */}
                {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:underline"
                      >
                        <Paperclip size={12} /> {att.name || 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            No comments yet. Start the conversation!
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskComments;
