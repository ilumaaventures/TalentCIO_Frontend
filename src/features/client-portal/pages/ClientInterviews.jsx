import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/apiClient';
import { 
  Calendar, 
  Star, 
  FileText, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ArrowUpDown,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClientInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'scheduled', 'pendingFeedback', 'passed', 'evaluated'
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'name-asc', 'rating-desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Evaluation Modal State
  const [evalModal, setEvalModal] = useState({ open: false, interview: null });
  const [rating, setRating] = useState(7);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('Passed');
  const [submitting, setSubmitting] = useState(false);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/client-portal/interviews/my');
      setInterviews(res.data || []);
    } catch (err) {
      console.error('Failed to load interviews:', err);
      toast.error('Failed to load interview schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  // Compute status summary counts
  const statusCounts = useMemo(() => {
    const counts = {
      all: interviews.length,
      scheduled: 0,
      pendingFeedback: 0,
      passed: 0,
      evaluated: 0
    };

    interviews.forEach(item => {
      if (item.status === 'Scheduled') counts.scheduled++;
      if (item.status === 'Passed' || item.status === 'Shortlisted') counts.passed++;
      if (item.clientFeedback || item.clientRating) {
        counts.evaluated++;
      } else {
        counts.pendingFeedback++;
      }
    });

    return counts;
  }, [interviews]);

  // Filter & Sort interviews
  const filteredInterviews = useMemo(() => {
    let result = [...interviews];

    // 1. Tab filter
    if (activeTab === 'scheduled') {
      result = result.filter(item => item.status === 'Scheduled');
    } else if (activeTab === 'pendingFeedback') {
      result = result.filter(item => !item.clientFeedback && !item.clientRating);
    } else if (activeTab === 'passed') {
      result = result.filter(item => item.status === 'Passed' || item.status === 'Shortlisted');
    } else if (activeTab === 'evaluated') {
      result = result.filter(item => Boolean(item.clientFeedback || item.clientRating));
    }

    // 2. Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        (item.candidateName && item.candidateName.toLowerCase().includes(q)) ||
        (item.requisitionTitle && item.requisitionTitle.toLowerCase().includes(q)) ||
        (item.requisitionCode && item.requisitionCode.toLowerCase().includes(q)) ||
        (item.levelName && item.levelName.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.scheduledDate || 0) - new Date(a.scheduledDate || 0);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0);
      }
      if (sortBy === 'name-asc') {
        return String(a.candidateName || '').localeCompare(String(b.candidateName || ''));
      }
      if (sortBy === 'name-desc') {
        return String(b.candidateName || '').localeCompare(String(a.candidateName || ''));
      }
      if (sortBy === 'rating-desc') {
        return (b.clientRating || 0) - (a.clientRating || 0);
      }
      return 0;
    });

    return result;
  }, [interviews, activeTab, searchTerm, sortBy]);

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, pageSize]);

  // Pagination calculations
  const totalItems = filteredInterviews.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedInterviews = filteredInterviews.slice(startIndex, endIndex);

  // Generate pagination button range
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  }, [safeCurrentPage, totalPages]);

  const openEvaluation = (interview) => {
    setRating(interview.clientRating || 7);
    setFeedback(interview.clientFeedback || '');
    setStatus(interview.status || 'Passed');
    setEvalModal({ open: true, interview });
  };

  const handleEvaluationSubmit = async (e) => {
    e.preventDefault();
    if (!evalModal.interview) return;

    try {
      setSubmitting(true);
      const { candidateId, roundId } = evalModal.interview;
      await api.patch(`/client-portal/candidates/${candidateId}/rounds/${roundId}/evaluate`, {
        rating: Number(rating),
        feedback,
        status
      });

      toast.success('Evaluation submitted successfully');
      setEvalModal({ open: false, interview: null });
      fetchInterviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setActiveTab('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Interviews</h1>
          <p className="text-sm text-slate-500">Upcoming and completed interviews assigned to your panel</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInterviews}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80">
        {[
          { key: 'all', label: 'All Interviews', count: statusCounts.all },
          { key: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled },
          { key: 'pendingFeedback', label: 'Pending Feedback', count: statusCounts.pendingFeedback },
          { key: 'passed', label: 'Passed / Shortlisted', count: statusCounts.passed },
          { key: 'evaluated', label: 'Evaluated', count: statusCounts.evaluated }
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                isActive ? 'bg-indigo-200/70 text-indigo-900' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Sort Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate, requisition, role..."
            className="w-full pl-9.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Page Limit controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="date-desc">Newest Scheduled</option>
              <option value="date-asc">Oldest Scheduled</option>
              <option value="name-asc">Candidate (A - Z)</option>
              <option value="name-desc">Candidate (Z - A)</option>
              <option value="rating-desc">Rating (Highest First)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-700 font-bold">No assigned interviews</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When recruiters schedule interviews and assign your panel members, rounds will appear here.
          </p>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Filter className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-700 font-bold">No matching interviews found</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            No interviews match your current search query and filter criteria.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedInterviews.map((item) => (
            <div
              key={`${item.candidateId}-${item.roundId}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 hover:shadow-xs transition-all"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">
                    {item.candidateName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                    {item.levelName}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    item.status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    item.status === 'Failed' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    item.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    item.status === 'Shortlisted' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span>Requisition: <strong className="text-slate-700 font-semibold">{item.requisitionTitle || 'General'}</strong> ({item.requisitionCode})</span>
                  {item.scheduledDate && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(item.scheduledDate).toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(item.scheduledDate).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </>
                  )}
                </div>

                {item.clientFeedback && (
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2">
                    <span className="font-bold text-slate-800 shrink-0">Feedback:</span>
                    <span className="text-slate-600">{item.clientFeedback}</span>
                    {item.clientRating && (
                      <span className="ml-auto flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {item.clientRating}/10
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
                <Link
                  to={`/client-portal/candidates/${item.candidateId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Profile
                </Link>

                <button
                  onClick={() => openEvaluation(item)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs transition-colors"
                >
                  <Star className="h-3.5 w-3.5" />
                  {item.clientFeedback ? 'Update Feedback' : 'Submit Evaluation'}
                </button>
              </div>
            </div>
          ))}

          {/* Bottom Pagination Controls */}
          {totalItems > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              {/* Entries count description & per-page dropdown */}
              <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>per page</span>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <div>
                  Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to <span className="font-bold text-slate-800">{endIndex}</span> of <span className="font-bold text-slate-800">{totalItems}</span> interviews
                </div>
              </div>

              {/* Page navigation buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {paginationRange.map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 text-xs font-bold text-slate-400 select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === safeCurrentPage;
                    return (
                      <button
                        key={`page-${p}`}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          isCurrent
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evaluation Modal */}
      {evalModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Evaluate Round: {evalModal.interview?.levelName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Candidate: <strong className="text-slate-800 font-semibold">{evalModal.interview?.candidateName}</strong>
                </p>
              </div>
              <button
                onClick={() => setEvalModal({ open: false, interview: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEvaluationSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Overall Rating (1 - 10)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-base font-extrabold text-indigo-600 w-8 text-center">{rating}/10</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Round Outcome
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Interviewer Feedback & Notes
                </label>
                <textarea
                  rows={4}
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Summarize key competencies, cultural alignment, strengths and areas of improvement..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvalModal({ open: false, interview: null })}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Submit Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientInterviews;
