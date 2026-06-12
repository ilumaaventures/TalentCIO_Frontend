import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
} from 'date-fns';

export const ANNOUNCEMENT_CATEGORIES = ['General', 'HR', 'Policy', 'Product', 'Celebration', 'Alert'];
export const REACTION_TYPES = ['like', 'celebrate', 'support'];
export const DEFAULT_COMPOSER_SETUP = {
  canManage: false,
  categories: ANNOUNCEMENT_CATEGORIES,
  audienceTypes: ['all', 'departments', 'employmentTypes', 'specificUsers'],
  reactionTypes: REACTION_TYPES,
  departments: [],
  employmentTypes: [],
  users: [],
};

export const EMPTY_ANNOUNCEMENT_FORM = {
  title: '',
  summary: '',
  content: '',
  category: 'General',
  pinned: false,
  audienceType: 'all',
  audienceDepartments: [],
  audienceEmploymentTypes: [],
  audienceUserIds: [],
  expiresAt: '',
  attachment: null,
  attachmentFile: null,
  removeAttachment: false,
};

export const ANNOUNCEMENT_ATTACHMENT_MAX_SIZE = 5 * 1024 * 1024;
export const ANNOUNCEMENT_ATTACHMENT_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';

const ANNOUNCEMENT_WORD_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ANNOUNCEMENT_SHEET_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const CATEGORY_THEME = {
  General: {
    accent: '#3B82F6',
    badgeClassName: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    softCardClassName: 'border-blue-200 bg-blue-50/70',
  },
  HR: {
    accent: '#8B5CF6',
    badgeClassName: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
    softCardClassName: 'border-violet-200 bg-violet-50/70',
  },
  Policy: {
    accent: '#F59E0B',
    badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    softCardClassName: 'border-amber-200 bg-amber-50/70',
  },
  Product: {
    accent: '#10B981',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    softCardClassName: 'border-emerald-200 bg-emerald-50/70',
  },
  Celebration: {
    accent: '#EC4899',
    badgeClassName: 'bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-200',
    softCardClassName: 'border-pink-200 bg-pink-50/70',
  },
  Alert: {
    accent: '#EF4444',
    badgeClassName: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    softCardClassName: 'border-red-200 bg-red-50/70',
  },
};

export const AUDIENCE_TYPE_LABELS = {
  all: 'All Employees',
  departments: 'Departments',
  employmentTypes: 'Employment Types',
  specificUsers: 'Specific People',
};

export const ANNOUNCEMENT_MANAGER_ROLES = ['Admin', 'Manager', 'HR Admin', 'System Admin'];
export const ANNOUNCEMENT_COMMUNITY_SECTION_PERMISSIONS = {
  birthdays: 'announcement.community.birthdays.view',
  anniversaries: 'announcement.community.work_anniversaries.view',
  joinees: 'announcement.community.new_joiners.view',
};
export const ACK_STORAGE_KEY_PREFIX = 'talentcio_ack_announcements_';
export const SKIP_STORAGE_KEY_PREFIX = 'talentcio_skip_announcements_';
export const SESSION_GATE_KEY_PREFIX = 'talentcio_announcement_gate_seen_';

export const getCategoryTheme = (category = 'General') => CATEGORY_THEME[category] || CATEGORY_THEME.General;

export const isAnnouncementManager = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return (
    roles.some((role) => ANNOUNCEMENT_MANAGER_ROLES.includes(role))
    || permissions.includes('announcement.manage')
    || permissions.includes('*')
    || permissions.includes('admin')
  );
};

export const canViewAnnouncementCommunitySection = (user, sectionKey) => {
  const permissionKey = ANNOUNCEMENT_COMMUNITY_SECTION_PERMISSIONS[sectionKey];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  if (!permissionKey) return false;

  return (
    Boolean(user?.hasAllPermissions)
    || permissions.includes(permissionKey)
    || permissions.includes('*')
    || permissions.includes('admin')
  );
};

export const sortAnnouncementsByPublishedAt = (announcements = []) => (
  [...announcements].sort((left, right) => {
    const leftTime = new Date(left?.publishedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.publishedAt || right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  })
);

export const getDisplayName = (person = {}) => {
  const fullName = [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim();
  return fullName || person?.name || person?.email || 'Team Member';
};

export const getInitials = (person = {}) => (
  getDisplayName(person)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'TM'
);

export const getAnnouncementRelativeTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Just now';
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true });
  if (isYesterday(date)) return 'Yesterday';
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatAnnouncementDate = (value, formatString = 'MMM d, yyyy') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, formatString);
};

export const formatAnnouncementDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'MMM d, yyyy • h:mm a');
};

export const formatDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const getAudienceLabel = (announcement = {}) => {
  if (announcement?.audienceSummary?.label) return announcement.audienceSummary.label;

  if (announcement.audienceType === 'departments') {
    return announcement.audienceDepartments?.length
      ? `Departments: ${announcement.audienceDepartments.join(', ')}`
      : 'Departments';
  }

  if (announcement.audienceType === 'employmentTypes') {
    return announcement.audienceEmploymentTypes?.length
      ? `Employment Types: ${announcement.audienceEmploymentTypes.join(', ')}`
      : 'Employment Types';
  }

  if (announcement.audienceType === 'specificUsers') {
    const count = Array.isArray(announcement.audienceUserIds) ? announcement.audienceUserIds.length : 0;
    return `Specific Users (${count})`;
  }

  return 'All Employees';
};

export const getExpiryNotice = (expiresAt) => {
  if (!expiresAt) return '';

  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return '';

  const daysRemaining = differenceInCalendarDays(expiryDate, new Date());
  if (daysRemaining < 0 || daysRemaining > 3) return '';
  if (daysRemaining === 0) return 'Expires today';
  if (daysRemaining === 1) return 'Expires tomorrow';
  return `Expires in ${daysRemaining} days`;
};

export const truncateText = (value = '', maxLength = 200) => (
  value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value
);

export const formatFileSize = (size = 0) => {
  const numericSize = Number(size) || 0;
  if (numericSize <= 0) return '0 B';
  if (numericSize < 1024) return `${numericSize} B`;
  if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} KB`;
  return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
};

export const getAnnouncementAttachmentKind = (attachment = {}) => {
  const mimeType = String(attachment?.mimeType || attachment?.type || '').toLowerCase();
  const fileName = String(attachment?.name || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'pdf';
  if (ANNOUNCEMENT_WORD_MIME_TYPES.has(mimeType) || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'word';
  if (ANNOUNCEMENT_SHEET_MIME_TYPES.has(mimeType) || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'sheet';
  return 'file';
};

export const getAnnouncementAttachmentTypeLabel = (attachment = {}) => {
  const kind = getAnnouncementAttachmentKind(attachment);
  if (kind === 'image') return 'Image';
  if (kind === 'pdf') return 'PDF';
  if (kind === 'word') return 'Word';
  if (kind === 'sheet') return 'Sheet';
  return 'File';
};

export const getAnnouncementAttachmentValidationError = (file) => {
  if (!file) return '';

  const mimeType = String(file.type || '').toLowerCase();
  const isImage = mimeType.startsWith('image/');
  const isAllowedDocument = (
    mimeType === 'application/pdf'
    || ANNOUNCEMENT_WORD_MIME_TYPES.has(mimeType)
    || ANNOUNCEMENT_SHEET_MIME_TYPES.has(mimeType)
  );

  if (!isImage && !isAllowedDocument) {
    return 'Only PDF, Word, Excel, and image files are allowed.';
  }

  if ((Number(file.size) || 0) > ANNOUNCEMENT_ATTACHMENT_MAX_SIZE) {
    return 'Attachment size must be 5 MB or smaller.';
  }

  return '';
};

export const getAnnouncementAttachmentDownloadUrl = (url = '') => (
  typeof url === 'string' && url.includes('/upload/')
    ? url.replace('/upload/', '/upload/fl_attachment/')
    : url
);

export const buildAnnouncementPayload = (announcement = {}, overrides = {}) => ({
  title: announcement.title || '',
  summary: announcement.summary || '',
  content: announcement.content || '',
  category: announcement.category || 'General',
  status: announcement.status || 'draft',
  pinned: Boolean(announcement.pinned),
  audienceType: announcement.audienceType || 'all',
  audienceDepartments: announcement.audienceDepartments || [],
  audienceEmploymentTypes: announcement.audienceEmploymentTypes || [],
  audienceUserIds: (announcement.audienceUserIds || []).map((value) => String(value?._id || value)),
  expiresAt: announcement.expiresAt ? formatDateInputValue(announcement.expiresAt) : null,
  removeAttachment: false,
  ...overrides,
});

export const createOptimisticComment = ({ text, user }) => ({
  _id: `temp-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
  text,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  canDelete: true,
  author: {
    _id: user?._id || 'self',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    profilePicture: user?.profilePicture || '',
    name: getDisplayName(user),
    department: user?.department || '',
    employmentType: user?.employmentType || '',
  },
  isOptimistic: true,
});

export const getAcknowledgedAnnouncementIds = (userId) => {
  if (!userId) return [];
  try {
    const rawValue = localStorage.getItem(`${ACK_STORAGE_KEY_PREFIX}${userId}`);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const storeAcknowledgedAnnouncementIds = (userId, announcementIds = []) => {
  if (!userId) return;
  const currentIds = getAcknowledgedAnnouncementIds(userId);
  const mergedIds = [...new Set([...currentIds, ...announcementIds.filter(Boolean)])];
  localStorage.setItem(`${ACK_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(mergedIds));
};

export const storeSkippedAnnouncementIds = (userId, announcementIds = []) => {
  if (!userId || announcementIds.length === 0) return;

  const key = `${SKIP_STORAGE_KEY_PREFIX}${userId}`;
  let currentEntries = [];

  try {
    const rawValue = localStorage.getItem(key);
    currentEntries = rawValue ? JSON.parse(rawValue) : [];
  } catch {
    currentEntries = [];
  }

  const nextEntries = [
    ...currentEntries,
    {
      announcementIds,
      skippedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(key, JSON.stringify(nextEntries.slice(-20)));
};

export const getAnnouncementSessionGateKey = (userId) => `${SESSION_GATE_KEY_PREFIX}${userId}`;

export const getAnnouncementValidationErrors = (form) => {
  const errors = {};
  const title = String(form?.title || '').trim();
  const content = String(form?.content || '').trim();
  const summary = String(form?.summary || '').trim();
  const expiresAt = String(form?.expiresAt || '').trim();

  if (!title) {
    errors.title = 'Title is required.';
  } else if (title.length > 160) {
    errors.title = 'Title cannot exceed 160 characters.';
  }

  if (!content) {
    errors.content = 'Content is required.';
  } else if (content.length > 8000) {
    errors.content = 'Content cannot exceed 8000 characters.';
  }

  if (summary.length > 240) {
    errors.summary = 'Summary cannot exceed 240 characters.';
  }

  if (expiresAt) {
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) {
      errors.expiresAt = 'Choose a valid expiry date.';
    }
  }

  if (form?.audienceType === 'departments' && (form?.audienceDepartments || []).length === 0) {
    errors.audienceDepartments = 'Select at least one department.';
  }

  if (form?.audienceType === 'employmentTypes' && (form?.audienceEmploymentTypes || []).length === 0) {
    errors.audienceEmploymentTypes = 'Select at least one employment type.';
  }

  if (form?.audienceType === 'specificUsers' && (form?.audienceUserIds || []).length === 0) {
    errors.audienceUserIds = 'Select at least one employee.';
  }

  const attachmentError = getAnnouncementAttachmentValidationError(form?.attachmentFile);
  if (attachmentError) {
    errors.attachmentFile = attachmentError;
  }

  return errors;
};
