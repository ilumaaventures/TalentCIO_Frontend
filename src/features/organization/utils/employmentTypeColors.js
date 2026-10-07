/**
 * Color configuration and styling for employment types across the organization charts and filters.
 */
export const EMPLOYMENT_TYPE_CONFIGS = {
    'consultant': {
        key: 'consultant',
        label: 'Consultant',
        topBar: 'bg-purple-500',
        cardBorder: 'border-purple-200/90 hover:border-purple-400',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
        avatarGradient: 'from-purple-600 to-indigo-600',
        avatarRing: 'ring-purple-200',
        listBorder: 'border-l-purple-500',
        text: 'text-purple-600',
        pillBg: 'bg-purple-50 text-purple-700'
    },
    'advisor': {
        key: 'advisors',
        label: 'Advisors',
        topBar: 'bg-amber-500',
        cardBorder: 'border-amber-200/90 hover:border-amber-400',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        avatarGradient: 'from-amber-500 to-orange-600',
        avatarRing: 'ring-amber-200',
        listBorder: 'border-l-amber-500',
        text: 'text-amber-600',
        pillBg: 'bg-amber-50 text-amber-700'
    },
    'trainee': {
        key: 'trainee',
        label: 'Trainee',
        topBar: 'bg-teal-500',
        cardBorder: 'border-teal-200/90 hover:border-teal-400',
        badge: 'bg-teal-50 text-teal-700 border-teal-200',
        dot: 'bg-teal-500',
        avatarGradient: 'from-teal-600 to-emerald-600',
        avatarRing: 'ring-teal-200',
        listBorder: 'border-l-teal-500',
        text: 'text-teal-600',
        pillBg: 'bg-teal-50 text-teal-700'
    },
    'intern': {
        key: 'intern',
        label: 'Intern',
        topBar: 'bg-pink-500',
        cardBorder: 'border-pink-200/90 hover:border-pink-400',
        badge: 'bg-pink-50 text-pink-700 border-pink-200',
        dot: 'bg-pink-500',
        avatarGradient: 'from-pink-500 to-rose-600',
        avatarRing: 'ring-pink-200',
        listBorder: 'border-l-pink-500',
        text: 'text-pink-600',
        pillBg: 'bg-pink-50 text-pink-700'
    },
    'full time': {
        key: 'full_time',
        label: 'Full Time',
        topBar: 'bg-blue-500',
        cardBorder: 'border-blue-200/90 hover:border-blue-400',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        avatarGradient: 'from-blue-600 to-indigo-600',
        avatarRing: 'ring-blue-200',
        listBorder: 'border-l-blue-500',
        text: 'text-blue-600',
        pillBg: 'bg-blue-50 text-blue-700'
    },
    'part time': {
        key: 'part_time',
        label: 'Part Time',
        topBar: 'bg-sky-500',
        cardBorder: 'border-sky-200/90 hover:border-sky-400',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        dot: 'bg-sky-500',
        avatarGradient: 'from-sky-500 to-blue-600',
        avatarRing: 'ring-sky-200',
        listBorder: 'border-l-sky-500',
        text: 'text-sky-600',
        pillBg: 'bg-sky-50 text-sky-700'
    },
    'contract': {
        key: 'contract',
        label: 'Contract',
        topBar: 'bg-emerald-500',
        cardBorder: 'border-emerald-200/90 hover:border-emerald-400',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        avatarGradient: 'from-emerald-600 to-teal-700',
        avatarRing: 'ring-emerald-200',
        listBorder: 'border-l-emerald-500',
        text: 'text-emerald-600',
        pillBg: 'bg-emerald-50 text-emerald-700'
    },
    'probation': {
        key: 'probation',
        label: 'Probation',
        topBar: 'bg-rose-500',
        cardBorder: 'border-rose-200/90 hover:border-rose-400',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        avatarGradient: 'from-rose-500 to-red-600',
        avatarRing: 'ring-rose-200',
        listBorder: 'border-l-rose-500',
        text: 'text-rose-600',
        pillBg: 'bg-rose-50 text-rose-700'
    },
    'freelance': {
        key: 'freelance',
        label: 'Freelance',
        topBar: 'bg-indigo-500',
        cardBorder: 'border-indigo-200/90 hover:border-indigo-400',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
        avatarGradient: 'from-indigo-600 to-purple-600',
        avatarRing: 'ring-indigo-200',
        listBorder: 'border-l-indigo-500',
        text: 'text-indigo-600',
        pillBg: 'bg-indigo-50 text-indigo-700'
    }
};

export const getEmploymentTypeStyle = (type = '') => {
    const normalized = String(type || '').trim().toLowerCase();

    if (normalized.includes('consultant')) return EMPLOYMENT_TYPE_CONFIGS['consultant'];
    if (normalized.includes('advisor')) return EMPLOYMENT_TYPE_CONFIGS['advisor'];
    if (normalized.includes('trainee') || normalized.includes('tranee')) return EMPLOYMENT_TYPE_CONFIGS['trainee'];
    if (normalized.includes('intern')) return EMPLOYMENT_TYPE_CONFIGS['intern'];
    if (normalized.includes('full time') || normalized === 'ft' || normalized === 'employee') return EMPLOYMENT_TYPE_CONFIGS['full time'];
    if (normalized.includes('part time') || normalized === 'pt') return EMPLOYMENT_TYPE_CONFIGS['part time'];
    if (normalized.includes('contract')) return EMPLOYMENT_TYPE_CONFIGS['contract'];
    if (normalized.includes('probation')) return EMPLOYMENT_TYPE_CONFIGS['probation'];
    if (normalized.includes('freelance')) return EMPLOYMENT_TYPE_CONFIGS['freelance'];

    return {
        key: 'default',
        label: type || 'Other',
        topBar: 'bg-slate-400',
        cardBorder: 'border-slate-200/90 hover:border-slate-400',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
        avatarGradient: 'from-slate-600 to-slate-700',
        avatarRing: 'ring-slate-200',
        listBorder: 'border-l-slate-400',
        text: 'text-slate-600',
        pillBg: 'bg-slate-100 text-slate-700'
    };
};

export const getEmploymentTypeBadgeStyle = (type = '') => {
    const s = getEmploymentTypeStyle(type);
    return {
        badge: s.badge,
        dot: s.dot,
        border: s.cardBorder,
        label: s.label
    };
};
