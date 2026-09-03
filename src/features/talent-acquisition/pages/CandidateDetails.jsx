import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { Loader, ArrowLeft, Download, Plus, CheckCircle, CheckCircle2, XCircle, Clock, User, Calendar, MessageSquare, Trash2, Edit2, Edit3, FileText, ExternalLink, Maximize2, Eye, Mail, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import Skeleton from '@/components/ui/Skeleton';
import DocPreviewer from '@/components/common/DocPreviewer';
import { ProfileReviewModal } from '@/features/talent-acquisition/components/PublicApplicationsView';
import { canViewTACandidateDetails } from '@/config/accessPolicies';

const hasReviewableApplicantProfile = (item) => Boolean(
    item &&
    (
        (item.applicantId && typeof item.applicantId === 'object') ||
        item.profileSnapshot ||
        item.publicApplicationId
    )
);

const CandidateDetails = ({ candidateId: propCandidateId, hiringRequestId: propHiringRequestId, isSidePanel, onUpdate, isSidePanelMaximized, onToggleMaximize }) => {
    const { user } = useAuth();
    const params = useParams();
    const hiringRequestId = propHiringRequestId || params.hiringRequestId;
    const candidateId = propCandidateId || params.candidateId;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const phaseParam = searchParams.get('phase');
    const currentPhase = phaseParam ? parseInt(phaseParam, 10) : 1;
    const canViewCandidateDetails = useMemo(() => canViewTACandidateDetails(user), [user]);

    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isDownloadingResume, setIsDownloadingResume] = useState(false);
    const [isDeletingResume, setIsDeletingResume] = useState(false);

    // Round Management State
    const [isAddingRound, setIsAddingRound] = useState(false);
    const [newRound, setNewRound] = useState({ levelName: '', scheduledDate: '' });
    const [customFields, setCustomFields] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [emailTemplates, setEmailTemplates] = useState([]);
    const [senderOptions, setSenderOptions] = useState([]);
    const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('');
    const [roundCc, setRoundCc] = useState('');
    const [roundBcc, setRoundBcc] = useState('');

    // Evaluation State
    const [evaluatingRoundId, setEvaluatingRoundId] = useState(null);
    const [evaluationForm, setEvaluationForm] = useState({ status: '', feedback: '', rating: '', skillRatings: [], showAssessment: false, manualSkillName: '' });

    // Edit Round State
    const [editingRoundId, setEditingRoundId] = useState(null);
    const [editingRoundForm, setEditingRoundForm] = useState({ levelName: '', scheduledDate: '', assignedTo: '', status: 'Scheduled', rating: '', feedback: '', customFields: [] });

    // Send Round Mail State
    const [sendingMailRound, setSendingMailRound] = useState(null);
    const [viewingMailDetails, setViewingMailDetails] = useState(null);
    const [sendMailForm, setSendMailForm] = useState({ emailTemplateId: '', emailAccountId: '', cc: '', bcc: '', customSubject: '', customHtmlBody: '' });
    const [isSendingMail, setIsSendingMail] = useState(false);
    const [mailPreview, setMailPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [mailTab, setMailTab] = useState('preview'); // 'preview' | 'edit'
    const [previewRecipientTab, setPreviewRecipientTab] = useState('candidate'); // 'candidate' | 'interviewer'

    // Workflow State
    const [interviewWorkflows, setInterviewWorkflows] = useState([]);
    const [isApplyingWorkflow, setIsApplyingWorkflow] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [workflowMapping, setWorkflowMapping] = useState({});

    // Internal Remark state (separate from sourcing remark)
    const [internalRemarkText, setInternalRemarkText] = useState('');
    const [internalRemarkEditing, setInternalRemarkEditing] = useState(false);
    const [internalRemarkLoading, setInternalRemarkLoading] = useState(false);

    // Users & Interviewers List for Assessment assignment
    const [users, setUsers] = useState([]);
    const [interviewers, setInterviewers] = useState([]);
    const [selectedInterviewer, setSelectedInterviewer] = useState('');
    const [roles, setRoles] = useState([]);
    const [selectedRoleForRound, setSelectedRoleForRound] = useState('');
    const [isResumeFullView, setIsResumeFullView] = useState(false);
    const [isProfileReviewOpen, setIsProfileReviewOpen] = useState(false);

    const toggleFullScreen = () => {
        if (isSidePanel && onToggleMaximize) {
            onToggleMaximize();
        } else {
            setIsResumeFullView(!isResumeFullView);
        }
    };

    const fetchSenderOptions = useCallback(async () => {
        try {
            const senderRes = await api.get('/company/email-settings/senders');
            const senderData = senderRes.data || {};
            const platformOpt = senderData.platformOption ? {
                _id: String(senderData.platformOption._id || 'platform'),
                label: `${senderData.platformOption.fromName || senderData.platformOption.name || 'TalentCIO Platform'} – ${senderData.platformOption.fromAddress || 'no-reply'}`
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
            return { options, defaultId };
        } catch (e) {
            console.warn('Could not fetch sender options:', e);
            const fallback = [{ _id: 'platform', label: 'TalentCIO Platform' }];
            setSenderOptions(fallback);
            setSelectedEmailAccountId('platform');
            return { options: fallback, defaultId: 'platform' };
        }
    }, []);

    useEffect(() => {
        const initializeData = async () => {
            try {
                setLoading(true);
                const candRes = await api.get(`/ta/candidates/candidate/${candidateId}/details`);
                setCandidate(candRes.data);
                setInternalRemarkText(candRes.data.internalRemark || '');

                try {
                    const [usersRes, interviewersRes] = await Promise.all([
                        api.get('/admin/users').catch(() => ({ data: [] })),
                        api.get('/ta/interviewers').catch(() => ({ data: [] }))
                    ]);
                    const fetchedUsers = usersRes.data?.data || usersRes.data || [];
                    const fetchedInterviewers = Array.isArray(interviewersRes.data)
                        ? interviewersRes.data
                        : (interviewersRes.data?.data || []);

                    setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
                    setInterviewers(Array.isArray(fetchedInterviewers) ? fetchedInterviewers : []);
                } catch (e) {
                    console.warn('Could not fetch users/interviewers list:', e);
                }

                try {
                    const rolesRes = await api.get('/admin/roles');
                    setRoles(rolesRes.data || []);
                } catch (e) {
                    console.warn('Interviewer user cannot fetch roles list:', e);
                }

                try {
                    const workflowsRes = await api.get('/ta/interview-workflows');
                    setInterviewWorkflows(workflowsRes.data || []);
                } catch (e) {
                    console.warn('Interviewer user cannot fetch interview workflows:', e);
                }

                try {
                    const templatesRes = await api.get('/ta/email-templates');
                    setEmailTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
                } catch (e) {
                    console.warn('Interviewer user cannot fetch email templates:', e);
                }

                await fetchSenderOptions();
            } catch (error) {
                console.error('Error initializing candidate details:', error);
                toast.error('Failed to load candidate details correctly.');
            } finally {
                setLoading(false);
            }
        };

        if (candidateId) {
            if (!canViewCandidateDetails) {
                setCandidate(null);
                setLoading(false);
                return;
            }
            initializeData();
        }
    }, [candidateId, canViewCandidateDetails]);

    const handleAddCustomFieldRow = () => {
        setCustomFields(prev => [...prev, { key: '', value: '' }]);
    };

    const handleRemoveCustomFieldRow = (index) => {
        setCustomFields(prev => prev.filter((_, i) => i !== index));
    };

    const handleCustomFieldChange = (index, field, value) => {
        setCustomFields(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const fetchCandidate = useCallback(async () => {
        try {
            const res = await api.get(`/ta/candidates/candidate/${candidateId}/details`);
            setCandidate(res.data);
        } catch (error) {
            console.error('Error fetching candidate:', error);
        }
    }, [candidateId]);



    const handleAddRound = useCallback(async () => {
        try {
            setActionLoading(true);
            const roundName = (newRound.levelName || 'Round 1').trim() || 'Round 1';
            const payload = {
                levelName: roundName,
                assignAfterStage: newRound.assignAfterStage || 'Shortlisted',
                assignedTo: selectedInterviewer && selectedInterviewer.trim() !== '' ? [selectedInterviewer] : [],
                scheduledDate: newRound.scheduledDate || undefined,
                phase: currentPhase,
                customFields: customFields.filter(f => f.key && f.key.trim())
            };

            await api.post(`/ta/candidates/${candidateId}/rounds`, payload);
            toast.success('Interview round added successfully');
            setIsAddingRound(false);
            setNewRound({ levelName: '', assignAfterStage: 'Shortlisted', scheduledDate: '' });
            setCustomFields([]);
            setSelectedInterviewer('');
            setSelectedRoleForRound('');
            fetchCandidate();
            if (onUpdate) onUpdate();
            window.dispatchEvent(new Event('refreshNotifications'));
        } catch (error) {
            console.error('Error adding round:', error);
            toast.error(error.response?.data?.message || 'Failed to add round');
        } finally {
            setActionLoading(false);
        }
    }, [candidateId, currentPhase, customFields, fetchCandidate, newRound, onUpdate, roundBcc, roundCc, selectedEmailAccountId, selectedInterviewer, selectedTemplateId, senderOptions]);

    const handleEditRound = useCallback(async (roundId) => {
        if (!editingRoundForm.levelName) {
            toast.error('Level Name is required');
            return;
        }

        try {
            setActionLoading(true);
            const payload = {
                levelName: editingRoundForm.levelName,
                assignAfterStage: editingRoundForm.assignAfterStage,
                assignedTo: editingRoundForm.assignedTo && editingRoundForm.assignedTo.trim() !== '' ? [editingRoundForm.assignedTo] : [],
                scheduledDate: editingRoundForm.scheduledDate || undefined,
                status: editingRoundForm.status || 'Scheduled',
                rating: editingRoundForm.rating !== '' && editingRoundForm.rating !== null && editingRoundForm.rating !== undefined ? Number(editingRoundForm.rating) : undefined,
                feedback: editingRoundForm.feedback || '',
                customFields: Array.isArray(editingRoundForm.customFields) ? editingRoundForm.customFields.filter(f => f.key && f.key.trim()) : []
            };

            await api.put(`/ta/candidates/${candidateId}/rounds/${roundId}`, payload);
            toast.success('Interview card updated');
            setEditingRoundId(null);
            fetchCandidate();
            if (onUpdate) onUpdate();
            window.dispatchEvent(new Event('refreshNotifications'));
        } catch (error) {
            console.error('Error updating round:', error);
            toast.error(error.response?.data?.message || 'Failed to update round');
        } finally {
            setActionLoading(false);
        }
    }, [candidateId, editingRoundForm, fetchCandidate, onUpdate]);


    const handleApplyWorkflowSubmit = useCallback(async () => {
        if (!selectedWorkflow) return toast.error('Please select a workflow template');
        try {
            setActionLoading(true);
            const template = interviewWorkflows.find(w => w._id === selectedWorkflow);
            if (!template) return;

            for (let i = 0; i < template.rounds.length; i++) {
                const r = template.rounds[i];
                const mapping = workflowMapping[i] || {};

                const payload = {
                    levelName: r.levelName,
                    assignedTo: mapping.assignedTo && mapping.assignedTo.trim() !== '' ? [mapping.assignedTo] : [],
                    scheduledDate: mapping.scheduledDate || undefined,
                    phase: currentPhase,
                    emailTemplateId: mapping.emailTemplateId || undefined,
                    emailAccountId: mapping.emailAccountId || selectedEmailAccountId || undefined,
                    cc: mapping.cc?.trim() || r.cc?.trim() || undefined,
                    bcc: mapping.bcc?.trim() || r.bcc?.trim() || undefined,
                    customFields: Array.isArray(mapping.customFields) ? mapping.customFields.filter(f => f.key && f.key.trim()) : []
                };
                await api.post(`/ta/candidates/${candidateId}/rounds`, payload);
            }
            toast.success('Interview workflow sequence applied successfully');
            setIsApplyingWorkflow(false);
            setSelectedWorkflow('');
            setWorkflowMapping({});
            fetchCandidate();
            if (onUpdate) onUpdate();
            window.dispatchEvent(new Event('refreshNotifications'));
        } catch (error) {
            console.error(error);
            toast.error('Failed to apply workflow completely. Some rounds may have failed.');
        } finally {
            setActionLoading(false);
        }
    }, [candidateId, currentPhase, fetchCandidate, interviewWorkflows, onUpdate, selectedWorkflow, workflowMapping]);

    const handleDeleteRound = useCallback(async (roundId) => {
        if (!window.confirm('Are you sure you want to delete this round?')) return;
        try {
            setActionLoading(true);
            await api.delete(`/ta/candidates/${candidateId}/rounds/${roundId}`);
            toast.success('Round deleted');
            fetchCandidate();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error deleting round:', error);
            toast.error('Failed to delete round');
        } finally {
            setActionLoading(false);
        }
    }, [candidateId, fetchCandidate, onUpdate]);

    const fetchMailPreview = useCallback(async (
        roundId,
        templateId,
        customFieldsOverride = null,
        customSubjectOverride = null,
        customHtmlBodyOverride = null
    ) => {
        try {
            setPreviewLoading(true);
            const fieldsToPass = customFieldsOverride !== null ? customFieldsOverride : (sendMailForm.customFields || []);
            const subjToPass = customSubjectOverride !== null ? customSubjectOverride : sendMailForm.customSubject;
            const bodyToPass = customHtmlBodyOverride !== null ? customHtmlBodyOverride : sendMailForm.customHtmlBody;

            const res = await api.post(`/ta/candidates/${candidateId}/rounds/${roundId}/mail-preview`, {
                emailTemplateId: templateId || undefined,
                customFields: fieldsToPass.filter(f => f.key && f.key.trim()),
                customSubject: subjToPass || undefined,
                customHtmlBody: bodyToPass || undefined
            });
            setMailPreview(res.data);
            setSendMailForm(prev => ({
                ...prev,
                customSubject: prev.customSubject !== '' ? prev.customSubject : (res.data?.rawSubject || res.data?.subject || ''),
                customHtmlBody: prev.customHtmlBody !== '' ? prev.customHtmlBody : (res.data?.rawBody || res.data?.htmlBody || '')
            }));
        } catch (error) {
            console.error('Error fetching mail preview:', error);
        } finally {
            setPreviewLoading(false);
        }
    }, [candidateId, sendMailForm.customFields, sendMailForm.customHtmlBody, sendMailForm.customSubject]);

    useEffect(() => {
        if (!sendingMailRound) return;
        const timer = setTimeout(() => {
            fetchMailPreview(
                sendingMailRound._id,
                sendMailForm.emailTemplateId,
                sendMailForm.customFields,
                sendMailForm.customSubject,
                sendMailForm.customHtmlBody
            );
        }, 350);
        return () => clearTimeout(timer);
    }, [fetchMailPreview, sendMailForm.customFields, sendMailForm.customHtmlBody, sendMailForm.customSubject, sendMailForm.emailTemplateId, sendingMailRound]);

    const openSendMailModal = useCallback(async (round) => {
        setSendingMailRound(round);
        setMailPreview(null);
        setMailTab('preview');
        setPreviewRecipientTab('candidate');

        let currentOptions = senderOptions;
        let defaultId = selectedEmailAccountId;

        if (!currentOptions || currentOptions.length === 0) {
            const fetched = await fetchSenderOptions();
            currentOptions = fetched.options;
            defaultId = fetched.defaultId;
        }

        const initialTpl = round.emailTemplateId || '';
        const initialCustomFields = Array.isArray(round.customFields) && round.customFields.length > 0
            ? round.customFields.map(f => ({ key: f.key || '', value: f.value || '' }))
            : [];

        const targetAccount = round.emailAccountId || defaultId || (currentOptions[0]?._id || 'platform');

        setSendMailForm({
            emailTemplateId: initialTpl,
            emailAccountId: targetAccount,
            cc: round.cc || '',
            bcc: round.bcc || '',
            customFields: initialCustomFields,
            customSubject: '',
            customHtmlBody: '',
            sendCandidateEmail: true,
            sendInterviewerEmail: true
        });
        fetchMailPreview(round._id, initialTpl, initialCustomFields);
    }, [fetchMailPreview, fetchSenderOptions, selectedEmailAccountId, senderOptions]);

    const handleSendRoundEmail = useCallback(async () => {
        if (!sendingMailRound) return;
        if (sendMailForm.sendCandidateEmail === false && sendMailForm.sendInterviewerEmail === false) {
            toast.error('Please select at least one recipient option (Candidate or Interviewer)');
            return;
        }
        try {
            setIsSendingMail(true);
            await api.post(`/ta/candidates/${candidateId}/rounds/${sendingMailRound._id}/send-mail`, {
                emailTemplateId: sendMailForm.emailTemplateId || undefined,
                emailAccountId: sendMailForm.emailAccountId || undefined,
                cc: sendMailForm.cc?.trim() || undefined,
                bcc: sendMailForm.bcc?.trim() || undefined,
                customFields: Array.isArray(sendMailForm.customFields) ? sendMailForm.customFields.filter(f => f.key && f.key.trim()) : [],
                customSubject: sendMailForm.customSubject || undefined,
                customHtmlBody: sendMailForm.customHtmlBody || undefined,
                sendCandidateEmail: sendMailForm.sendCandidateEmail !== false,
                sendInterviewerEmail: sendMailForm.sendInterviewerEmail !== false
            });
            toast.success(`Interview email sent for ${sendingMailRound.levelName}`);
            setSendingMailRound(null);
            fetchCandidate();
        } catch (error) {
            console.error('Error sending interview round email:', error);
            toast.error(error.response?.data?.message || 'Failed to send email');
        } finally {
            setIsSendingMail(false);
        }
    }, [candidateId, fetchCandidate, sendMailForm, sendingMailRound]);

    const submitEvaluation = useCallback(async (roundId) => {
        if (!evaluationForm.status) {
            toast.error('Decision Result is required');
            return;
        }
        if (!evaluationForm.feedback) {
            toast.error('Feedback is required');
            return;
        }

        try {
            setActionLoading(true);
            const payload = {
                status: evaluationForm.status,
                feedback: evaluationForm.feedback,
                skillRatings: evaluationForm.skillRatings,
                ...(evaluationForm.rating ? { rating: evaluationForm.rating } : {})
            };
            await api.patch(`/ta/candidates/${candidateId}/rounds/${roundId}/evaluate`, payload);
            toast.success('Evaluation submitted');
            setEvaluatingRoundId(null);
            setEvaluationForm({ status: '', feedback: '', rating: '', skillRatings: [], showAssessment: false, manualSkillName: '' });
            fetchCandidate();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            toast.error(error.response?.data?.message || 'Failed to submit evaluation');
        } finally {
            setActionLoading(false);
        }
    }, [candidateId, evaluationForm, fetchCandidate, onUpdate]);

    const handlePhase3DecisionChange = async (newDecision) => {
        try {
            await api.patch(`/ta/candidates/${candidateId}/phase3-decision`, { phase3Decision: newDecision });
            toast.success('Phase 3 Decision updated');
            setCandidate(prev => ({ ...prev, phase3Decision: newDecision }));
            if (onUpdate) onUpdate();
            window.dispatchEvent(new Event('refreshNotifications'));
        } catch (error) {
            console.error('Error updating Phase 3 decision:', error);
            toast.error('Failed to update Phase 3 decision');
        }
    };

    const handleUpdateInternalRemark = async () => {
        try {
            setInternalRemarkLoading(true);
            await api.patch(`/ta/candidates/${candidateId}/internal-remark`, { internalRemark: internalRemarkText });
            setCandidate(prev => ({ ...prev, internalRemark: internalRemarkText }));
            setInternalRemarkEditing(false);
            if (onUpdate) onUpdate();
            toast.success('Internal remark saved successfully');
        } catch (error) {
            console.error('Error saving internal remark:', error);
            toast.error('Failed to save internal remark');
        } finally {
            setInternalRemarkLoading(false);
        }
    };



    const getEffectiveRoundStatus = useCallback((round) => {
        if (round.displayStatusLabel) return round.displayStatusLabel;
        if (round.status && ['Shortlisted', 'Rejected', 'Did not Turn up', 'Did not turn up', 'Passed', 'Failed', 'Skipped', 'Pending', 'Scheduled', 'Left in between'].includes(round.status)) {
            return round.status;
        }

        // Only mark as Shortlisted if both feedback and rating are present
        const isCompleted = round.feedback && (round.rating || round.rating === 0);
        if (isCompleted) return 'Shortlisted';

        // If not completed, show as Scheduled if a date exists
        if (round.scheduledDate) return 'Scheduled';

        return 'Pending';
    }, []);

    const getStatusBadgeColor = useCallback((status) => {
        switch (status) {
            case 'Passed':
            case 'Shortlisted': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Failed':
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'Scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Skipped':
            case 'Did not turn up':
            case 'Did not Turn up': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200'; // Pending
        }
    }, []);

    const getStatusIcon = useCallback((status) => {
        switch (status) {
            case 'Passed':
            case 'Shortlisted': return <CheckCircle size={16} className="text-emerald-600" />;
            case 'Failed':
            case 'Rejected': return <XCircle size={16} className="text-red-600" />;
            case 'Scheduled': return <Calendar size={16} className="text-blue-600" />;
            case 'Skipped':
            case 'Did not turn up':
            case 'Did not Turn up': return <XCircle size={16} className="text-slate-500" />;
            default: return <Clock size={16} className="text-amber-600" />;
        }
    }, []);

    const { hasSuperApprove, canManageCandidateEdits, canScheduleRounds, canManagePhase3Decision } = useMemo(() => {
        const admin = user?.roles?.includes('Admin') || user?.roles?.some(r => r.name === 'Admin');
        const perms = user?.permissions || [];
        const superApprove = perms.includes('ta.super_approve') || perms.includes('*') || admin;
        const analyticsCandidateAccess = perms.includes('ta.analytics.assigned') || perms.includes('ta.analytics.global');
        const manageCandidateEdits = admin
            || perms.includes('ta.edit')
            || perms.includes('ta.candidate.manage.assigned')
            || perms.includes('ta.candidate.manage.all')
            || perms.includes('ta.candidate.edit')
            || analyticsCandidateAccess;
        const scheduleRounds = manageCandidateEdits;
        const managePhase3Decision = admin
            || perms.includes('ta.edit')
            || perms.includes('ta.candidate.manage.assigned')
            || perms.includes('ta.candidate.manage.all')
            || perms.includes('ta.candidate.edit')
            || perms.includes('ta.candidate.make_decision');
        return {
            hasSuperApprove: superApprove,
            canManageCandidateEdits: manageCandidateEdits,
            canScheduleRounds: scheduleRounds,
            canManagePhase3Decision: managePhase3Decision
        };
    }, [user]);

    const skillExperienceList = useMemo(() => {
        const groupedSkills = new Map();
        const sourceSkills = [
            ...(Array.isArray(candidate?.mustHaveSkills) ? candidate.mustHaveSkills.map((skill) => ({ ...skill, category: 'Must-Have' })) : []),
            ...(Array.isArray(candidate?.niceToHaveSkills) ? candidate.niceToHaveSkills.map((skill) => ({ ...skill, category: 'Nice-To-Have' })) : [])
        ];

        sourceSkills.forEach((entry) => {
            const skillName = String(entry?.skill || '').trim();
            const experience = Number(entry?.experience);
            if (!skillName) return;

            const skillKey = skillName.toLowerCase();
            const existing = groupedSkills.get(skillKey);

            if (!existing) {
                groupedSkills.set(skillKey, {
                    skill: skillName,
                    experience: Number.isFinite(experience) && experience > 0 ? experience : null,
                    categories: [entry.category]
                });
                return;
            }

            if (Number.isFinite(experience) && experience > 0 && (existing.experience === null || experience > existing.experience)) {
                existing.experience = experience;
            }

            if (!existing.categories.includes(entry.category)) {
                existing.categories.push(entry.category);
            }
        });

        return Array.from(groupedSkills.values()).sort((left, right) => {
            const leftPriority = left.categories.includes('Must-Have') ? 0 : 1;
            const rightPriority = right.categories.includes('Must-Have') ? 0 : 1;
            if (leftPriority !== rightPriority) return leftPriority - rightPriority;

            const leftExperience = left.experience ?? -1;
            const rightExperience = right.experience ?? -1;
            if (rightExperience !== leftExperience) return rightExperience - leftExperience;
            return left.skill.localeCompare(right.skill);
        });
    }, [candidate?.mustHaveSkills, candidate?.niceToHaveSkills]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-12">
                <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="h-10 w-36" />
                            <Skeleton className="h-10 w-36" />
                        </div>
                    </div>
                </div>

                <div className="w-full px-3 sm:px-4 lg:px-6 mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <Skeleton className="h-6 w-40 mb-6" />
                            <div className="space-y-6">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <Skeleton className="h-6 w-48" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 w-32" />
                                    <Skeleton className="h-9 w-40" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-32 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!canViewCandidateDetails) {
        return (
            <div className={`${isSidePanel ? 'p-6' : 'min-h-screen bg-slate-50 p-6'} flex items-center justify-center`}>
                <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Candidate details are restricted</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        This page requires either <code>ta.candidate.manage.all</code> or <code>ta.candidate.manage.assigned</code>.
                    </p>
                    {!isSidePanel && (
                        <button
                            type="button"
                            onClick={() => navigate(`/ta/view/${hiringRequestId}?tab=applications&phase=${phaseParam || 1}`)}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            <ArrowLeft size={16} />
                            Back to applications
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!candidate) return <div className="text-center p-8">Candidate not found</div>;

    const resolvedResumeUrl = candidate?.resumeUrl || candidate?.publicApplication?.resumeUrl || candidate?.applicantId?.resumeUrl || '';
    const hasResume = Boolean(resolvedResumeUrl && String(resolvedResumeUrl).startsWith('http'));

    const handleDownloadResume = async () => {
        if (!resolvedResumeUrl) return;
        setIsDownloadingResume(true);
        try {
            const response = await fetch(resolvedResumeUrl);
            if (!response.ok) throw new Error('Network response failed');
            const blob = await response.blob();

            const extMatch = resolvedResumeUrl.split('?')[0].match(/\.([0-9a-z]+)$/i);
            const ext = extMatch ? `.${extMatch[1]}` : '.pdf';
            const rawCandidateName = candidate?.candidateName?.trim() || 'Candidate';
            const sanitizedName = rawCandidateName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
            const fileName = `${sanitizedName}_Resume${ext}`;

            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success('Resume downloaded successfully');
        } catch (error) {
            console.error('Failed to download resume directly, triggering fallback download:', error);
            const link = document.createElement('a');
            link.href = resolvedResumeUrl;
            link.target = '_blank';
            link.download = `${candidate?.candidateName || 'Candidate'}_Resume`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            setIsDownloadingResume(false);
        }
    };

    const handleDeleteResume = async () => {
        if (!window.confirm('Are you sure you want to delete this resume?')) return;
        try {
            setIsDeletingResume(true);
            await api.put(`/ta/candidates/${candidateId}`, {
                resumeUrl: '',
                resumePublicId: ''
            });
            setCandidate(prev => prev ? ({ ...prev, resumeUrl: '', resumePublicId: '' }) : prev);
            if (onUpdate) onUpdate();
            toast.success('Resume deleted successfully');
        } catch (error) {
            console.error('Failed to delete resume:', error);
            toast.error(error.response?.data?.message || 'Failed to delete resume');
        } finally {
            setIsDeletingResume(false);
        }
    };

    return (
        <div className={`min-h-screen ${isSidePanel ? 'bg-transparent pb-4' : 'bg-slate-50 pb-12'}`}>
            {!isSidePanel ? (
                <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <div className="w-full px-3 sm:px-4 lg:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(`/ta/view/${hiringRequestId}?tab=applications&phase=${phaseParam || 1}`)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">{candidate.candidateName}</h1>
                                <p className="text-sm text-slate-500">{candidate.email} • {candidate.mobile}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {hasReviewableApplicantProfile(candidate) && (
                                <button
                                    type="button"
                                    onClick={() => setIsProfileReviewOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors border border-blue-600 text-sm"
                                >
                                    <Eye size={18} /> Review Complete Profile
                                </button>
                            )}
                            {((currentPhase === 3 && canManagePhase3Decision) || (currentPhase !== 3 && canManageCandidateEdits)) && (
                                <button
                                    onClick={() => navigate(`/ta/hiring-request/${hiringRequestId}/candidate/${candidateId}/edit`)}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <Edit2 size={18} /> Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border-b border-slate-200 p-4 mb-4 rounded-xl shadow-sm mx-4 mt-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">{candidate.candidateName}</h1>
                        <p className="text-xs text-slate-500">{candidate.email} • {candidate.mobile}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasReviewableApplicantProfile(candidate) && (
                            <button
                                type="button"
                                onClick={() => setIsProfileReviewOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                            >
                                <Eye size={16} /> Review Complete Profile
                            </button>
                        )}
                        {canManageCandidateEdits && (
                            <button
                                onClick={() => navigate(`/ta/hiring-request/${hiringRequestId}/candidate/${candidateId}/edit`)}
                                className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={`w-full ${isSidePanel ? 'px-4' : 'px-4 sm:px-6 lg:px-8 xl:px-10 mt-6 max-w-[1920px] mx-auto'} ${isSidePanel ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-12'} gap-6`}>
                {/* Left Column: Basic Details Summary (Only shown on full page) */}
                {!isSidePanel && (
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Profile Summary</h3>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Client Name</p>
                                        <p className="text-slate-900 font-bold text-sm">
                                            {candidate?.hiringRequestId?.clientConfidential
                                                ? 'Confidential Client'
                                                : (candidate?.hiringRequestId?.client || candidate?.client || 'N/A')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Requisition Name</p>
                                        <p className="text-slate-900 font-bold text-sm">
                                            {candidate?.hiringRequestId?.roleDetails?.title || candidate?.hiringRequestId?.title || candidate?.roleTitle || 'N/A'}
                                            {candidate?.hiringRequestId?.requestId && (
                                                <span className="block text-[11px] font-medium text-slate-500">
                                                    {candidate.hiringRequestId.requestId}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Status</p>
                                        <div className="flex items-center gap-2 flex-wrap mt-1">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
                                                {candidate.status}
                                            </span>
                                            {currentPhase === 1 && candidate.decision && candidate.decision !== 'None' && (
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${candidate.decision === 'Hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    candidate.decision === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        candidate.decision === 'Did Not Turn Up' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    Phase 1: {candidate.decision}
                                                </span>
                                            )}
                                            {currentPhase === 2 && candidate.phase2Decision && candidate.phase2Decision !== 'None' && (
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${candidate.phase2Decision === 'Hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    candidate.phase2Decision === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    Phase 2: {candidate.phase2Decision}
                                                </span>
                                            )}
                                            {currentPhase === 2 && candidate.phase2InterviewStatus && candidate.phase2InterviewStatus !== 'None' && (
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${candidate.phase2InterviewStatus === 'Shortlisted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    candidate.phase2InterviewStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    Phase 2 Interview: {candidate.phase2InterviewStatus}
                                                </span>
                                            )}
                                            {currentPhase === 3 && candidate.phase3Decision && candidate.phase3Decision !== 'None' && (
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${candidate.phase3Decision === 'Joined' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    candidate.phase3Decision === 'Offer Accepted' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                                        candidate.phase3Decision === 'Offer Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            candidate.phase3Decision === 'No Show' || candidate.phase3Decision === 'Offer Declined' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    Phase 3: {candidate.phase3Decision}
                                                </span>
                                            )}

                                            {/* Dropdown to change decision based on active phase */}
                                            {((currentPhase === 3 && canManagePhase3Decision) || (currentPhase !== 3 && canManageCandidateEdits)) && (
                                                <div className="mt-2 w-full max-w-50">
                                                    {currentPhase === 1 ? (
                                                        <select
                                                            value={candidate.decision || 'None'}
                                                            onChange={() => {
                                                                // Currently, list UI handles patch, let's keep consistency or just show it readonly here,
                                                                // But user wants to update from details too if possible.
                                                                // For now, list is main place, but we can add patch if missing.
                                                                toast.error("Please update Phase 1 decision from Candidate List page.");
                                                            }}
                                                            disabled
                                                            className="w-full appearance-none px-3 py-1.5 pr-8 text-sm font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                                        >
                                                            <option value="None">None</option>
                                                            <option value="Shortlisted">Shortlisted</option>
                                                            <option value="Profile Shared">Profile Shared</option>
                                                            <option value="Hired">Hired</option>
                                                            <option value="Rejected">Rejected</option>
                                                            <option value="Did Not Turn Up">Did Not Turn Up</option>
                                                            <option value="Left in between">Left in between</option>
                                                            <option value="On Hold">On Hold</option>
                                                        </select>
                                                    ) : currentPhase === 2 ? (
                                                        <select
                                                            value={candidate.phase2Decision || 'None'}
                                                            onChange={() => {
                                                                toast.error("Please update Phase 2 decision from Candidate List page.");
                                                            }}
                                                            disabled
                                                            className="w-full appearance-none px-3 py-1.5 pr-8 text-sm font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                                        >
                                                            <option value="None">None</option>
                                                            <option value="Shortlisted">Shortlisted</option>
                                                            <option value="Hired">Hired</option>
                                                            <option value="Rejected">Rejected</option>
                                                            <option value="On Hold">On Hold</option>
                                                        </select>
                                                    ) : (
                                                        <select
                                                            value={candidate.phase3Decision || 'None'}
                                                            onChange={(e) => handlePhase3DecisionChange(e.target.value)}
                                                            className="w-full appearance-none px-3 py-1.5 pr-8 text-sm font-bold rounded-lg border border-slate-300 bg-white outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 text-slate-700 transition-colors"
                                                        >
                                                            <option value="None">-- Set Phase 3 Status --</option>
                                                            <option value="Offer Sent">Offer Sent</option>
                                                            <option value="Offer Accepted">Offer Accepted</option>
                                                            <option value="Joined">Joined</option>
                                                            <option value="No Show">No Show</option>
                                                            <option value="Offer Declined">Offer Declined</option>
                                                        </select>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Source</p>
                                        <p className="text-slate-700 font-medium">{candidate.source} {candidate.referralName && `(${candidate.referralName})`}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Experience</p>
                                        <p className="text-slate-700 font-medium">{candidate.totalExperience !== undefined ? `${candidate.totalExperience} Years` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Qualification</p>
                                        <p className="text-slate-700 font-medium">{candidate.qualification || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current CTC</p>
                                        <p className="text-slate-700 font-medium">{candidate.currentCTC ? `₹${candidate.currentCTC?.toLocaleString()}` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expected CTC</p>
                                        <p className="text-slate-700 font-medium">{candidate.expectedCTC ? `₹${candidate.expectedCTC?.toLocaleString()}` : 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Profile Pulled By</p>
                                        <p className="text-slate-700 font-medium">{candidate.profilePulledBy || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Called By</p>
                                        <p className="text-slate-700 font-medium">{candidate.calledBy || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Rate</p>
                                    <p className="text-slate-700 font-medium">
                                        {candidate.rate !== undefined && candidate.rate !== null
                                            ? ` ${Number(candidate.rate).toLocaleString('en-IN')}`
                                            : 'N/A'}
                                    </p>
                                </div>

                                {/* In-Hand Offer */}
                                {candidate.inHandOffer ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">In-Hand Offer</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Company</p>
                                                <p className="text-slate-800 font-semibold text-sm">{candidate.offerCompany || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Their CTC</p>
                                                <p className="text-slate-800 font-semibold text-sm">{candidate.offerCTC ? `₹${candidate.offerCTC.toLocaleString()}` : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Date Of Joining New Company</p>
                                                <p className="text-slate-800 font-semibold text-sm">{candidate.offerJoiningDate ? format(new Date(candidate.offerJoiningDate), 'dd MMM yyyy') : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In-Hand Offer</p>
                                        <span className="text-xs text-slate-400 font-medium">No</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Location</p>
                                        <p className="text-slate-700 font-medium">{candidate.currentLocation || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Preferred Location</p>
                                        <p className="text-slate-700 font-medium">{candidate.preferredLocation || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notice Period</p>
                                        <p className="text-slate-700 font-medium">{candidate.noticePeriod ? `${candidate.noticePeriod} Days` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">TAT To Join</p>
                                        <p className="text-slate-700 font-medium">{candidate.tatToJoin ? `${candidate.tatToJoin} Days` : 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Working Day</p>
                                        <p className="text-slate-700 font-medium">{candidate.lastWorkingDay ? format(new Date(candidate.lastWorkingDay), 'dd MMM yyyy') : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Preference</p>
                                        <p className="text-slate-700 font-medium">{candidate.preference || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Company</p>
                                    <p className="text-slate-700 font-medium">{candidate.currentCompany || 'N/A'}</p>
                                </div>

                                {candidate.remark && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Remark</p>
                                        <div className={`text-sm p-3 rounded-lg border whitespace-pre-wrap leading-relaxed ${candidate.remark.startsWith('Transferred') ? 'bg-blue-50/70 border-blue-200/80 text-blue-950 font-medium' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                            {candidate.remark}
                                        </div>
                                    </div>
                                )}

                                {candidate.pastExperience && candidate.pastExperience.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 mt-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Past Experience</p>
                                        <ul className="space-y-2">
                                            {candidate.pastExperience.map((exp, idx) => (
                                                <li key={idx} className="text-sm text-slate-700 flex justify-between">
                                                    <span>{exp.companyName}</span>
                                                    <span className="text-slate-500">{exp.experienceYears} yrs</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {skillExperienceList.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 mt-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Skill Experience</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {skillExperienceList.map((skill) => (
                                                <div key={`${skill.skill}-${skill.categories.join('-')}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">{skill.skill}</p>
                                                            <p className="text-[11px] text-slate-500">{skill.categories.join(', ')}</p>
                                                        </div>
                                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                                            {skill.experience !== null ? `${skill.experience} yrs` : 'Not specified'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Column: Interview Timeline, Resume Preview, Remarks */}
                <div className={`${isSidePanel ? 'w-full' : 'lg:col-span-8'} space-y-6`}>
                    {!isSidePanel && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-base font-bold text-slate-800">Interview Timeline</h3>
                            {canScheduleRounds && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setIsApplyingWorkflow(true); setIsAddingRound(false); }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <Plus size={14} /> Apply Workflow
                                    </button>
                                    <button
                                        onClick={() => { setIsAddingRound(!isAddingRound); setIsApplyingWorkflow(false); }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <Plus size={14} /> Add Custom Round
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Apply Workflow Form */}
                        {isApplyingWorkflow && (
                            <div className="bg-slate-50 p-5 rounded-xl border border-indigo-100 mb-8 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">Apply Interview Template Sequence</h4>
                                 <div className="mb-4">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Template</label>
                                    <select
                                        value={selectedWorkflow}
                                        onChange={(e) => {
                                            const wfId = e.target.value;
                                            setSelectedWorkflow(wfId);
                                            const template = interviewWorkflows.find(w => w._id === wfId);
                                            if (template) {
                                                const mapping = {};
                                                template.rounds.forEach((r, i) => {
                                                    mapping[i] = {
                                                        assignedTo: r.user ? (r.user._id || r.user) : '',
                                                        scheduledDate: '',
                                                        emailTemplateId: r.emailTemplateId ? (r.emailTemplateId._id || r.emailTemplateId) : '',
                                                        customFields: Array.isArray(r.customFields) ? r.customFields.map(cf => ({ key: cf.key || '', value: cf.value || '' })) : []
                                                    };
                                                });
                                                setWorkflowMapping(mapping);
                                            } else {
                                                setWorkflowMapping({});
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 font-medium"
                                    >
                                        <option value="">-- Select an Interview Workflow --</option>
                                        {interviewWorkflows.map(wf => (
                                            <option key={wf._id} value={wf._id}>{wf.name} ({wf.rounds?.length || 0} Rounds)</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedWorkflow && (
                                    <div className="space-y-4 mb-5 border-t border-slate-200 pt-4">
                                        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Configure Rounds</p>
                                        {interviewWorkflows.find(w => w._id === selectedWorkflow)?.rounds.map((round, index) => {
                                            const roleFilterId = round.role?._id || round.role;
                                            const availablePool = interviewers.length > 0 ? interviewers : users;
                                            const roleUsers = roleFilterId
                                                ? availablePool.filter(u => u.roles?.some(r => r._id === roleFilterId || r === roleFilterId || r.name === roleFilterId))
                                                : availablePool;

                                            const currentRoundMapping = workflowMapping[index] || {};

                                            return (
                                                <div key={index} className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                                {index + 1}
                                                            </span>
                                                            <span className="font-bold text-indigo-900 text-sm">{round.levelName}</span>
                                                        </div>
                                                        {roleFilterId && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">Role: {round.role?.name || 'Assigned'}</span>}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Interviewer</label>
                                                            <select
                                                                value={currentRoundMapping.assignedTo || ''}
                                                                onChange={(e) => setWorkflowMapping({ ...workflowMapping, [index]: { ...currentRoundMapping, assignedTo: e.target.value } })}
                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs outline-none focus:border-indigo-500"
                                                            >
                                                                <option value="">-- Select Interviewer --</option>
                                                                {roleUsers.map(u => (
                                                                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Schedule Date & Time</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={currentRoundMapping.scheduledDate || ''}
                                                                onChange={(e) => setWorkflowMapping({ ...workflowMapping, [index]: { ...currentRoundMapping, scheduledDate: e.target.value } })}
                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs outline-none focus:border-indigo-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Key Value Custom Fields */}
                                                    <div className="border-t border-slate-100 pt-2 mt-1">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                                                Custom Fields (e.g., Meeting Link, Location, Topics)
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const fields = currentRoundMapping.customFields || [];
                                                                    setWorkflowMapping({
                                                                        ...workflowMapping,
                                                                        [index]: { ...currentRoundMapping, customFields: [...fields, { key: '', value: '' }] }
                                                                    });
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                                            >
                                                                <Plus size={12} /> Add Field
                                                            </button>
                                                        </div>
                                                        {(!currentRoundMapping.customFields || currentRoundMapping.customFields.length === 0) ? (
                                                            <p className="text-[11px] text-slate-400 italic">No custom fields for this round.</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {currentRoundMapping.customFields.map((field, fieldIdx) => (
                                                                    <div key={fieldIdx} className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Key (e.g. Meeting Link)"
                                                                            value={field.key || ''}
                                                                            onChange={(e) => {
                                                                                const fields = [...(currentRoundMapping.customFields || [])];
                                                                                fields[fieldIdx] = { ...fields[fieldIdx], key: e.target.value };
                                                                                setWorkflowMapping({
                                                                                    ...workflowMapping,
                                                                                    [index]: { ...currentRoundMapping, customFields: fields }
                                                                                });
                                                                            }}
                                                                            className="w-1/3 px-2.5 py-1 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Value (e.g. https://zoom.us/...)"
                                                                            value={field.value || ''}
                                                                            onChange={(e) => {
                                                                                const fields = [...(currentRoundMapping.customFields || [])];
                                                                                fields[fieldIdx] = { ...fields[fieldIdx], value: e.target.value };
                                                                                setWorkflowMapping({
                                                                                    ...workflowMapping,
                                                                                    [index]: { ...currentRoundMapping, customFields: fields }
                                                                                });
                                                                            }}
                                                                            className="flex-1 px-2.5 py-1 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const fields = (currentRoundMapping.customFields || []).filter((_, fIdx) => fIdx !== fieldIdx);
                                                                                setWorkflowMapping({
                                                                                    ...workflowMapping,
                                                                                    [index]: { ...currentRoundMapping, customFields: fields }
                                                                                });
                                                                            }}
                                                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                            title="Remove field"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => { setIsApplyingWorkflow(false); setSelectedWorkflow(''); }} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                    <button onClick={handleApplyWorkflowSubmit} disabled={actionLoading || !selectedWorkflow} className="px-4 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {actionLoading && <Loader size={14} className="animate-spin" />} Apply Workflow
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add Round Form */}
                        {isAddingRound && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">Schedule New Round</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Round Level/Title *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. L1 - Technical"
                                            value={newRound.levelName}
                                            onChange={(e) => setNewRound({ ...newRound, levelName: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Assign After Stage</label>
                                        <select
                                            value={newRound.assignAfterStage || 'Shortlisted'}
                                            onChange={(e) => setNewRound({ ...newRound, assignAfterStage: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                        >
                                            <optgroup label="Hiring Stages">
                                                {(() => {
                                                    const p = Number(currentPhase) || 1;
                                                    if (p === 2) {
                                                        return (
                                                            <>
                                                                <option value="Profile Shared">Profile Shared</option>
                                                                <option value="Shortlisted">Shortlisted</option>
                                                                <option value="Selected">Selected</option>
                                                                <option value="Rejected">Rejected</option>
                                                            </>
                                                        );
                                                    }
                                                    if (p === 3) {
                                                        return (
                                                            <>
                                                                <option value="Offer Sent">Offer Sent</option>
                                                                <option value="Offer Accepted">Offer Accepted</option>
                                                                <option value="Joined">Joined</option>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <option value="Total Sourced">Total Sourced</option>
                                                            <option value="Interested">Interested</option>
                                                            <option value="Shortlisted">Shortlisted</option>
                                                            <option value="Profile Shared">Profile Shared</option>
                                                        </>
                                                    );
                                                })()}
                                            </optgroup>
                                            {(() => {
                                                const existingRoundNames = [
                                                    ...new Set(
                                                        (candidate?.interviewRounds || [])
                                                            .filter((r) => Number(r.phase || 1) === currentPhase)
                                                            .map((r) => String(r.levelName || '').trim())
                                                            .filter(Boolean)
                                                    )
                                                ];
                                                if (existingRoundNames.length === 0) return null;
                                                return (
                                                    <optgroup label="After a Round (chain)">
                                                        {existingRoundNames.map((name) => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Target Role (Optional)</label>
                                        <select
                                            value={selectedRoleForRound}
                                            onChange={(e) => {
                                                setSelectedRoleForRound(e.target.value);
                                                setSelectedInterviewer('');
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Any Role</option>
                                            {roles.map(r => (
                                                <option key={r._id} value={r._id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Assign Interviewer</label>
                                        <select
                                            value={selectedInterviewer}
                                            onChange={(e) => setSelectedInterviewer(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select Evaluator --</option>
                                            {((interviewers.length > 0 ? interviewers : users).filter(u => !selectedRoleForRound || u.roles?.some(r => r._id === selectedRoleForRound || r === selectedRoleForRound || r.name === selectedRoleForRound))).map(u => (
                                                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Scheduled Date</label>
                                        <input
                                            type="datetime-local"
                                            value={newRound.scheduledDate}
                                            onChange={(e) => setNewRound({ ...newRound, scheduledDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Custom Fields Section */}
                                <div className="mt-4 border-t border-slate-200 pt-3 mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700">
                                            Custom Fields (e.g., Meeting Link, Location, Topics)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAddCustomFieldRow}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                        >
                                            <Plus size={14} /> Add Field
                                        </button>
                                    </div>
                                    {customFields.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No custom fields added. Click "+ Add Field" to include details like Zoom link, location, or instructions.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {customFields.map((field, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Key (e.g. Meeting Link)"
                                                        value={field.key}
                                                        onChange={(e) => handleCustomFieldChange(idx, 'key', e.target.value)}
                                                        className="w-1/3 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Value (e.g. https://meet.google.com/xyz)"
                                                        value={field.value}
                                                        onChange={(e) => handleCustomFieldChange(idx, 'value', e.target.value)}
                                                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCustomFieldRow(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove field"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => { setIsAddingRound(false); setSelectedInterviewer(''); setSelectedRoleForRound(''); setCustomFields([]); setSelectedTemplateId(''); }} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                                    <button onClick={handleAddRound} disabled={actionLoading} className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {actionLoading && <Loader size={14} className="animate-spin" />} Save Round
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="space-y-8 relative">
                            {(() => {
                                const phaseRounds = Array.isArray(candidate.interviewRounds)
                                    ? candidate.interviewRounds.filter(r => Number(r.phase || 1) === Number(currentPhase))
                                    : [];
                                const hasPhase2ImportedCard = currentPhase === 2
                                    && (
                                        Boolean(String(candidate.phase2InterviewerFeedback || '').trim())
                                        || ['Scheduled', 'Rejected', 'Shortlisted'].includes(candidate.phase2InterviewStatus)
                                    );
                                const displayedRounds = hasPhase2ImportedCard
                                    ? [...phaseRounds, {
                                        _id: 'phase2-imported-interview',
                                        levelName: 'Round 1',
                                        assignedTo: [],
                                        scheduledDate: null,
                                        feedback: candidate.phase2InterviewerFeedback || '',
                                        rating: null,
                                        skillRatings: [],
                                        displayStatusLabel: ['Scheduled', 'Rejected', 'Shortlisted'].includes(candidate.phase2InterviewStatus)
                                            ? candidate.phase2InterviewStatus
                                            : 'Scheduled',
                                        isSyntheticPhase2: true
                                    }]
                                    : phaseRounds;

                                if (displayedRounds.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-slate-500">
                                            No interview rounds have been scheduled yet.
                                        </div>
                                    );
                                }

                                return displayedRounds.map((round, index) => {
                                        const isAssigned = round.assignedTo?.some(u => u._id === user?._id || u._id?.toString() === user?._id?.toString());
                                        const canManageEvaluation = isAssigned || hasSuperApprove;
                                        const hasExistingEvaluationData = Boolean(String(round.feedback || '').trim())
                                            || Boolean(round.rating || round.rating === 0)
                                            || (Array.isArray(round.skillRatings) && round.skillRatings.some(sr => sr.rating > 0));
                                        const canEvaluate = !round.isSyntheticPhase2 && canManageEvaluation && ['Pending', 'Scheduled'].includes(round.status) && !hasExistingEvaluationData;
                                        const canEditFeedback = !round.isSyntheticPhase2 && canManageEvaluation && (
                                            ['Passed', 'Failed', 'Skipped'].includes(round.status) || hasExistingEvaluationData
                                        );
                                        const isEvaluating = evaluatingRoundId === round._id;
                                        const isEditingRound = editingRoundId === round._id;
                                        const hasVisibleFeedback = Boolean(String(round.feedback || '').trim())
                                            || (Array.isArray(round.skillRatings) && round.skillRatings.some(sr => sr.rating > 0));
                                        const effectiveRoundStatus = getEffectiveRoundStatus(round);

                                        return (
                                            <div key={round._id} className="relative pl-8">
                                                {/* Timeline Line */}
                                                {index !== displayedRounds.length - 1 && (
                                                    <div className="absolute top-8 -bottom-8 left-3.5 w-0.5 bg-slate-200"></div>
                                                )}

                                                {/* Dot */}
                                                <div className={`absolute top-1 left-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${['Passed', 'Shortlisted'].includes(effectiveRoundStatus) ? 'bg-emerald-500' :
                                                    ['Failed', 'Rejected'].includes(effectiveRoundStatus) ? 'bg-red-500' :
                                                        'bg-amber-400'
                                                    }`}></div>

                                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                    {/* Round Header */}
                                                    <div className={`px-4 py-3 border-b flex justify-between items-center ${['Passed', 'Shortlisted'].includes(effectiveRoundStatus) ? 'bg-emerald-50/50 border-emerald-100' :
                                                        ['Failed', 'Rejected'].includes(effectiveRoundStatus) ? 'bg-red-50/50 border-red-100' :
                                                            'bg-slate-50/50 border-slate-100'
                                                        }`}>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                                {round.levelName}
                                                                {getStatusIcon(effectiveRoundStatus)}
                                                            </h4>
                                                            {round.scheduledDate && (
                                                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                                    <Calendar size={11} /> Scheduled: {format(new Date(round.scheduledDate), 'PPp')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(effectiveRoundStatus)}`}>
                                                                {effectiveRoundStatus}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title="Recruitment stage after which this round is assigned">
                                                                After: {round.assignAfterStage || 'Shortlisted'}
                                                            </span>

                                                            {(() => {
                                                                const isMailSentForRound = Boolean(round.mailSent || round.mailSentAt || round.lastMailDetails?.sentAt || round.lastMailDetails?.subject);
                                                                return (
                                                                    <>
                                                                        {isMailSentForRound && (
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                                                    <CheckCircle2 size={11} className="text-emerald-600" /> Mail Sent
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setViewingMailDetails({
                                                                                        ...round.lastMailDetails,
                                                                                        roundName: round.levelName,
                                                                                        sentAt: round.mailSentAt || round.lastMailDetails?.sentAt,
                                                                                        roundRef: round
                                                                                    })}
                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
                                                                                    title="View Details of Sent Email"
                                                                                >
                                                                                    <Eye size={11} className="text-slate-600" /> Mail Details
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        {canScheduleRounds && !round.isSyntheticPhase2 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openSendMailModal(round)}
                                                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                                                                                title={isMailSentForRound ? "Resend or Send New Email for this round" : "Send Email for this interview round"}
                                                                            >
                                                                                <Mail size={11} /> {isMailSentForRound ? 'Resend Mail' : 'Send Mail'}
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            {canScheduleRounds && (
                                                                <div className="flex items-center gap-2 border-l border-slate-200 pl-2 ml-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            if (editingRoundId === round._id) {
                                                                                setEditingRoundId(null);
                                                                            } else {
                                                                                setEditingRoundId(round._id);
                                                                                setEvaluatingRoundId(null);
                                                                                const formattedDate = round.scheduledDate ? new Date(round.scheduledDate).toISOString().slice(0, 16) : '';
                                                                                setEditingRoundForm({
                                                                                    levelName: round.levelName || 'Round 1',
                                                                                    assignAfterStage: round.assignAfterStage || (currentPhase === 2 ? 'Shortlisted' : 'Interested'),
                                                                                    scheduledDate: formattedDate,
                                                                                    assignedTo: round.assignedTo?.[0]?._id || round.assignedTo?.[0] || round.evaluatedBy?._id || round.evaluatedBy || '',
                                                                                    status: getEffectiveRoundStatus(round) || round.status || 'Scheduled',
                                                                                    rating: round.rating !== undefined && round.rating !== null ? round.rating : '',
                                                                                    feedback: round.feedback || '',
                                                                                    customFields: Array.isArray(round.customFields) ? round.customFields.map(f => ({ key: f.key || '', value: f.value || '' })) : []
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`transition-colors ${isEditingRound ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
                                                                        title="Edit Round"
                                                                    >
                                                                        <Edit2 size={15} />
                                                                    </button>
                                                                    {!round.isSyntheticPhase2 && (
                                                                        <button
                                                                            onClick={() => handleDeleteRound(round._id)}
                                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                                            title="Delete Round"
                                                                        >
                                                                            <Trash2 size={15} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Round Details */}
                                                    <div className="px-4 py-3 text-xs">
                                                        <div className="flex items-start gap-2 mb-3">
                                                            <User size={15} className="text-slate-400 mt-0.5" />
                                                            <div>
                                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Evaluator</p>
                                                                {round.assignedTo?.length > 0 ? (
                                                                    <p className="text-xs font-semibold text-slate-800">
                                                                        {round.assignedTo.map(u =>
                                                                            u.firstName ? `${u.firstName} ${u.lastName}` : (u.email || 'Assigned User')
                                                                        ).join(', ')}
                                                                    </p>
                                                                ) : round.evaluatedBy ? (
                                                                    <p className="text-xs font-semibold text-slate-800">
                                                                        {round.evaluatedBy.firstName ? `${round.evaluatedBy.firstName} ${round.evaluatedBy.lastName}` : (round.evaluatedBy.email || 'Evaluator')}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs text-slate-400 italic">Unassigned</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Custom Round Fields */}
                                                        {Array.isArray(round.customFields) && round.customFields.length > 0 && (
                                                            <div className="mt-2.5 mb-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Custom Round Details</span>
                                                                <div className="grid grid-cols-1 gap-2 text-xs">
                                                                    {round.customFields.map((cf, i) => (
                                                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-xs">
                                                                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider shrink-0">{cf.key}:</span>
                                                                            <span className="font-medium text-xs text-slate-800 break-all select-all hover:text-indigo-600" title={cf.value}>{cf.value || '—'}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Evaluation Results Overlay */}
                                                        {hasVisibleFeedback && !isEvaluating && (
                                                            <div className={`rounded-lg p-4 border ${['Passed', 'Shortlisted'].includes(effectiveRoundStatus) ? 'bg-emerald-50/60 border-emerald-100' : ['Failed', 'Rejected'].includes(effectiveRoundStatus) ? 'bg-red-50/60 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                                                                <div className="flex items-start gap-2">
                                                                    <MessageSquare size={16} className="text-slate-400 mt-0.5" />
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Evaluator Feedback</p>
                                                                            {round.rating && (
                                                                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${['Failed', 'Rejected'].includes(effectiveRoundStatus) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                                                                    ⭐ {round.rating}/10
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{round.feedback}</p>

                                                                        {round.skillRatings && round.skillRatings.some(sr => sr.rating > 0) && (
                                                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {round.skillRatings.map((sr, idx) => (
                                                                                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white/60 px-2.5 py-1.5 rounded-lg border border-slate-200/50 shadow-sm">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <span className={`w-1.5 h-1.5 rounded-full ${sr.rating > 0 ? 'bg-blue-400' : 'bg-slate-300'}`}></span>
                                                                                            <span className={`text-slate-600 font-semibold ${sr.rating === 0 ? 'opacity-50' : ''}`}>{sr.skill}</span>
                                                                                        </div>
                                                                                        <span className={`${sr.rating > 0 ? 'font-black text-blue-700' : 'font-medium text-slate-400'}`}>{sr.rating}/10</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {round.evaluatedBy && (
                                                                            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                                                                                <span>Evaluated by <span className="font-medium text-slate-700">{round.evaluatedBy.firstName} {round.evaluatedBy.lastName}</span></span>
                                                                                {round.evaluatedAt && <span>{format(new Date(round.evaluatedAt), 'PP')}</span>}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* CTA to Evaluate / Edit Feedback */}
                                                        {(canEvaluate || canEditFeedback) && !isEvaluating && !isEditingRound && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                                                {canEvaluate && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEvaluatingRoundId(round._id);
                                                                            setEvaluationForm({
                                                                                skillRatings: (candidate.skillRatings || [])
                                                                                    .filter(sr => {
                                                                                        const s = sr.skill.toLowerCase();
                                                                                        const isMustHave = sr.category === 'Must-Have';
                                                                                        return isMustHave && s !== 'tat' && s !== 'rate' && s !== 'billing rate';
                                                                                    })
                                                                                    .map(sr => ({ ...sr, rating: 0 })),
                                                                                feedback: '',
                                                                                status: '',
                                                                                showAssessment: false,
                                                                                manualSkillName: ''
                                                                            });
                                                                        }}
                                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                                    >
                                                                        Submit Evaluation
                                                                    </button>
                                                                )}
                                                                {canEditFeedback && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setEvaluatingRoundId(round._id);
                                                                            setEvaluationForm({
                                                                                status: ['Passed', 'Failed', 'Skipped'].includes(round.status)
                                                                                    ? round.status
                                                                                    : 'Passed',
                                                                                feedback: round.feedback || '',
                                                                                rating: round.rating || '',
                                                                                skillRatings: round.skillRatings && round.skillRatings.length > 0
                                                                                    ? round.skillRatings
                                                                                    : (candidate.skillRatings || []),
                                                                                showAssessment: Boolean(round.skillRatings && round.skillRatings.length > 0),
                                                                                manualSkillName: ''
                                                                            });
                                                                        }}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                                                                    >
                                                                        <Edit2 size={14} /> Edit Feedback
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Edit Form */}
                                                        {isEditingRound && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                                    <h5 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                                        <Edit2 size={16} /> Edit Interview Card Details
                                                                    </h5>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Round Level/Title *</label>
                                                                            <input
                                                                                type="text"
                                                                                value={editingRoundForm.levelName}
                                                                                onChange={(e) => setEditingRoundForm({ ...editingRoundForm, levelName: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Round Status</label>
                                                                            <select
                                                                                value={editingRoundForm.status}
                                                                                onChange={(e) => setEditingRoundForm({ ...editingRoundForm, status: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                                                            >
                                                                                <option value="Scheduled">Scheduled</option>
                                                                                <option value="Pending">Pending</option>
                                                                                <option value="Shortlisted">Shortlisted</option>
                                                                                <option value="Rejected">Rejected</option>
                                                                                <option value="Did not Turn up">Did not Turn up</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Scheduled Date & Time</label>
                                                                            <input
                                                                                type="datetime-local"
                                                                                value={editingRoundForm.scheduledDate}
                                                                                onChange={(e) => setEditingRoundForm({ ...editingRoundForm, scheduledDate: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Assign Interviewer</label>
                                                                            <select
                                                                                value={editingRoundForm.assignedTo}
                                                                                onChange={(e) => setEditingRoundForm({ ...editingRoundForm, assignedTo: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                                                            >
                                                                                <option value="">-- Unassigned --</option>
                                                                                {(() => {
                                                                                    const pool = interviewers.length > 0 ? [...interviewers] : [...users];
                                                                                    if (editingRoundForm.assignedTo && !pool.some(u => u._id === editingRoundForm.assignedTo)) {
                                                                                        const currentAssigned = users.find(u => u._id === editingRoundForm.assignedTo);
                                                                                        if (currentAssigned) pool.push(currentAssigned);
                                                                                    }
                                                                                    return pool.map(u => (
                                                                                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                                                                    ));
                                                                                })()}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Overall Rating (1-10)</label>
                                                                            <select
                                                                                value={editingRoundForm.rating}
                                                                                onChange={(e) => setEditingRoundForm({ ...editingRoundForm, rating: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                                                            >
                                                                                <option value="">-- No Rating --</option>
                                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                                                    <option key={n} value={n}>{n} / 10</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Assign After Stage</label>
                                                                            <select
                                                                                value={editingRoundForm.assignAfterStage || (currentPhase === 2 ? 'Shortlisted' : 'Interested')}
                                                                                onChange={(e) => setEditingRoundForm({ ...editingRoundForm, assignAfterStage: e.target.value })}
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                                                            >
                                                                                {currentPhase === 2 ? (
                                                                                    <>
                                                                                        <option value="Profile Shared">Profile Shared</option>
                                                                                        <option value="Shortlisted">Shortlisted</option>
                                                                                        <option value="Selected">Selected</option>
                                                                                        <option value="Rejected">Rejected</option>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <option value="Total Sourced">Total Sourced</option>
                                                                                        <option value="Interested">Interested</option>
                                                                                        <option value="Shortlisted">Shortlisted</option>
                                                                                        <option value="Profile Shared">Profile Shared</option>
                                                                                    </>
                                                                                )}
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mb-4">
                                                                        <label className="block text-xs font-medium text-slate-500 mb-1">Evaluator Feedback / Remarks</label>
                                                                        <textarea
                                                                            rows={3}
                                                                            placeholder="Enter interviewer feedback, evaluation remarks, or notes..."
                                                                            value={editingRoundForm.feedback}
                                                                            onChange={(e) => setEditingRoundForm({ ...editingRoundForm, feedback: e.target.value })}
                                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                        />
                                                                    </div>

                                                                    {/* Custom Fields Editor for Round Edit */}
                                                                    <div className="border-t border-slate-200 pt-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-xs font-bold text-slate-700">
                                                                                Custom Fields (Meeting Link, Location, Topics)
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingRoundForm(prev => ({
                                                                                    ...prev,
                                                                                    customFields: [...(prev.customFields || []), { key: '', value: '' }]
                                                                                }))}
                                                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                                            >
                                                                                <Plus size={13} /> Add Field
                                                                            </button>
                                                                        </div>
                                                                        {(!editingRoundForm.customFields || editingRoundForm.customFields.length === 0) ? (
                                                                            <p className="text-xs text-slate-400 italic">No custom fields added.</p>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                {editingRoundForm.customFields.map((field, idx) => (
                                                                                    <div key={idx} className="flex items-center gap-2">
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="Key (e.g. Meeting Link)"
                                                                                            value={field.key}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...editingRoundForm.customFields];
                                                                                                updated[idx].key = e.target.value;
                                                                                                setEditingRoundForm(prev => ({ ...prev, customFields: updated }));
                                                                                            }}
                                                                                            className="w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                                                                                        />
                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="Value (e.g. https://meet.google.com/xyz)"
                                                                                            value={field.value}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...editingRoundForm.customFields];
                                                                                                updated[idx].value = e.target.value;
                                                                                                setEditingRoundForm(prev => ({ ...prev, customFields: updated }));
                                                                                            }}
                                                                                            className="w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                const updated = editingRoundForm.customFields.filter((_, i) => i !== idx);
                                                                                                setEditingRoundForm(prev => ({ ...prev, customFields: updated }));
                                                                                            }}
                                                                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                                                        >
                                                                                            <X size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => setEditingRoundId(null)}
                                                                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleEditRound(round._id)}
                                                                            disabled={actionLoading}
                                                                            className="px-5 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                                                        >
                                                                            {actionLoading && <Loader size={14} className="animate-spin" />} Save Changes
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Evaluation Form */}
                                                        {isEvaluating && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                                    <h5 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                                                        <CheckCircle size={16} /> Complete Round Assessment
                                                                    </h5>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-slate-700 mb-2">Decision Result *</label>
                                                                            <div className="w-full">
                                                                                <select
                                                                                    name={`status-${round._id}`}
                                                                                    value={evaluationForm.status || ''}
                                                                                    onChange={(e) => setEvaluationForm({ ...evaluationForm, status: e.target.value })}
                                                                                    className="w-full md:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 bg-white outline-none"
                                                                                >
                                                                                    <option value="">-- Select Result --</option>
                                                                                    <option value="Passed">Shortlisted</option>
                                                                                    <option value="Failed">Rejected</option>
                                                                                    <option value="Skipped">Did not turn up</option>
                                                                                    <option value="Left in between">Left in between</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>

                                                                        {/* Assessment and rating are available for both pass and fail outcomes */}
                                                                        {['Passed', 'Failed'].includes(evaluationForm.status) && (
                                                                            <>
                                                                                <div className="mb-4">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setEvaluationForm(prev => ({ ...prev, showAssessment: !prev.showAssessment }))}
                                                                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${evaluationForm.showAssessment
                                                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                                                            : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                                                                                            }`}
                                                                                    >
                                                                                        <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                                                            {evaluationForm.showAssessment ? <CheckCircle size={16} /> : <Plus size={16} />}
                                                                                            Comprehensive Skill Assessment
                                                                                        </span>
                                                                                        <span className="text-[10px] opacity-80">
                                                                                            {evaluationForm.showAssessment ? 'Click to Close' : 'Click to Open & Rate'}
                                                                                        </span>
                                                                                    </button>

                                                                                    {evaluationForm.showAssessment && (
                                                                                        <div className="mt-2 bg-white/80 p-4 rounded-xl border border-blue-100 shadow-inner animate-in fade-in slide-in-from-top-1 duration-200">
                                                                                            <div className="space-y-4">
                                                                                                {/* Manual Add Skills */}
                                                                                                <div className="flex gap-2 p-1 bg-blue-50/50 rounded-lg border border-blue-100">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        placeholder="Enter skill name (e.g. Java, Leadership)..."
                                                                                                        value={evaluationForm.manualSkillName || ''}
                                                                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, manualSkillName: e.target.value })}
                                                                                                        className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm"
                                                                                                    />
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            if (!evaluationForm.manualSkillName?.trim()) return;
                                                                                                            const newSkill = {
                                                                                                                skill: evaluationForm.manualSkillName.trim(),
                                                                                                                rating: 0,
                                                                                                                category: 'Must-Have'
                                                                                                            };
                                                                                                            setEvaluationForm({
                                                                                                                ...evaluationForm,
                                                                                                                skillRatings: [...(evaluationForm.skillRatings || []), newSkill],
                                                                                                                manualSkillName: ''
                                                                                                            });
                                                                                                        }}
                                                                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
                                                                                                    >
                                                                                                        <Plus size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Add</span>
                                                                                                    </button>
                                                                                                </div>

                                                                                                {/* Skills List */}
                                                                                                <div className="space-y-4">
                                                                                                    {evaluationForm.skillRatings && evaluationForm.skillRatings
                                                                                                        .filter(sr => {
                                                                                                            const s = (sr.skill || '').toLowerCase();
                                                                                                            return sr.category === 'Must-Have' && s !== 'tat' && s !== 'rate' && s !== 'billing rate';
                                                                                                        }).length > 0 ? (
                                                                                                        evaluationForm.skillRatings
                                                                                                            .filter(sr => {
                                                                                                                const s = (sr.skill || '').toLowerCase();
                                                                                                                return sr.category === 'Must-Have' && s !== 'tat' && s !== 'rate' && s !== 'billing rate';
                                                                                                            })
                                                                                                            .map((sr, idx) => {
                                                                                                                const originalIdx = evaluationForm.skillRatings.findIndex(orig => orig.skill === sr.skill);
                                                                                                                return (
                                                                                                                    <div key={idx} className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                            <span className="text-sm font-semibold text-slate-700">{sr.skill}</span>
                                                                                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-red-50 text-red-500`}>
                                                                                                                                Must-Have
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                        <div className="flex items-center gap-1 mt-2">
                                                                                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                                                                                                                                <button
                                                                                                                                    key={star}
                                                                                                                                    type="button"
                                                                                                                                    onClick={() => {
                                                                                                                                        const updated = [...evaluationForm.skillRatings];
                                                                                                                                        if (originalIdx !== -1) {
                                                                                                                                            updated[originalIdx].rating = star;
                                                                                                                                            setEvaluationForm({ ...evaluationForm, skillRatings: updated });
                                                                                                                                        }
                                                                                                                                    }}
                                                                                                                                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${sr.rating >= star
                                                                                                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                                                                                                        : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-400'
                                                                                                                                        }`}
                                                                                                                                >
                                                                                                                                    {star}
                                                                                                                                </button>
                                                                                                                            ))}
                                                                                                                            <span className="ml-2 text-xs font-black text-blue-700 w-8">{sr.rating}/10</span>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                );
                                                                                                            })
                                                                                                    ) : (
                                                                                                        <p className="text-center text-xs text-slate-400 py-4 italic">No must-have skills found for this assessment.</p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                                                                        Performance Rating
                                                                                        <span className="ml-1 text-xs text-slate-400 font-normal">(Optional, 1-10)</span>
                                                                                    </label>
                                                                                    <select
                                                                                        value={evaluationForm.rating}
                                                                                        onChange={(e) => setEvaluationForm({ ...evaluationForm, rating: e.target.value })}
                                                                                        className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                                                                                    >
                                                                                        <option value="">-- Select Rating --</option>
                                                                                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                                                                                            <option key={n} value={n}>{n} / 10{n === 10 ? ' — Outstanding' : n >= 8 ? ' — Excellent' : n >= 6 ? ' — Good' : n >= 4 ? ' — Average' : ' — Poor'}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>
                                                                            </>
                                                                        )}

                                                                        <div>
                                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Qualitative Feedback / Remarks *</label>
                                                                            <textarea
                                                                                rows={3}
                                                                                value={evaluationForm.feedback}
                                                                                onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                                                                                placeholder="Detail the candidate's performance, strengths, and weaknesses observed in this round..."
                                                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                                                            ></textarea>
                                                                        </div>
                                                                        <div className="flex justify-end gap-2 pt-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEvaluatingRoundId(null);
                                                                                    setEvaluationForm({ status: '', feedback: '', rating: '', skillRatings: [], showAssessment: false, manualSkillName: '' });
                                                                                }}
                                                                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                            <button
                                                                                onClick={() => submitEvaluation(round._id)}
                                                                                disabled={actionLoading}
                                                                                className="px-5 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                                                            >
                                                                                {actionLoading && <Loader size={14} className="animate-spin" />}
                                                                                {canEditFeedback ? 'Update Feedback' : 'Submit Decision'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {/* Inline Resume Viewer (Displayed below Interview Timeline in full details page, or full-width in Quick Profile View) */}
                {hasResume ? (
                    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${isSidePanel ? 'h-[calc(100vh-160px)] min-h-[600px]' : 'min-h-125 h-[650px]'}`}>
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <FileText size={16} className="text-blue-500" /> Resume Preview
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadResume}
                                    disabled={isDownloadingResume || isDeletingResume}
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-900 transition-colors bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {isDownloadingResume ? <Loader size={14} className="animate-spin" /> : <Download size={14} />} Download Resume
                                </button>
                                <a
                                    href={resolvedResumeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 shadow-sm"
                                >
                                    <ExternalLink size={14} /> Open in new tab
                                </a>
                                {canManageCandidateEdits && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteResume}
                                        disabled={isDeletingResume || isDownloadingResume}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 shadow-sm disabled:opacity-50"
                                        title="Delete Resume"
                                    >
                                        {isDeletingResume ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Resume
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="scrollbar-hide w-full flex-1 overflow-hidden bg-white">
                            <DocPreviewer url={resolvedResumeUrl} title="Resume Preview" />
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
                        <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">No Resume Document Attached</p>
                        <p className="text-xs text-slate-400 mt-1">This candidate profile does not have a PDF/Word resume file uploaded.</p>
                    </div>
                )}

                {/* Internal Remark Card (Only shown on full page) */}
                {!isSidePanel && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Internal Remark</h3>
                            {!internalRemarkEditing && (
                                <button
                                    onClick={() => { setInternalRemarkText(candidate.internalRemark || ''); setInternalRemarkEditing(true); }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                                >
                                    <Edit2 size={12} /> {candidate.internalRemark ? 'Edit' : 'Add Remark'}
                                </button>
                            )}
                        </div>
                        {internalRemarkEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    rows={4}
                                    value={internalRemarkText}
                                    onChange={(e) => setInternalRemarkText(e.target.value)}
                                    placeholder="Add an internal remark about this candidate..."
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setInternalRemarkEditing(false)}
                                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateInternalRemark}
                                        disabled={internalRemarkLoading}
                                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {internalRemarkLoading && <Loader size={12} className="animate-spin" />} Save Remark
                                    </button>
                                </div>
                            </div>
                        ) : candidate.internalRemark ? (
                            <p className="text-slate-700 text-sm p-3 bg-slate-50 rounded-lg border border-slate-100 whitespace-pre-wrap">{candidate.internalRemark}</p>
                        ) : (
                            <p className="text-slate-400 text-sm italic">No remark added yet. Click "Add Remark" to write one.</p>
                        )}
                    </div>
                )}

                </div>
            </div>

            {isProfileReviewOpen && (
                <ProfileReviewModal
                    application={candidate}
                    onClose={() => setIsProfileReviewOpen(false)}
                />
            )}

            {/* Send Interview Round Mail Modal */}
            {sendingMailRound && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs p-4 pt-12 overflow-y-auto">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl lg:max-w-6xl w-full p-6 space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <Mail className="text-indigo-600" size={20} />
                                    Send Interview Email: {sendingMailRound.levelName}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Configure sender settings, custom fields, and preview live email content before sending
                                </p>
                            </div>
                            <button
                                onClick={() => setSendingMailRound(null)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Side-by-Side 2-Column Desktop Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Left Column: Email Configuration & Content Customization Editor */}
                            <div className="lg:col-span-6 space-y-4 text-xs">
                                {/* Mail Configuration */}
                                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                                        Mail Configuration
                                    </h4>

                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Email Template</label>
                                        <select
                                            value={sendMailForm.emailTemplateId}
                                            onChange={(e) => {
                                                const tplId = e.target.value;
                                                setSendMailForm(prev => ({ ...prev, emailTemplateId: tplId, customSubject: '', customHtmlBody: '' }));
                                                fetchMailPreview(sendingMailRound._id, tplId);
                                            }}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                                        >
                                            <option value="">Default Interview Schedule Template</option>
                                            {emailTemplates.map(t => (
                                                <option key={t._id} value={t._id}>{t.name} ({t.type})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Sender Email Account</label>
                                        <select
                                            value={sendMailForm.emailAccountId}
                                            onChange={(e) => setSendMailForm(prev => ({ ...prev, emailAccountId: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                                        >
                                            {senderOptions.map(opt => (
                                                <option key={opt._id} value={opt._id}>
                                                    {opt.label || `${opt.fromName || opt.name || 'Sender Account'} (${opt.fromAddress || opt.email || ''})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-semibold text-slate-700 mb-1">CC Email(s)</label>
                                            <input
                                                type="text"
                                                placeholder="Comma separated"
                                                value={sendMailForm.cc}
                                                onChange={(e) => setSendMailForm(prev => ({ ...prev, cc: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-slate-700 mb-1">BCC Email(s)</label>
                                            <input
                                                type="text"
                                                placeholder="Comma separated"
                                                value={sendMailForm.bcc}
                                                onChange={(e) => setSendMailForm(prev => ({ ...prev, bcc: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Email Recipients Options */}
                                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                                        <span className="block font-bold text-slate-700 text-xs uppercase tracking-wider">
                                            Email Recipients Configuration
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${sendMailForm.sendCandidateEmail !== false ? 'bg-indigo-50/60 border-indigo-200' : 'bg-white border-slate-200 opacity-75'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={sendMailForm.sendCandidateEmail !== false}
                                                    onChange={(e) => setSendMailForm(prev => ({ ...prev, sendCandidateEmail: e.target.checked }))}
                                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="text-xs">
                                                    <span className="font-bold text-slate-800 block">Send to Candidate</span>
                                                    <span className="text-[11px] text-slate-500 block truncate">{candidate?.candidateName || 'Candidate'} ({candidate?.email || 'No email'})</span>
                                                </div>
                                            </label>
                                            <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${sendMailForm.sendInterviewerEmail !== false ? 'bg-indigo-50/60 border-indigo-200' : 'bg-white border-slate-200 opacity-75'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={sendMailForm.sendInterviewerEmail !== false}
                                                    onChange={(e) => setSendMailForm(prev => ({ ...prev, sendInterviewerEmail: e.target.checked }))}
                                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="text-xs">
                                                    <span className="font-bold text-slate-800 block">Send to Interviewer(s)</span>
                                                    <span className="text-[11px] text-slate-500 block truncate">Assigned Evaluators</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Custom Fields */}
                                    <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                                                Custom Fields (Meeting Link, Location, Topics)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = [...(sendMailForm.customFields || []), { key: '', value: '' }];
                                                    setSendMailForm(prev => ({ ...prev, customFields: updated }));
                                                    fetchMailPreview(sendingMailRound._id, sendMailForm.emailTemplateId, updated);
                                                }}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                                            >
                                                <Plus size={12} /> Add Field
                                            </button>
                                        </div>

                                        {(!sendMailForm.customFields || sendMailForm.customFields.length === 0) ? (
                                            <p className="text-[11px] text-indigo-700/70 italic">No custom meeting details attached. Click "Add Field" to include links or location.</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {sendMailForm.customFields.map((cf, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Key (e.g. Meeting Link)"
                                                            value={cf.key}
                                                            onChange={(e) => {
                                                                const updated = [...sendMailForm.customFields];
                                                                updated[idx].key = e.target.value;
                                                                setSendMailForm(prev => ({ ...prev, customFields: updated }));
                                                                fetchMailPreview(sendingMailRound._id, sendMailForm.emailTemplateId, updated);
                                                            }}
                                                            className="w-5/12 px-2 py-1 border border-indigo-200/80 rounded-lg text-xs bg-white outline-none focus:border-indigo-500 font-medium"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Value (e.g. Google Meet link)"
                                                            value={cf.value}
                                                            onChange={(e) => {
                                                                const updated = [...sendMailForm.customFields];
                                                                updated[idx].value = e.target.value;
                                                                setSendMailForm(prev => ({ ...prev, customFields: updated }));
                                                                fetchMailPreview(sendingMailRound._id, sendMailForm.emailTemplateId, updated);
                                                            }}
                                                            className="w-6/12 px-2 py-1 border border-indigo-200/80 rounded-lg text-xs bg-white outline-none focus:border-indigo-500 font-medium"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = sendMailForm.customFields.filter((_, i) => i !== idx);
                                                                setSendMailForm(prev => ({ ...prev, customFields: updated }));
                                                                fetchMailPreview(sendingMailRound._id, sendMailForm.emailTemplateId, updated);
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Candidate-Specific Email Customization Editor */}
                                <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3 shadow-xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                                            <Edit3 size={14} className="text-indigo-600" /> Edit Content for this Candidate
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSendMailForm(prev => ({
                                                    ...prev,
                                                    customSubject: mailPreview?.rawSubject || mailPreview?.subject || '',
                                                    customHtmlBody: mailPreview?.rawBody || mailPreview?.htmlBody || ''
                                                }));
                                                toast.success('Reset to default template');
                                            }}
                                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Subject Line</label>
                                        <input
                                            type="text"
                                            value={sendMailForm.customSubject !== '' ? sendMailForm.customSubject : (mailPreview?.rawSubject || mailPreview?.subject || '')}
                                            onChange={(e) => setSendMailForm(prev => ({ ...prev, customSubject: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Enter customized email subject line..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Body Content (Template Placeholders Supported)</label>
                                        <textarea
                                            rows={8}
                                            value={sendMailForm.customHtmlBody !== '' ? sendMailForm.customHtmlBody : (mailPreview?.rawBody || mailPreview?.htmlBody || '')}
                                            onChange={(e) => setSendMailForm(prev => ({ ...prev, customHtmlBody: e.target.value }))}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                                            placeholder="Enter customized email body..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Live Email Dispatch Preview Side-by-Side */}
                            <div className="lg:col-span-6 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 sticky top-4">
                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                            <Eye size={15} className="text-indigo-600" /> Preview:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewRecipientTab('candidate')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${previewRecipientTab === 'candidate' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            Candidate View
                                        </button>
                                        {mailPreview?.interviewerHtmlBody && (
                                            <button
                                                type="button"
                                                onClick={() => setPreviewRecipientTab('interviewer')}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${previewRecipientTab === 'interviewer' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                            >
                                                Interviewer View
                                            </button>
                                        )}
                                    </div>
                                    {previewLoading && <Loader size={14} className="animate-spin text-indigo-600" />}
                                </div>

                                {mailPreview ? (
                                    <div className="space-y-3 text-xs">
                                        {previewRecipientTab === 'candidate' ? (
                                            <>
                                                <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                                                    <span className="font-bold text-slate-500">To Candidate:</span>
                                                    <span className="bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-lg border border-indigo-100">
                                                        {mailPreview.candidateName} ({mailPreview.candidateEmail || 'No Email'})
                                                    </span>
                                                </div>

                                                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-slate-500 block mb-0.5">Subject Line:</span>
                                                        <p className="font-semibold text-slate-800 text-xs">
                                                            {mailPreview.subject}
                                                        </p>
                                                    </div>
                                                    {Boolean(sendMailForm.customSubject || sendMailForm.customHtmlBody) && (
                                                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                                                            Live Custom Edits
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Live Email Body Preview Frame */}
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto shadow-xs">
                                                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-2 border-b pb-1">
                                                        Compiled Candidate Email Body:
                                                    </span>
                                                    <div
                                                        className="prose prose-xs max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap"
                                                        dangerouslySetInnerHTML={{ __html: mailPreview.htmlBody }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                                                    <span className="font-bold text-slate-500">To Interviewer(s):</span>
                                                    {mailPreview.interviewers?.length > 0 ? (
                                                        mailPreview.interviewers.map(i => (
                                                            <span key={i.email} className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                                                                {i.name} ({i.email})
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-slate-400 italic">No interviewers assigned yet</span>
                                                    )}
                                                </div>

                                                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-slate-500 block mb-0.5">Subject Line:</span>
                                                        <p className="font-semibold text-slate-800 text-xs">
                                                            {mailPreview.interviewerSubject || `[Interviewer Notice] Interview Scheduled: ${sendingMailRound?.levelName || 'Round'} - ${mailPreview.candidateName}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Live Email Body Preview Frame */}
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto shadow-xs">
                                                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider mb-2 border-b pb-1">
                                                        Compiled Interviewer Assignment Notice:
                                                    </span>
                                                    <div
                                                        className="prose prose-xs max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap"
                                                        dangerouslySetInnerHTML={{ __html: mailPreview.interviewerHtmlBody }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-xs py-8 text-center">Loading live email preview details...</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSendingMailRound(null)}
                                disabled={isSendingMail}
                                className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendRoundEmail}
                                disabled={isSendingMail}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm hover:shadow disabled:opacity-50"
                            >
                                {isSendingMail ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                                Send Email Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sent Email Details View Modal */}
            {viewingMailDetails && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs p-4 pt-12 overflow-y-auto">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl lg:max-w-6xl w-full p-6 space-y-4 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Dispatched Email Record</h3>
                                    <p className="text-xs text-slate-500">
                                        Email details for <span className="font-semibold text-slate-700">{viewingMailDetails.roundName || 'Interview Round'}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingMailDetails(null)}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3 text-[11px]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                <div>
                                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Dispatched At:</span>
                                    <p className="font-semibold text-slate-800 text-xs">
                                        {viewingMailDetails.sentAt ? format(new Date(viewingMailDetails.sentAt), 'PPpp') : 'Sent'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Recipient Candidate:</span>
                                    <p className="font-semibold text-slate-800 text-xs">
                                        {viewingMailDetails.candidateEmail || candidate?.email || 'N/A'}
                                    </p>
                                </div>
                                {viewingMailDetails.cc && (
                                    <div>
                                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-0.5">CC Emails:</span>
                                        <p className="font-medium text-slate-700 text-xs">{viewingMailDetails.cc}</p>
                                    </div>
                                )}
                                {viewingMailDetails.bcc && (
                                    <div>
                                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-0.5">BCC Emails:</span>
                                        <p className="font-medium text-slate-700 text-xs">{viewingMailDetails.bcc}</p>
                                    </div>
                                )}
                                {Array.isArray(viewingMailDetails.interviewers) && viewingMailDetails.interviewers.length > 0 && (
                                    <div className="md:col-span-2">
                                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Assigned Interviewer(s) Notified:</span>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {viewingMailDetails.interviewers.map((inv, idx) => (
                                                <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-700">
                                                    {inv.name} ({inv.email || 'N/A'})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-0.5">Subject:</span>
                                <p className="font-bold text-slate-800 text-xs">{viewingMailDetails.subject || 'Interview Invitation'}</p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 min-h-[220px] max-h-[500px] overflow-y-auto shadow-xs">
                                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-2 border-b pb-1">
                                    Actual Dispatched Email Content:
                                </span>
                                <div
                                    className="text-xs text-slate-700 leading-normal whitespace-pre-wrap font-normal"
                                    dangerouslySetInnerHTML={{ __html: viewingMailDetails.htmlBody || '<p className="text-slate-400 italic">No HTML content logged.</p>' }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            {viewingMailDetails.roundRef && canScheduleRounds && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const targetRound = viewingMailDetails.roundRef;
                                        setViewingMailDetails(null);
                                        openSendMailModal(targetRound);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition"
                                >
                                    <Mail size={14} /> Resend Email
                                </button>
                            )}
                            <div className="ml-auto">
                                <button
                                    onClick={() => setViewingMailDetails(null)}
                                    className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateDetails;
