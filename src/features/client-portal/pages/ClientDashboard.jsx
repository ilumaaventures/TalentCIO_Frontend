import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/apiClient';
import { useClientAuth } from '../context/ClientAuthContext';
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  Calendar,
  ArrowRight 
} from 'lucide-react';

const ClientDashboard = () => {
  const { clientUser, client } = useClientAuth();
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
          <div className="p-8 text-center text-sm text-slate-500">
            No active requisitions found.
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
