import React, { useState } from 'react';
import {
  Award,
  Target,
  FileText,
  MessageSquare,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AppraisalReviews from '@/features/performance/components/AppraisalReviews';
import GoalsManagement from '@/features/performance/components/GoalsManagement';
import ContinuousFeedback from '@/features/performance/components/ContinuousFeedback';
import PipDevPlans from '@/features/performance/components/PipDevPlans';
import KraManagement from '@/features/performance/components/KraManagement';
import { useAuth } from '@/features/auth/context/AuthContext';
import { canAccessPms } from '@/config/accessPolicies';

export default function MySpacePerformance() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'appraisals';
  const canAccessWorkspace = canAccessPms(user);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/ess"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-1"
          >
            <ArrowLeft size={14} />
            <span>Back to My Space</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="text-blue-600" size={24} />
            <span>My Performance & Appraisals</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Track your goals, complete self-appraisals, review feedback, and manage your professional development.
          </p>
        </div>

        {canAccessWorkspace && (
          <Link
            to="/performance"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            Open Full PMS Workspace →
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-2xs">
        <button
          onClick={() => setSearchParams({ tab: 'appraisals' })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            currentTab === 'appraisals' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText size={14} />
          <span>My Appraisals</span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'goals' })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            currentTab === 'goals' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Target size={14} />
          <span>My Goals & OKRs</span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'feedback' })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            currentTab === 'feedback' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MessageSquare size={14} />
          <span>Feedback & Recognition</span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'growth' })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            currentTab === 'growth' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={14} />
          <span>My Development Plan</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {currentTab === 'appraisals' && <AppraisalReviews defaultScope="self" hideAdminTabs={true} />}
        {currentTab === 'goals' && <GoalsManagement />}
        {currentTab === 'feedback' && <ContinuousFeedback />}
        {currentTab === 'growth' && <PipDevPlans />}
      </div>
    </div>
  );
}
