import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Mail,
  Phone,
  Copy,
  Check,
  Trash2,
  RotateCw,
  ExternalLink,
  Shield,
  Users,
  Eye,
  EyeOff,
  FileText,
  Download,
  Lock,
  Unlock,
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  UserCheck,
  Settings,
  Plus,
  HelpCircle,
  Loader,
  Sparkles,
  CheckSquare,
  Calendar,
  Filter
} from 'lucide-react';

const ClientPortalUsersTab = ({ clientId, clientName }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reqIdParam = searchParams.get('reqId');

  // Navigation
  const [activeSubTab, setActiveSubTab] = useState('requisitions'); // 'requisitions' | 'policy' | 'users'

  // Data states
  const [users, setUsers] = useState([]);
  const [sharedData, setSharedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search for requisitions list
  const [reqSearchQuery, setReqSearchQuery] = useState('');

  // Filters for candidate details page
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateStageFilter, setCandidateStageFilter] = useState('all');
  const [candidateContactFilter, setCandidateContactFilter] = useState('all'); // 'all' | 'masked' | 'shared'
  const [candidateResumeFilter, setCandidateResumeFilter] = useState('all'); // 'all' | 'hasResume' | 'downloadAllowed' | 'gated'
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageSize, setCandidatePageSize] = useState(10);

  // Requisition Phase & Privacy Configuration Modal state
  const [configModalReq, setConfigModalReq] = useState(null);
  const [configVisibility, setConfigVisibility] = useState({
    enabled: true,
    visibleFromPhaseIndex: 0,
    candidateFilter: 'all', // 'all' | 'shortlistedOnly' | 'interviewScheduled' | 'explicitOnly'
    onlyShortlisted: false,
    hideRejected: false,
    hideOnHold: false,
    requireClientInterview: false,
    maskCandidateContact: true,
    maskCompensation: true,
    allowResumeDownload: false,
    allowClientDecision: true,
    allowClientFeedback: true,
    allowClientScheduling: false,
    showInternalNotes: false
  });
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [showSharingGuide, setShowSharingGuide] = useState(false);

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'ClientViewer',
    isPrimaryContact: false
  });

  // Share link modal after invite
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [usersRes, sharedRes] = await Promise.all([
        api.get(`/ta/clients/${clientId}/users`),
        api.get(`/ta/clients/${clientId}/shared-summary`).catch(err => {
          console.warn('Could not fetch shared summary:', err);
          return { data: null };
        })
      ]);

      setUsers(usersRes.data || []);
      if (sharedRes?.data) {
        setSharedData(sharedRes.data);
      }
    } catch (err) {
      console.error('Failed to load client portal data:', err);
      toast.error('Failed to load client portal data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email) {
      toast.error('First name and email are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/ta/clients/${clientId}/users/invite`, formData);
      toast.success('Invitation sent successfully');
      setCreatedInvite(res.data.inviteLink);
      setIsInviteOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'ClientViewer',
        isPrimaryContact: false
      });
      fetchAllData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite client user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (userId) => {
    try {
      const res = await api.post(`/ta/clients/${clientId}/users/${userId}/resend-invite`);
      toast.success('Invitation reminder sent');
      if (res.data.inviteLink) {
        setCreatedInvite(res.data.inviteLink);
      }
      fetchAllData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invite');
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.patch(`/ta/clients/${clientId}/users/${user._id}`, { status: nextStatus });
      toast.success(`User set to ${nextStatus}`);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status: nextStatus } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this client portal user?')) return;

    try {
      await api.delete(`/ta/clients/${clientId}/users/${userId}`);
      toast.success('Client portal user removed');
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const portalLoginUrl = typeof window !== 'undefined' ? `${window.location.origin}/client-portal/login` : '';

  // Extract shared candidates and summaries
  const sharedCandidates = useMemo(() => sharedData?.sharedCandidates || [], [sharedData]);
  const requisitions = useMemo(() => sharedData?.requisitions || [], [sharedData]);
  const summary = sharedData?.summary || {
    totalRequisitions: 0,
    totalSharedCandidates: 0,
    totalResumesAvailable: 0,
    contactsMaskedCount: 0,
    contactsVisibleCount: 0,
    resumesDownloadableCount: 0,
    resumesRestrictedCount: 0
  };
  const policy = sharedData?.policy || {
    maskCandidateContact: true,
    maskCompensation: true,
    allowResumeDownload: false,
    allowClientDecision: true
  };

  // Group candidates under requisitions
  const groupedRequisitions = useMemo(() => {
    const map = new Map();
    requisitions.forEach(r => {
      map.set(String(r._id), {
        ...r,
        candidates: []
      });
    });

    const unmappedCandidates = [];

    sharedCandidates.forEach(c => {
      const reqId = String(c.requisition?._id || '');
      if (map.has(reqId)) {
        map.get(reqId).candidates.push(c);
      } else {
        unmappedCandidates.push(c);
      }
    });

    const result = Array.from(map.values());

    if (unmappedCandidates.length > 0) {
      result.push({
        _id: 'other',
        requestId: 'GENERAL',
        title: 'Other / Direct Client Shares',
        department: 'General',
        status: 'Active',
        clientVisibility: {},
        candidates: unmappedCandidates
      });
    }

    return result;
  }, [requisitions, sharedCandidates]);

  // Filtered requisitions for list view
  const filteredRequisitions = useMemo(() => {
    if (!reqSearchQuery.trim()) return groupedRequisitions;
    const q = reqSearchQuery.toLowerCase().trim();
    return groupedRequisitions.filter(r => {
      return (
        r.title?.toLowerCase().includes(q) ||
        r.requestId?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q)
      );
    });
  }, [groupedRequisitions, reqSearchQuery]);

  // Navigation handlers for Requisition -> Candidates Page
  const handleOpenRequisition = (reqId) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('reqId', String(reqId));
      return next;
    });
    setCandidateSearchQuery('');
    setCandidatePage(1);
  };

  const handleBackToRequisitions = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('reqId');
      return next;
    });
    setCandidateSearchQuery('');
    setCandidatePage(1);
  };

  const handleOpenConfigModal = (e, req) => {
    if (e) e.stopPropagation();
    const vis = req.clientVisibility || {};
    setConfigModalReq(req);
    setConfigVisibility({
      enabled: vis.enabled !== false,
      visibleFromPhaseIndex: Number(vis.visibleFromPhaseIndex ?? 0),
      candidateFilter: vis.candidateFilter || (vis.onlyShortlisted ? 'shortlistedOnly' : 'all'),
      onlyShortlisted: Boolean(vis.onlyShortlisted || vis.candidateFilter === 'shortlistedOnly'),
      hideRejected: Boolean(vis.hideRejected),
      hideOnHold: Boolean(vis.hideOnHold),
      requireClientInterview: Boolean(vis.requireClientInterview),
      maskCandidateContact: vis.maskCandidateContact !== false,
      maskCompensation: vis.maskCompensation !== false,
      allowResumeDownload: Boolean(vis.allowResumeDownload),
      allowClientDecision: vis.allowClientDecision !== false,
      allowClientFeedback: vis.allowClientFeedback !== false,
      allowClientScheduling: Boolean(vis.allowClientScheduling),
      showInternalNotes: Boolean(vis.showInternalNotes)
    });
  };

  const handleSaveVisibilitySettings = async (e) => {
    if (e) e.preventDefault();
    if (!configModalReq || !configModalReq._id || configModalReq._id === 'other') {
      toast.error('Cannot configure visibility on direct unmapped shares');
      return;
    }
    try {
      setSavingVisibility(true);
      const payload = {
        ...configVisibility,
        onlyShortlisted: configVisibility.candidateFilter === 'shortlistedOnly' || Boolean(configVisibility.onlyShortlisted)
      };
      await api.put(`/ta/hiring-request/${configModalReq._id}`, {
        clientVisibility: payload
      });
      toast.success('Requisition visibility & phase access rules saved');
      setConfigModalReq(null);
      fetchAllData(true);
    } catch (err) {
      console.error('Failed to update requisition visibility:', err);
      toast.error(err.response?.data?.message || 'Failed to update visibility settings');
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleOpenInPipeline = (e, reqId) => {
    if (e) e.stopPropagation();
    window.open(`/ta/view/${reqId}?tab=applications`, '_blank');
  };

  const handleToggleRequisitionAccess = async (e, req, newStatus) => {
    if (e) e.stopPropagation();
    if (!req?._id || req._id === 'other') return;
    try {
      const currentVis = req.clientVisibility || {};
      await api.put(`/ta/hiring-request/${req._id}`, {
        clientVisibility: {
          ...currentVis,
          enabled: newStatus
        }
      });
      toast.success(newStatus ? 'Client portal access enabled' : 'Requisition unshared from client portal');
      if (!newStatus && reqIdParam && String(reqIdParam) === String(req._id)) {
        handleBackToRequisitions();
      }
      fetchAllData(true);
    } catch (err) {
      console.error('Failed to toggle requisition client access:', err);
      toast.error(err.response?.data?.message || 'Failed to update access');
    }
  };

  const handleHideCandidateFromClient = async (candidateId, candidateName) => {
    try {
      await api.put(`/ta/candidates/${candidateId}`, {
        hiddenFromClient: true,
        profileShared: false
      });
      toast.success(`${candidateName || 'Candidate'} unshared from client portal`);
      fetchAllData(true);
    } catch (err) {
      console.error('Failed to hide candidate:', err);
      toast.error(err.response?.data?.message || 'Failed to remove candidate from client');
    }
  };

  // Active Requisition for dedicated candidate page
  const activeRequisition = useMemo(() => {
    if (!reqIdParam) return null;
    return groupedRequisitions.find(r => String(r._id) === String(reqIdParam)) || null;
  }, [groupedRequisitions, reqIdParam]);

  // Filtered candidates for active requisition's candidates page
  const activeReqCandidates = useMemo(() => {
    if (!activeRequisition) return [];
    const candidates = activeRequisition.candidates || [];

    return candidates.filter(c => {
      // Search
      if (candidateSearchQuery.trim()) {
        const q = candidateSearchQuery.toLowerCase().trim();
        const matchesName = c.candidateName?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        const matchesPhone = c.mobile?.toLowerCase().includes(q);
        const matchesCompany = c.currentCompany?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesCompany) return false;
      }

      // Stage
      if (candidateStageFilter !== 'all') {
        if (c.status !== candidateStageFilter) return false;
      }

      // Contact visibility
      if (candidateContactFilter === 'masked' && !c.isContactMasked) return false;
      if (candidateContactFilter === 'shared' && c.isContactMasked) return false;

      // Resume
      if (candidateResumeFilter === 'hasResume' && !c.hasResume) return false;
      if (candidateResumeFilter === 'downloadAllowed' && (!c.hasResume || !c.isResumeDownloadAllowed)) return false;
      if (candidateResumeFilter === 'gated' && (!c.hasResume || c.isResumeDownloadAllowed)) return false;

      return true;
    });
  }, [activeRequisition, candidateSearchQuery, candidateStageFilter, candidateContactFilter, candidateResumeFilter]);

  // Paginated candidates for active requisition
  const paginatedCandidates = useMemo(() => {
    const startIndex = (candidatePage - 1) * candidatePageSize;
    return activeReqCandidates.slice(startIndex, startIndex + candidatePageSize);
  }, [activeReqCandidates, candidatePage, candidatePageSize]);

  const candidateTotalPages = Math.ceil(activeReqCandidates.length / candidatePageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900">Client Portal & Shared Engagements</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {users.length} Authorized Users
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              {summary.totalSharedCandidates} Shared Profiles
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {summary.totalRequisitions} Requisitions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitor all requisitions and candidates accessible to <strong>{clientName}</strong>, configure privacy guardrails, and manage portal stakeholders.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-fit">
            <span>Portal URL:</span>
            <code className="font-mono text-indigo-600 font-semibold">{portalLoginUrl}</code>
            <button
              onClick={() => handleCopyLink(portalLoginUrl)}
              className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Copy Portal URL"
            >
              <Copy size={13} />
            </button>
            <a
              href="/client-portal/login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-indigo-600 ml-1 transition-colors"
              title="Open Portal in New Tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAllData(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Refresh All Portal Data"
          >
            <RotateCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus size={15} />
            Invite Client User
          </button>
        </div>
      </div>

      {/* KPI Policy & Access Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Shared Profiles */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Shared Profiles</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{summary.totalSharedCandidates}</span>
            <span className="text-xs text-slate-500 ml-2">Candidates</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Linked Requisitions</span>
            <span className="font-semibold text-slate-800">{summary.totalRequisitions}</span>
          </div>
        </div>

        {/* Card 2: Contact Privacy Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Candidate Contact Info</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              summary.contactsMaskedCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {summary.contactsMaskedCount > 0 ? <Lock size={16} /> : <Unlock size={16} />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {summary.contactsMaskedCount > 0 ? 'Protected' : 'Full Access'}
            </span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-sm ${
              summary.contactsMaskedCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {summary.contactsMaskedCount} Masked
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Full Contacts Visible:</span>
            <span className="font-semibold text-slate-800">{summary.contactsVisibleCount}</span>
          </div>
        </div>

        {/* Card 3: Resume Download Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Resume Access</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{summary.totalResumesAvailable}</span>
            <span className="text-xs text-slate-500">Resumes Online</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Client Downloads:</span>
            <span className={`font-semibold ${summary.resumesDownloadableCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {summary.resumesDownloadableCount > 0 ? `${summary.resumesDownloadableCount} Allowed` : 'Restricted (Gated)'}
            </span>
          </div>
        </div>

        {/* Card 4: Portal Stakeholders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Portal Users</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{users.length}</span>
            <span className="text-xs text-slate-500">Authorized Users</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Active Logins:</span>
            <span className="font-semibold text-emerald-600">
              {users.filter(u => u.status === 'Active').length} Active
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-6 pt-3 gap-8 shadow-2xs">
        <button
          onClick={() => {
            setActiveSubTab('requisitions');
            handleBackToRequisitions();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'requisitions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Briefcase size={16} />
          Shared Requisitions
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeSubTab === 'requisitions' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {summary.totalRequisitions}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('policy');
            handleBackToRequisitions();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'policy'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Shield size={16} />
          What Client Can Access & Policies
        </button>

        <button
          onClick={() => {
            setActiveSubTab('users');
            handleBackToRequisitions();
          }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users size={16} />
          Authorized Portal Stakeholders
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeSubTab === 'users' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {users.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: REQUISITIONS VIEW OR DEDICATED CANDIDATES PAGE */}
      {/* ========================================================================= */}
      {activeSubTab === 'requisitions' && (
        <>
          {/* A. DEDICATED PAGE: CANDIDATES FOR SELECTED REQUISITION */}
          {activeRequisition ? (
            <div className="space-y-4">
              {/* Back Button & Requisition Banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToRequisitions}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer shadow-2xs"
                    >
                      <ArrowLeft size={13} />
                      Back to Requisitions
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeRequisition.title}
                        </h3>
                        <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {activeRequisition.requestId}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {activeRequisition.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Client: <strong className="text-slate-600">{clientName}</strong>
                        {activeRequisition.department && ` • Department: ${activeRequisition.department}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {String(activeRequisition._id) !== 'other' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleOpenConfigModal(e, activeRequisition)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Settings size={12} />
                          Configure Phase & Rules
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenInPipeline(e, activeRequisition._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs"
                          title="Open Requisition in TA to add candidates or advance phases"
                        >
                          <ExternalLink size={12} />
                          Manage in TA Pipeline
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleToggleRequisitionAccess(e, activeRequisition, false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs"
                          title="Unshare this requisition from client portal"
                        >
                          <EyeOff size={12} />
                          Unshare Requisition
                        </button>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <UserCheck size={13} />
                      {activeRequisition.candidates?.length || 0} Candidates Shared
                    </span>
                  </div>
                </div>

                {/* Requisition Policy Guardrails Strip */}
                <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Rules:</span>

                  {activeRequisition.clientVisibility?.candidateFilter === 'shortlistedOnly' || activeRequisition.clientVisibility?.onlyShortlisted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <CheckCircle2 size={11} /> Phase {(Number(activeRequisition.clientVisibility?.visibleFromPhaseIndex) || 0) + 1} Shortlisted Only
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Phase {(Number(activeRequisition.clientVisibility?.visibleFromPhaseIndex) || 0) + 1} Visible
                    </span>
                  )}

                  {activeRequisition.clientVisibility?.maskCandidateContact !== false ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      <Lock size={11} /> Contact Details Masked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Unlock size={11} /> Contact Details Visible
                    </span>
                  )}

                  {activeRequisition.clientVisibility?.allowResumeDownload ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Download size={11} /> Resume Download Allowed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <Shield size={11} /> Resume Download Gated
                    </span>
                  )}

                  {activeRequisition.clientVisibility?.maskCompensation !== false ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <Lock size={10} /> CTC Concealed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Unlock size={10} /> CTC Shared
                    </span>
                  )}
                </div>
              </div>

              {/* Candidates Table Container */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
                {/* Search & Filters */}
                <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto flex-1 max-w-2xl">
                    {/* Search */}
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={candidateSearchQuery}
                        onChange={(e) => { setCandidateSearchQuery(e.target.value); setCandidatePage(1); }}
                        placeholder="Search candidate, email, phone..."
                        className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    {/* Stage */}
                    <div>
                      <select
                        value={candidateStageFilter}
                        onChange={(e) => { setCandidateStageFilter(e.target.value); setCandidatePage(1); }}
                        className="w-full py-1 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-700"
                      >
                        <option value="all">All Stages</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Profile Shared">Profile Shared</option>
                        <option value="In Interview">In Interview</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Selected">Selected</option>
                        <option value="Offer Released">Offer Released</option>
                      </select>
                    </div>

                    {/* Resume Filter */}
                    <div>
                      <select
                        value={candidateResumeFilter}
                        onChange={(e) => { setCandidateResumeFilter(e.target.value); setCandidatePage(1); }}
                        className="w-full py-1 px-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-700"
                      >
                        <option value="all">All Resumes</option>
                        <option value="hasResume">Resume Uploaded</option>
                        <option value="downloadAllowed">Download Allowed</option>
                        <option value="gated">Download Gated</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
                    Showing <strong className="text-slate-800">{activeReqCandidates.length}</strong> of {activeRequisition.candidates?.length || 0}
                  </div>
                </div>


                {/* Candidate Table */}
                {activeReqCandidates.length === 0 ? (
                  <div className="p-12 text-center">
                    <UserCheck size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No candidates match your filters</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {candidateSearchQuery || candidateStageFilter !== 'all' || candidateResumeFilter !== 'all'
                        ? 'Try adjusting your search query or stage filters above.'
                        : 'No candidates have been shared under this requisition yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2">Candidate</th>
                          <th className="px-3 py-2">Pipeline Stage</th>
                          <th className="px-3 py-2">Contact Details & Client Privacy</th>
                          <th className="px-3 py-2">Resume Status</th>
                          <th className="px-3 py-2">Sharing Trigger</th>
                          <th className="px-3 py-2">Client Decision</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {paginatedCandidates.map((c) => (
                          <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Candidate */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {c.candidateName?.[0] || 'C'}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-xs leading-tight">
                                    {c.candidateName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    {c.currentCompany ? `${c.currentCompany} • ` : ''}
                                    {c.totalExperience ? `${c.totalExperience} yrs exp` : 'Fresher / N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Pipeline Stage */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                {c.status || 'Shared'}
                              </span>
                            </td>

                            {/* Contact Details & Privacy */}
                            <td className="px-3 py-2">
                              <div className="space-y-0.5">
                                {/* Actual recruiter view */}
                                <div className="text-xs text-slate-700 flex items-center gap-2 flex-wrap">
                                  <span className="flex items-center gap-1 font-mono text-[11px]">
                                    <Mail size={11} className="text-slate-400 shrink-0" /> {c.email}
                                  </span>
                                  {c.mobile && (
                                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                      <Phone size={11} className="text-slate-400 shrink-0" /> {c.mobile}
                                    </span>
                                  )}
                                </div>

                                {/* Client visibility indicator */}
                                <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                                  {c.isContactMasked ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                      <Lock size={9} /> Masked: {c.maskedEmail} {c.maskedPhone ? `• ${c.maskedPhone}` : ''}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <Unlock size={9} /> Full Contact Visible
                                    </span>
                                  )}

                                  {/* Compensation badge */}
                                  {c.isCompensationMasked ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                      <Lock size={8} /> CTC Masked
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <Unlock size={8} /> CTC Shared
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Resume Status */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {c.hasResume ? (
                                  <>
                                    <a
                                      href={c.resumeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                                      title="Open Candidate Resume"
                                    >
                                      <FileText size={11} /> View Resume
                                    </a>

                                    {c.isResumeDownloadAllowed ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100" title="Client portal users can download this raw resume">
                                        <Download size={9} /> Allowed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100" title="Client portal users cannot download raw resume">
                                        <Shield size={9} /> Gated
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No resume</span>
                                )}
                              </div>
                            </td>

                            {/* Sharing Trigger */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                c.sharedMechanism === 'Explicitly Shared'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                  : c.sharedMechanism === 'Client Interview'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {c.sharedMechanism}
                              </span>
                            </td>

                            {/* Client Decision */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.phase2Decision === 'Selected' || c.phase2Decision === 'Shortlisted'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : c.phase2Decision === 'Rejected'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : c.phase2Decision === 'On Hold'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {c.phase2Decision || 'Pending Review'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleHideCandidateFromClient(c._id, c.candidateName)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                                  title="Unshare/Hide this candidate from client portal"
                                >
                                  <EyeOff size={10} />
                                  Unshare
                                </button>
                                {activeRequisition._id !== 'other' && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(`/ta/hiring-request/${activeRequisition._id}/candidate/${c._id}/view`, '_blank')}
                                    className="inline-flex items-center gap-1 p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors cursor-pointer"
                                    title="Open candidate in TA"
                                  >
                                    <ExternalLink size={11} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>


                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Rows per page:</span>
                        <select
                          value={candidatePageSize}
                          onChange={(e) => { setCandidatePageSize(Number(e.target.value)); setCandidatePage(1); }}
                          className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-700"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Page {candidatePage} of {candidateTotalPages}</span>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={candidatePage <= 1}
                            onClick={() => setCandidatePage(p => p - 1)}
                            className="px-2.5 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Prev
                          </button>
                          <button
                            disabled={candidatePage >= candidateTotalPages}
                            onClick={() => setCandidatePage(p => p + 1)}
                            className="px-2.5 py-1 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* B. REQUISITIONS ONLY VIEW */
            <div className="space-y-4">
              {/* Header & Requisition Search */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Shared Requisitions for {clientName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a requisition below to view the candidates shared with this client, their resume access, and contact privacy.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  <div className="w-full sm:w-60 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={reqSearchQuery}
                      onChange={(e) => setReqSearchQuery(e.target.value)}
                      placeholder="Search job title, ID..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSharingGuide(!showSharingGuide)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <HelpCircle size={13} className="text-indigo-600" />
                    {showSharingGuide ? 'Hide Guide' : 'How Sharing Works'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/ta/create-request')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus size={13} />
                    New Requisition
                  </button>
                </div>
              </div>

              {/* Guide Card (Collapsible) */}
              {showSharingGuide && (
                <div className="bg-linear-to-r from-indigo-50/70 via-sky-50/50 to-white rounded-xl border border-indigo-100 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                        <Info size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">
                        How Requisition & Candidate Sharing Works in TalentCIO
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowSharingGuide(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                    <div className="bg-white/80 rounded-lg p-3 border border-indigo-50 space-y-1">
                      <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                        Share a Requisition
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        When creating or editing a requisition in Talent Acquisition, assign it to <strong>{clientName}</strong>. Click <strong>Configure</strong> on the card below to toggle client portal visibility on/off.
                      </p>
                    </div>

                    <div className="bg-white/80 rounded-lg p-3 border border-indigo-50 space-y-1">
                      <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                        Phase-Gating Control
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Set <strong>Visible From Phase</strong> to choose when candidates appear (e.g. <em>Phase 1</em> for immediate sourced access, or <em>Phase 2</em> for screened/interview candidates).
                      </p>
                    </div>

                    <div className="bg-white/80 rounded-lg p-3 border border-indigo-50 space-y-1">
                      <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                        Share Candidates
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        In the TA pipeline, click <strong>Moved to Next Phase</strong> on any candidate (or bulk select) to explicitly share them, or assign a client interviewer to a round.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Requisitions List */}
              {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
                  Loading shared requisitions...
                </div>
              ) : filteredRequisitions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Briefcase size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No requisitions found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {reqSearchQuery
                      ? 'No requisitions match your search keywords.'
                      : `There are no active requisitions linked to ${clientName} yet.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequisitions.map((req) => {
                    const reqId = String(req._id);
                    const candidateCount = req.candidates?.length || 0;
                    const vis = req.clientVisibility || {};
                    const isContactMasked = vis.maskCandidateContact !== false;
                    const isDownloadAllowed = Boolean(vis.allowResumeDownload);

                    return (
                      <div
                        key={reqId}
                        onClick={() => handleOpenRequisition(reqId)}
                        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 cursor-pointer hover:border-indigo-300 hover:shadow-xs transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                            <Briefcase size={18} />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                {req.title}
                              </span>
                              <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                {req.requestId}
                              </span>
                              <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {req.status || 'Active'}
                              </span>
                            </div>
                            {req.department && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Department: {req.department}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right side badges & View button */}
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                          {/* Phase indicator badge */}
                          {vis.enabled === false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Access Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Phase {(Number(vis.visibleFromPhaseIndex) || 0) + 1}
                              {vis.candidateFilter === 'shortlistedOnly' || vis.onlyShortlisted
                                ? ' • Shortlisted Only'
                                : vis.candidateFilter === 'interviewScheduled'
                                ? ' • Interviews Only'
                                : vis.candidateFilter === 'explicitOnly'
                                ? ' • Explicit Only'
                                : ' Visible'}
                            </span>
                          )}

                          {/* Policy indicators for this requisition */}
                          <div className="flex items-center gap-1.5">
                            {isContactMasked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Lock size={11} /> Contact Masked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Unlock size={11} /> Contact Shared
                              </span>
                            )}

                            {isDownloadAllowed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <Download size={11} /> Resume Allowed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Shield size={11} /> Resume Gated
                              </span>
                            )}
                          </div>

                          {/* Candidate count */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            candidateCount > 0
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            <UserCheck size={13} />
                            {candidateCount}
                          </span>

                          {/* Action Buttons */}
                          {reqId !== 'other' && (
                            <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => handleOpenConfigModal(e, req)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                                title="Configure Phase & Privacy for this requisition"
                              >
                                <Settings size={12} />
                                Configure
                              </button>

                              {vis.enabled === false ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleRequisitionAccess(e, req, true)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-indigo-200 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
                                  title="Enable client portal access for this requisition"
                                >
                                  <Eye size={12} />
                                  Enable
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleRequisitionAccess(e, req, false)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                                  title="Unshare this requisition from client portal"
                                >
                                  <EyeOff size={12} />
                                  Unshare
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => handleOpenInPipeline(e, reqId)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                                title="Open Requisition in TA Pipeline to add candidates or advance phases"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          )}

                          <span className="text-xs font-bold text-indigo-600 group-hover:text-indigo-700 inline-flex items-center gap-0.5 ml-1">
                            View <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: WHAT CLIENT CAN ACCESS & REQUISITION POLICIES */}
      {/* ========================================================================= */}
      {activeSubTab === 'policy' && (
        <div className="space-y-6">
          {/* Policy Overview Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">What Can This Client Access?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Overview of security rules, privacy safeguards, and interactive permissions configured for {clientName}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {/* Policy 1: Candidate Contact Privacy */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${policy.maskCandidateContact ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {policy.maskCandidateContact ? <Lock size={15} /> : <Unlock size={15} />}
                    </div>
                    <span className="text-xs font-bold text-slate-900">Candidate Contact Info</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    policy.maskCandidateContact ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {policy.maskCandidateContact ? 'Masked / Protected' : 'Shared Full'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {policy.maskCandidateContact
                    ? 'Candidate email and phone numbers are masked (e.g. j***@email.com) in the client portal to prevent agency disintermediation.'
                    : 'Client users can view full candidate emails and phone numbers directly.'}
                </p>
              </div>

              {/* Policy 2: Compensation Masking */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${policy.maskCompensation ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {policy.maskCompensation ? <Lock size={15} /> : <Unlock size={15} />}
                    </div>
                    <span className="text-xs font-bold text-slate-900">Candidate Compensation (CTC)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    policy.maskCompensation ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {policy.maskCompensation ? 'Concealed' : 'Visible'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {policy.maskCompensation
                    ? 'Current and expected CTC are concealed from client portal viewers.'
                    : 'Candidate CTC details are visible to client reviewers.'}
                </p>
              </div>

              {/* Policy 3: Resume Download Gating */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${policy.allowResumeDownload ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      <FileText size={15} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Resume Downloads</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    policy.allowResumeDownload ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {policy.allowResumeDownload ? 'Download Allowed' : 'View Restricted'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {policy.allowResumeDownload
                    ? 'Client users can download the original resume PDF/Doc.'
                    : 'Direct raw resume file downloads are gated; resumes are only viewable securely.'}
                </p>
              </div>

              {/* Policy 4: Client Decisions */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <CheckCircle2 size={15} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Client Hiring Decisions</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {policy.allowClientDecision ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Client Admins can submit Shortlist, Reject, or Hold decisions on submitted candidate profiles.
                </p>
              </div>

              {/* Policy 5: Client Interview Feedback */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <SlidersHorizontal size={15} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Client Interview Feedback</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Client Interviewers can score skills (1-10) and record written interview feedback for their assigned rounds.
                </p>
              </div>

              {/* Policy 6: Phase Gating Rule */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                      <ShieldCheck size={15} />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Phase Gated Access</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Automatic
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Candidates become accessible in the client portal when advanced past the client visibility threshold or explicitly marked as shared.
                </p>
              </div>
            </div>
          </div>

          {/* Shared Requisitions Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Requisitions Shared with {clientName}</h4>
                <p className="text-xs text-slate-500">Each requisition controls its own visibility, contact masking, and resume download rules.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {requisitions.length} Requisitions
              </span>
            </div>

            {requisitions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No requisitions linked to this client yet. Create or assign a requisition to {clientName} in Talent Acquisition.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Requisition</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Contact Masking</th>
                      <th className="px-6 py-3">Resume Download</th>
                      <th className="px-6 py-3">Client Decisions</th>
                      <th className="px-6 py-3 text-right">Shared Candidates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {requisitions.map((r) => {
                      const vis = r.clientVisibility || {};
                      const isContactMasked = vis.maskCandidateContact !== false;
                      const isDownloadAllowed = Boolean(vis.allowResumeDownload);
                      const isDecisionAllowed = vis.allowClientDecision !== false;

                      return (
                        <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 text-xs">{r.title}</div>
                            <div className="text-[10px] font-mono text-indigo-600 mt-0.5">{r.requestId}</div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {r.status || 'Active'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {isContactMasked ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <Lock size={12} /> Masked (Protected)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <Unlock size={12} /> Full Contact Shared
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {isDownloadAllowed ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 size={12} /> Download Allowed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                                <Shield size={12} /> Gated (View Only)
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs font-semibold ${isDecisionAllowed ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {isDecisionAllowed ? 'Shortlist / Reject / Hold' : 'Disabled'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {r.sharedCandidateCount || 0} Candidates
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: AUTHORIZED PORTAL STAKEHOLDERS (USER MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Authorized Portal Users for {clientName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage client accounts with access to the client portal.</p>
            </div>
            <button
              onClick={() => fetchAllData(true)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              title="Refresh List"
            >
              <RotateCw size={14} className={refreshing || loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No client users invited yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Invite Client User&quot; above to give your client contacts access to the recruitment portal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Last Login</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {u.firstName} {u.lastName}
                              {u.isPrimaryContact && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail size={12} /> {u.email}
                              </span>
                              {u.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} /> {u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          <Shield size={12} />
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          u.status === 'Invited' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        {u.status === 'Invited' && (
                          <button
                            onClick={() => handleResendInvite(u._id)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          >
                            Resend Invite
                          </button>
                        )}

                        {u.status !== 'Invited' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`${u.status === 'Active' ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'} cursor-pointer`}
                          >
                            {u.status === 'Active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Remove User"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Invite User to {clientName} Portal
            </h3>
            <p className="text-xs text-slate-500">
              The user will receive an activation email with a secure link to set up their password.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="Jane"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Smith"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="jane.smith@client.com"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Portal Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="ClientAdmin">Client Admin (View candidates, submit decisions, view all rounds)</option>
                  <option value="ClientInterviewer">Client Interviewer (Evaluate assigned interview rounds & submit feedback)</option>
                  <option value="ClientViewer">Client Viewer (Read-only access to presented candidates)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryContact"
                  checked={formData.isPrimaryContact}
                  onChange={(e) => setFormData(p => ({ ...p, isPrimaryContact: e.target.checked }))}
                  className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="primaryContact" className="text-xs text-slate-700 font-medium">
                  Mark as Primary Client Contact
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Link Display Modal */}
      {createdInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Invitation Link Generated
            </h3>
            <p className="text-xs text-slate-500">
              An invitation email has been sent. You can also copy and share this activation link directly with the client:
            </p>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="text"
                readOnly
                value={createdInvite}
                className="w-full bg-transparent text-xs text-slate-700 font-mono outline-hidden"
              />
              <button
                onClick={() => handleCopyLink(createdInvite)}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md shrink-0 cursor-pointer"
                title="Copy Link"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedInvite(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Requisition Phase & Privacy Modal */}
      {configModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 shadow-2xs">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">
                      Client Visibility & Phase Access Configuration
                    </h3>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                      {configModalReq.requestId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {configModalReq.title} • {configModalReq.department || 'General'} • Publishing to <strong className="text-slate-700">{clientName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalReq(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVisibilitySettings} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* 1. Master Requisition Portal Visibility Switch */}
                <div className={`p-4 rounded-xl border transition-all ${
                  configVisibility.enabled
                    ? 'bg-indigo-50/60 border-indigo-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        configVisibility.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Eye size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">
                            Enable Client Visibility for this Requisition
                          </h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            configVisibility.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {configVisibility.enabled ? 'Portal Active' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          When enabled, {clientName} stakeholders can view and evaluate candidates under this job in their portal according to the rules below.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={configVisibility.enabled}
                        onChange={(e) => setConfigVisibility(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Warning when disabled */}
                {!configVisibility.enabled && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Requisition is currently hidden from client</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Client users cannot see this job or any of its candidates until visibility is toggled on.
                      </p>
                    </div>
                  </div>
                )}

                {/* Detailed Settings Grid (2 Columns) */}
                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${!configVisibility.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* Left Column (7 cols): Pipeline & Qualification Filter */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal size={15} className="text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Candidate Pipeline & Phase Gating
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          Phase Control
                        </span>
                      </div>

                      {/* Phase Gating Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Phase-Gated Access (Visible From)
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Candidates before this phase remain completely hidden from client stakeholders.
                        </p>
                        <select
                          value={configVisibility.visibleFromPhaseIndex}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, visibleFromPhaseIndex: Number(e.target.value) }))}
                          className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          {(configModalReq.recruitmentPhases && configModalReq.recruitmentPhases.length > 0) ? (
                            configModalReq.recruitmentPhases.map((phase, idx) => (
                              <option key={phase.phaseId || idx} value={idx}>
                                Phase {idx + 1}: {phase.phaseName || `Phase ${idx + 1}`}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value={0}>Phase 1 (Sourced & Screened) - Immediate Visibility</option>
                              <option value={1}>Phase 2 (Interview Rounds) - Screened Candidates Only</option>
                              <option value={2}>Phase 3 (Offer & Hired) - Final Stage Only</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Candidate Qualification Filter (Option for Phase 2 Shortlisted Only) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Candidate Qualification Filter
                          </label>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                            Targeted Sharing
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2.5">
                          Specify which candidates in the selected phase get shared with the client.
                        </p>

                        <div className="space-y-2">
                          {/* Option A: All Candidates in Phase */}
                          <label
                            onClick={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'all', onlyShortlisted: false }))}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              configVisibility.candidateFilter === 'all' && !configVisibility.onlyShortlisted
                                ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="candidateFilter"
                              checked={configVisibility.candidateFilter === 'all' && !configVisibility.onlyShortlisted}
                              onChange={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'all', onlyShortlisted: false }))}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Users size={13} className="text-slate-500" />
                                All Candidates in Phase {configVisibility.visibleFromPhaseIndex + 1}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                All candidates currently in Phase {configVisibility.visibleFromPhaseIndex + 1} or beyond will be visible in the client portal.
                              </p>
                            </div>
                          </label>

                          {/* Option B: Phase Shortlisted Only (e.g. Phase 2 Shortlisted Only) */}
                          <label
                            onClick={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'shortlistedOnly', onlyShortlisted: true }))}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              configVisibility.candidateFilter === 'shortlistedOnly' || configVisibility.onlyShortlisted
                                ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="candidateFilter"
                              checked={configVisibility.candidateFilter === 'shortlistedOnly' || configVisibility.onlyShortlisted}
                              onChange={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'shortlistedOnly', onlyShortlisted: true }))}
                              className="mt-0.5 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                  <CheckCircle2 size={13} className="text-purple-600" />
                                  Phase {configVisibility.visibleFromPhaseIndex + 1} Shortlisted Only
                                </p>
                                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded uppercase">
                                  Recommended
                                </span>
                              </div>
                              <p className="text-[11px] text-purple-700 mt-0.5">
                                Strictly share candidates marked as <strong>Shortlisted</strong> or <strong>Selected</strong> in Phase {configVisibility.visibleFromPhaseIndex + 1}. Unscreened or pending candidates stay hidden.
                              </p>
                            </div>
                          </label>

                          {/* Option C: Interview Scheduled Only */}
                          <label
                            onClick={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'interviewScheduled', onlyShortlisted: false }))}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              configVisibility.candidateFilter === 'interviewScheduled'
                                ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="candidateFilter"
                              checked={configVisibility.candidateFilter === 'interviewScheduled'}
                              onChange={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'interviewScheduled', onlyShortlisted: false }))}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-500" />
                                Interview Scheduled / Assigned Only
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Only candidates who have an active client interview round or assigned client interviewers.
                              </p>
                            </div>
                          </label>

                          {/* Option D: Explicit Share Only */}
                          <label
                            onClick={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'explicitOnly', onlyShortlisted: false }))}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              configVisibility.candidateFilter === 'explicitOnly'
                                ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="candidateFilter"
                              checked={configVisibility.candidateFilter === 'explicitOnly'}
                              onChange={() => setConfigVisibility(prev => ({ ...prev, candidateFilter: 'explicitOnly', onlyShortlisted: false }))}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Lock size={13} className="text-slate-500" />
                                Manual Explicit Share Only
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                No candidate is visible automatically. Recruiter must manually click "Share Profile" on individual candidates.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Drop-off & Cleanliness Guardrails */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-700 block">
                          Pipeline Cleanliness & Drop-Off Guardrails
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={configVisibility.hideRejected}
                            onChange={(e) => setConfigVisibility(prev => ({ ...prev, hideRejected: e.target.checked }))}
                            className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">Auto-Hide Rejected Candidates</p>
                            <p className="text-[11px] text-slate-500">
                              Automatically removes rejected candidates from the client portal to keep their view clean and focused.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={configVisibility.hideOnHold}
                            onChange={(e) => setConfigVisibility(prev => ({ ...prev, hideOnHold: e.target.checked }))}
                            className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">Auto-Hide Candidates On Hold</p>
                            <p className="text-[11px] text-slate-500">
                              Temporarily hide candidates placed on hold internally until recruiter reactivates them.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (5 cols): Privacy & Permissions */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Privacy & Anti-Disintermediation */}
                    <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={15} className="text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Privacy & Anti-Bypass
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Protection
                        </span>
                      </div>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.maskCandidateContact}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, maskCandidateContact: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Mask Candidate Contact Details</p>
                          <p className="text-[11px] text-slate-500">
                            Conceals email & phone (e.g. h***@gmail.com, 91******34) from client users.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.maskCompensation}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, maskCompensation: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Mask Compensation (CTC)</p>
                          <p className="text-[11px] text-slate-500">
                            Hides current and expected CTC from client stakeholders.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.allowResumeDownload}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, allowResumeDownload: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Allow Resume Download</p>
                          <p className="text-[11px] text-slate-500">
                            When unchecked, client can only view redacted resume online and cannot download raw files.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.showInternalNotes}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, showInternalNotes: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Share Internal Recruiter Notes</p>
                          <p className="text-[11px] text-slate-500">
                            Share internal screening remarks and evaluation feedback with client reviewers.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Client Stakeholder Permissions */}
                    <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <UserCheck size={15} className="text-indigo-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Client Stakeholder Permissions
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Permissions
                        </span>
                      </div>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.allowClientDecision}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, allowClientDecision: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Allow Client Decisions</p>
                          <p className="text-[11px] text-slate-500">
                            Permit client interviewers to submit decisions (Shortlist, Reject, Hold) from portal.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.allowClientFeedback}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, allowClientFeedback: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Allow Scorecards & Feedback</p>
                          <p className="text-[11px] text-slate-500">
                            Permit client interviewers to submit skill scorecards and written evaluations.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configVisibility.allowClientScheduling}
                          onChange={(e) => setConfigVisibility(prev => ({ ...prev, allowClientScheduling: e.target.checked }))}
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Self-Service Interview Scheduling</p>
                          <p className="text-[11px] text-slate-500">
                            Permit client stakeholders to propose interview slots directly with candidates.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dynamic Live Policy Preview Callout */}
                {configVisibility.enabled && (
                  <div className="p-3.5 rounded-xl bg-linear-to-r from-indigo-50 via-purple-50/50 to-white border border-indigo-200 flex items-center justify-between flex-wrap gap-2 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <div className="text-slate-800">
                        <span className="font-bold text-indigo-900">Active Policy Summary: </span>
                        <span>
                          Visible starting from <strong>Phase {configVisibility.visibleFromPhaseIndex + 1}</strong>
                          {' • '}
                          <strong className={configVisibility.candidateFilter === 'shortlistedOnly' || configVisibility.onlyShortlisted ? 'text-purple-700 underline font-black' : 'text-slate-900'}>
                            {configVisibility.candidateFilter === 'shortlistedOnly' || configVisibility.onlyShortlisted
                              ? 'Phase ' + (configVisibility.visibleFromPhaseIndex + 1) + ' Shortlisted Candidates Only'
                              : configVisibility.candidateFilter === 'interviewScheduled'
                              ? 'Interview Scheduled Only'
                              : configVisibility.candidateFilter === 'explicitOnly'
                              ? 'Explicit Share Only'
                              : 'All Candidates in Phase'}
                          </strong>
                          {' • '}
                          {configVisibility.maskCandidateContact ? 'Contacts Masked' : 'Contacts Visible'}
                          {' • '}
                          {configVisibility.allowResumeDownload ? 'Resume Download Allowed' : 'Downloads Gated'}
                          {configVisibility.hideRejected ? ' • Auto-Hide Rejected' : ''}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
                      Live Preview
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Changes take effect immediately across all client portal sessions.
                </p>
                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setConfigModalReq(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingVisibility}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {savingVisibility ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
                    Save Visibility Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortalUsersTab;
