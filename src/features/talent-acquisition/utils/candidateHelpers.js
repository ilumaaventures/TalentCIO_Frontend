import { createdDatePresetOptions } from '@/features/talent-acquisition/utils/CandidateListConstants';

export const hasReviewableApplicantProfile = (item) => Boolean(
    item &&
    (
        (item.applicantId && typeof item.applicantId === 'object') ||
        item.profileSnapshot ||
        item.publicApplicationId
    )
);

export const hasUploadedResumeFile = (resumeUrl) => (
    typeof resumeUrl === 'string' &&
    /^https?:\/\//i.test(resumeUrl.trim())
);

export const getCandidateUploadType = (candidate) => (
    hasUploadedResumeFile(candidate?.resumeUrl) ? 'CV' : 'Excel'
);

export const getCandidateUploadedByName = (candidate) => (
    `${candidate?.uploadedBy?.firstName || ''} ${candidate?.uploadedBy?.lastName || ''}`.trim()
);

export const hasCandidateCtcDetails = (candidate) => (
    (candidate?.currentCTC !== undefined && candidate?.currentCTC !== null && candidate?.currentCTC !== '')
    || (candidate?.expectedCTC !== undefined && candidate?.expectedCTC !== null && candidate?.expectedCTC !== '')
    || (candidate?.noticePeriod !== undefined && candidate?.noticePeriod !== null && candidate?.noticePeriod !== '')
);

export const getRoundsForPhase = (candidate, phase) => (
    Array.isArray(candidate?.interviewRounds)
        ? candidate.interviewRounds.filter((round) => Number(round.phase || 1) === Number(phase))
        : []
);

export const getPhase2InterviewStatusValue = (candidate = {}) => {
    const normalized = String(candidate?.phase2InterviewStatus || '').trim();
    if (['Scheduled', 'Rejected', 'Shortlisted', 'Did not Turn up'].includes(normalized)) {
        return normalized;
    }

    if (candidate?.phase2Decision === 'Rejected') {
        return 'Rejected';
    }

    if (candidate?.phase2Decision === 'Selected') {
        return 'Shortlisted';
    }

    return '';
};

export const getDisplayInterviewRoundsForPhase = (candidate, phase) => {
    const rounds = getRoundsForPhase(candidate, phase);
    if (phase !== 2 || rounds.length > 0) {
        return rounds;
    }

    const phase2InterviewStatus = getPhase2InterviewStatusValue(candidate);
    const phase2Feedback = String(candidate?.phase2InterviewerFeedback || '').trim();
    if (!phase2InterviewStatus && !phase2Feedback) {
        return [];
    }

    return [{
        _id: 'phase2-imported-interview-summary',
        phase: 2,
        status: phase2InterviewStatus === 'Rejected'
            ? 'Failed'
            : phase2InterviewStatus === 'Shortlisted'
                ? 'Passed'
                : phase2InterviewStatus === 'Did not Turn up'
                    ? 'Skipped'
                    : 'Scheduled',
        displayStatusLabel: phase2InterviewStatus || 'Scheduled',
        feedback: candidate?.phase2InterviewerFeedback || '',
        rating: null,
        skillRatings: []
    }];
};

export const hasPhase2InterviewActivity = (candidate = {}) => {
    return getDisplayInterviewRoundsForPhase(candidate, 2).length > 0;
};

export const getInterviewFilterValue = (rounds = []) => {
    if (!Array.isArray(rounds) || rounds.length === 0) {
        return null;
    }

    const hasFailed = rounds.some((round) => round.status === 'Failed');
    if (hasFailed) {
        return 'Failed';
    }

    const hasScheduled = rounds.some((round) => ['Pending', 'Scheduled'].includes(round.status));
    if (hasScheduled) {
        return 'Scheduled';
    }

    const allClosed = rounds.every((round) => ['Passed', 'Skipped'].includes(round.status));
    if (allClosed) {
        return 'Shortlisted';
    }

    return 'Scheduled';
};

export const getInterviewSummaryValue = (rounds = []) => {
    if (!Array.isArray(rounds) || rounds.length === 0) {
        return null;
    }

    if (rounds.some((round) => round.status === 'Failed')) {
        return 'Failed';
    }

    if (rounds.some((round) => ['Left in between', 'Left In Between', 'LIB'].includes(round.status))) {
        return 'Left in between';
    }

    if (rounds.some((round) => ['Did Not Turn Up', 'Did not turn up', 'Did Not Turnup', 'DNTU'].includes(round.status))) {
        return 'Did Not Turn Up';
    }

    if (rounds.some((round) => round.status === 'Pending')) {
        return 'Pending';
    }

    if (rounds.some((round) => round.status === 'Scheduled')) {
        return 'Scheduled';
    }

    if (rounds.every((round) => round.status === 'Skipped')) {
        return 'Skipped';
    }

    const allClosed = rounds.every((round) => ['Passed', 'Skipped'].includes(round.status));
    if (allClosed) {
        return 'Shortlisted';
    }

    return 'Pending';
};

export const getRoundExportInterviewStatus = (round = {}) => {
    if (round.status === 'Failed') return 'Rejected';
    if (round.status === 'Passed') return 'Shortlisted';
    if (round.status === 'Skipped') return 'Did not Turn up';
    return 'Scheduled';
};

export const getPhase2InterviewStatusExportValue = (candidate = {}) => getPhase2InterviewStatusValue(candidate);

export const isRoundScheduledStatus = (status = '') => {
    const s = String(status || '').trim();
    if (!s || s === 'Pending' || s === 'Scheduled') return true;
    const closedStatuses = [
        'passed', 'pass', 'shortlisted',
        'failed', 'fail', 'rejected',
        'did not turn up', 'did not turnup', 'dntu', 'skipped', 'no show',
        'left in between', 'lib'
    ];
    return !closedStatuses.includes(s.toLowerCase());
};

export const isRoundPassedStatus = (status = '') => {
    const s = String(status || '').trim().toLowerCase();
    return s === 'passed' || s === 'pass' || s === 'shortlisted';
};

export const matchesInterviewFilter = (rounds = [], filterValue = 'All') => {
    if (filterValue === 'All') {
        return true;
    }

    if (filterValue === 'Scheduled') {
        return Array.isArray(rounds) && rounds.length > 0;
    }

    return getInterviewFilterValue(rounds) === filterValue;
};

export const normalizeMultiValueFilter = (values = []) => [...new Set(
    (Array.isArray(values) ? values : [values])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
)];

export const matchesMultiValueFilter = (selectedValues = [], candidateValue = '') => {
    const normalizedSelections = normalizeMultiValueFilter(selectedValues);
    if (normalizedSelections.length === 0) {
        return true;
    }

    const normalizedCandidateValue = String(candidateValue || '').trim();
    return normalizedCandidateValue ? normalizedSelections.includes(normalizedCandidateValue) : false;
};

export const getMultiFilterLabel = (selectedValues = [], fallbackLabel) => {
    if (selectedValues.length === 0) {
        return fallbackLabel;
    }

    if (selectedValues.length === 1) {
        return selectedValues[0];
    }

    return `${selectedValues.length} selected`;
};

export const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getPresetDateRange = (preset) => {
    if (!preset) {
        return { startDate: '', endDate: '' };
    }

    const today = new Date();
    const startDate = new Date(today);

    switch (preset) {
        case 'today':
            break;
        case 'last2days':
            startDate.setDate(today.getDate() - 1);
            break;
        case 'last7days':
            startDate.setDate(today.getDate() - 6);
            break;
        case 'last2weeks':
            startDate.setDate(today.getDate() - 13);
            break;
        case 'thisMonth':
            startDate.setDate(1);
            break;
        default:
            return { startDate: '', endDate: '' };
    }

    return {
        startDate: formatDateInputValue(startDate),
        endDate: formatDateInputValue(today)
    };
};

export const getDefaultDateFilterState = () => {
    return {
        createdDatePreset: '',
        dateFilterField: '',
        dateFrom: '',
        dateTo: ''
    };
};

export const getCreatedDatePresetLabel = (preset) => (
    createdDatePresetOptions.find((option) => option.value === preset)?.label || 'Sort'
);

export const getDecisionColor = (decision) => {
    switch (decision) {
        case 'Selected': return 'text-purple-600 font-bold';
        case 'Shortlisted': return 'text-emerald-600 font-bold';
        case 'Profile Shared': return 'text-sky-600 font-bold';
        case 'Phase 3 Offer Stage': return 'text-purple-600 font-bold';
        case 'Offer Sent': return 'text-blue-600 font-bold';
        case 'Offer Accepted': return 'text-amber-600 font-bold';
        case 'Joined': return 'text-emerald-600 font-bold';
        case 'Did Not Turn Up':
        case 'Left in between': return 'text-rose-600 font-bold';
        case 'No Show':
        case 'Offer Declined': return 'text-rose-600 font-bold';
        case 'Rejected': return 'text-red-600 font-bold';
        case 'On Hold': return 'text-amber-600 font-bold';
        default: return 'text-slate-600';
    }
};

export const getInterviewStatusSummary = (rounds = []) => {
    if (!rounds || rounds.length === 0) return { label: '', color: 'text-slate-400 bg-slate-50 border-slate-200' };

    if (rounds.length === 1 && rounds[0]?.displayStatusLabel) {
        const displayStatus = rounds[0].displayStatusLabel;
        if (displayStatus === 'Rejected') {
            return { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' };
        }

        if (displayStatus === 'Left in between') {
            return { label: 'Left in between', color: 'text-rose-700 bg-rose-50 border-rose-200' };
        }

        if (displayStatus === 'Did Not Turn Up') {
            return { label: 'Did not turn up', color: 'text-slate-700 bg-slate-50 border-slate-200' };
        }

        if (displayStatus === 'Scheduled') {
            return { label: 'Scheduled', color: 'text-blue-700 bg-blue-50 border-blue-200' };
        }

        if (displayStatus === 'Shortlisted') {
            return { label: 'Shortlisted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
        }
    }

    const interviewStatus = getInterviewSummaryValue(rounds);

    if (interviewStatus === 'Failed') {
        return { label: 'Rejected', color: 'text-red-700 bg-red-50 border-red-200' };
    }

    if (interviewStatus === 'Left in between') {
        return { label: 'Left in between', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }

    if (interviewStatus === 'Did Not Turn Up') {
        return { label: 'Did not turn up', color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }

    if (interviewStatus === 'Pending') {
        return { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }

    if (interviewStatus === 'Scheduled') {
        return { label: 'Scheduled', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    }

    if (interviewStatus === 'Skipped') {
        return { label: 'Did not turn up', color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }

    if (interviewStatus === 'Shortlisted') {
        return { label: 'Shortlisted', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }

    return { label: '', color: 'text-slate-400 bg-slate-50 border-slate-200' };
};
