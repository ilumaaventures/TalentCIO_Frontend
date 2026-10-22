import React, { useState, useEffect } from 'react';
import {
  Users,
  Star,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  Award,
  Layers,
  Sparkles,
  ChevronRight,
  X,
  Send,
  Building,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import pmsApi from '../api/pmsApi';

const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Developing',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Exceptional Performance',
};

const getRatingLabel = (score) => {
  const num = Math.round(Number(score) || 0);
  if (num >= 5) return 'Exceptional Performance';
  if (num >= 4) return 'Exceeds Expectations';
  if (num >= 3) return 'Meets Expectations';
  if (num >= 2) return 'Developing';
  return 'Needs Improvement';
};

const RATING_COLORS = {
  1: 'text-rose-600 bg-rose-50 border-rose-200',
  2: 'text-amber-600 bg-amber-50 border-amber-200',
  3: 'text-blue-600 bg-blue-50 border-blue-200',
  4: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  5: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

export default function SimpleTeamEvaluations({ onNavigateSettings }) {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('default');
  const [selectedEval, setSelectedEval] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState(null);

  // Review Form State
  const [reviewForm, setReviewForm] = useState({
    rating: 4,
    feedback: '',
    strengths: '',
    improvements: '',
    kraRatings: [],
    level: 'auto',
  });

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const roleNames = userRoles.map((r) => (typeof r === 'string' ? r : r?.name || '')).filter(Boolean);
  const isAdmin = user?.permissions?.includes('*') ||
    user?.permissions?.includes('admin') ||
    user?.permissions?.includes('pms.can.edit.all') ||
    roleNames.some((r) => /admin/i.test(r));

  const isHr = isAdmin ||
    user?.permissions?.includes('pms.view.all') ||
    roleNames.some((r) => /hr/i.test(r));

  const isManager = isAdmin || isHr ||
    user?.permissions?.includes('pms.manage.team') ||
    roleNames.some((r) => /manager/i.test(r));

  useEffect(() => {
    // Choose sensible default scope
    if (isAdmin || isHr) {
      setScope('all');
    } else if (isManager) {
      setScope('team');
    } else {
      setScope('self');
    }
  }, [isAdmin, isHr, isManager]);

  useEffect(() => {
    fetchEvaluations();
  }, [scope]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getEvaluations({ scope });
      if (res.data?.success) {
        const rawList = res.data.data || [];
        const activeOnly = rawList.filter((e) => e.user?.isActive !== false && e.user?.status !== 'Inactive' && e.user?.status !== 'inactive');
        setEvaluations(activeOnly);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error('Failed to load evaluations:', err);
      toast.error('Failed to load team evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (item) => {
    setSelectedEval(item);
    setReviewForm({
      rating: item.ratings?.managerRating || item.ratings?.finalScore || 4,
      feedback: item.ratings?.managerComments || item.ratings?.adminComments || '',
      strengths: item.ratings?.managerStrengths || '',
      improvements: item.ratings?.managerImprovements || '',
      kraRatings: (item.kras || []).map((k) => ({
        kraId: k._id,
        name: k.name,
        weightage: k.weightage,
        score: k.score || 4,
        comments: k.comments || '',
      })),
      level: isAdmin ? 'admin' : (isHr ? 'hr' : 'manager'),
    });
  };

  const calculateOverallFromKras = () => {
    if (!reviewForm.kraRatings || reviewForm.kraRatings.length === 0) return;
    let totalWeight = 0;
    let weightedSum = 0;
    reviewForm.kraRatings.forEach((k) => {
      const weight = Number(k.weightage) || 25;
      const score = Number(k.score) || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    if (totalWeight > 0) {
      const computed = Math.round((weightedSum / totalWeight) * 10) / 10;
      setReviewForm((prev) => ({ ...prev, rating: computed }));
      toast.success(`Calculated overall score: ${computed}`);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedEval) return;

    const numericRating = parseFloat(Number(reviewForm.rating).toFixed(1));
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      toast.error('Please enter a valid rating between 1.0 and 5.0');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...reviewForm,
        rating: numericRating,
        kraRatings: (reviewForm.kraRatings || []).map((k) => ({
          ...k,
          score: parseFloat(Number(k.score || numericRating).toFixed(1)),
        })),
      };
      const res = await pmsApi.submitEvaluationReview(selectedEval.employeeId, payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Evaluation submitted successfully!');
        setSelectedEval(null);
        fetchEvaluations();
      }
    } catch (err) {
      console.error('Submit review error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter evaluations based on search query
  const filteredList = evaluations.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const u = item.user;
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.department?.toLowerCase().includes(query) ||
      u.designation?.toLowerCase().includes(query) ||
      u.employeeCode?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Scope Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <Users size={16} />
            <span>Performance Evaluations & Approval Flow</span>
          </div>
          <h2 className="mt-1 text-lg font-black text-slate-900 tracking-tight">
            {scope === 'team'
              ? "My Team's Evaluations"
              : scope === 'managers'
              ? 'Reporting Managers Evaluation'
              : scope === 'self'
              ? 'My Performance Scorecard'
              : 'All Company Employees'}
          </h2>
          <p className="text-xs text-slate-500">
            Sequential evaluation workflow: <span className="font-semibold text-slate-700">Reporting Manager</span> → <span className="font-semibold text-slate-700">HR Calibration</span> → <span className="font-semibold text-slate-700">Admin Sign-off</span>
          </p>
        </div>

        {/* Scope Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isHr) && (
            <>
              <button
                onClick={() => setScope('all')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  scope === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Users ({evaluations.length})
              </button>
              <button
                onClick={() => setScope('managers')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  scope === 'managers'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Evaluate Reporting Managers
              </button>
            </>
          )}

          {(isManager || isAdmin || isHr) && (
            <button
              onClick={() => setScope('team')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                scope === 'team'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              My Direct Team
            </button>
          )}

          <button
            onClick={() => setScope('self')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              scope === 'self'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            My Own Scorecard
          </button>
        </div>
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[280px] max-w-md flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, department, or role..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800">{filteredList.length}</strong> active members</span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Users size={40} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">No employees found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {scope === 'team'
              ? 'You do not currently have direct reports assigned to you in the user directory.'
              : 'No matching users found in the current selection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredList.map((item) => {
            const u = item.user;
            const score = item.ratings?.finalScore || item.ratings?.managerRating || 0;
            const hasRating = score > 0;
            const roundedScore = Math.round(score);

            const isEvaluatedByManager = Boolean(item.ratings?.managerRating);
            const isEvaluatedByHr = Boolean(item.ratings?.hrRating);
            const isEvaluatedByAdmin = Boolean(item.ratings?.adminRating);

            const canUserRateThisPerson =
              isAdmin ||
              isHr ||
              (item.reportingManager?._id && String(item.reportingManager._id) === String(user?._id));

            return (
              <div
                key={item.employeeId}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div>
                  {/* User Profile Info */}
                  <div className="flex items-start gap-3">
                    {u.profilePicture ? (
                      <img
                        src={u.profilePicture}
                        alt={u.name}
                        className="h-12 w-12 rounded-2xl object-cover ring-2 ring-slate-100"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-xs">
                        {u.name?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="truncate text-sm font-bold text-slate-900">{u.name}</h4>
                        {u.isManager && (
                          <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                            Manager
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">{u.designation} • {u.department}</p>
                      <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                    </div>
                  </div>

                  {/* Reporting Manager Info */}
                  {item.reportingManager && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                      <UserCheck size={13} className="text-slate-400" />
                      <span className="text-slate-400">Reports to:</span>
                      <strong className="truncate text-slate-800">{item.reportingManager.name}</strong>
                    </div>
                  )}

                  {/* Approval Workflow Pipeline Steps */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Approval Stage Progress
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold text-center">
                      <div
                        className={`rounded-lg py-1 px-1 border ${
                          isEvaluatedByManager
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        1. Manager {isEvaluatedByManager ? '✓' : '—'}
                      </div>
                      <div
                        className={`rounded-lg py-1 px-1 border ${
                          isEvaluatedByHr
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        2. HR {isEvaluatedByHr ? '✓' : '—'}
                      </div>
                      <div
                        className={`rounded-lg py-1 px-1 border ${
                          isEvaluatedByAdmin
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        3. Admin {isEvaluatedByAdmin ? '✓' : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Rating Card Display */}
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">Current Rating</span>
                      {hasRating ? (
                        <span className={`rounded-lg border px-2 py-0.5 text-xs font-black ${RATING_COLORS[roundedScore] || 'text-blue-600 bg-blue-50 border-blue-200'}`}>
                          ★ {score.toFixed(1)} / 5.0
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 italic">Not rated yet</span>
                      )}
                    </div>
                    {item.ratings?.managerComments ? (
                      <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-600 italic">
                        "{item.ratings.managerComments}"
                      </p>
                    ) : item.ratings?.adminComments ? (
                      <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-600 italic">
                        "{item.ratings.adminComments}"
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400">Awaiting review from manager</p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                  {canUserRateThisPerson ? (
                    <button
                      onClick={() => handleOpenReviewModal(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                    >
                      <Star size={13} />
                      <span>{hasRating ? 'Update Rating & Feedback' : 'Give Feedback & Rating'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenReviewModal(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <span>View Scorecard</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Evaluation & Rating Modal */}
      {selectedEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {selectedEval.user.profilePicture ? (
                  <img
                    src={selectedEval.user.profilePicture}
                    alt={selectedEval.user.name}
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                    {selectedEval.user.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedEval.user.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedEval.user.designation} • {selectedEval.user.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEval(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Evaluation Form */}
            <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
              {/* Level Selector for Admins */}
              {isAdmin && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <label className="block text-xs font-bold text-blue-900">Evaluation Role / Stage</label>
                  <select
                    value={reviewForm.level}
                    onChange={(e) => setReviewForm({ ...reviewForm, level: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="admin">Admin Final Sign-off (Publish Rating)</option>
                    <option value="hr">HR Evaluation & Calibration Stage</option>
                    <option value="manager">Reporting Manager Review Stage</option>
                  </select>
                </div>
              )}

              {/* Star Rating Picker */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Overall Performance Rating (1.0 to 5.0) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Score:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={reviewForm.rating}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setReviewForm({ ...reviewForm, rating: '' });
                          return;
                        }
                        const num = parseFloat(val);
                        setReviewForm({ ...reviewForm, rating: isNaN(num) ? val : num });
                      }}
                      onBlur={() => {
                        let num = parseFloat(reviewForm.rating);
                        if (isNaN(num) || num < 1) num = 1;
                        if (num > 5) num = 5;
                        setReviewForm({ ...reviewForm, rating: Math.round(num * 10) / 10 });
                      }}
                      className="w-16 rounded-xl border border-slate-300 px-2.5 py-1 text-center text-sm font-black text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      placeholder="4.5"
                    />
                    <span className="text-xs font-bold text-slate-500">/ 5.0</span>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const cur = Number(reviewForm.rating) || 0;
                      const fillPercent = Math.max(0, Math.min(100, Math.round((cur - (star - 1)) * 100)));
                      return (
                        <button
                          type="button"
                          key={star}
                          onClick={() => {
                            if (Number(reviewForm.rating) === star) {
                              setReviewForm({ ...reviewForm, rating: star - 0.5 });
                            } else {
                              setReviewForm({ ...reviewForm, rating: star });
                            }
                          }}
                          title={`Click for ${star} (click again for ${star - 0.5})`}
                          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition shadow-2xs"
                        >
                          {/* Empty star background */}
                          <Star size={20} className="text-slate-200" />
                          {/* Partial/Full filled star overlay */}
                          {fillPercent > 0 && (
                            <div
                              className="absolute inset-0 flex items-center justify-center overflow-hidden"
                              style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
                            >
                              <Star size={20} className="fill-amber-400 text-amber-500" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                    {Number(reviewForm.rating || 0).toFixed(1)} / 5 — {getRatingLabel(reviewForm.rating)}
                  </span>
                </div>

                {/* Quick Select Decimal Presets */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Presets:</span>
                  {[3.0, 3.5, 4.0, 4.2, 4.5, 4.7, 5.0].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setReviewForm({ ...reviewForm, rating: val })}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition border ${
                        Number(reviewForm.rating) === val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* KRAs Breakdown (if available) */}
              {selectedEval.kras && selectedEval.kras.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs font-bold text-slate-700">Rate Key Result Areas (KRAs)</label>
                      {selectedEval.user?.department && (
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {selectedEval.user.department}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={calculateOverallFromKras}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition"
                      title="Calculate weighted average from KRAs into Overall Rating"
                    >
                      <Sparkles size={12} />
                      Auto-calculate Overall
                    </button>
                  </div>
                  <div className="mt-2 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    {reviewForm.kraRatings.map((k, idx) => (
                      <div key={k.kraId} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-800">{k.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({k.weightage}%)</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* 1 to 5 integer buttons */}
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                type="button"
                                key={score}
                                onClick={() => {
                                  const updated = [...reviewForm.kraRatings];
                                  updated[idx].score = score;
                                  setReviewForm({ ...reviewForm, kraRatings: updated });
                                }}
                                className={`h-6 w-6 rounded-md text-[10px] font-bold transition ${
                                  Number(k.score) === score
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>

                          {/* Direct decimal input (e.g. 4.5, 4.7) */}
                          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={k.score}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...reviewForm.kraRatings];
                                if (val === '') {
                                  updated[idx].score = '';
                                } else {
                                  const num = parseFloat(val);
                                  updated[idx].score = isNaN(num) ? val : num;
                                }
                                setReviewForm({ ...reviewForm, kraRatings: updated });
                              }}
                              onBlur={() => {
                                const updated = [...reviewForm.kraRatings];
                                let num = parseFloat(updated[idx].score);
                                if (isNaN(num) || num < 1) num = 1;
                                if (num > 5) num = 5;
                                updated[idx].score = Math.round(num * 10) / 10;
                                setReviewForm({ ...reviewForm, kraRatings: updated });
                              }}
                              className="h-6 w-14 rounded-md border border-slate-300 bg-white px-1 text-center text-[11px] font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                              placeholder="4.5"
                              title="Enter exact decimal score (e.g. 4.5, 4.7)"
                            />
                            <span className="text-[10px] font-semibold text-slate-400">/ 5</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qualitative Strengths */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Key Strengths & Wins</label>
                <textarea
                  rows={2}
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                  placeholder="Highlights, successful projects, teamwork..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Areas of Improvement */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Areas for Improvement / Growth</label>
                <textarea
                  rows={2}
                  value={reviewForm.improvements}
                  onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                  placeholder="Growth areas, skills to develop, goals for next cycle..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Overall Feedback Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700">Overall Feedback & Comments *</label>
                <textarea
                  required
                  rows={3}
                  value={reviewForm.feedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                  placeholder="Comprehensive evaluation summary..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedEval(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{submitting ? 'Submitting...' : 'Save & Submit Rating'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
