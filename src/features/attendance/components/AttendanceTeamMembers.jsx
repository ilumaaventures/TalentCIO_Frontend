import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

const AttendanceTeamMembers = ({
    canViewAllUsers,
    isManager,
    usersLoaded,
    loadingUsers,
    fetchUsers,
    teamMemberSearch,
    setTeamMemberSearch,
    currentUser,
    selectedUserId,
    setSelectedUserId,
    filteredTeamMembers = [],
    usersList = [],
    debouncedTeamMemberSearch = ''
}) => {
    if (!canViewAllUsers && !isManager) return null;

    return (
        <div className="zoho-card p-5">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Team Members</h4>
                {!usersLoaded && !loadingUsers && (
                    <button
                        onClick={fetchUsers}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                        Show All
                    </button>
                )}
            </div>
            <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={teamMemberSearch}
                    onChange={(e) => setTeamMemberSearch(e.target.value)}
                    onFocus={() => {
                        if (!usersLoaded && !loadingUsers) {
                            fetchUsers();
                        }
                    }}
                    placeholder="Search by name, email, or code"
                    aria-label="Search team members"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                {teamMemberSearch && (
                    <button
                        type="button"
                        onClick={() => setTeamMemberSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        aria-label="Clear team member search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {/* Self */}
                <button
                    onClick={() => setSelectedUserId(currentUser?._id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${selectedUserId === currentUser?._id ? 'bg-blue-50 border border-blue-100 text-blue-700' : 'hover:bg-slate-50 border border-transparent text-slate-600'}`}
                >
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">ME</div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate">My Attendance</p>
                        <p className="text-[10px] opacity-70 truncate">{currentUser?.email}</p>
                    </div>
                </button>

                {loadingUsers && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                    </div>
                )}

                {usersLoaded && usersList.length > 0 && <div className="h-px bg-slate-100 my-2"></div>}

                {/* List */}
                {filteredTeamMembers.map((u) => (
                    <button
                        key={u._id}
                        onClick={() => setSelectedUserId(u._id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${selectedUserId === u._id ? 'bg-blue-50 border border-blue-100 text-blue-700' : 'hover:bg-slate-50 border border-transparent text-slate-600'}`}
                    >
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-[10px] opacity-70 truncate">{u.email}</p>
                        </div>
                    </button>
                ))}

                {!loadingUsers && (usersLoaded || debouncedTeamMemberSearch) && filteredTeamMembers.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center">
                        <p className="text-xs font-semibold text-slate-500">
                            {debouncedTeamMemberSearch ? 'No team members match your search.' : 'No team members available.'}
                        </p>
                        {debouncedTeamMemberSearch && (
                            <p className="mt-1 text-[11px] text-slate-400">
                                Try a different name, email, or employee code.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTeamMembers;

