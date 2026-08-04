export const LEGACY_EXPORT_STATUS_OPTIONS = [
    'Total Sourced', 'Interested', 'Interview Scheduled', 'Shortlisted', 'Profile Shared',
    'Not Interested', 'Not Relevant', 'Not Picking', 'High expectation', 'Long Notice period', 'Location Not suitable'
];

export const PIPELINE_FIXED_STAGES = ['Total Sourced', 'Interested', 'Shortlisted', 'Profile Shared'];
export const PIPELINE_FIXED_STAGE_SET = new Set(PIPELINE_FIXED_STAGES);

export const PHASE_2_FIXED_STAGES = ['Profile Shared', 'Shortlisted', 'Selected', 'Rejected'];
export const PHASE_2_FIXED_STAGE_SET = new Set(PHASE_2_FIXED_STAGES);

export const EXPORT_INTERVIEW_STATUS_OPTIONS = ['Shortlisted', 'Rejected', 'Scheduled', 'Did not Turn up'];
export const PROFILE_SHORTLISTED_EXPORT_OPTIONS = ['Yes', 'No', 'Did Not Turn Up', 'On Hold'];
export const PROFILE_SHORTLISTED_HEADER = 'Profile Shortlisted';

export const interviewFilterOptions = [
    { value: 'All', label: 'All' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Shortlisted', label: 'Shortlisted' },
    { value: 'Failed', label: 'Failed' }
];

export const DEFAULT_DATE_FILTER_FIELD = 'updatedAt';

export const createdDatePresetOptions = [
    { value: 'today', label: 'Today' },
    { value: 'last2days', label: 'Last 2 Days' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last2weeks', label: 'Last 2 Weeks' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom' }
];

export const dateFilterFieldOptions = [
    { value: '', label: 'None' },
    { value: 'updatedAt', label: 'Updated At' },
    { value: 'createdAt', label: 'Created At' }
];
