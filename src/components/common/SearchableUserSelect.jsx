import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, AlertTriangle, User as UserIcon } from 'lucide-react';

/**
 * Searchable single-user dropdown select with real-time text filter and active user support.
 */
const SearchableUserSelect = ({
    users = [],
    value = '',
    onChange,
    placeholder = 'Select User...',
    disabled = false,
    error = false,
    selectedUserFallback = null,
    emptyMessage = 'No active users found',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Resolve current selected user from users array or fallback
    const selectedUser = useMemo(() => {
        if (!value) return null;
        const found = users.find(u => String(u._id) === String(value));
        if (found) return found;
        if (selectedUserFallback && String(selectedUserFallback._id) === String(value)) {
            return selectedUserFallback;
        }
        return null;
    }, [users, value, selectedUserFallback]);

    // Filter users based on search term
    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return users;
        return users.filter(user => {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            const email = (user.email || '').toLowerCase();
            const empCode = (user.employeeCode || '').toLowerCase();
            return fullName.includes(term) || email.includes(term) || empCode.includes(term);
        });
    }, [users, searchTerm]);

    // Handle outside clicks to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus input on dropdown open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    const handleSelect = (userId) => {
        if (disabled) return;
        onChange(userId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (disabled) return;
        onChange('');
    };

    const isCurrentInactive = selectedUser && selectedUser.isActive === false;

    // Helper to get initials
    const getInitials = (user) => {
        if (!user) return 'U';
        const f = user.firstName?.[0] || '';
        const l = user.lastName?.[0] || '';
        return (f + l).toUpperCase() || 'U';
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                    if (!disabled) setIsOpen(prev => !prev);
                }}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        setIsOpen(true);
                    } else if (e.key === 'Escape') {
                        setIsOpen(false);
                    }
                }}
                className={`w-full min-h-[38px] px-3 py-1.5 bg-white border rounded-lg text-sm flex items-center justify-between gap-2 transition-all select-none ${
                    disabled
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : error
                            ? 'border-rose-400 focus:ring-2 focus:ring-rose-100 cursor-pointer'
                            : isOpen
                                ? 'border-indigo-500 ring-2 ring-indigo-100 cursor-pointer'
                                : 'border-slate-200 hover:border-slate-300 cursor-pointer shadow-xs'
                }`}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectedUser ? (
                        <>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden ${
                                isCurrentInactive
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}>
                                {selectedUser.profilePicture ? (
                                    <img src={selectedUser.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{getInitials(selectedUser)}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold text-slate-800 text-xs truncate">
                                    {selectedUser.firstName} {selectedUser.lastName}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate">
                                    ({selectedUser.email})
                                </span>
                                {isCurrentInactive && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                        <AlertTriangle size={10} /> Inactive
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                        <span className="text-slate-400 text-xs font-normal">
                            {placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {selectedUser && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Clear selection"
                        >
                            <X size={13} />
                        </button>
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}
                    />
                </div>
            </div>

            {/* Inactive Warning Alert underneath trigger if current user is inactive */}
            {isCurrentInactive && (
                <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} className="shrink-0" />
                    Current resolver is inactive. Please select an active team member.
                </p>
            )}

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Field Header */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Option List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
                        {/* Clear / Unselect Option */}
                        <div
                            onClick={() => handleSelect('')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                                !value
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                    : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span>-- Select User... --</span>
                            {!value && <Check size={14} className="text-indigo-600" />}
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className="py-6 px-4 text-center">
                                <UserIcon size={20} className="mx-auto text-slate-300 mb-1" />
                                <p className="text-xs text-slate-500 font-medium">
                                    {searchTerm ? `No users matching "${searchTerm}"` : emptyMessage}
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map((user) => {
                                const isSelected = String(user._id) === String(value);
                                return (
                                    <div
                                        key={user._id}
                                        onClick={() => handleSelect(user._id)}
                                        className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                            isSelected
                                                ? 'bg-indigo-50 text-indigo-900 font-semibold'
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                                                {user.profilePicture ? (
                                                    <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{getInitials(user)}</span>
                                                )}
                                            </div>
                                            <div className="truncate min-w-0">
                                                <p className="font-semibold text-slate-800 truncate leading-tight">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <Check size={14} className="text-indigo-600 shrink-0 font-bold" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableUserSelect;
