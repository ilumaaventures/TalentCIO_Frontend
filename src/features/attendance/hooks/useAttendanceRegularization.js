import { useState, useCallback } from 'react';
import { format, startOfDay, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';
import { formatTimeInput } from '../utils/attendanceFormatters';

export const useAttendanceRegularization = ({
    holidays = [],
    weeklyOffs = ['Saturday', 'Sunday'],
    isPresentOnlyMode = false,
    onRegularizationProcessed
}) => {
    const [showRegModal, setShowRegModal] = useState(false);
    const [regDate, setRegDate] = useState(null);
    const [regForm, setRegForm] = useState({
        type: 'BOTH',
        checkIn: '',
        checkOut: '',
        reason: ''
    });
    const [regularizationRequests, setRegularizationRequests] = useState([]);
    const [processingRegId, setProcessingRegId] = useState(null);

    const fetchRegularizations = useCallback(async () => {
        try {
            const res = await api.get('/attendance/regularizations');
            const requestsList = Array.isArray(res.data) ? res.data : (res.data?.requests || []);
            setRegularizationRequests(requestsList);
        } catch (error) {
            console.error('Error fetching regularizations', error);
            setRegularizationRequests([]);
        }
    }, []);

    const handleRegularize = (day, record) => {
        const targetDate = startOfDay(new Date(day));
        const today = startOfDay(new Date());

        const holidayDates = (holidays || []).map(h => format(new Date(h.date), 'yyyy-MM-dd'));

        // 1. Check if it's a future date
        if (targetDate > today) {
            toast.error('Cannot regularize for future dates.');
            return;
        }

        // 2. Check if it's a Weekly Off or Holiday
        const dayOfWeekName = format(targetDate, 'EEEE');
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        if (weeklyOffs.includes(dayOfWeekName)) {
            toast.error(`Attendance regularization is not available for your weekly off day (${dayOfWeekName}).`);
            return;
        }
        if (holidayDates.includes(dateStr)) {
            toast.error('Attendance regularization is not available for holidays.');
            return;
        }

        // 3. Calculate 4 working days ago
        let workingDaysCount = 0;
        let checkDate = new Date(today);
        let maxLookback = 30; // Safety break

        while (workingDaysCount < 4 && maxLookback > 0) {
            checkDate = subDays(checkDate, 1);
            const dName = format(checkDate, 'EEEE');
            const dStr = format(checkDate, 'yyyy-MM-dd');

            const isWeeklyOff = weeklyOffs.includes(dName);
            const isHoliday = holidayDates.includes(dStr);

            if (!isWeeklyOff && !isHoliday) {
                workingDaysCount++;
            }
            maxLookback--;
        }

        const fourWorkingDaysAgo = startOfDay(checkDate);

        if (targetDate < fourWorkingDaysAgo) {
            toast.error('Attendance regularization is only allowed for the last 4 working days.');
            return;
        }

        setRegDate(day);
        setRegForm({
            type: isPresentOnlyMode ? 'PRESENT' : 'BOTH',
            checkIn: record?.clockIn ? formatTimeInput(record.clockIn) : '09:00',
            checkOut: record?.clockOut ? formatTimeInput(record.clockOut) : '18:00',
            reason: ''
        });
        setShowRegModal(true);
    };

    const submitRegularization = async (e) => {
        e.preventDefault();
        try {
            let requestedClockIn = null;
            let requestedClockOut = null;

            if (!isPresentOnlyMode) {
                const reqDate = new Date(regDate);

                if (regForm.type === 'IN' || regForm.type === 'BOTH') {
                    if (!regForm.checkIn) {
                        toast.error('Check In time is required.');
                        return;
                    }
                    const [inH, inM] = regForm.checkIn.split(':');
                    requestedClockIn = new Date(reqDate);
                    requestedClockIn.setHours(parseInt(inH, 10), parseInt(inM, 10), 0, 0);
                }

                if (regForm.type === 'OUT' || regForm.type === 'BOTH') {
                    if (!regForm.checkOut) {
                        toast.error('Check Out time is required.');
                        return;
                    }
                    const [outH, outM] = regForm.checkOut.split(':');
                    requestedClockOut = new Date(reqDate);
                    requestedClockOut.setHours(parseInt(outH, 10), parseInt(outM, 10), 0, 0);
                }

                if (regForm.type === 'BOTH' && requestedClockIn && requestedClockOut && requestedClockIn >= requestedClockOut) {
                    toast.error('Check In time must be earlier than Check Out time.');
                    return;
                }
            }

            await api.post('/attendance/regularize', {
                date: regDate,
                type: regForm.type,
                requestedClockIn,
                requestedClockOut,
                reason: regForm.reason
            });

            toast.success('Regularization request submitted');
            setShowRegModal(false);
            fetchRegularizations();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error submitting request');
        }
    };

    const processRegularization = async (id, status, rejectionReason = '') => {
        setProcessingRegId(id);
        try {
            const action = status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : status;
            await api.patch(`/attendance/regularize/${id}`, { action, status, rejectionReason });
            toast.success(`Request ${status.toLowerCase()}ed`);
            fetchRegularizations();
            if (onRegularizationProcessed) {
                onRegularizationProcessed();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error processing request');
        } finally {
            setProcessingRegId(null);
        }
    };

    return {
        showRegModal,
        setShowRegModal,
        regDate,
        setRegDate,
        regForm,
        setRegForm,
        regularizationRequests,
        setRegularizationRequests,
        processingRegId,
        fetchRegularizations,
        handleRegularize,
        submitRegularization,
        processRegularization
    };
};

export default useAttendanceRegularization;

