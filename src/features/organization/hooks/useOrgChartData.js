import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { readSessionCache, createCachePayload, isCacheFresh } from '@/lib/cache';

const ORG_CHART_CACHE_TTL_MS = 60 * 1000;

const EXCLUDED_EMPLOYMENT_TYPES = new Set(['employee', 'avai']);

const DEFAULT_EMPLOYMENT_TYPES = [
    'Consultant',
    'Advisors',
    'Trainee',
    'Intern',
    'Full Time',
    'Part Time',
    'Contract',
    'Probation'
];

export const useOrgChartData = ({
    departmentId = '',
    businessUnitId = '',
    search = '',
    includeInactive = false,
    employmentTypes = [],
    showReportingManagers = false,
    canViewBusinessUnits = true,
    canManageOrgChart = false
} = {}) => {
    const [treeData, setTreeData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [availableEmploymentTypes, setAvailableEmploymentTypes] = useState(DEFAULT_EMPLOYMENT_TYPES);

    const empTypesKey = (canManageOrgChart && Array.isArray(employmentTypes)) ? [...employmentTypes].sort().join('_') : '';
    const cacheKey = `org_chart_data_${departmentId}_${businessUnitId}_${includeInactive}_${empTypesKey}_${canManageOrgChart && showReportingManagers}_${canManageOrgChart}`;

    // Fetch dropdown filter options (departments, business units, employment types) once on mount or when permissions change
    useEffect(() => {
        let isMounted = true;
        const fetchFilters = async () => {
            try {
                const [deptRes, buRes, empTypesRes] = await Promise.all([
                    api.get('/organization/departments?includeInactive=false').catch(() => ({ data: [] })),
                    canViewBusinessUnits
                        ? api.get('/organization/business-units').catch(() => ({ data: [] }))
                        : Promise.resolve({ data: [] }),
                    canManageOrgChart
                        ? api.get('/admin/employment-types').catch(() => ({ data: { customEmploymentTypes: [] } }))
                        : Promise.resolve({ data: { customEmploymentTypes: [] } })
                ]);

                if (!isMounted) return;

                setDepartments(deptRes.data || []);
                setBusinessUnits(buRes.data || []);

                const customList = (empTypesRes.data?.customEmploymentTypes || []).filter(
                    (t) => !EXCLUDED_EMPLOYMENT_TYPES.has(String(t).trim().toLowerCase())
                );
                const mergedTypes = Array.from(new Set([...DEFAULT_EMPLOYMENT_TYPES, ...customList]))
                    .filter((t) => !EXCLUDED_EMPLOYMENT_TYPES.has(String(t).trim().toLowerCase()));
                setAvailableEmploymentTypes(mergedTypes);
            } catch (err) {
                console.error('Failed to load org filters:', err);
            }
        };

        fetchFilters();
        return () => {
            isMounted = false;
        };
    }, [canViewBusinessUnits, canManageOrgChart]);

    const fetchOrgData = useCallback(async ({ force = false } = {}) => {
        try {
            setLoading(true);

            // Check cache for tree & stats if not searching and no employmentTypes filter
            if (!search && !empTypesKey && !force) {
                const cached = readSessionCache(cacheKey);
                if (cached && isCacheFresh(cached, ORG_CHART_CACHE_TTL_MS)) {
                    setTreeData(cached.data?.tree || []);
                    setStats(cached.data?.stats || null);
                    setLoading(false);
                    return;
                }
            }

            const params = new URLSearchParams();
            if (departmentId) params.append('departmentId', departmentId);
            if (businessUnitId) params.append('businessUnitId', businessUnitId);
            if (search) params.append('search', search);
            if (includeInactive) params.append('includeInactive', 'true');
            if (canManageOrgChart && empTypesKey) {
                params.append('employmentTypes', empTypesKey.replace(/_/g, ','));
                if (showReportingManagers) {
                    params.append('showReportingManagers', 'true');
                }
            }

            const [treeRes, statsRes] = await Promise.all([
                api.get(`/organization/org-chart?${params.toString()}`),
                api.get('/organization/org-chart/stats').catch(() => ({ data: null }))
            ]);

            const newTree = treeRes.data?.tree || [];
            const newStats = statsRes.data || null;

            setTreeData(newTree);
            setStats(newStats);

            if (!search && !empTypesKey) {
                const payload = createCachePayload({ tree: newTree, stats: newStats });
                try {
                    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
                } catch {
                    // Ignore storage quota limits
                }
            }
        } catch (error) {
            console.error('Failed to load Org Chart data:', error);
            toast.error('Failed to load Organization Chart');
        } finally {
            setLoading(false);
        }
    }, [departmentId, businessUnitId, search, includeInactive, empTypesKey, cacheKey, showReportingManagers, canManageOrgChart]);

    useEffect(() => {
        fetchOrgData();
    }, [fetchOrgData]);

    return {
        treeData,
        stats,
        loading,
        departments,
        businessUnits,
        availableEmploymentTypes,
        refetch: (force = true) => fetchOrgData({ force })
    };
};
