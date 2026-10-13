import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Plus,
  MessageSquare,
  Users,
  CheckCircle2,
  Calendar,
  ThumbsUp,
  X,
  Send,
  Heart,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import pmsApi from '../api/pmsApi';

export default function ContinuousFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('wall'); // 'wall', 'received', 'given', 'meetings'
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Form states
  const [feedbackForm, setFeedbackForm] = useState({
    toUser: '',
    feedbackType: 'appreciation',
    category: 'Teamwork',
    content: '',
    visibility: 'public',
  });

  const [meetingForm, setMeetingForm] = useState({
    toUser: '',
    meetingDate: '',
    discussionTopics: '',
    actionItemTask: '',
    privateNotes: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users?limit=200').catch(() => api.get('/admin/users/team'));
      const list = res.data?.users || (Array.isArray(res.data) ? res.data : []);
      setUsersList(list);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [tab]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getFeedbacks({ tab });
      if (res.data?.success) setFeedbacks(res.data.data);
    } catch (err) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleGiveFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackForm.toUser || !feedbackForm.content) {
      toast.error('Recipient and message are required');
      return;
    }

    try {
      const res = await pmsApi.giveFeedback(feedbackForm);
      if (res.data?.success) {
        toast.success('Feedback posted');
        setShowFeedbackModal(false);
        setFeedbackForm({ toUser: '', feedbackType: 'appreciation', category: 'Teamwork', content: '', visibility: 'public' });
        fetchFeedbacks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post feedback');
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!meetingForm.toUser) {
      toast.error('Participant is required');
      return;
    }

    try {
      const payload = {
        toUser: meetingForm.toUser,
        meetingDate: meetingForm.meetingDate || new Date(),
        discussionTopics: meetingForm.discussionTopics ? meetingForm.discussionTopics.split('\n').filter(Boolean) : [],
        actionItems: meetingForm.actionItemTask ? [{ task: meetingForm.actionItemTask, completed: false }] : [],
        privateNotes: meetingForm.privateNotes,
      };

      const res = await pmsApi.create1on1(payload);
      if (res.data?.success) {
        toast.success('1-on-1 meeting notes recorded');
        setShowMeetingModal(false);
        fetchFeedbacks();
      }
    } catch (err) {
      toast.error('Failed to save meeting notes');
    }
  };

  const handleToggleActionItem = async (feedbackId, itemIndex, currentCompleted) => {
    try {
      const res = await pmsApi.toggleActionItem(feedbackId, { itemIndex, completed: !currentCompleted });
      if (res.data?.success) {
        fetchFeedbacks();
      }
    } catch (err) {
      toast.error('Failed to update action item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 text-xs font-bold">
          <button
            onClick={() => setTab('wall')}
            className={`rounded-lg px-3 py-1 transition ${
              tab === 'wall' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kudos & Recognition Wall
          </button>
          <button
            onClick={() => setTab('received')}
            className={`rounded-lg px-3 py-1 transition ${
              tab === 'received' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setTab('given')}
            className={`rounded-lg px-3 py-1 transition ${
              tab === 'given' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Given
          </button>
          <button
            onClick={() => setTab('meetings')}
            className={`rounded-lg px-3 py-1 transition ${
              tab === 'meetings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1-on-1 Catchups
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMeetingModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Calendar size={14} />
            <span>Schedule 1-on-1</span>
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Sparkles size={14} />
            <span>Give Kudos</span>
          </button>
        </div>
      </div>

      {/* Feed list */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          No feedback entries recorded in this view
        </div>
      ) : tab === 'meetings' ? (
        <div className="space-y-4">
          {feedbacks.map((m) => (
            <div key={m._id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                    1:1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      1-on-1 Catchup with {m.toUser?.firstName} {m.toUser?.lastName}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Conducted by {m.fromUser?.firstName} • {new Date(m.meetingDetails?.meetingDate || m.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discussion topics */}
              {m.meetingDetails?.discussionTopics && m.meetingDetails.discussionTopics.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Discussion Topics</span>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-600 space-y-0.5">
                    {m.meetingDetails.discussionTopics.map((top, idx) => (
                      <li key={idx}>{top}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action items checklist */}
              {m.meetingDetails?.actionItems && m.meetingDetails.actionItems.length > 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Action Items</span>
                  <div className="mt-2 space-y-1.5">
                    {m.meetingDetails.actionItems.map((ai, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ai.completed}
                          onChange={() => handleToggleActionItem(m._id, idx, ai.completed)}
                          className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={ai.completed ? 'line-through text-slate-400' : ''}>{ai.task}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feedbacks.map((f) => (
            <div key={f._id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                    {f.category}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                    {f.fromUser?.firstName?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {f.fromUser?.firstName} → {f.toUser?.firstName}
                    </div>
                    <div className="text-[10px] text-slate-500">{f.fromUser?.department}</div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-700 italic bg-slate-50 rounded-xl p-3 border border-slate-100/80">
                  "{f.content}"
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                <span className="capitalize">{f.visibility}</span>
                <span className="text-amber-500 font-bold">👏 Kudos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Give Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Share Kudos / Appreciation</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGiveFeedback} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Colleague / Team Member *</label>
                {usersList.length > 0 ? (
                  <select
                    required
                    value={feedbackForm.toUser}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, toUser: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select Colleague...</option>
                    {usersList.map((u) => {
                      const id = u._id || u.id;
                      const displayName = u.firstName && u.lastName 
                        ? `${u.firstName} ${u.lastName}` 
                        : (u.name || u.email || id);
                      const empId = u.employeeId ? ` (${u.employeeId})` : '';
                      return (
                        <option key={id} value={id}>
                          {displayName}{empId} {u.designation?.name ? `- ${u.designation.name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter colleague ID or email"
                    value={feedbackForm.toUser}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, toUser: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={feedbackForm.category}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Teamwork">Teamwork</option>
                    <option value="Innovation">Innovation</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Customer Focus">Customer Focus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Visibility</label>
                  <select
                    value={feedbackForm.visibility}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, visibility: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="public">Public Wall</option>
                    <option value="manager_only">Manager & Employee</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Appreciation Note *</label>
                <textarea
                  required
                  rows={3}
                  value={feedbackForm.content}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                  placeholder="Give a shoutout or recognize great impact..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Post Kudos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule 1-on-1 Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record 1-on-1 Catchup</h3>
              <button onClick={() => setShowMeetingModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Participant / Team Member *</label>
                {usersList.length > 0 ? (
                  <select
                    required
                    value={meetingForm.toUser}
                    onChange={(e) => setMeetingForm({ ...meetingForm, toUser: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select Team Member...</option>
                    {usersList.map((u) => {
                      const id = u._id || u.id;
                      const displayName = u.firstName && u.lastName 
                        ? `${u.firstName} ${u.lastName}` 
                        : (u.name || u.email || id);
                      const empId = u.employeeId ? ` (${u.employeeId})` : '';
                      return (
                        <option key={id} value={id}>
                          {displayName}{empId} {u.designation?.name ? `- ${u.designation.name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={meetingForm.toUser}
                    onChange={(e) => setMeetingForm({ ...meetingForm, toUser: e.target.value })}
                    placeholder="Team member ID or email"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Meeting Date</label>
                <input
                  type="date"
                  value={meetingForm.meetingDate}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Discussion Topics (1 per line)</label>
                <textarea
                  rows={2}
                  value={meetingForm.discussionTopics}
                  onChange={(e) => setMeetingForm({ ...meetingForm, discussionTopics: e.target.value })}
                  placeholder="Quarterly goals check&#10;Sprint blocker review&#10;Feedback exchange"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Action Item</label>
                <input
                  type="text"
                  value={meetingForm.actionItemTask}
                  onChange={(e) => setMeetingForm({ ...meetingForm, actionItemTask: e.target.value })}
                  placeholder="e.g. Schedule design walkthrough by Friday"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  Save 1-on-1 Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
