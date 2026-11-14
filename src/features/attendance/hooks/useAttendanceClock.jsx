import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import api from '@/lib/apiClient';

export const useAttendanceClock = ({
    currentUser,
    selectedUserId,
    calendarDate,
    isPresentOnlyMode,
    attendanceStartActionText,
    isDossierComplete,
    applyImmediateAttendanceUpdate,
    fetchTodayStatus,
    fetchMonthHistory
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [showDossierModal, setShowDossierModal] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleClockIn = async () => {
        if (!isDossierComplete) {
            setShowDossierModal(true);
            return;
        }

        if (!navigator.geolocation) {
            toast.error(`Geolocation is not supported by your browser. Please use a modern browser to ${attendanceStartActionText}.`);
            return;
        }

        const executeClockIn = async (locationData) => {
            setLoadingLocation(true);
            try {
                const payload = { location: locationData };
                const { data: attendanceRecord } = await api.post('/attendance/clock-in', payload);
                applyImmediateAttendanceUpdate(attendanceRecord);
                toast.success(isPresentOnlyMode ? 'Present Marked Successfully' : 'Clocked In Successfully');
                fetchTodayStatus();
                if (!selectedUserId || selectedUserId === currentUser?._id) {
                    fetchMonthHistory(calendarDate.getFullYear(), calendarDate.getMonth() + 1, { skipCache: true });
                }
            } catch (error) {
                toast.error(error.response?.data?.message || (isPresentOnlyMode ? 'Error Marking Present' : 'Error Clocking In'));
            } finally {
                setLoadingLocation(false);
            }
        };

        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                executeClockIn({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }).catch(err => {
                    console.error("Unhandled error during clock in:", err);
                    toast.error("An unexpected error occurred during clock in.");
                    setLoadingLocation(false);
                });
            },
            (err) => {
                setLoadingLocation(false);
                if (err.code === 1) {
                    toast.error(`Location permission is denied. Please allow location access in your browser to ${attendanceStartActionText}.`);
                } else if (err.code === 2) {
                    toast.error(`Location unavailable. Please turn on your system/device location service to ${attendanceStartActionText}.`);
                } else if (err.code === 3) {
                    toast.error(`Location request timed out. Please ensure GPS/location is enabled and try again.`);
                } else {
                    toast.error(`Please enable location to proceed with ${attendanceStartActionText}.`);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleClockOut = async () => {
        if (!isDossierComplete) {
            setShowDossierModal(true);
            return;
        }

        const executeClockOut = async (locationData) => {
            setLoadingLocation(true);
            try {
                const payload = { location: locationData };
                const { data: attendanceRecord } = await api.post('/attendance/clock-out', payload);
                applyImmediateAttendanceUpdate(attendanceRecord);
                toast.success('Clocked Out Successfully');
                fetchTodayStatus();
                if (!selectedUserId || selectedUserId === currentUser?._id) {
                    fetchMonthHistory(calendarDate.getFullYear(), calendarDate.getMonth() + 1, { skipCache: true });
                }
            } catch (error) {
                toast.error(error.response?.data?.message || 'Error Clocking Out');
            } finally {
                setLoadingLocation(false);
            }
        };

        toast((t) => (
            <div className={`
                ${t.visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                transition-all duration-300 pointer-events-auto
                bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-5 min-w-[320px]
            `}>
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <LogOut size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Confirm Checkout?</h3>
                        <p className="text-xs text-slate-500 font-medium">Are you sure you want to end your session?</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);

                            if (!navigator.geolocation) {
                                toast.error('Geolocation is not supported by your browser.');
                                return;
                            }

                            setLoadingLocation(true);
                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    executeClockOut({
                                        lat: position.coords.latitude,
                                        lng: position.coords.longitude,
                                        accuracy: position.coords.accuracy
                                    }).catch(err => {
                                        console.error("Unhandled error during clock out:", err);
                                        toast.error("An unexpected error occurred during clock out.");
                                        setLoadingLocation(false);
                                    });
                                },
                                (err) => {
                                    setLoadingLocation(false);
                                    if (err.code === 1) {
                                        toast.error('Location permission is denied. Please allow location access in your browser to check out.');
                                    } else if (err.code === 2) {
                                        toast.error('Location unavailable. Please turn on your system/device location service to check out.');
                                    } else if (err.code === 3) {
                                        toast.error('Location request timed out. Please ensure GPS/location is enabled and try again.');
                                    } else {
                                        toast.error('Please enable location to proceed with check out.');
                                    }
                                },
                                {
                                    enableHighAccuracy: true,
                                    timeout: 10000,
                                    maximumAge: 0
                                }
                            );
                        }}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-xl transition-all active:scale-95"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        ), { duration: 10000, position: 'top-center', style: { padding: 0, background: 'transparent', boxShadow: 'none', border: 'none' } });
    };

    return {
        currentTime,
        loadingLocation,
        showDossierModal,
        setShowDossierModal,
        handleClockIn,
        handleClockOut
    };
};

export default useAttendanceClock;
