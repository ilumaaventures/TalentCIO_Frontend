import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { readSessionCache, createCachePayload, isCacheFresh } from '@/lib/cache';

const ORG_CHART_CACHE_TTL_MS = 60 * 1000;

export const useOrgChartData = ({ departmentId = '', businessUnitId = '', search = '', includeInactive = false } = {}) => {
    const [treeData, setTreeData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const initialFetchDoneRef = useRef(false);

    const cacheKey = `org_chart_data_${departmentId}_${businessUnitId}_${includeInactive}`;

    const fetchOrgData = useCallback(async ({ force = false } = {}) => {
        try {
            setLoading(true);

            // Fetch filters (departments & business units)
            const [deptRes, buRes] = await Promise.all([
                api.get('/organization/departments?includeInactive=false').catch(() => ({ data: [] })),
                api.get('/organization/business-units').catch(() => ({ data: [] }))
            ]);

            setDepartments(deptRes.data || []);
            setBusinessUnits(buRes.data || []);

            // Check cache for tree & stats if not searching
            if (!search && !force) {
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

            const [treeRes, statsRes] = await Promise.all([
                api.get(`/organization/org-chart?${params.toString()}`),
                api.get('/organization/org-chart/stats').catch(() => ({ data: null }))
            ]);

            const newTree = treeRes.data?.tree || [];
            const newStats = statsRes.data || null;

            setTreeData(newTree);
            setStats(newStats);

            if (!search) {
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
    }, [departmentId, businessUnitId, search, includeInactive, cacheKey]);

    useEffect(() => {
        fetchOrgData();
    }, [fetchOrgData]);

    return {
        treeData,
        stats,
        loading,
        departments,
        businessUnits,
        refetch: (force = true) => fetchOrgData({ force })
    };
};
