import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/apiClient';
import useDebouncedValue from '@/hooks/useDebouncedValue';

export const useAttendanceUsers = ({
    currentUser,
    canViewAllUsers,
    isManager
}) => {
    const [usersList, setUsersList] = useState(currentUser?.directReports || []);
    const [selectedUserId, setSelectedUserId] = useState(currentUser?._id);
    const [viewUser, setViewUser] = useState(currentUser);
    const [teamMemberSearch, setTeamMemberSearch] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersLoaded, setUsersLoaded] = useState(false);

    const debouncedTeamMemberSearch = useDebouncedValue(teamMemberSearch.trim(), 900);

    const fetchUsers = useCallback(async () => {
        if (usersLoaded || loadingUsers) return;
        setLoadingUsers(true);
        try {
            if (canViewAllUsers) {
                const res = await api.get('/admin/users');
                setUsersList(res.data);
                setUsersLoaded(true);
            } else if (isManager) {
                try {
                    const res = await api.get('/admin/users/team');
                    setUsersList(res.data);
                    setUsersLoaded(true);
                } catch {
                    setUsersList(currentUser?.directReports || []);
                    setUsersLoaded(true);
                }
            }
        } catch (error) {
            console.error('Failed to fetch users list', error);
        } finally {
            setLoadingUsers(false);
        }
    }, [canViewAllUsers, isManager, loadingUsers, currentUser?.directReports, usersLoaded]);

    useEffect(() => {
        if (!selectedUserId || !currentUser?._id) return;

        if (selectedUserId === currentUser._id) {
            setViewUser(currentUser);
            return;
        }

        const foundLocally = usersList.find(u => u._id === selectedUserId);
        if (foundLocally && foundLocally.firstName && foundLocally.email) {
            setViewUser(foundLocally);
            return;
        }

        const fetchTargetUser = async () => {
            try {
                const res = await api.get(`/admin/users/${selectedUserId}`);
                setViewUser(res.data);
            } catch (error) {
                console.error('Failed to fetch target user details', error);
                if (foundLocally) setViewUser(foundLocally);
            }
        };

        fetchTargetUser();
    }, [selectedUserId, currentUser, usersList]);

    useEffect(() => {
        if (!debouncedTeamMemberSearch || usersLoaded || loadingUsers || (!canViewAllUsers && !isManager)) {
            return;
        }

        fetchUsers();
    }, [debouncedTeamMemberSearch, fetchUsers, canViewAllUsers, isManager, loadingUsers, usersLoaded]);

    const filteredTeamMembers = useMemo(() => {
        const searchableUsers = usersList.filter((u) => u?._id !== currentUser?._id);

        if (!debouncedTeamMemberSearch) {
            return searchableUsers;
        }

        const normalizedQuery = debouncedTeamMemberSearch.toLowerCase();

        return searchableUsers.filter((member) => {
            const fullName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim().toLowerCase();
            const email = String(member?.email || '').toLowerCase();
            const employeeCode = String(member?.employeeCode || '').toLowerCase();

            return fullName.includes(normalizedQuery)
                || email.includes(normalizedQuery)
                || employeeCode.includes(normalizedQuery);
        });
    }, [debouncedTeamMemberSearch, currentUser?._id, usersList]);

    return {
        usersList,
        setUsersList,
        selectedUserId,
        setSelectedUserId,
        viewUser,
        setViewUser,
        teamMemberSearch,
        setTeamMemberSearch,
        loadingUsers,
        usersLoaded,
        debouncedTeamMemberSearch,
        fetchUsers,
        filteredTeamMembers
    };
};

export default useAttendanceUsers;

