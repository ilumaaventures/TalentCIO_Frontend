import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Trash2, Check } from 'lucide-react';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';

const PREDEFINED_EMPLOYMENT_TYPES = [
    'Full Time',
    'Part Time',
    'Contract',
    'Intern',
    'Consultant',
    'Freelance',
    'Probation'
];

const EmploymentTypeSelect = ({ value, onChange, name = 'employmentType', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [customTypes, setCustomTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const fetchCustomTypes = async () => {
            try {
                const res = await api.get('/admin/employment-types');
                if (isMounted && res.data?.customEmploymentTypes) {
                    setCustomTypes(res.data.customEmploymentTypes);
                }
            } catch (err) {
                console.error('Failed to load custom employment types:', err);
            }
        };
        fetchCustomTypes();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsAddingNew(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allCustomTypes = customTypes.filter(t => !PREDEFINED_EMPLOYMENT_TYPES.includes(t));
    const allOptions = Array.from(new Set([
        ...PREDEFINED_EMPLOYMENT_TYPES,
        ...allCustomTypes,
        ...(value && !PREDEFINED_EMPLOYMENT_TYPES.includes(value) ? [value] : [])
    ]));

    const handleSelectOption = (optionValue) => {
        onChange({
            target: {
                name,
                value: optionValue
            }
        });
        setIsOpen(false);
        setIsAddingNew(false);
    };

    const handleSaveNewType = async (e) => {
        if (e) e.preventDefault();
        const trimmed = newTypeName.trim();
        if (!trimmed) return;

        setLoading(true);
        try {
            const res = await api.post('/admin/employment-types', { name: trimmed });
            const updated = res.data?.customEmploymentTypes || [...customTypes, trimmed];
            setCustomTypes(updated);

            onChange({
                target: {
                    name,
                    value: trimmed
                }
            });

            setNewTypeName('');
            setIsAddingNew(false);
            setIsOpen(false);
            toast.success(`Employment type "${trimmed}" added!`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save employment type');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomType = async (typeToDelete, e) => {
        e.stopPropagation();
        try {
            const res = await api.delete(`/admin/employment-types/${encodeURIComponent(typeToDelete)}`);
            const updated = res.data?.customEmploymentTypes || customTypes.filter(t => t !== typeToDelete);
            setCustomTypes(updated);

            if (value === typeToDelete) {
                onChange({
                    target: {
                        name,
                        value: 'Full Time'
                    }
                });
            }
            toast.success(`Removed "${typeToDelete}"`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete employment type');
        }
    };

    const selectedLabel = value || 'Full Time';

    return (
        <div className={`relative w-full ${className}`} ref={dropdownRef}>
            {/* Dropdown Toggle Button */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(prev => !prev);
                    if (isOpen) setIsAddingNew(false);
                }}
                className="zoho-input w-full flex items-center justify-between text-left cursor-pointer bg-white"
            >
                <span className="truncate text-slate-800 text-xs sm:text-sm font-medium">
                    {selectedLabel}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Container */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        {allOptions.map((type) => {
                            const isCustom = !PREDEFINED_EMPLOYMENT_TYPES.includes(type);
                            const isSelected = value === type;

                            return (
                                <div
                                    key={type}
                                    onClick={() => handleSelectOption(type)}
                                    className={`px-3 py-2 text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                            : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                                        <span className="truncate">{type}</span>
                                    </div>

                                    {isCustom && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteCustomType(type, e)}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition shrink-0 ml-2"
                                            title={`Delete "${type}"`}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {/* Bottom "+ Add New" or Inline Input inside dropdown list */}
                        {!isAddingNew ? (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAddingNew(true);
                                }}
                                className="px-3 py-2 text-xs sm:text-sm font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center gap-1.5 border-t border-slate-100 transition-colors"
                            >
                                <Plus size={14} />
                                <span>+ Add New</span>
                            </div>
                        ) : (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="p-2.5 bg-slate-50 border-t border-slate-200 space-y-2 animate-in fade-in duration-150"
                            >
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    New Employment Type
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={newTypeName}
                                        onChange={(e) => setNewTypeName(e.target.value)}
                                        placeholder="e.g. Apprentice, Retainer, Volunteer"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNewType(e);
                                            if (e.key === 'Escape') {
                                                setIsAddingNew(false);
                                                setNewTypeName('');
                                            }
                                        }}
                                        className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveNewType}
                                        disabled={loading || !newTypeName.trim()}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded shrink-0 transition shadow-xs"
                                    >
                                        {loading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddingNew(false);
                                            setNewTypeName('');
                                        }}
                                        className="px-2 py-1.5 text-slate-500 hover:bg-slate-200 text-xs font-medium rounded shrink-0 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmploymentTypeSelect;
