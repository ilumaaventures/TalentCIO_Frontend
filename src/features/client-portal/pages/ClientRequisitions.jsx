import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/apiClient';
import { 
  Search, 
  Briefcase,
  ArrowRight 
} from 'lucide-react';

const ClientRequisitions = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequisitions = async () => {
      try {
        setLoading(true);
        const params = {};
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;

        const res = await api.get('/client-portal/requisitions', { params });
        setRequisitions(res.data || []);
      } catch (err) {
        console.error('Failed to fetch client requisitions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequisitions();
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Requisitions</h1>
          <p className="text-sm text-slate-500">Track and review positions actively being fulfilled</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or ID..."
              className="pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 text-sm border border-slate-300 rounded-lg bg-white shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Approved">Approved / Active</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Requisitions Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : requisitions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Briefcase className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No requisitions found</p>
          <p className="text-xs text-slate-400 mt-1">Try modifying your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requisitions.map((req) => (
            <div
              key={req._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {req.requestId}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    req.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                    'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                  {req.roleDetails?.title || 'Untitled Position'}
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  {req.roleDetails?.department || 'Department'} • {req.employmentDetails?.employmentType || 'Full-time'}
                </p>

                {req.requirements?.location && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Location: {req.requirements.location}
                  </p>
                )}

                {/* Candidate funnel badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-1.5 px-1">
                    <div className="text-xs font-bold text-slate-800">{req.totalCandidates || 0}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Presented</div>
                  </div>
                  <div className="bg-indigo-50 rounded-lg py-1.5 px-1">
                    <div className="text-xs font-bold text-indigo-700">{req.shortlistedCandidates || 0}</div>
                    <div className="text-[10px] text-indigo-600 font-medium">Shortlisted</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg py-1.5 px-1">
                    <div className="text-xs font-bold text-purple-700">{req.interviewingCandidates || 0}</div>
                    <div className="text-[10px] text-purple-600 font-medium">Interviewing</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Openings: <strong className="text-slate-700">{req.hiringDetails?.openPositions ?? 1}</strong>
                </span>
                <Link
                  to={`/client-portal/requisitions/${req._id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  View Pipeline
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientRequisitions;
