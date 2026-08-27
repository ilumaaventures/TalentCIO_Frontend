import React, { useCallback, useState, useEffect, useRef } from 'react';
import api from '@/lib/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Plus, Edit2, Trash2, Calendar, X, Save, CalendarCheck, CalendarOff, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { createCachePayload, isCacheFresh, readSessionCache } from '@/lib/cache';

const Holidays = () => {
    const { user } = useAuth();
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const initialFetchDoneRef = useRef(false);
    const HOLIDAY_CACHE_TTL_MS = 60 * 1000;

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        isOptional: false
    });

    // Determine stats
    const totalHolidays = holidays.length;
    const upcomingHolidays = holidays.filter(h => new Date(h.date) >= new Date() && !h.isOptional).length;
    const optionalHolidays = holidays.filter(h => h.isOptional).length;

    const isAdmin = user?.roles?.includes('Admin') || user?.roles?.some(r => r.name === 'Admin');
    const canCreateHoliday = isAdmin || user?.permissions?.includes('holiday.create') || user?.hasAllPermissions;
    const canEditHoliday = isAdmin || user?.permissions?.includes('holiday.edit') || user?.hasAllPermissions;
    const canDeleteHoliday = isAdmin || user?.permissions?.includes('holiday.delete') || user?.hasAllPermissions;

    const fetchHolidays = useCallback(async (isBackground = false, force = false) => {
        const CACHE_KEY = `holiday_data_${user?._id}_${new Date().getFullYear()}`;

        // Helper: Generate fingerprint for change detection
        const buildFingerprint = (data) => {
            const items = data?.data || data;
            if (!Array.isArray(items)) return '';
            return items.map(h => `${h._id}-${h.name}-${h.date}-${h.isOptional}`).join('|');
        };

        // 1. Initial Load from Cache
        if (!isBackground && !force) {
            const cached = readSessionCache(CACHE_KEY);
            if (cached) {
                setHolidays(cached.data || cached);
                setLoading(false);
                if (isCacheFresh(cached, HOLIDAY_CACHE_TTL_MS)) return;
            }
        }

        try {
            if (!isBackground && !force && !readSessionCache(CACHE_KEY)) setLoading(true);
            const res = await api.get(`/holidays?_t=${Date.now()}`);
            const freshData = res.data;

            // 2. Check for changes via fingerprint
            const cachedValue = readSessionCache(CACHE_KEY);
            const oldFingerprint = cachedValue ? buildFingerprint(cachedValue.data || cachedValue) : '';
            const newFingerprint = buildFingerprint(freshData);

            if (newFingerprint !== oldFingerprint || force) {
                setHolidays(freshData);
                
                // Minimal data for caching
                const minimalHolidays = freshData.map(h => ({
                    _id: h._id,
                    name: h.name,
                    date: h.date,
                    isOptional: h.isOptional
                }));

                const payload = createCachePayload(minimalHolidays, newFingerprint);
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
            }
        } catch (error) {
            console.error(error);
            if (!isBackground) toast.error("Failed to load holidays");
        } finally {
            setLoading(false);
        }
    }, [HOLIDAY_CACHE_TTL_MS, user?._id]);

    useEffect(() => {
        if (initialFetchDoneRef.current) return;
        initialFetchDoneRef.current = true;
        fetchHolidays();
    }, [fetchHolidays]);

    const handleOpenModal = (holiday = null) => {
        if (holiday) {
            setEditingHoliday(holiday);
            setFormData({
                name: holiday.name,
                date: new Date(holiday.date).toISOString().split('T')[0],
                isOptional: holiday.isOptional
            });
        } else {
            setEditingHoliday(null);
            setFormData({ name: '', date: '', isOptional: false });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingHoliday) {
                await api.put(`/holidays/${editingHoliday._id}`, formData);
                toast.success("Holiday updated");
            } else {
                await api.post('/holidays', formData);
                toast.success("Holiday added");
            }
            const CACHE_KEY = `holiday_data_${user?._id}_${new Date().getFullYear()}`;
            sessionStorage.removeItem(CACHE_KEY);
            setIsModalOpen(false);
            fetchHolidays(false, true); // Force refresh cache
        } catch (error) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this holiday?")) return false;
        try {
            await api.delete(`/holidays/${id}`);
            toast.success("Holiday deleted");
            const CACHE_KEY = `holiday_data_${user?._id}_${new Date().getFullYear()}`;
            sessionStorage.removeItem(CACHE_KEY);
            fetchHolidays(false, true); // Force refresh cache
            return true;
        } catch {
            toast.error("Failed to delete holiday");
            return false;
        }
    };

    return (
        <div className="p-4 sm:p-5 max-w-[1600px] mx-auto w-full font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Holiday Calendar</h1>
                    <p className="text-[11px] text-slate-400 mt-0.5">Manage annual holidays and optional leaves for your organization.</p>
                </div>
                {canCreateHoliday && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition-all text-xs font-semibold cursor-pointer"
                    >
                        <Plus size={15} />
                        <span>Add New Holiday</span>
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <CalendarDays size={18} />
                    </div>
                    <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Total Holidays</p>
                        <p className="text-xl font-extrabold text-slate-900">{totalHolidays}</p>
                    </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                        <CalendarCheck size={18} />
                    </div>
                    <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Upcoming Holidays</p>
                        <p className="text-xl font-extrabold text-slate-900">{upcomingHolidays}</p>
                    </div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                        <CalendarOff size={18} />
                    </div>
                    <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Optional Leaves</p>
                        <p className="text-xl font-extrabold text-slate-900">{optionalHolidays}</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-10 bg-white rounded-xl shadow-xs border border-slate-200">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden ring-1 ring-black/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-white text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-5 py-2.5 font-bold text-slate-400 text-[10px] tracking-wider uppercase">Date</th>
                                    <th className="px-5 py-2.5 font-bold text-slate-400 text-[10px] tracking-wider uppercase">Holiday Name</th>
                                    <th className="px-5 py-2.5 font-bold text-slate-400 text-[10px] tracking-wider uppercase">Type</th>
                                    <th className="px-5 py-2.5 font-bold text-slate-400 text-[10px] tracking-wider uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {holidays.length > 0 ? (
                                    holidays.map((holiday) => {
                                        const isPast = new Date(holiday.date) < new Date().setHours(0, 0, 0, 0);
                                        return (
                                            <tr
                                                key={holiday._id}
                                                // Make row clickable for admins to edit
                                                onClick={() => canEditHoliday && handleOpenModal(holiday)}
                                                className={`hover:bg-slate-50/70 transition-colors group ${canEditHoliday ? 'cursor-pointer' : ''}`}
                                            >
                                                <td className="px-5 py-2.5 whitespace-nowrap">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-1.5 rounded-md ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                                                            <Calendar size={15} />
                                                        </div>
                                                        <div>
                                                            <p className={`font-semibold ${isPast ? 'text-slate-500' : 'text-slate-900'} text-xs`}>
                                                                {format(new Date(holiday.date), 'MMMM d, yyyy')}
                                                            </p>
                                                            <p className="text-[10.5px] text-slate-400 font-medium">
                                                                {format(new Date(holiday.date), 'EEEE')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`text-xs font-bold ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>{holiday.name}</span>
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${holiday.isOptional
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                        }`}>
                                                        {holiday.isOptional ? 'Optional' : 'Fixed'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <span className={`text-[11px] ${isPast ? 'text-slate-400 italic' : 'text-blue-600 font-semibold'}`}>
                                                        {isPast ? 'Completed' : 'Upcoming'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <CalendarOff size={36} className="mb-3 text-slate-300" />
                                                <p className="text-xs font-bold text-slate-600">No holidays found for this year</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Get started by adding a new holiday to the calendar.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {holidays.length > 0 && (
                        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between uppercase tracking-wider font-semibold">
                            <span>Total: {totalHolidays}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-base text-slate-800">
                                    {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Enter holiday details below</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Holiday Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-semibold text-slate-800 placeholder:font-normal"
                                    placeholder="e.g. Independence Day"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-semibold text-slate-800"
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center space-x-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="isOptional"
                                            checked={formData.isOptional}
                                            onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        <span className="text-xs font-semibold text-slate-700 select-none">
                                            Optional / Floating
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between items-center border-t border-slate-100 mt-2">
                                <div>
                                    {editingHoliday && canDeleteHoliday && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const deleted = await handleDelete(editingHoliday._id);
                                                if (deleted) {
                                                    setIsModalOpen(false);
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                                        >
                                            <Trash2 size={14} />
                                            <span>Delete Holiday</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex space-x-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg transition text-xs font-semibold border border-transparent hover:border-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-xs font-semibold shadow-sm flex items-center space-x-1.5 cursor-pointer"
                                    >
                                        <Save size={14} />
                                        <span>{editingHoliday ? 'Update Changes' : 'Save Holiday'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Holidays;
