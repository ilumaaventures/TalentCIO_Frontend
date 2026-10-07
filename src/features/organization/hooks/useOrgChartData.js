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
    employmentTypes = []
} = {}) => {
    const [treeData, setTreeData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [availableEmploymentTypes, setAvailableEmploymentTypes] = useState(DEFAULT_EMPLOYMENT_TYPES);

    const empTypesKey = Array.isArray(employmentTypes) ? [...employmentTypes].sort().join('_') : '';
    const cacheKey = `org_chart_data_${departmentId}_${businessUnitId}_${includeInactive}_${empTypesKey}`;

    const fetchOrgData = useCallback(async ({ force = false } = {}) => {
        try {
            setLoading(true);

            // Fetch filters (departments, business units, and custom employment types)
            const [deptRes, buRes, empTypesRes] = await Promise.all([
                api.get('/organization/departments?includeInactive=false').catch(() => ({ data: [] })),
                api.get('/organization/business-units').catch(() => ({ data: [] })),
                api.get('/admin/employment-types').catch(() => ({ data: { customEmploymentTypes: [] } }))
            ]);

            setDepartments(deptRes.data || []);
            setBusinessUnits(buRes.data || []);

            const customList = (empTypesRes.data?.customEmploymentTypes || []).filter(
                (t) => !EXCLUDED_EMPLOYMENT_TYPES.has(String(t).trim().toLowerCase())
            );
            const mergedTypes = Array.from(new Set([...DEFAULT_EMPLOYMENT_TYPES, ...customList]))
                .filter((t) => !EXCLUDED_EMPLOYMENT_TYPES.has(String(t).trim().toLowerCase()));
            setAvailableEmploymentTypes(mergedTypes);

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
            if (Array.isArray(employmentTypes) && employmentTypes.length > 0) {
                params.append('employmentTypes', employmentTypes.join(','));
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
    }, [departmentId, businessUnitId, search, includeInactive, empTypesKey, cacheKey, employmentTypes]);

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
