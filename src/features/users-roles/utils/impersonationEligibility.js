/**
 * Determines whether a target user/employee is eligible to be impersonated by the current actor.
 *
 * Rules:
 * 1. Cannot impersonate oneself.
 * 2. Cannot impersonate inactive or deleted accounts.
 * 3. Cannot impersonate protected primary admin.
 * 4. If actor is an Admin (actorIsAdmin === true):
 *    - Allowed to impersonate other Admins as well.
 * 5. If actor is NOT an Admin (actor only has delegated user.impersonate permission):
 *    - Blocked from impersonating privileged/Admin users (prevents privilege escalation).
 *
 * @param {Object} targetUser - Target employee row or profile object
 * @param {string} currentUserId - ID of the currently logged-in actor
 * @param {boolean} actorIsAdmin - Whether the current actor is an Admin / System Admin / wildcard
 * @returns {boolean}
 */
export const isImpersonationTargetEligible = (targetUser, currentUserId, actorIsAdmin = true) => {
    if (!targetUser) return false;

    // Self impersonation is not permitted
    if (currentUserId && String(targetUser._id) === String(currentUserId)) {
        return false;
    }

    // Inactive or deleted users cannot be impersonated
    if (targetUser.isActive === false || targetUser.isDeleted) {
        return false;
    }

    // Protected primary admin cannot be impersonated
    if (targetUser.isProtectedPrimaryAdmin) {
        return false;
    }

    // If actor is NOT an Admin, prevent privilege escalation to Admin/privileged accounts
    if (!actorIsAdmin) {
        const roles = Array.isArray(targetUser.roles) ? targetUser.roles : [];
        const hasPrivilegedRole = roles.some((role) => {
            if (!role) return false;
            const roleName = typeof role === 'string' ? role : role.name;
            return ['Admin', 'Super Admin', 'System Admin'].includes(roleName) || role.isSystem;
        });

        if (hasPrivilegedRole) {
            return false;
        }

        const permissions = Array.isArray(targetUser.permissions) ? targetUser.permissions : [];
        if (
            permissions.includes('*') ||
            permissions.includes('all') ||
            permissions.includes('user.impersonate')
        ) {
            return false;
        }
    }

    return true;
};

