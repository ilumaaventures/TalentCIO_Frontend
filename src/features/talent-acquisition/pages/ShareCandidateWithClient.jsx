import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    CheckSquare,
    Square,
    Mail,
    Send,
    Paperclip,
    X,
    FileText,
    FileArchive,
    AlertTriangle,
    Eye,
    Edit3,
    UserCheck,
    Building2,
    RefreshCw,
    ShieldAlert,
    ExternalLink,
    HelpCircle,
    Info,
    Sparkles,
    Users,
    Table,
    FileSpreadsheet,
    Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import Skeleton from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = ['pdf', 'zip', 'doc', 'docx'];

// Format bytes to KB / MB
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Simple email validator
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

// Check if candidate is in Phase 2
const isCandidateInPhase2 = (cand) => {
    if (!cand) return false;
    if (Number(cand.currentPhaseOrder) === 2) return true;
    if (cand.profileShared === true || cand.isProfileShared === true || cand.profileSharedAt) return true;
    if (cand.decision === 'Shortlisted' || cand.decision === 'Profile Shared' || cand.decision === 'Selected') return true;
    if ((cand.phase2Decision && cand.phase2Decision !== 'None') ||
        (cand.phase2InterviewStatus && cand.phase2InterviewStatus !== 'None') ||
        Boolean(cand.phase2InterviewerFeedback)) return true;
    if (Array.isArray(cand.interviewRounds) && cand.interviewRounds.some(r => Number(r.phaseOrder || r.phase || r.roundNumber) === 2)) return true;
    const isDropped = ['Rejected', 'Did Not Turn Up', 'Left in between'].includes(cand.decision);
    if (isDropped) return false;
    return false;
};

// Available candidate field columns definition
const AVAILABLE_COLUMNS = [
    { key: 'candidateName', label: 'Candidate Name', isDefault: true },
    { key: 'currentCTC', label: 'Current CTC', isDefault: true },
    { key: 'expectedCTC', label: 'Expected CTC', isDefault: true },
    { key: 'noticePeriod', label: 'Notice Period', isDefault: true },
    { key: 'currentLocation', label: 'Current Location', isDefault: true },
    { key: 'totalExperience', label: 'Total Experience', isDefault: false },
    { key: 'relevantExperience', label: 'Relevant Experience', isDefault: false },
    { key: 'currentCompany', label: 'Current Employer', isDefault: false },
    { key: 'qualification', label: 'Highest Qualification', isDefault: false },
    { key: 'tatToJoin', label: 'TAT / Joining Time', isDefault: false },
    { key: 'mustHaveSkills', label: 'Key / Must-Have Skills', isDefault: false },
    { key: 'niceToHaveSkills', label: 'Additional Skills', isDefault: false },
    { key: 'preferredLocation', label: 'Preferred Location', isDefault: false },
    { key: 'inHandOffer', label: 'In-Hand Offer', isDefault: false },
    { key: 'preference', label: 'Assessment Rating', isDefault: false },
    { key: 'email', label: 'Candidate Email', isDefault: false },
    { key: 'mobile', label: 'Candidate Phone', isDefault: false }
];

// Helper to format candidate field values for Excel grid display
const formatCandidateCellValue = (cand, key) => {
    if (!cand) return '—';

    const formatSkills = (skillList) => {
        if (!Array.isArray(skillList) || skillList.length === 0) return '—';
        return skillList
            .map(s => {
                if (typeof s === 'string') return s;
                return s.skill ? `${s.skill}${s.experience ? ` (${s.experience} yrs)` : ''}` : '';
            })
            .filter(Boolean)
            .join(', ');
    };

    switch (key) {
        case 'candidateName':
            return cand.candidateName || '—';
        case 'expectedCTC':
            if (cand.expectedCTC !== undefined && cand.expectedCTC !== null && cand.expectedCTC !== '') {
                const val = Number(cand.expectedCTC);
                return !isNaN(val) ? `₹ ${val.toLocaleString('en-IN')} LPA` : String(cand.expectedCTC);
            }
            return '—';
        case 'currentCTC':
            if (cand.currentCTC !== undefined && cand.currentCTC !== null && cand.currentCTC !== '') {
                const val = Number(cand.currentCTC);
                return !isNaN(val) ? `₹ ${val.toLocaleString('en-IN')} LPA` : String(cand.currentCTC);
            }
            return '—';
        case 'noticePeriod':
            return cand.noticePeriod !== undefined && cand.noticePeriod !== null ? `${cand.noticePeriod} Days` : '—';
        case 'currentLocation':
            return cand.currentLocation || '—';
        case 'totalExperience':
            return cand.totalExperience !== undefined && cand.totalExperience !== null && cand.totalExperience !== ''
                ? `${cand.totalExperience} Yrs`
                : '—';
        case 'relevantExperience':
            return cand.relevantExperience !== undefined && cand.relevantExperience !== null && cand.relevantExperience !== ''
                ? `${cand.relevantExperience} Yrs`
                : '—';
        case 'currentCompany':
            return cand.currentCompany || '—';
        case 'qualification':
            return cand.qualification || '—';
        case 'tatToJoin':
            return cand.tatToJoin !== undefined && cand.tatToJoin !== null ? `${cand.tatToJoin} Days` : '—';
        case 'mustHaveSkills':
            return formatSkills(cand.mustHaveSkills);
        case 'niceToHaveSkills':
            return formatSkills(cand.niceToHaveSkills);
        case 'preferredLocation':
            return cand.preferredLocation || '—';
        case 'inHandOffer':
            return cand.inHandOffer
                ? `Yes (${cand.offerCompany || 'Offer'}${cand.offerCTC ? ` - ₹${cand.offerCTC} LPA` : ''})`
                : 'No';
        case 'preference':
            return cand.preference || '—';
        case 'email':
            return cand.email || '—';
        case 'mobile':
            return cand.mobile || '—';
        default:
            return cand[key] !== undefined && cand[key] !== null ? String(cand[key]) : '—';
    }
};

const ShareCandidateWithClient = () => {
    const { hiringRequestId, candidateId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Data Loading states
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [hiringRequest, setHiringRequest] = useState(null);
    const [senderOptions, setSenderOptions] = useState([]);
    const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('platform');

    // Email Form states
    const [toEmail, setToEmail] = useState('');
    const [ccEmail, setCcEmail] = useState('');
    const [bccEmail, setBccEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [bodyIntro, setBodyIntro] = useState('');
    const [bodyOutro, setBodyOutro] = useState('');

    // Attachments
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef(null);
    const [attachingResumes, setAttachingResumes] = useState(false);

    // Selected Columns mapping (field key -> boolean)
    const [selectedColumnsMap, setSelectedColumnsMap] = useState(() => {
        const initial = {};
        AVAILABLE_COLUMNS.forEach(col => {
            initial[col.key] = col.isDefault;
        });
        return initial;
    });

    // UI View mode: 'edit' or 'preview'
    const [viewMode, setViewMode] = useState('edit');
    const [isSending, setIsSending] = useState(false);

    // Resolve Target Candidate IDs from searchParams, state, or route param
    const targetCandidateIds = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        const queryIds = (searchParams.get('candidateIds') || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const stateIds = Array.isArray(location.state?.selectedCandidateIds)
            ? location.state.selectedCandidateIds.filter(Boolean)
            : [];

        const routeIds = candidateId && candidateId !== 'all' && candidateId !== 'share-candidates'
            ? [candidateId]
            : [];

        // Deduplicate while preserving order
        const combined = Array.from(new Set([...queryIds, ...stateIds, ...routeIds]));
        return combined;
    }, [location.search, location.state, candidateId]);

    // Fetch Candidates, Requisition, and Sender Accounts
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                setLoading(true);

                if (targetCandidateIds.length === 0) {
                    toast.error('No candidates selected to share with client.');
                    if (isMounted) setLoading(false);
                    return;
                }

                // 1. Fetch all candidate profiles in parallel
                const fetchPromises = targetCandidateIds.map(async (id) => {
                    try {
                        const res = await api.get(`/ta/candidates/candidate/${id}`).catch(() => api.get(`/ta/candidate/${id}`));
                        return res.data?.candidate || res.data;
                    } catch (e) {
                        console.warn(`Failed to fetch candidate ${id}:`, e);
                        return null;
                    }
                });

                const loadedList = (await Promise.all(fetchPromises)).filter(Boolean);

                if (!isMounted) return;

                if (loadedList.length === 0) {
                    toast.error('Could not load candidate information for selected IDs.');
                    setLoading(false);
                    return;
                }

                setCandidates(loadedList);
                const primaryCand = loadedList[0];

                // 2. Fetch Requisition if not populated
                const resolvedReqId = primaryCand?.hiringRequestId?._id || primaryCand?.hiringRequestId || hiringRequestId;
                let reqData = null;
                if (resolvedReqId && typeof resolvedReqId === 'object' && resolvedReqId.roleDetails) {
                    reqData = resolvedReqId;
                } else if (resolvedReqId && resolvedReqId !== 'all') {
                    const reqRes = await api.get(`/ta/hiring-request/${resolvedReqId}`).catch(() => null);
                    reqData = reqRes?.data || null;
                }
                setHiringRequest(reqData);

                // 3. Prefill Client Email if available
                let clientEmailGuess = '';
                if (reqData?.clientId && typeof reqData.clientId === 'object') {
                    clientEmailGuess = reqData.clientId.email || reqData.clientId.contactPersons?.[0]?.email || '';
                }
                if (clientEmailGuess) {
                    setToEmail(clientEmailGuess);
                }

                // 4. Default Subject & Intro/Outro
                const roleTitle = reqData?.roleDetails?.title || reqData?.positionName || 'Open Position';
                if (loadedList.length === 1) {
                    const cName = loadedList[0]?.candidateName || 'Candidate';
                    setSubject(`Candidate Profile – ${cName} (${roleTitle})`);
                    setBodyIntro(
                        `Dear Client,\n\nPlease find the profile details of shortlisted candidate ${cName} in the table below for your review:`
                    );
                } else {
                    setSubject(`Candidate Profiles (${loadedList.length}) – ${roleTitle}`);
                    setBodyIntro(
                        `Dear Client,\n\nPlease find the profile details of the ${loadedList.length} shortlisted candidates in the table below for your review:`
                    );
                }

                setBodyOutro(
                    `Please review the candidate details and let us know your feedback or preferred interview slots.\n\nBest regards,\nTalent Acquisition Team`
                );

                // 5. Fetch Sender Accounts
                try {
                    const senderRes = await api.get('/company/email-settings/senders');
                    const senderData = senderRes.data || {};
                    const platformOpt = senderData.platformOption ? {
                        _id: String(senderData.platformOption._id || 'platform'),
                        label: `${senderData.platformOption.fromName || 'TalentCIO Platform'} – ${senderData.platformOption.fromAddress || 'no-reply'}`
                    } : { _id: 'platform', label: 'TalentCIO Platform' };

                    const accountOpts = (senderData.accounts || []).filter(a => a.ready).map(a => ({
                        _id: String(a._id),
                        label: `${a.fromName || a.name || 'Sender Account'} – ${a.fromAddress || a.email || ''}`
                    }));

                    const options = [platformOpt, ...accountOpts];
                    setSenderOptions(options);

                    const defaultId = options.some(o => o._id === senderData.defaultAccountId)
                        ? senderData.defaultAccountId
                        : (options[0]?._id || 'platform');

                    setSelectedEmailAccountId(defaultId);
                } catch (senderErr) {
                    console.warn('Could not load sender accounts:', senderErr);
                    setSenderOptions([{ _id: 'platform', label: 'TalentCIO Platform (Default)' }]);
                    setSelectedEmailAccountId('platform');
                }

            } catch (err) {
                console.error('Failed to load candidate(s) for client share:', err);
                toast.error(err.response?.data?.message || 'Failed to load candidates');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [targetCandidateIds.join(','), hiringRequestId]);

    // Check Phase 2 gating: at least one candidate must be Phase 2
    const phase2Candidates = useMemo(() => {
        return candidates.filter(isCandidateInPhase2);
    }, [candidates]);

    const hasAnyPhase2 = useMemo(() => {
        if (candidates.length === 0) return true; // still loading
        return phase2Candidates.length > 0;
    }, [candidates, phase2Candidates]);

    // Active selected columns list for Excel table
    const selectedColumnsList = useMemo(() => {
        return AVAILABLE_COLUMNS.filter(col => selectedColumnsMap[col.key]);
    }, [selectedColumnsMap]);

    // Toggle Column selection
    const toggleColumn = (key) => {
        setSelectedColumnsMap(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Select All Columns
    const selectAllColumns = () => {
        const next = {};
        AVAILABLE_COLUMNS.forEach(c => {
            next[c.key] = true;
        });
        setSelectedColumnsMap(next);
    };

    // Deselect All Columns (keeps Candidate Name selected)
    const resetToDefaults = () => {
        const next = {};
        AVAILABLE_COLUMNS.forEach(c => {
            next[c.key] = c.isDefault;
        });
        setSelectedColumnsMap(next);
    };

    // File Attachments calculation
    const totalRawAttachmentBytes = useMemo(() => {
        return attachments.reduce((sum, f) => sum + f.size, 0);
    }, [attachments]);

    const estimatedBase64Bytes = useMemo(() => {
        return Math.ceil(totalRawAttachmentBytes * 1.37);
    }, [totalRawAttachmentBytes]);

    const isAttachmentLimitExceeded = useMemo(() => {
        return totalRawAttachmentBytes > MAX_ATTACHMENT_BYTES || estimatedBase64Bytes > MAX_ATTACHMENT_BYTES;
    }, [totalRawAttachmentBytes, estimatedBase64Bytes]);

    // File Upload Handler
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const validFiles = [];
        const invalidFormatFiles = [];

        selectedFiles.forEach(file => {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (ALLOWED_EXTENSIONS.includes(ext)) {
                validFiles.push(file);
            } else {
                invalidFormatFiles.push(file.name);
            }
        });

        if (invalidFormatFiles.length > 0) {
            toast.error(`Invalid format: ${invalidFormatFiles.join(', ')}. Only PDF (.pdf), ZIP (.zip), and Word (.doc, .docx) are supported.`);
        }

        if (validFiles.length > 0) {
            setAttachments(prev => [...prev, ...validFiles]);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (indexToRemove) => {
        setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    // Attach Resumes for all candidates with resumeUrl
    const handleAttachAllCandidateResumes = async () => {
        const candidatesWithResume = candidates.filter(c => Boolean(c.resumeUrl));
        if (candidatesWithResume.length === 0) {
            toast.error('None of the selected candidates have uploaded resumes.');
            return;
        }

        try {
            setAttachingResumes(true);
            const downloadedFiles = [];

            for (const cand of candidatesWithResume) {
                try {
                    const response = await fetch(cand.resumeUrl);
                    const blob = await response.blob();
                    const ext = cand.resumeUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'pdf';
                    const safeExt = ['pdf', 'doc', 'docx', 'zip'].includes(ext) ? ext : 'pdf';
                    const safeName = (cand.candidateName || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `${safeName}_Resume.${safeExt}`;

                    const fileObj = new File([blob], fileName, { type: blob.type || 'application/pdf' });
                    downloadedFiles.push(fileObj);
                } catch (e) {
                    console.warn(`Could not download resume for ${cand.candidateName}:`, e);
                }
            }

            if (downloadedFiles.length > 0) {
                setAttachments(prev => [...prev, ...downloadedFiles]);
                toast.success(`Attached ${downloadedFiles.length} candidate resume${downloadedFiles.length > 1 ? 's' : ''}`);
            } else {
                toast.error('Failed to download resumes from storage.');
            }
        } catch (err) {
            console.error('Failed to attach candidate resumes:', err);
            toast.error('Failed to download resume files.');
        } finally {
            setAttachingResumes(false);
        }
    };

    // Attach Single Candidate Resume
    const handleAttachSingleResume = async (cand) => {
        if (!cand?.resumeUrl) {
            toast.error(`No resume uploaded for ${cand?.candidateName || 'candidate'}`);
            return;
        }

        try {
            const response = await fetch(cand.resumeUrl);
            const blob = await response.blob();
            const ext = cand.resumeUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'pdf';
            const safeExt = ['pdf', 'doc', 'docx', 'zip'].includes(ext) ? ext : 'pdf';
            const safeName = (cand.candidateName || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${safeName}_Resume.${safeExt}`;

            const fileObj = new File([blob], fileName, { type: blob.type || 'application/pdf' });
            setAttachments(prev => [...prev, fileObj]);
            toast.success(`Attached resume: ${fileName}`);
        } catch (err) {
            console.error('Failed to attach resume:', err);
            toast.error(`Failed to download resume for ${cand.candidateName}`);
        }
    };

    // Validation for Send button
    const isValidToEmail = useMemo(() => {
        return isValidEmail(toEmail);
    }, [toEmail]);

    const canSend = useMemo(() => {
        return (
            isValidToEmail &&
            subject.trim() !== '' &&
            selectedColumnsList.length > 0 &&
            candidates.length > 0 &&
            !isAttachmentLimitExceeded &&
            !isSending &&
            hasAnyPhase2
        );
    }, [isValidToEmail, subject, selectedColumnsList, candidates, isAttachmentLimitExceeded, isSending, hasAnyPhase2]);

    // Send Email to Client
    const handleSendEmail = async () => {
        if (!canSend) return;

        try {
            setIsSending(true);

            const activeCandidates = phase2Candidates.length > 0 ? phase2Candidates : candidates;
            const targetIds = activeCandidates.map(c => c._id);

            const formData = new FormData();
            formData.append('to', toEmail.trim());
            if (ccEmail.trim()) formData.append('cc', ccEmail.trim());
            if (bccEmail.trim()) formData.append('bcc', bccEmail.trim());
            formData.append('subject', subject.trim());
            formData.append('emailBodyIntro', bodyIntro);
            formData.append('emailBodyOutro', bodyOutro);
            formData.append('emailAccountId', selectedEmailAccountId);
            formData.append('selectedFields', JSON.stringify(selectedColumnsList));
            formData.append('candidateIds', JSON.stringify(targetIds));

            // Attach files
            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            const sendRes = await api.post(
                `/ta/candidates/${targetIds[0]}/share-with-client`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000
                }
            );

            toast.success(sendRes.data?.message || `All ${targetIds.length} candidate details sent to client successfully!`);

            // Redirect back to Phase 2 candidates table
            const backReqId = hiringRequest?._id || candidates[0]?.hiringRequestId?._id || candidates[0]?.hiringRequestId || hiringRequestId;
            setTimeout(() => {
                navigate(-1);
            }, 1200);

        } catch (err) {
            console.error('Error sharing candidates with client:', err);
            toast.error(err.response?.data?.message || 'Failed to send candidates email to client');
        } finally {
            setIsSending(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <Skeleton className="h-10 w-72 rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-96 md:col-span-2 rounded-2xl" />
                    <Skeleton className="h-96 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (candidates.length === 0) {
        return (
            <div className="p-12 text-center max-w-xl mx-auto space-y-4">
                <ShieldAlert className="size-16 text-rose-500 mx-auto" />
                <h2 className="text-xl font-bold text-slate-800">No Candidates Found</h2>
                <p className="text-sm text-slate-500">The selected candidate record(s) could not be loaded.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Phase 2 Gating Alert
    if (!hasAnyPhase2) {
        return (
            <div className="p-8 max-w-3xl mx-auto mt-8">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
                    <AlertTriangle className="size-14 text-amber-600 mx-auto" />
                    <h2 className="text-xl font-extrabold text-amber-900">
                        Phase 2 Candidate Sharing Only
                    </h2>
                    <p className="text-sm text-amber-800 max-w-xl mx-auto">
                        The <strong>"Share with Client"</strong> feature is exclusively reserved for candidates who have progressed to <strong>Phase 2 (Client Evaluation / Interview)</strong>.
                    </p>
                    <div className="pt-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
                        >
                            <ArrowLeft size={16} />
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const displayCandidates = phase2Candidates.length > 0 ? phase2Candidates : candidates;

    return (
        <div className="min-h-screen bg-slate-50/70 pb-24">
            {/* Top Sticky Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                            title="Go Back"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-700 uppercase tracking-wider">
                                    Phase 2 Client Share
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {hiringRequest?.roleDetails?.title || hiringRequest?.positionName || 'Requisition'}
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                                <span>Share Candidates with Client</span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold">
                                    {displayCandidates.length} Selected
                                </span>
                            </h1>
                        </div>
                    </div>

                    {/* Mode Toggles & Action Buttons */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'edit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Edit3 size={14} />
                                Compose
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Eye size={14} />
                                Preview Email
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSendEmail}
                            disabled={!canSend}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm ${canSend ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 cursor-pointer' : 'bg-slate-400 cursor-not-allowed opacity-75'}`}
                        >
                            {isSending ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    Sending {displayCandidates.length} Candidates...
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    Send Email to Client ({displayCandidates.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 pt-6">
                {/* Candidates Summary Pill Bar */}
                <div className="mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                    {displayCandidates.length} Candidate{displayCandidates.length > 1 ? 's' : ''} Ready to Share
                                </h4>
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Excel Grid Format
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                All selected candidates will be compiled into a single clean Excel-style table and sent to the client.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {displayCandidates.map((cand, idx) => (
                            <span
                                key={cand._id || idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                            >
                                <span className="size-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-700">
                                    {idx + 1}
                                </span>
                                {cand.candidateName}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Warning when limits exceeded */}
                {isAttachmentLimitExceeded && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 shadow-2xs">
                        <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-rose-900">Total Attachment Size Exceeds Limit</h4>
                            <p className="text-xs text-rose-700 mt-0.5">
                                The combined attachment size ({formatFileSize(totalRawAttachmentBytes)}) exceeds the 25 MB limit (estimated encoded message size: {formatFileSize(estimatedBase64Bytes)}). Gmail and other providers will reject this message. Please remove some files before sending.
                            </p>
                        </div>
                    </div>
                )}

                {viewMode === 'preview' ? (
                    /* ================= PREVIEW MODE (Clean Normal Body, NO LOGO) ================= */
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-5xl mx-auto">
                        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye size={18} className="text-blue-400" />
                                <span className="font-bold text-sm">Client Email Preview (Normal Body Format – No Logo)</span>
                            </div>
                            <span className="text-xs text-slate-400">
                                Exact representation for Gmail / Outlook
                            </span>
                        </div>

                        {/* Email Headers Meta */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/60 space-y-2 text-xs">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-16">Sender:</span>
                                <span className="text-slate-800 font-semibold">
                                    {senderOptions.find(o => o._id === selectedEmailAccountId)?.label || 'TalentCIO Platform'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-16">To:</span>
                                <span className="text-blue-600 font-semibold">{toEmail || '<Client Email Address Required>'}</span>
                            </div>
                            {ccEmail && (
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-500 w-16">CC:</span>
                                    <span className="text-slate-700">{ccEmail}</span>
                                </div>
                            )}
                            {bccEmail && (
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-500 w-16">BCC:</span>
                                    <span className="text-slate-700">{bccEmail} <span className="text-slate-400 italic">(hidden from client)</span></span>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-16">Subject:</span>
                                <span className="text-slate-900 font-bold text-sm">{subject || '<No Subject>'}</span>
                            </div>
                            {attachments.length > 0 && (
                                <div className="flex items-start gap-3 pt-1">
                                    <span className="font-bold text-slate-500 w-16 mt-0.5">Files:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {attachments.map((file, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs">
                                                <Paperclip size={12} className="text-slate-400" />
                                                {file.name} ({formatFileSize(file.size)})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rendered Body Container (Clean Normal Body without Logo) */}
                        <div className="p-8 space-y-6 text-sm text-slate-800 leading-relaxed font-sans">
                            {bodyIntro && (
                                <div className="whitespace-pre-wrap text-slate-800 text-[14px]">
                                    {bodyIntro}
                                </div>
                            )}

                            {/* Excel-Type Candidates Table Preview */}
                            <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-300">
                                            <th className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300 text-center w-12">
                                                #
                                            </th>
                                            {selectedColumnsList.map(col => (
                                                <th
                                                    key={col.key}
                                                    className="py-2.5 px-3.5 font-bold text-slate-800 border-r border-slate-300 last:border-r-0 whitespace-nowrap bg-slate-100"
                                                >
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {displayCandidates.map((cand, idx) => (
                                            <tr key={cand._id || idx} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/20' : 'bg-slate-50 hover:bg-blue-50/20'}>
                                                <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                                                    {idx + 1}
                                                </td>
                                                {selectedColumnsList.map(col => {
                                                    const cellVal = formatCandidateCellValue(cand, col.key);
                                                    const isName = col.key === 'candidateName';
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            className={`py-2 px-3.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap ${isName ? 'font-bold text-slate-900' : 'text-slate-700'}`}
                                                        >
                                                            {cellVal}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {bodyOutro && (
                                <div className="whitespace-pre-wrap text-slate-800 text-[14px]">
                                    {bodyOutro}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white transition"
                            >
                                Back to Editing
                            </button>
                            <button
                                type="button"
                                onClick={handleSendEmail}
                                disabled={!canSend}
                                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 ${canSend ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'}`}
                            >
                                <Send size={14} />
                                Send Email ({displayCandidates.length} Candidates)
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ================= COMPOSE / EDIT MODE ================= */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Column & Field Selection (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <FileSpreadsheet size={16} className="text-blue-600" />
                                            Excel Table Columns
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Choose columns to include in the Excel table
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
                                        {selectedColumnsList.length} of {AVAILABLE_COLUMNS.length}
                                    </span>
                                </div>

                                {/* Quick selection toolbar */}
                                <div className="flex items-center justify-between text-xs pt-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={selectAllColumns}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition text-[11px]"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetToDefaults}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition text-[11px]"
                                        >
                                            Reset Defaults
                                        </button>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        Check to include
                                    </span>
                                </div>

                                {/* Field Selection List Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[580px] overflow-y-auto divide-y divide-slate-100">
                                    {AVAILABLE_COLUMNS.map((col) => {
                                        const isChecked = Boolean(selectedColumnsMap[col.key]);
                                        return (
                                            <div
                                                key={col.key}
                                                onClick={() => toggleColumn(col.key)}
                                                className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'bg-white hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => { }}
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-bold text-slate-800">
                                                                {col.label}
                                                            </span>
                                                            {col.isDefault && (
                                                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${isChecked ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                                                    {isChecked ? 'Column On' : 'Off'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Email Configuration & Interactive Excel Grid (8 cols) */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Card: Sender & Recipients */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                                    <Mail size={16} className="text-blue-600" />
                                    Sender & Client Recipients
                                </h3>

                                <div className="space-y-3.5">
                                    {/* Sender Account Dropdown */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Send From Email Account <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedEmailAccountId}
                                            onChange={(e) => setSelectedEmailAccountId(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {senderOptions.map((opt) => (
                                                <option key={opt._id} value={opt._id}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* To: Client Email */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            To (Client Recipient Email) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={toEmail}
                                            onChange={(e) => setToEmail(e.target.value)}
                                            placeholder="client.manager@company.com"
                                            className={`w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:ring-2 ${toEmail && !isValidToEmail ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30' : 'border-slate-300 focus:ring-blue-500'}`}
                                        />
                                        {toEmail && !isValidToEmail && (
                                            <p className="text-[10px] font-semibold text-rose-600 mt-1">
                                                Please enter a valid recipient email address.
                                            </p>
                                        )}
                                    </div>

                                    {/* CC & BCC */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                CC (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={ccEmail}
                                                onChange={(e) => setCcEmail(e.target.value)}
                                                placeholder="team@agency.com, hr@company.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                BCC (Optional, Private)
                                            </label>
                                            <input
                                                type="text"
                                                value={bccEmail}
                                                onChange={(e) => setBccEmail(e.target.value)}
                                                placeholder="audit@company.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Email Subject <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Candidate Profiles – Open Position"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card: Email Body & Live Excel Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                                    <Edit3 size={16} className="text-blue-600" />
                                    Email Body & Excel-Style Table
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Opening Message (Pre-Table)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={bodyIntro}
                                            onChange={(e) => setBodyIntro(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                                        />
                                    </div>

                                    {/* Excel Table Live Preview Box */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                <Table size={14} className="text-blue-600" />
                                                Live Table Preview ({displayCandidates.length} candidates, {selectedColumnsList.length} columns)
                                            </label>
                                            <span className="text-[11px] text-slate-400">
                                                Excel-style grid format
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto border border-slate-300 rounded-xl max-h-72 shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-slate-100 border-b border-slate-300">
                                                        <th className="py-2.5 px-3 font-bold text-slate-700 border-r border-slate-300 text-center w-10">
                                                            #
                                                        </th>
                                                        {selectedColumnsList.map(col => (
                                                            <th
                                                                key={col.key}
                                                                className="py-2.5 px-3.5 font-bold text-slate-800 border-r border-slate-300 last:border-r-0 whitespace-nowrap bg-slate-100"
                                                            >
                                                                {col.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {displayCandidates.map((cand, idx) => (
                                                        <tr key={cand._id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                            <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                                                                {idx + 1}
                                                            </td>
                                                            {selectedColumnsList.map(col => (
                                                                <td
                                                                    key={col.key}
                                                                    className={`py-2 px-3.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap ${col.key === 'candidateName' ? 'font-bold text-slate-900' : 'text-slate-700'}`}
                                                                >
                                                                    {formatCandidateCellValue(cand, col.key)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Closing Message (Post-Table)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={bodyOutro}
                                            onChange={(e) => setBodyOutro(e.target.value)}
                                            className="w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card: File Attachments */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                            <Paperclip size={16} className="text-blue-600" />
                                            File Attachments (PDF, ZIP, Word)
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Attach candidate resumes, portfolios, or test reports
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs font-extrabold text-slate-800">
                                            Total: {formatFileSize(totalRawAttachmentBytes)} / 25 MB
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            Est. encoded: {formatFileSize(estimatedBase64Bytes)}
                                        </div>
                                    </div>
                                </div>

                                {/* Attachment Upload Zone */}
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.zip,.doc,.docx"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="file-upload-input"
                                        />
                                        <label
                                            htmlFor="file-upload-input"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-2xs"
                                        >
                                            <Paperclip size={14} />
                                            Add Files (.pdf, .zip, .doc, .docx)
                                        </label>

                                        {displayCandidates.some(c => Boolean(c.resumeUrl)) && (
                                            <button
                                                type="button"
                                                onClick={handleAttachAllCandidateResumes}
                                                disabled={attachingResumes}
                                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition"
                                            >
                                                {attachingResumes ? (
                                                    <RefreshCw size={14} className="animate-spin text-blue-600" />
                                                ) : (
                                                    <FileText size={14} className="text-blue-600" />
                                                )}
                                                Attach All Resumes ({displayCandidates.filter(c => Boolean(c.resumeUrl)).length})
                                            </button>
                                        )}
                                    </div>

                                    {/* Individual Resume Attach Pills */}
                                    {displayCandidates.length > 1 && (
                                        <div className="pt-1 flex items-center gap-2 flex-wrap text-xs text-slate-600">
                                            <span className="text-[11px] text-slate-500 font-medium">Attach individually:</span>
                                            {displayCandidates.map(c => (
                                                c.resumeUrl ? (
                                                    <button
                                                        key={c._id}
                                                        type="button"
                                                        onClick={() => handleAttachSingleResume(c)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition"
                                                    >
                                                        <FileText size={12} className="text-blue-600" />
                                                        {c.candidateName}
                                                    </button>
                                                ) : null
                                            ))}
                                        </div>
                                    )}

                                    {/* Files list */}
                                    {attachments.length === 0 ? (
                                        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-slate-50/50">
                                            No files attached yet. You can attach PDF resumes, Word documents, or ZIP archives up to 25 MB.
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
                                            {attachments.map((file, idx) => {
                                                const ext = (file.name.split('.').pop() || '').toLowerCase();
                                                const isPdf = ext === 'pdf';
                                                const isZip = ext === 'zip';

                                                return (
                                                    <div
                                                        key={`${file.name}-${idx}`}
                                                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            {isPdf ? (
                                                                <FileText size={16} className="text-rose-500 shrink-0" />
                                                            ) : isZip ? (
                                                                <FileArchive size={16} className="text-amber-500 shrink-0" />
                                                            ) : (
                                                                <FileText size={16} className="text-blue-500 shrink-0" />
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-800 truncate" title={file.name}>
                                                                    {file.name}
                                                                </p>
                                                                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                                                                    {ext} • {formatFileSize(file.size)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(idx)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                            title="Remove attachment"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ShareCandidateWithClient;
