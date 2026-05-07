import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, Calendar, CheckCircle, Clock3, Download, Eye, FileText, Loader, Mail, Menu, MoreVertical, Plus, Search, SlidersHorizontal, ThumbsDown, ThumbsUp, Upload, Users, UserCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../../../api/axios';
import Skeleton from '../../../components/Skeleton';
import { useAuth } from '../../../context/AuthContext';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import BulkCandidateImport from '../BulkCandidateImport';
import BulkResumeImport from '../BulkResumeImport';
import MassMailModal from '../MassMailModal';
import BulkTransferModal from '../BulkTransferModal';


const TOTAL_CANDIDATE_CARD_KEY = 'total_candidates';
const INTERVIEWS_CARD_KEY = 'interviews';

const getPhaseEntryForOrder = (candidate, phaseOrder) => {
    const matches = (candidate?.phaseHistory || []).filter((entry) => Number(entry.phaseOrder) === Number(phaseOrder));
    if (!matches.length) {
        return null;
    }

    return matches.sort((left, right) => {
        const leftTime = left?.enteredAt ? new Date(left.enteredAt).getTime() : 0;
        const rightTime = right?.enteredAt ? new Date(right.enteredAt).getTime() : 0;
        return rightTime - leftTime;
    })[0];
};

const getInterviewStatusSummary = (rounds = []) => {
    if (!rounds || rounds.length === 0) {
        return { label: 'No rounds', color: 'text-slate-400 bg-slate-50 border-slate-200' };
    }

    const total = rounds.length;
    const completedRounds = rounds.filter((round) => round.feedback && (round.rating || round.rating === 0));
    const completedCount = completedRounds.length;
    const failedRounds = rounds.filter((round) => round.status === 'Failed');
    const scheduledRounds = rounds.filter((round) => (round.status === 'Scheduled' || round.status === 'Pending') && !round.feedback);

    if (failedRounds.length > 0) {
        const failedNames = failedRounds.map((round) => round.levelName).join(', ');
        return { label: `Failed: ${failedNames}`, color: 'text-red-700 bg-red-50 border-red-200' };
    }

    if (scheduledRounds.length > 0 && completedCount === 0) {
        return { label: 'Scheduled', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    }

    if (completedCount < total) {
        return { label: `${completedCount}/${total} Completed`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }

    if (completedCount === total && total > 0) {
        return { label: 'All Passed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }

    return { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' };
};

const cloneCardVisibilityConfig = (config = []) => (
    (Array.isArray(config) ? config : []).map((entry) => ({
        phaseOrder: Number(entry.phaseOrder),
        visibleCardKeys: Array.isArray(entry.visibleCardKeys) ? [...entry.visibleCardKeys] : []
    }))
);

const getCardDefinitionsForPhase = (phase) => {
    if (!phase) return [];

    return [
        {
            key: TOTAL_CANDIDATE_CARD_KEY,
            label: 'Total Candidate',
            color: phase.color || '#2563EB'
        },
        {
            key: INTERVIEWS_CARD_KEY,
            label: 'Interviews',
            color: '#F59E0B'
        },
        ...((phase.statusOptions || []).map((statusOption) => ({
            key: `status:${statusOption.value}`,
            label: statusOption.label,
            color: statusOption.color || '#3B82F6'
        }))),
        ...((phase.decisionOptions || []).map((decisionOption) => ({
            key: `decision:${decisionOption.value}`,
            label: decisionOption.label,
            color: decisionOption.color || '#10B981'
        })))
    ];
};

const getVisibleCardKeysForPhase = (phase, config = []) => {
    const definitions = getCardDefinitionsForPhase(phase);
    const availableKeys = definitions.map((item) => item.key);
    const entry = (Array.isArray(config) ? config : []).find((item) => Number(item.phaseOrder) === Number(phase?.order));

    if (!entry) {
        return availableKeys;
    }

    return (Array.isArray(entry.visibleCardKeys) ? entry.visibleCardKeys : []).filter((key) => availableKeys.includes(key));
};

const normalizeCardVisibilityPayload = (phases = [], config = []) => {
    return cloneCardVisibilityConfig(config)
        .map((entry) => {
            const phase = phases.find((item) => Number(item.order) === Number(entry.phaseOrder));
            if (!phase) return null;

            const availableKeys = getCardDefinitionsForPhase(phase).map((item) => item.key);
            return {
                phaseOrder: Number(entry.phaseOrder),
                visibleCardKeys: entry.visibleCardKeys.filter((key) => availableKeys.includes(key))
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.phaseOrder - right.phaseOrder);
};

const getSummaryCardMeta = (cardKey, label) => {
    if (cardKey === TOTAL_CANDIDATE_CARD_KEY) {
        return { icon: Users, color: 'purple' };
    }

    if (cardKey === INTERVIEWS_CARD_KEY) {
        return { icon: Calendar, color: 'amber' };
    }

    if (cardKey.startsWith('status:')) {
        const normalized = String(label || '').toLowerCase();
        if (normalized.includes('interest')) return { icon: UserCheck, color: 'sky' };
        if (normalized.includes('not') || normalized.includes('reject')) return { icon: ThumbsDown, color: 'rose' };
        return { icon: Users, color: 'indigo' };
    }

    if (cardKey.startsWith('decision:')) {
        const normalized = String(label || '').toLowerCase();
        if (normalized.includes('shortlist') || normalized.includes('selected')) return { icon: ThumbsUp, color: 'sky' };
        if (normalized.includes('joined') || normalized.includes('accept')) return { icon: CheckCircle, color: 'emerald' };
        if (normalized.includes('reject') || normalized.includes('declined') || normalized.includes('no show')) return { icon: XCircle, color: 'rose' };
        if (normalized.includes('hold')) return { icon: Clock3, color: 'slate' };
        return { icon: FileText, color: 'blue' };
    }

    return { icon: FileText, color: 'blue' };
};

const DynamicPhaseView = ({ hiringRequest }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [phases, setPhases] = useState((hiringRequest?.phases || []).slice().sort((left, right) => left.order - right.order));
    const [activePhaseOrder, setActivePhaseOrder] = useState(phases[0]?.order || 1);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 300);
    const [statusFilter, setStatusFilter] = useState('All');
    const [decisionFilter, setDecisionFilter] = useState('All');
    const [pulledByFilter, setPulledByFilter] = useState('All');
    const [pulledByUsers, setPulledByUsers] = useState([]);
    const [actionLoadingId, setActionLoadingId] = useState('');
    const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
    const [showMassMailModal, setShowMassMailModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferPresetIds, setTransferPresetIds] = useState([]);
    const [showToolbarMenu, setShowToolbarMenu] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showBulkResumeImport, setShowBulkResumeImport] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, right: 0 });
    const [cardVisibilityConfig, setCardVisibilityConfig] = useState(() => cloneCardVisibilityConfig(hiringRequest?.candidateCardVisibility || []));
    const [draftCardVisibilityConfig, setDraftCardVisibilityConfig] = useState([]);
    const [showCardVisibilityModal, setShowCardVisibilityModal] = useState(false);
    const [visibilityEditorPhaseOrder, setVisibilityEditorPhaseOrder] = useState(phases[0]?.order || 1);
    const [savingCardVisibility, setSavingCardVisibility] = useState(false);

    const canEdit = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.edit');
    const canMakeDecisions = canEdit || user?.permissions?.includes('ta.decision');
    const canManualAdvance = user?.roles?.includes('Admin');
    const canCreate = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.create');
    const canMassMail = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.mass_mail') || user?.permissions?.includes('ta.edit');
    const canBulkTransfer = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.bulk_transfer') || user?.permissions?.includes('ta.edit');
    const canManageTemplates = user?.roles?.includes('Admin') || user?.permissions?.includes('ta.email_template.manage') || user?.permissions?.includes('ta.edit');

    useEffect(() => {
        if (hiringRequest?.phases?.length) {
            const orderedPhases = [...hiringRequest.phases].sort((left, right) => left.order - right.order);
            setPhases(orderedPhases);
            setActivePhaseOrder((current) => current || orderedPhases[0]?.order || 1);
            setVisibilityEditorPhaseOrder((current) => current || orderedPhases[0]?.order || 1);
            return;
        }

        const fetchPhases = async () => {
            try {
                const response = await api.get(`/ta/hiring-requests/${hiringRequest._id}/phases`);
                const fetchedPhases = (response.data?.phases || []).slice().sort((left, right) => left.order - right.order);
                setPhases(fetchedPhases);
                setActivePhaseOrder(fetchedPhases[0]?.order || 1);
                setVisibilityEditorPhaseOrder((current) => current || fetchedPhases[0]?.order || 1);
            } catch (error) {
                console.error('Failed to fetch dynamic phases:', error);
                toast.error(error.response?.data?.message || 'Failed to load requisition phases');
            }
        };

        fetchPhases();
    }, [hiringRequest]);

    const fetchCandidates = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/ta/candidates/${hiringRequest._id}`);
            setCandidates(response.data?.candidates || []);
        } catch (error) {
            console.error('Failed to fetch dynamic candidates:', error);
            toast.error(error.response?.data?.message || 'Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }, [hiringRequest._id]);

    useEffect(() => {
        if (hiringRequest?._id) {
            fetchCandidates();
        }
    }, [fetchCandidates, hiringRequest?._id]);

    useEffect(() => {
        const fetchPulledByUsers = async () => {
            try {
                const response = await api.get('/admin/users');
                const fetchedUsers = response.data?.success
                    ? (response.data.data || [])
                    : (Array.isArray(response.data) ? response.data : []);

                const filteredUsers = fetchedUsers.filter((candidateUser) => {
                    const roleNames = candidateUser.roles?.map((role) => role.name) || [];
                    if (roleNames.includes('Admin')) {
                        return true;
                    }

                    return (candidateUser.roles || []).some((role) => (
                        Array.isArray(role.permissions) && role.permissions
                            .map((permission) => (typeof permission === 'string' ? permission : permission.key))
                            .some((key) => key === 'ta.create' || key === '*')
                    ));
                });

                setPulledByUsers(filteredUsers);
            } catch (error) {
                console.error('Failed to fetch pulled-by users for dynamic phase filter:', error);
            }
        };

        fetchPulledByUsers();
    }, []);

    useEffect(() => {
        setCardVisibilityConfig(cloneCardVisibilityConfig(hiringRequest?.candidateCardVisibility || []));
    }, [hiringRequest?.candidateCardVisibility]);

    useEffect(() => {
        const handleClose = (event) => {
            const target = event?.target;
            if (target instanceof Element) {
                if (target.closest('[data-dynamic-action-menu-trigger]') || target.closest('[data-dynamic-action-menu-content]')) {
                    return;
                }
            }

            setShowToolbarMenu(false);
            setActiveActionMenu(null);
        };

        document.addEventListener('click', handleClose);
        window.addEventListener('scroll', handleClose, true);

        return () => {
            document.removeEventListener('click', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, []);

    const phaseCounts = useMemo(() => {
        const counts = new Map();
        phases.forEach((phase) => {
            const count = candidates.filter((candidate) => {
                if (Number(phase.order) === 1) {
                    return true;
                }
                return Number(candidate.currentPhaseOrder) === Number(phase.order);
            }).length;
            counts.set(phase.order, count);
        });
        return counts;
    }, [candidates, phases]);

    const activePhase = useMemo(
        () => phases.find((phase) => phase.order === activePhaseOrder) || phases[0] || null,
        [phases, activePhaseOrder]
    );
    const activePhaseIndex = useMemo(
        () => phases.findIndex((phase) => Number(phase.order) === Number(activePhase?.order)),
        [phases, activePhase]
    );
    const previousPhase = activePhaseIndex > 0 ? phases[activePhaseIndex - 1] : null;
    const nextPhase = activePhaseIndex >= 0 && activePhaseIndex < phases.length - 1 ? phases[activePhaseIndex + 1] : null;

    const phaseCandidates = useMemo(() => (
        candidates.filter((candidate) => {
            if (Number(activePhase?.order) === 1) {
                return true;
            }
            return Number(candidate.currentPhaseOrder) === Number(activePhase?.order);
        })
    ), [candidates, activePhase]);

    const pulledByOptions = useMemo(() => {
        const recruiterNames = pulledByUsers
            .map((candidateUser) => `${candidateUser.firstName || ''} ${candidateUser.lastName || ''}`.trim())
            .filter(Boolean);

        const options = [...new Set(recruiterNames)].sort((left, right) => left.localeCompare(right));
        if (pulledByFilter !== 'All' && pulledByFilter && !options.includes(pulledByFilter)) {
            return [...options, pulledByFilter].sort((left, right) => left.localeCompare(right));
        }

        return options;
    }, [pulledByFilter, pulledByUsers]);

    useEffect(() => {
        if (pulledByFilter !== 'All' && !pulledByOptions.includes(pulledByFilter)) {
            setPulledByFilter('All');
        }
    }, [pulledByFilter, pulledByOptions]);

    const filteredCandidates = useMemo(() => (
        phaseCandidates.filter((candidate) => {
            const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
            const currentDecision = phaseEntry?.decision || 'None';
            const haystack = `${candidate.candidateName || ''} ${candidate.email || ''}`.toLowerCase();
            const normalizedSearch = debouncedSearch.trim().toLowerCase();
            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesStatus = statusFilter === 'All' || phaseEntry?.status === statusFilter;
            const matchesDecision = decisionFilter === 'All' || currentDecision === decisionFilter;
            const matchesPulledBy = pulledByFilter === 'All' || String(candidate.profilePulledBy || '').trim() === pulledByFilter;
            return matchesSearch && matchesStatus && matchesDecision && matchesPulledBy;
        })
    ), [activePhase, debouncedSearch, decisionFilter, phaseCandidates, pulledByFilter, statusFilter]);

    useEffect(() => {
        const visibleIds = new Set(phaseCandidates.map((candidate) => candidate._id));
        setSelectedCandidateIds((prev) => prev.filter((id) => visibleIds.has(id)));
    }, [phaseCandidates]);

    const allVisibleSelected = filteredCandidates.length > 0 && filteredCandidates.every((candidate) => selectedCandidateIds.includes(candidate._id));

    const statusSummary = useMemo(() => {
        const summaryBase = phaseCandidates.filter((candidate) => {
            const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
            const currentDecision = phaseEntry?.decision || 'None';
            const haystack = `${candidate.candidateName || ''} ${candidate.email || ''}`.toLowerCase();
            const normalizedSearch = debouncedSearch.trim().toLowerCase();
            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesDecision = decisionFilter === 'All' || currentDecision === decisionFilter;
            const matchesPulledBy = pulledByFilter === 'All' || String(candidate.profilePulledBy || '').trim() === pulledByFilter;
            return matchesSearch && matchesDecision && matchesPulledBy;
        });

        return (activePhase?.statusOptions || []).map((statusOption) => ({
            ...statusOption,
            count: summaryBase.filter((candidate) => getPhaseEntryForOrder(candidate, activePhase?.order)?.status === statusOption.value).length
        }));
    }, [activePhase, debouncedSearch, decisionFilter, phaseCandidates, pulledByFilter]);

    const decisionSummary = useMemo(() => {
        const summaryBase = phaseCandidates.filter((candidate) => {
            const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
            const phaseStatus = phaseEntry?.status || '';
            const haystack = `${candidate.candidateName || ''} ${candidate.email || ''}`.toLowerCase();
            const normalizedSearch = debouncedSearch.trim().toLowerCase();
            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesStatus = statusFilter === 'All' || phaseStatus === statusFilter;
            const matchesPulledBy = pulledByFilter === 'All' || String(candidate.profilePulledBy || '').trim() === pulledByFilter;
            return matchesSearch && matchesStatus && matchesPulledBy;
        });

        return (activePhase?.decisionOptions || []).map((decisionOption) => ({
            ...decisionOption,
            count: summaryBase.filter((candidate) => (getPhaseEntryForOrder(candidate, activePhase?.order)?.decision || 'None') === decisionOption.value).length
        }));
    }, [activePhase, debouncedSearch, phaseCandidates, pulledByFilter, statusFilter]);

    const totalSourcedCount = useMemo(() => {
        return phaseCandidates.filter((candidate) => {
            const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
            const currentDecision = phaseEntry?.decision || 'None';
            const haystack = `${candidate.candidateName || ''} ${candidate.email || ''}`.toLowerCase();
            const normalizedSearch = debouncedSearch.trim().toLowerCase();
            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesDecision = decisionFilter === 'All' || currentDecision === decisionFilter;
            const matchesPulledBy = pulledByFilter === 'All' || String(candidate.profilePulledBy || '').trim() === pulledByFilter;
            return matchesSearch && matchesDecision && matchesPulledBy;
        }).length;
    }, [activePhase, debouncedSearch, decisionFilter, phaseCandidates, pulledByFilter]);

    const interviewsCount = useMemo(() => {
        return phaseCandidates.filter((candidate) => {
            const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
            const currentDecision = phaseEntry?.decision || 'None';
            const haystack = `${candidate.candidateName || ''} ${candidate.email || ''}`.toLowerCase();
            const normalizedSearch = debouncedSearch.trim().toLowerCase();
            const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
            const matchesDecision = decisionFilter === 'All' || currentDecision === decisionFilter;
            const rounds = (candidate.interviewRounds || []).filter((round) => Number(round.phase || 1) === Number(activePhase?.order || 1));
            const matchesPulledBy = pulledByFilter === 'All' || String(candidate.profilePulledBy || '').trim() === pulledByFilter;
            return matchesSearch && matchesDecision && matchesPulledBy && rounds.length > 0;
        }).length;
    }, [activePhase, debouncedSearch, decisionFilter, phaseCandidates, pulledByFilter]);

    const activeVisibleCardKeys = useMemo(
        () => getVisibleCardKeysForPhase(activePhase, cardVisibilityConfig),
        [activePhase, cardVisibilityConfig]
    );
    const visibleStatusSummary = useMemo(
        () => statusSummary.filter((statusOption) => activeVisibleCardKeys.includes(`status:${statusOption.value}`)),
        [activeVisibleCardKeys, statusSummary]
    );
    const visibleDecisionSummary = useMemo(
        () => decisionSummary.filter((decisionOption) => activeVisibleCardKeys.includes(`decision:${decisionOption.value}`)),
        [activeVisibleCardKeys, decisionSummary]
    );
    const showTotalCandidateCard = activeVisibleCardKeys.includes(TOTAL_CANDIDATE_CARD_KEY);
    const showInterviewsCard = activeVisibleCardKeys.includes(INTERVIEWS_CARD_KEY);
    const summaryColorMap = {
        purple: 'border-b-purple-500 text-purple-600',
        sky: 'border-b-sky-500 text-sky-600',
        amber: 'border-b-amber-500 text-amber-600',
        emerald: 'border-b-emerald-500 text-emerald-600',
        rose: 'border-b-rose-500 text-rose-600',
        slate: 'border-b-slate-500 text-slate-500',
        indigo: 'border-b-indigo-500 text-indigo-600',
        blue: 'border-b-blue-500 text-blue-600'
    };

    const visibilityEditorPhase = useMemo(
        () => phases.find((phase) => Number(phase.order) === Number(visibilityEditorPhaseOrder)) || phases[0] || null,
        [phases, visibilityEditorPhaseOrder]
    );

    const visibilityEditorCardDefinitions = useMemo(
        () => getCardDefinitionsForPhase(visibilityEditorPhase),
        [visibilityEditorPhase]
    );

    const visibilityEditorVisibleKeys = useMemo(
        () => getVisibleCardKeysForPhase(visibilityEditorPhase, draftCardVisibilityConfig),
        [draftCardVisibilityConfig, visibilityEditorPhase]
    );

    const toggleActionMenu = useCallback((event, candidateId) => {
        event.stopPropagation();

        if (activeActionMenu === candidateId) {
            setActiveActionMenu(null);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 220;
        const positionStyles = {
            right: Math.max(window.innerWidth - rect.right, 12)
        };

        if (spaceBelow < menuHeight && rect.top > menuHeight) {
            positionStyles.bottom = window.innerHeight - rect.top + 6;
        } else {
            positionStyles.top = rect.bottom + 6;
        }

        setActionMenuPosition(positionStyles);
        setActiveActionMenu(candidateId);
    }, [activeActionMenu]);

    const handleAddNew = useCallback(() => {
        navigate(`/ta/hiring-request/${hiringRequest._id}/add-candidate`);
    }, [hiringRequest._id, navigate]);

    const toggleCandidateSelection = useCallback((candidateId) => {
        setSelectedCandidateIds((prev) => (
            prev.includes(candidateId)
                ? prev.filter((id) => id !== candidateId)
                : [...prev, candidateId]
        ));
    }, []);

    const toggleSelectAllVisible = useCallback(() => {
        setSelectedCandidateIds((prev) => {
            if (allVisibleSelected) {
                return prev.filter((id) => !filteredCandidates.some((candidate) => candidate._id === id));
            }

            const merged = new Set([...prev, ...filteredCandidates.map((candidate) => candidate._id)]);
            return [...merged];
        });
    }, [allVisibleSelected, filteredCandidates]);

    const openMassMailModal = useCallback(() => {
        setShowMassMailModal(true);
    }, []);

    const openTransferModal = useCallback((candidateIds = []) => {
        setTransferPresetIds(candidateIds);
        setShowTransferModal(true);
    }, []);

    const openCardVisibilityModal = useCallback(() => {
        setDraftCardVisibilityConfig(cloneCardVisibilityConfig(cardVisibilityConfig));
        setVisibilityEditorPhaseOrder(activePhase?.order || phases[0]?.order || 1);
        setShowCardVisibilityModal(true);
    }, [activePhase, cardVisibilityConfig, phases]);

    const updateDraftVisibilityForPhase = useCallback((phase, nextVisibleKeys) => {
        if (!phase) return;

        setDraftCardVisibilityConfig((prev) => {
            const next = cloneCardVisibilityConfig(prev);
            const index = next.findIndex((entry) => Number(entry.phaseOrder) === Number(phase.order));
            const payload = {
                phaseOrder: Number(phase.order),
                visibleCardKeys: [...nextVisibleKeys]
            };

            if (index >= 0) {
                next[index] = payload;
            } else {
                next.push(payload);
            }

            return next.sort((left, right) => left.phaseOrder - right.phaseOrder);
        });
    }, []);

    const toggleDraftCardVisibility = useCallback((phase, cardKey) => {
        if (!phase) return;

        const currentKeys = getVisibleCardKeysForPhase(phase, draftCardVisibilityConfig);
        const nextKeys = currentKeys.includes(cardKey)
            ? currentKeys.filter((key) => key !== cardKey)
            : [...currentKeys, cardKey];

        const orderedKeys = getCardDefinitionsForPhase(phase)
            .map((item) => item.key)
            .filter((key) => nextKeys.includes(key));

        updateDraftVisibilityForPhase(phase, orderedKeys);
    }, [draftCardVisibilityConfig, updateDraftVisibilityForPhase]);

    const handleSaveCardVisibility = useCallback(async () => {
        try {
            setSavingCardVisibility(true);
            const payload = normalizeCardVisibilityPayload(phases, draftCardVisibilityConfig);
            const response = await api.put(`/ta/hiring-request/${hiringRequest._id}`, {
                candidateCardVisibility: payload
            });

            const savedConfig = cloneCardVisibilityConfig(response.data?.candidateCardVisibility || payload);
            setCardVisibilityConfig(savedConfig);
            setDraftCardVisibilityConfig(savedConfig);
            setShowCardVisibilityModal(false);
            toast.success('Card visibility updated for this requisition');
        } catch (error) {
            console.error('Failed to update card visibility:', error);
            toast.error(error.response?.data?.message || 'Failed to update card visibility');
        } finally {
            setSavingCardVisibility(false);
        }
    }, [draftCardVisibilityConfig, hiringRequest._id, phases]);

    const handleStatusUpdate = async (candidate, status) => {
        try {
            setActionLoadingId(candidate._id);
            await api.patch(`/ta/candidates/${candidate._id}/dynamic-phase/status`, {
                phaseId: candidate.currentPhaseId,
                status
            });
            toast.success('Candidate status updated');
            await fetchCandidates();
        } catch (error) {
            console.error('Failed to update dynamic status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoadingId('');
        }
    };

    const handleDecisionUpdate = async (candidate, decision) => {
        try {
            setActionLoadingId(candidate._id);
            const response = await api.post(`/ta/candidates/${candidate._id}/dynamic-phase/decision`, {
                phaseId: candidate.currentPhaseId,
                decision
            });
            if (response.data?.advanced && response.data?.newPhase?.phaseName) {
                toast.success(`Candidate moved to ${response.data.newPhase.phaseName}`);
            } else {
                toast.success('Decision saved');
            }
            await fetchCandidates();
        } catch (error) {
            console.error('Failed to update dynamic decision:', error);
            toast.error(error.response?.data?.message || 'Failed to save decision');
        } finally {
            setActionLoadingId('');
        }
    };

    const handleDirectPhaseMove = useCallback(async (candidate, targetPhase) => {
        if (!targetPhase?.order) {
            return;
        }

        try {
            setActionLoadingId(candidate._id);
            await api.post(`/ta/candidates/${candidate._id}/dynamic-phase/advance`, {
                targetPhaseOrder: Number(targetPhase.order)
            });
            toast.success(`Candidate moved to ${targetPhase.name}`);
            await fetchCandidates();
        } catch (error) {
            console.error('Failed to move candidate between phases:', error);
            toast.error(error.response?.data?.message || 'Failed to move candidate');
        } finally {
            setActionLoadingId('');
        }
    }, [fetchCandidates]);

    const handleExportExcel = async () => {
        try {
            toast.loading('Preparing export...', { id: 'dynamic-phase-export' });
            const toEmptyCell = (value, { zeroIsEmpty = false } = {}) => {
                if (value === undefined || value === null) {
                    return null;
                }

                if (typeof value === 'number') {
                    if (zeroIsEmpty && value === 0) {
                        return null;
                    }

                    return value;
                }

                if (typeof value === 'string') {
                    const normalized = value.trim();
                    const upperValue = normalized.toUpperCase();
                    const isZeroLike = /^0+(?:\.0+)?$/.test(normalized);
                    if (!normalized || normalized === '-' || normalized === '--' || upperValue === 'N/A' || (zeroIsEmpty && isZeroLike)) {
                        return null;
                    }

                    return normalized;
                }

                return value;
            };

            let requisitionData = hiringRequest || {};
            let softSkillsFromReq = [];
            let techSkillsFromReq = [];

            try {
                const requisitionResponse = await api.get(`/ta/hiring-request/${hiringRequest._id}`);
                requisitionData = requisitionResponse.data || hiringRequest || {};
            } catch (error) {
                console.error('Failed to fetch requisition details for export:', error);
            }

            const requirements = requisitionData?.requirements || {};
            const mustHaveSkills = requirements?.mustHaveSkills || {};

            softSkillsFromReq = Array.isArray(mustHaveSkills.softSkills) ? mustHaveSkills.softSkills : [];
            techSkillsFromReq = Array.isArray(mustHaveSkills.technical)
                ? mustHaveSkills.technical
                : (Array.isArray(mustHaveSkills) ? mustHaveSkills : []);

            const softSkillsHeaders = softSkillsFromReq.filter(Boolean);
            const techSkillsHeaders = techSkillsFromReq.filter(Boolean);
            const dataToExport = filteredCandidates;

            let maxRoundsCount = 1;
            dataToExport.forEach((candidate) => {
                const rounds = (candidate.interviewRounds || []).filter(
                    (round) => Number(round.phase || 1) === Number(activePhase?.order || 1)
                );
                if (rounds.length > maxRoundsCount) {
                    maxRoundsCount = rounds.length;
                }
            });

            const roundSections = [];
            for (let index = 1; index <= maxRoundsCount; index += 1) {
                roundSections.push({
                    title: `Round ${index}`,
                    subHeaders: [
                        'Interviewer Feedback',
                        'Interview date',
                        'Interviewer Name',
                        ...softSkillsHeaders,
                        ...techSkillsHeaders
                    ],
                    width: 3 + softSkillsHeaders.length + techSkillsHeaders.length
                });
            }

            const excelSections = [
                { title: 'Basic Info', subHeaders: ['S.no', 'Submission Date', 'Source', 'Profile pulled by', 'Calling by', 'Name of Candidate', 'Total Experience'], width: 7 },
                { title: 'Internal Round', subHeaders: ['TAT', 'Rate', 'Remarks'], width: 3 },
                { title: 'Experience', subHeaders: ['Relevant Experience'], width: 1 },
                { title: 'Technical Skills (Experience)', subHeaders: techSkillsHeaders, width: techSkillsHeaders.length },
                { title: 'Education & Employment', subHeaders: ['Qualification', 'Company'], width: 2 },
                { title: 'Compensation', subHeaders: ['CTC', 'Expected CTC'], width: 2 },
                { title: 'Availability & Location', subHeaders: ['Notice Period(Days)', 'Last Working Day', 'Location', 'Preferred Location'], width: 4 },
                { title: 'Contact Details', subHeaders: ['Email', 'Mobile No.'], width: 2 },
                { title: 'Offer Details', subHeaders: ['Offer Company', 'Date Of Joining new company'], width: 2 },
                { title: 'Status & Remarks', subHeaders: ['Status', 'Remark', 'Custom Remark'], width: 3 },
                ...roundSections,
                { title: 'Final Status & Decision', subHeaders: ['Profile Shortlisted (Yes/No)', 'Final Scoring', 'Profile Shared', 'Interview Status', 'Reason', 'Decision Status (Auto-calculated)'], width: 6 }
            ].filter((section) => section.width > 0);

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Candidates');

            const row1Data = [];
            excelSections.forEach((section) => {
                row1Data.push(section.title);
                for (let index = 1; index < section.width; index += 1) {
                    row1Data.push('');
                }
            });
            const row1 = sheet.addRow(row1Data);

            const row2Data = [];
            excelSections.forEach((section) => {
                section.subHeaders.forEach((subHeader) => row2Data.push(subHeader));
            });
            const row2 = sheet.addRow(row2Data);

            let currentCol = 1;
            excelSections.forEach((section) => {
                if (section.width > 1) {
                    sheet.mergeCells(1, currentCol, 1, currentCol + section.width - 1);
                }
                currentCol += section.width;
            });

            row2Data.forEach((header, index) => {
                const column = sheet.getColumn(index + 1);
                column.width = 18;
                if (index === 0) column.width = 8;
                if (header === 'Remarks' || header === 'Interviewer Feedback') column.width = 35;
                if (header === 'Name of Candidate' || techSkillsHeaders.includes(header) || softSkillsHeaders.includes(header)) {
                    column.width = 25;
                }
                column.alignment = { wrapText: true, vertical: 'middle' };
            });

            [row1, row2].forEach((row, rowIndex) => {
                row.font = { bold: true };
                row.alignment = { horizontal: 'center', vertical: 'middle' };
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowIndex === 0 ? 'FFD9EAD3' : 'FFE0E0E0' }
                    };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            sheet.views = [{ state: 'frozen', ySplit: 2 }];
            sheet.autoFilter = {
                from: { row: 2, column: 1 },
                to: { row: 2, column: row2Data.length }
            };

            dataToExport.forEach((candidate, index) => {
                const rounds = (candidate.interviewRounds || []).filter(
                    (round) => Number(round.phase || 1) === Number(activePhase?.order || 1)
                );
                const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
                const phaseDecision = phaseEntry?.decision || 'None';
                const phaseDecisionOption = (activePhase?.decisionOptions || []).find(
                    (decisionOption) => decisionOption.value === phaseDecision
                );
                const phaseStatusOption = (activePhase?.statusOptions || []).find(
                    (statusOption) => statusOption.value === phaseEntry?.status
                );

                const techSkillRatings = techSkillsHeaders.map((skillName) => {
                    const mustHaveSkillEntry = (candidate.mustHaveSkills || []).find((skill) => skill.skill === skillName);
                    if (mustHaveSkillEntry) {
                        const experience = toEmptyCell(mustHaveSkillEntry.experience, { zeroIsEmpty: true });
                        return experience === null ? null : `${experience}y`;
                    }

                    const candidateSkillRating = (candidate.skillRatings || []).find((skillRating) => skillRating.skill === skillName)?.rating;
                    return candidateSkillRating !== undefined ? `${candidateSkillRating}/10` : null;
                });

                const roundsData = [];
                for (let roundIndex = 0; roundIndex < maxRoundsCount; roundIndex += 1) {
                    const round = rounds[roundIndex];

                    if (round) {
                        const feedback = toEmptyCell(round.feedback);
                        const interviewDate = round.scheduledDate ? format(new Date(round.scheduledDate), 'dd-MMM-yyyy') : null;
                        const interviewerName = round.evaluatedBy
                            ? `${round.evaluatedBy.firstName || ''} ${round.evaluatedBy.lastName || ''}`.trim()
                            : toEmptyCell(round.interviewerName);

                        const roundSoftSkillRatings = softSkillsHeaders.map((skillName) => {
                            const skillRating = (round.skillRatings || []).find((entry) => entry.skill === skillName)?.rating;
                            return skillRating !== undefined ? `${skillRating}/10` : null;
                        });

                        const roundTechSkillRatings = techSkillsHeaders.map((skillName) => {
                            const skillRating = (round.skillRatings || []).find((entry) => entry.skill === skillName)?.rating;
                            return skillRating !== undefined ? `${skillRating}/10` : null;
                        });

                        roundsData.push(feedback, interviewDate, toEmptyCell(interviewerName), ...roundSoftSkillRatings, ...roundTechSkillRatings);
                    } else {
                        const fieldCount = 3 + softSkillsHeaders.length + techSkillsHeaders.length;
                        for (let emptyIndex = 0; emptyIndex < fieldCount; emptyIndex += 1) {
                            roundsData.push(null);
                        }
                    }
                }

                const profileShortlisted = phaseDecisionOption?.type === 'advance'
                    ? 'Yes'
                    : phaseDecisionOption?.type === 'reject'
                        ? 'No'
                        : '';
                const interviewStatusSummary = getInterviewStatusSummary(rounds);
                const interviewStatusLabel = toEmptyCell(interviewStatusSummary.label);

                const rowData = [
                    index + 1,
                    candidate.uploadedAt ? format(new Date(candidate.uploadedAt), 'dd-MMM-yyyy') : null,
                    toEmptyCell(candidate.source),
                    toEmptyCell(candidate.profilePulledBy),
                    toEmptyCell(candidate.calledBy),
                    toEmptyCell(candidate.candidateName),
                    toEmptyCell(candidate.totalExperience),

                    toEmptyCell(candidate.tatToJoin, { zeroIsEmpty: true }),
                    toEmptyCell(candidate.rate, { zeroIsEmpty: true }),
                    toEmptyCell(candidate.remark),

                    toEmptyCell(candidate.relevantExperience, { zeroIsEmpty: true }),
                    ...techSkillRatings,

                    toEmptyCell(candidate.qualification),
                    toEmptyCell(candidate.currentCompany),

                    toEmptyCell(candidate.currentCTC, { zeroIsEmpty: true }),
                    toEmptyCell(candidate.expectedCTC, { zeroIsEmpty: true }),

                    toEmptyCell(candidate.noticePeriod, { zeroIsEmpty: true }),
                    candidate.lastWorkingDay ? format(new Date(candidate.lastWorkingDay), 'dd-MMM-yyyy') : null,
                    toEmptyCell(candidate.currentLocation),
                    toEmptyCell(candidate.preferredLocation),

                    toEmptyCell(candidate.email),
                    toEmptyCell(candidate.mobile),

                    toEmptyCell(candidate.offerCompany),
                    candidate.offerJoiningDate ? format(new Date(candidate.offerJoiningDate), 'dd-MMM-yyyy') : null,

                    toEmptyCell(phaseStatusOption?.label || phaseEntry?.status),
                    toEmptyCell(candidate.remark),
                    toEmptyCell(candidate.customRemark),

                    ...roundsData,

                    toEmptyCell(profileShortlisted),
                    null,
                    null,
                    interviewStatusLabel,
                    phaseDecision && phaseDecision !== 'None' ? phaseDecision : null,
                    null
                ];

                const row = sheet.addRow(rowData);
                const totalColsBeforeLast = row2Data.length - 6;
                const profileShortlistedColIndex = totalColsBeforeLast + 1;
                const decisionStatusColIndex = totalColsBeforeLast + 6;
                const colLetter = sheet.getColumn(profileShortlistedColIndex).letter;
                const formulaRow = row.number;

                if (profileShortlisted) {
                    row.getCell(decisionStatusColIndex).value = {
                        formula: `IF(${colLetter}${formulaRow}="Yes","Shortlisted",IF(${colLetter}${formulaRow}="No","Rejected",""))`,
                        result: profileShortlisted === 'Yes' ? 'Shortlisted' : (profileShortlisted === 'No' ? 'Rejected' : '')
                    };
                } else {
                    row.getCell(decisionStatusColIndex).value = null;
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const roleTitle = requisitionData?.roleDetails?.title || hiringRequest.positionName || hiringRequest.requestId || 'Candidates';
            const fileName = `${roleTitle} Candidate List.xlsx`;

            saveAs(
                new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                fileName
            );
            toast.success('Excel exported successfully!', { id: 'dynamic-phase-export' });
        } catch (error) {
            console.error('Failed to export dynamic phase candidates:', error);
            toast.error('Failed to export candidates', { id: 'dynamic-phase-export' });
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, index) => <Skeleton key={index} className="h-24 w-full rounded-2xl" />)}
                </div>
                <Skeleton className="h-[420px] w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Candidate Applications</p>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                            {hiringRequest.roleDetails?.title || hiringRequest.positionName || 'Hiring Request'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {activePhase ? `${activePhase.name} workflow with ${phaseCandidates.length} candidates in this phase.` : 'Dynamic recruitment workflow'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                        <div className="min-w-fit">
                            <h3 className="text-[12px] font-bold uppercase tracking-[0.32em] text-slate-500">Pipeline</h3>
                        </div>
                        <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-inner shadow-slate-200/70">
                            {phases.map((phase) => {
                                const isActive = Number(activePhaseOrder) === Number(phase.order);
                                return (
                                    <button
                                        key={phase.phaseId || phase._id || phase.order}
                                        type="button"
                                        onClick={() => {
                                            setActivePhaseOrder(phase.order);
                                            setStatusFilter('All');
                                            setDecisionFilter('All');
                                        }}
                                        className={`min-w-[96px] rounded-[14px] px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                            isActive
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                        }`}
                                    >
                                        <span className="block">{phase.name}</span>
                                        <span className={`mt-1 block text-[11px] font-medium ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {phaseCounts.get(phase.order) || 0} candidates
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative flex items-center justify-end">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setShowToolbarMenu((prev) => !prev);
                            }}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            aria-label="Open quick actions"
                            title="Quick actions"
                        >
                            <Menu size={18} />
                        </button>

                        {showToolbarMenu && (
                            <div
                                className="absolute right-0 top-14 z-30 w-[280px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="mb-2 px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                    Quick Actions
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowToolbarMenu(false);
                                        handleExportExcel();
                                    }}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                            <Download size={15} />
                                        </span>
                                        Export Excel
                                    </span>
                                </button>

                                {canMassMail && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            openMassMailModal();
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-rose-50 p-2 text-rose-600">
                                                <Mail size={15} />
                                            </span>
                                            Send Mail
                                        </span>
                                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                                            {selectedCandidateIds.length || phaseCandidates.length}
                                        </span>
                                    </button>
                                )}

                                {canBulkTransfer && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            openTransferModal(selectedCandidateIds);
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                                <ArrowRightLeft size={15} />
                                            </span>
                                            Transfer
                                        </span>
                                        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                            {selectedCandidateIds.length}
                                        </span>
                                    </button>
                                )}

                                {canManageTemplates && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            navigate('/ta/email-templates');
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                                                <FileText size={15} />
                                            </span>
                                            Templates
                                        </span>
                                    </button>
                                )}

                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            openCardVisibilityModal();
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                                                <SlidersHorizontal size={15} />
                                            </span>
                                            Change Card Visibility
                                        </span>
                                    </button>
                                )}

                                {canCreate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            setShowBulkResumeImport(true);
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                                <FileText size={15} />
                                            </span>
                                            Upload Resumes
                                        </span>
                                    </button>
                                )}

                                {canCreate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            setShowBulkImport(true);
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                                                <Upload size={15} />
                                            </span>
                                            Import (Excel)
                                        </span>
                                    </button>
                                )}

                                {canCreate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowToolbarMenu(false);
                                            handleAddNew();
                                        }}
                                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                                <Plus size={15} />
                                            </span>
                                            Add Candidate
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {activePhase && (showTotalCandidateCard || showInterviewsCard || visibleStatusSummary.length > 0 || visibleDecisionSummary.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {showTotalCandidateCard && (
                        (() => {
                            const meta = getSummaryCardMeta(TOTAL_CANDIDATE_CARD_KEY, 'Total Candidate');
                            const Icon = meta.icon;
                            return (
                                <div className={`bg-white border border-slate-200 border-b-4 ${summaryColorMap[meta.color].split(' ')[0]} shadow-sm p-5 relative overflow-hidden group`}>
                                    <span className="block text-[44px] font-light text-slate-900 leading-none mb-3 relative z-10">{totalSourcedCount}</span>
                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">Total Candidate</span>
                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${summaryColorMap[meta.color].split(' ')[1]} opacity-[0.08] size-20`} />
                                </div>
                            );
                        })()
                    )}
                    {showInterviewsCard && (
                        (() => {
                            const meta = getSummaryCardMeta(INTERVIEWS_CARD_KEY, 'Interviews');
                            const Icon = meta.icon;
                            return (
                                <div className={`bg-white border border-slate-200 border-b-4 ${summaryColorMap[meta.color].split(' ')[0]} shadow-sm p-5 relative overflow-hidden group`}>
                                    <span className="block text-[44px] font-light text-slate-900 leading-none mb-3 relative z-10">{interviewsCount}</span>
                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">Interviews</span>
                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${summaryColorMap[meta.color].split(' ')[1]} opacity-[0.08] size-20`} />
                                </div>
                            );
                        })()
                    )}
                    {visibleStatusSummary.map((statusOption) => (
                        (() => {
                            const meta = getSummaryCardMeta(`status:${statusOption.value}`, statusOption.label);
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={statusOption.value}
                                    className={`bg-white border border-slate-200 border-b-4 ${summaryColorMap[meta.color].split(' ')[0]} shadow-sm p-5 relative overflow-hidden group`}
                                >
                                    <span className="block text-[44px] font-light text-slate-900 leading-none mb-3 relative z-10">{statusOption.count}</span>
                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{statusOption.label}</span>
                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${summaryColorMap[meta.color].split(' ')[1]} opacity-[0.08] size-20`} />
                                </div>
                            );
                        })()
                    ))}
                    {visibleDecisionSummary.map((decisionOption) => (
                        (() => {
                            const meta = getSummaryCardMeta(`decision:${decisionOption.value}`, decisionOption.label);
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={decisionOption.value}
                                    className={`bg-white border border-slate-200 border-b-4 ${summaryColorMap[meta.color].split(' ')[0]} shadow-sm p-5 relative overflow-hidden group`}
                                >
                                    <span className="block text-[44px] font-light text-slate-900 leading-none mb-3 relative z-10">{decisionOption.count}</span>
                                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide relative z-10">{decisionOption.label}</span>
                                    <Icon className={`absolute -right-2 top-1/2 -translate-y-1/2 ${summaryColorMap[meta.color].split(' ')[1]} opacity-[0.08] size-20`} />
                                </div>
                            );
                        })()
                    ))}
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid flex-1 gap-4 md:grid-cols-4">
                        <div className="md:col-span-1">
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search candidate name"
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="All">All Statuses</option>
                                {(activePhase?.statusOptions || []).map((statusOption) => (
                                    <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Decision</label>
                            <select
                                value={decisionFilter}
                                onChange={(event) => setDecisionFilter(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="All">All Decisions</option>
                                {(activePhase?.decisionOptions || []).map((decisionOption) => (
                                    <option key={decisionOption.value} value={decisionOption.value}>{decisionOption.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Pulled By</label>
                            <select
                                value={pulledByFilter}
                                onChange={(event) => setPulledByFilter(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="All">All Users</option>
                                {pulledByOptions.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                            {selectedCandidateIds.length} selected
                        </div>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            <Download size={16} />
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Candidate</th>
                                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current Status</th>
                                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Decision</th>
                                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Interviews</th>
                                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pulled By</th>
                                <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                                        No candidates match this phase and filter combination.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map((candidate) => {
                                    const phaseEntry = getPhaseEntryForOrder(candidate, activePhase?.order);
                                    const isBusy = actionLoadingId === candidate._id;
                                    const rounds = (candidate.interviewRounds || []).filter((round) => Number(round.phase || 1) === Number(activePhase?.order || 1));
                                    const interviewSummary = getInterviewStatusSummary(rounds);
                                    const isActiveInViewedPhase = !phaseEntry?.exitedAt && Number(candidate.currentPhaseOrder) === Number(activePhase?.order);

                                    return (
                                        <tr key={candidate._id} className="hover:bg-slate-50">
                                            <td className="px-4 py-4 text-center align-top">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCandidateIds.includes(candidate._id)}
                                                    onChange={() => toggleCandidateSelection(candidate._id)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <div className="font-semibold text-slate-900">{candidate.candidateName}</div>
                                                    <div className="text-sm text-slate-500">{candidate.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={phaseEntry?.status || ''}
                                                    onChange={(event) => handleStatusUpdate(candidate, event.target.value)}
                                                    disabled={!canEdit || isBusy || !isActiveInViewedPhase}
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <option value="">None</option>
                                                    {(activePhase?.statusOptions || []).map((statusOption) => (
                                                        <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={phaseEntry?.decision || 'None'}
                                                    onChange={(event) => handleDecisionUpdate(candidate, event.target.value)}
                                                    disabled={!canMakeDecisions || isBusy || !isActiveInViewedPhase}
                                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <option value="None">None</option>
                                                    {(activePhase?.decisionOptions || []).map((decisionOption) => (
                                                        <option key={decisionOption.value} value={decisionOption.value}>{decisionOption.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-700">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/ta/hiring-request/${hiringRequest._id}/candidate/${candidate._id}/view?phase=${activePhase?.order || 1}`)}
                                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-90 ${interviewSummary.color}`}
                                                >
                                                    <Calendar size={14} />
                                                    {interviewSummary.label}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                <div className="flex flex-col">
                                                    {candidate.profilePulledBy ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPulledByFilter(String(candidate.profilePulledBy).trim())}
                                                            className="w-fit text-left text-[13px] font-bold text-blue-600 transition hover:text-blue-700 hover:underline"
                                                            title={`Filter by ${candidate.profilePulledBy}`}
                                                        >
                                                            {candidate.profilePulledBy}
                                                        </button>
                                                    ) : (
                                                        <span className="text-[13px] font-bold text-slate-400">-</span>
                                                    )}
                                                    <span className="mt-1 text-[12px] text-slate-600">
                                                        {candidate.uploadedAt ? format(new Date(candidate.uploadedAt), 'MMM dd, yyyy') : '-'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        {candidate.uploadedAt ? format(new Date(candidate.uploadedAt), 'hh:mm a') : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => toggleActionMenu(event, candidate._id)}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                                                        aria-label={`Open actions for ${candidate.candidateName}`}
                                                        title="Candidate actions"
                                                        data-dynamic-action-menu-trigger="true"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {isBusy && <Loader className="animate-spin text-slate-400" size={16} />}
                                                    {activeActionMenu === candidate._id && typeof document !== 'undefined' && createPortal(
                                                        <div
                                                            className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl shadow-slate-200/80"
                                                            style={actionMenuPosition}
                                                            onClick={(event) => event.stopPropagation()}
                                                            data-dynamic-action-menu-content="true"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigate(`/ta/hiring-request/${hiringRequest._id}/candidate/${candidate._id}/view?phase=${activePhase?.order || 1}`);
                                                                    setActiveActionMenu(null);
                                                                }}
                                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                <Eye size={15} className="text-slate-500" />
                                                                View Profile
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigate(`/ta/hiring-request/${hiringRequest._id}/candidate/${candidate._id}/view?phase=${activePhase?.order || 1}`);
                                                                    setActiveActionMenu(null);
                                                                }}
                                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                                                            >
                                                                <Calendar size={15} className="text-emerald-600" />
                                                                Schedule Interview
                                                            </button>
                                                            {canManualAdvance && (
                                                                <>
                                                                    {isActiveInViewedPhase && previousPhase && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveActionMenu(null);
                                                                                handleDirectPhaseMove(candidate, previousPhase);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                                                        >
                                                                            <ArrowRightLeft size={15} className="text-blue-600" />
                                                                            Move to Previous Phase
                                                                        </button>
                                                                    )}
                                                                    {isActiveInViewedPhase && nextPhase && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveActionMenu(null);
                                                                                handleDirectPhaseMove(candidate, nextPhase);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                                                        >
                                                                            <ArrowRightLeft size={15} className="text-blue-600" />
                                                                            Move to Next Phase
                                                                        </button>
                                                                    )}
                                                                    {!isActiveInViewedPhase && activePhase && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveActionMenu(null);
                                                                                handleDirectPhaseMove(candidate, activePhase);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                                                                        >
                                                                            <ArrowRightLeft size={15} className="text-blue-600" />
                                                                            Move Back to This Phase
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>,
                                                        document.body
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCardVisibilityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Change Card Visibility</h3>
                                <p className="text-sm text-slate-500">Choose which summary cards should be visible for this requisition.</p>
                            </div>
                            <button type="button" onClick={() => setShowCardVisibilityModal(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">x</button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="space-y-5">
                            <div className="flex flex-wrap gap-2">
                                {phases.map((phase) => {
                                    const isActive = Number(visibilityEditorPhaseOrder) === Number(phase.order);
                                    return (
                                        <button
                                            key={phase.order}
                                            type="button"
                                            onClick={() => setVisibilityEditorPhaseOrder(phase.order)}
                                            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                                            style={isActive ? { backgroundColor: phase.color || '#2563EB', borderColor: phase.color || '#2563EB' } : undefined}
                                        >
                                            {phase.order}. {phase.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {visibilityEditorPhase && (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{visibilityEditorPhase.name}</div>
                                            <div className="text-xs text-slate-500">Select the cards to show in this phase view.</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateDraftVisibilityForPhase(visibilityEditorPhase, visibilityEditorCardDefinitions.map((item) => item.key))}
                                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                                            >
                                                Show All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateDraftVisibilityForPhase(visibilityEditorPhase, [])}
                                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                                            >
                                                Hide All
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {visibilityEditorCardDefinitions.map((cardDefinition) => {
                                            const active = visibilityEditorVisibleKeys.includes(cardDefinition.key);
                                            return (
                                                <div
                                                    key={cardDefinition.key}
                                                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
                                                >
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{cardDefinition.label}</div>
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {cardDefinition.key === TOTAL_CANDIDATE_CARD_KEY
                                                                ? 'Top-level total card'
                                                                : cardDefinition.key === INTERVIEWS_CARD_KEY
                                                                    ? 'Interview summary card'
                                                                    : cardDefinition.key.startsWith('decision:')
                                                                        ? 'Decision summary card'
                                                                    : 'Status summary card'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`inline-flex h-6 min-w-[56px] items-center justify-center rounded-full px-2 text-[11px] font-bold uppercase tracking-wide ${active ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                                                            style={active ? { backgroundColor: cardDefinition.color || '#2563EB' } : undefined}
                                                        >
                                                            {active ? 'Visible' : 'Hidden'}
                                                        </span>
                                                        <select
                                                            value={active ? 'visible' : 'hidden'}
                                                            onChange={(event) => {
                                                                const shouldBeVisible = event.target.value === 'visible';
                                                                if (shouldBeVisible !== active) {
                                                                    toggleDraftCardVisibility(visibilityEditorPhase, cardDefinition.key);
                                                                }
                                                            }}
                                                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        >
                                                            <option value="visible">Visible</option>
                                                            <option value="hidden">Hidden</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                </>
                            )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setShowCardVisibilityModal(false)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCardVisibility}
                                disabled={savingCardVisibility}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {savingCardVisibility && <Loader className="animate-spin" size={16} />}
                                Save Visibility
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkImport && (
                <BulkCandidateImport
                    hiringRequestId={hiringRequest._id}
                    isOpen={showBulkImport}
                    onClose={() => setShowBulkImport(false)}
                    onImportSuccess={fetchCandidates}
                />
            )}

            {showBulkResumeImport && (
                <BulkResumeImport
                    hiringRequestId={hiringRequest._id}
                    isOpen={showBulkResumeImport}
                    onClose={() => setShowBulkResumeImport(false)}
                    onImportSuccess={fetchCandidates}
                />
            )}

            {showMassMailModal && (
                <MassMailModal
                    isOpen={showMassMailModal}
                    onClose={() => setShowMassMailModal(false)}
                    hiringRequestId={hiringRequest._id}
                    requestMeta={hiringRequest}
                    candidates={phaseCandidates}
                    initialSelectedIds={selectedCandidateIds}
                    onSent={() => {
                        setSelectedCandidateIds([]);
                        fetchCandidates();
                    }}
                />
            )}

            {showTransferModal && (
                <BulkTransferModal
                    isOpen={showTransferModal}
                    onClose={() => {
                        setShowTransferModal(false);
                        setTransferPresetIds([]);
                    }}
                    candidates={phaseCandidates}
                    fromHiringRequestId={hiringRequest._id}
                    initialSelectedIds={transferPresetIds.length ? transferPresetIds : selectedCandidateIds}
                    onTransferred={() => {
                        setSelectedCandidateIds([]);
                        fetchCandidates();
                    }}
                />
            )}
        </div>
    );
};

export default DynamicPhaseView;
