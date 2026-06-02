export const ADMIN_ROLES = ['Admin'];

export const ATTENDANCE_SETTINGS_PERMISSIONS = ['user.update'];
export const EMAIL_SETTINGS_PERMISSIONS = ['settings.email.view', 'settings.email.manage'];
export const NOTIFICATION_SETTINGS_PERMISSIONS = ['settings.notification.view', 'settings.notification.manage'];
export const USER_ACCESS_PERMISSIONS = ['user.read'];
export const ROLE_ACCESS_PERMISSIONS = ['role.read'];
export const BIN_VIEW_PERMISSIONS = ['bin.view'];
export const ONBOARDING_VIEW_PERMISSIONS = [
    'onboarding.view',
    'onboarding.document.review',
    'onboarding.document.request',
    'onboarding.credential.manage',
    'onboarding.complete',
    'onboarding.manage'
];
export const TA_CONFIG_PERMISSIONS = ['ta.manage', 'ta.config.view', 'ta.config.edit'];
export const TA_ANALYTICS_PERMISSIONS = ['ta.manage', 'ta.analytics.global', 'ta.analytics.assigned'];
export const TA_EMAIL_TEMPLATE_PERMISSIONS = ['ta.email_template.manage'];
export const BUSINESS_UNIT_ACCESS_PERMISSIONS = ['business_unit.read', 'business_unit.create', 'business_unit.update'];
export const CLIENT_ACCESS_PERMISSIONS = ['client.read', 'client.create', 'client.update'];
export const CLIENT_CREATE_PERMISSIONS = ['client.create'];
export const CLIENT_UPDATE_PERMISSIONS = ['client.update'];

const hasAnyRole = (user, roles = []) => (
    Array.isArray(roles) && roles.some((role) => user?.roles?.includes(role))
);

const hasAnyPermission = (user, permissions = []) => (
    Array.isArray(permissions) && permissions.some((permission) => user?.permissions?.includes(permission))
);

export const isAdminUser = (user) => (
    hasAnyRole(user, ADMIN_ROLES)
    || Boolean(user?.hasAllPermissions)
    || user?.permissions?.includes('*')
);

export const canAccessUsers = (user) => (
    isAdminUser(user)
    || hasAnyPermission(user, USER_ACCESS_PERMISSIONS)
    || Number(user?.directReportsCount || 0) > 0
);

export const canAccessTAAnalytics = (user) => (
    isAdminUser(user)
    || hasAnyPermission(user, TA_ANALYTICS_PERMISSIONS)
    || Boolean(user?.isTAAnalyticsViewer)
);
