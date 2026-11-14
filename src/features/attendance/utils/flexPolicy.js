export const DEFAULT_ATTENDANCE_SHIFTS = [
    {
        code: 'general',
        name: 'General',
        shiftType: 'general',
        startTime: '09:00',
        endTime: '18:00',
        maxWorkingHours: 9
    },
    {
        code: 'any',
        name: 'Any Time',
        shiftType: 'any',
        startTime: '00:00',
        endTime: '23:59',
        maxWorkingHours: 8
    }
];

export const resolveUserFlexPolicy = (emp, attendanceSettings) => {
    const flexConfig = attendanceSettings?.flexWeeklyOff || {};
    const allowPastDays = flexConfig.allowPastDays !== false;

    // 0. Master switch check
    if (flexConfig.enabled === false) {
        return { enabled: false, allowPastDays, count: 0, allowedDays: [], isCustomChoice: false, source: 'Disabled' };
    }

    const normalizeArray = (obj) => {
        if (Array.isArray(obj?.allowedDays) && obj.allowedDays.length > 0) return obj.allowedDays;
        if (obj?.allowedDay) return [obj.allowedDay];
        return ['Custom (Employee Chooses)'];
    };

    const defaultAllowedDays = normalizeArray(flexConfig);

    // 1. Per-user override
    if (emp?.flexWeeklyOffCount !== undefined && emp?.flexWeeklyOffCount !== null && emp?.flexWeeklyOffCount !== '' && Number(emp?.flexWeeklyOffCount) > 0) {
        return {
            enabled: true,
            allowPastDays,
            count: Math.max(1, Number(emp.flexWeeklyOffCount)),
            allowedDays: defaultAllowedDays,
            isCustomChoice: true,
            source: 'Employee Override'
        };
    }

    // Extract user role names and IDs
    const userRoleNames = Array.isArray(emp?.roles)
        ? emp.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
        : [];
    const userRoleIds = Array.isArray(emp?.roles)
        ? emp.roles.map((r) => (typeof r === 'string' ? r : r?._id ? String(r._id) : null)).filter(Boolean)
        : [];

    const cleanEmpType = (s) => String(s || '').replace(/[\s\-_]/g, '').toLowerCase();
    const userEmpTypeClean = cleanEmpType(emp?.employmentType || 'Full-Time');

    const activeRolePolicies = flexConfig.rolePolicies || [];
    const hasConfiguredRolePolicies = activeRolePolicies.some(rp => Boolean(rp.enabled));

    const activeEmpTypePolicies = flexConfig.employmentTypePolicies || [];
    const hasConfiguredEmpTypePolicies = activeEmpTypePolicies.some(ep => Boolean(ep.enabled));

    // Matched Role policy
    const matchedRolePolicy = activeRolePolicies.find(
        (rp) => Boolean(rp.enabled) && (userRoleNames.includes(rp.roleName) ||
            userRoleNames.includes(rp.roleId) ||
            userRoleIds.includes(rp.roleId) ||
            userRoleIds.includes(rp.roleName))
    );

    // Matched Employment Type policy
    const matchedEmpTypePolicy = activeEmpTypePolicies.find(
        (ep) => Boolean(ep.enabled) && cleanEmpType(ep.employmentType) === userEmpTypeClean
    );

    // 2. If BOTH Role Policies AND Employment Type Policies are configured/enabled:
    if (hasConfiguredRolePolicies && hasConfiguredEmpTypePolicies) {
        if (matchedRolePolicy && matchedEmpTypePolicy) {
            const allowedDays = normalizeArray(matchedRolePolicy.allowedDays?.length ? matchedRolePolicy : matchedEmpTypePolicy);
            const count = matchedRolePolicy.allowedCount ?? matchedEmpTypePolicy.allowedCount ?? flexConfig.allowedCount ?? 2;
            return {
                enabled: true,
                allowPastDays,
                count,
                allowedDays,
                isCustomChoice: true,
                source: `Combined (${matchedRolePolicy.roleName || matchedRolePolicy.roleId} + ${matchedEmpTypePolicy.employmentType})`
            };
        }
        return {
            enabled: false,
            allowPastDays,
            count: 0,
            allowedDays: [],
            isCustomChoice: false,
            source: 'Not Eligible (Does not match both Role and Employment Type criteria)'
        };
    }

    // 3. If ONLY Role Policies are configured/enabled:
    if (hasConfiguredRolePolicies) {
        if (matchedRolePolicy) {
            const allowedDays = normalizeArray(matchedRolePolicy);
            return {
                enabled: true,
                allowPastDays,
                count: matchedRolePolicy.allowedCount ?? flexConfig.allowedCount ?? 2,
                allowedDays,
                isCustomChoice: true,
                source: `Role (${matchedRolePolicy.roleName || matchedRolePolicy.roleId})`
            };
        }
        return {
            enabled: false,
            allowPastDays,
            count: 0,
            allowedDays: [],
            isCustomChoice: false,
            source: 'Not Eligible (Role criteria mismatch)'
        };
    }

    // 4. If ONLY Employment Type Policies are configured/enabled:
    if (hasConfiguredEmpTypePolicies) {
        if (matchedEmpTypePolicy) {
            const allowedDays = normalizeArray(matchedEmpTypePolicy);
            return {
                enabled: true,
                allowPastDays,
                count: matchedEmpTypePolicy.allowedCount ?? flexConfig.allowedCount ?? 2,
                allowedDays,
                isCustomChoice: true,
                source: `Employment Type (${matchedEmpTypePolicy.employmentType})`
            };
        }
        return {
            enabled: false,
            allowPastDays,
            count: 0,
            allowedDays: [],
            isCustomChoice: false,
            source: 'Not Eligible (Employment Type criteria mismatch)'
        };
    }

    if (matchedEmpTypePolicy) {
        const allowedDays = normalizeArray(matchedEmpTypePolicy);
        return {
            enabled: true,
            allowPastDays,
            count: matchedEmpTypePolicy.allowedCount ?? flexConfig.allowedCount ?? 2,
            allowedDays,
            isCustomChoice: true,
            source: `Employment Type (${matchedEmpTypePolicy.employmentType})`
        };
    }

    // 5. Target Roles or Target Employment Types check on baseline
    const targetRoles = flexConfig.targetRoles || [];
    if (targetRoles.length > 0) {
        const matchesRole = targetRoles.some(tr => userRoleNames.includes(tr) || userRoleIds.includes(tr));
        if (!matchesRole) {
            return { enabled: false, allowPastDays, count: 0, allowedDays: [], isCustomChoice: false, source: 'Not Eligible (Role criteria mismatch)' };
        }
    }

    const targetEmpTypes = flexConfig.targetEmploymentTypes || [];
    if (targetEmpTypes.length > 0) {
        const matchesEmpType = targetEmpTypes.some(te => cleanEmpType(te) === userEmpTypeClean);
        if (!matchesEmpType) {
            return { enabled: false, allowPastDays, count: 0, allowedDays: [], isCustomChoice: false, source: 'Not Eligible (Employment Type criteria mismatch)' };
        }
    }

    // 6. Company Default Baseline
    return {
        enabled: true,
        allowPastDays,
        count: flexConfig.allowedCount ?? 2,
        allowedDays: defaultAllowedDays,
        isCustomChoice: true,
        source: 'Company Default'
    };
};

