import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/apiClient';
import { useClientAuth } from '../context/ClientAuthContext';
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Calendar,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';

const ClientDashboard = () => {
  const { clientUser, client, agency } = useClientAuth();
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(() => {
    return localStorage.getItem('talentcio_client_hide_welcome') !== 'true';
  });
  const [stats, setStats] = useState({
    activeRequisitions: 0,
    totalVisibleCandidates: 0,
    shortlistedCandidates: 0,
    upcomingInterviews: 0
  });
  const [recentRequisitions, setRecentRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [dashRes, reqsRes] = await Promise.all([
          api.get('/client-portal/dashboard'),
          api.get('/client-portal/requisitions')
        ]);
        setStats(dashRes.data);
        setRecentRequisitions((reqsRes.data || []).slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const cards = [
    { name: 'Active Requisitions', value: stats.activeRequisitions, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Total Candidates Presented', value: stats.totalVisibleCandidates, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Shortlisted Candidates', value: stats.shortlistedCandidates, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Upcoming Interviews', value: stats.upcomingInterviews, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* First-Run Welcome Guide */}
      {showWelcomeGuide && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-slate-50 border border-indigo-100/80 rounded-2xl p-6 relative shadow-2xs">
          <button
            onClick={() => {
              setShowWelcomeGuide(false);
              localStorage.setItem('talentcio_client_hide_welcome', 'true');
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
            title="Dismiss guide"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Welcome to your {agency?.name ? `${agency.name} ` : ''}Client Recruitment Portal
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                This secure portal gives your hiring team direct visibility into candidate submissions, scheduled interview rounds, and real-time hiring progress.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3.5 border-t border-indigo-100/70">
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">1</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Review Candidates</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Explore phase-gated candidate profiles, credentials, and resumes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">2</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Evaluate Rounds</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Submit interview ratings, feedback, and skill evaluations directly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">3</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Submit Decisions</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Shortlist or select candidates to keep your agency partner aligned.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {clientUser?.firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your candidate pipeline and interviews for <span className="font-semibold text-slate-700">{client?.name}</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/client-portal/requisitions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shadow-xs transition-colors"
          >
            View Requisitions
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/client-portal/interviews"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-xs transition-colors"
          >
            My Interviews
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div key={card.name} className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex items-center gap-4">
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.name}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Requisitions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Requisitions</h2>
            <p className="text-xs text-slate-500">Currently open positions being sourced by your agency</p>
          </div>
          <Link
            to="/client-portal/requisitions"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentRequisitions.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-bold">No active requisitions shared yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Your recruitment partner will grant access to relevant requisition pipelines as soon as candidates are ready for review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentRequisitions.map((req) => (
              <Link
                key={req._id}
                to={`/client-portal/requisitions/${req._id}`}
                className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group block"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {req.roleDetails?.title || 'Untitled Role'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {req.requestId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{req.roleDetails?.department || 'General'}</span>
                    <span>•</span>
                    <span>{req.employmentDetails?.employmentType || 'Full-time'}</span>
                    <span>•</span>
                    <span>Openings: {req.hiringDetails?.openPositions ?? 1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {req.totalCandidates || 0} Candidates
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {req.shortlistedCandidates || 0} Shortlisted
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
