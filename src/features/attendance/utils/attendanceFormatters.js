import { format } from 'date-fns';

export const getLocalDateInputValue = (dateValue = new Date()) =>
    format(new Date(dateValue), 'yyyy-MM-dd');

export const formatTime = (dateString, istString) => {
    if (istString && istString.includes(',')) {
        const timePart = istString.split(',')[1]?.trim() || '';
        return timePart.toLowerCase();
    }
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).toLowerCase();
};

export const calculateDuration = (start, end, recordDate, livingCurrentTime = new Date()) => {
    if (!start) return '--';
    const startTime = new Date(start);
    let endTime;

    if (end) {
        endTime = new Date(end);
    } else {
        const today = new Date();
        const rDate = recordDate ? new Date(recordDate) : today;
        const isToday = rDate.toDateString() === today.toDateString();

        if (isToday) {
            endTime = livingCurrentTime; // Use living timer for today
        } else {
            endTime = new Date(rDate);
            endTime.setHours(23, 59, 59, 999);
        }
    }

    // Prevent negative duration
    if (endTime < startTime) return '0h 0m 0s';

    const diffString = Math.abs(endTime - startTime);
    const hours = Math.floor(diffString / (1000 * 60 * 60));
    const minutes = Math.floor((diffString % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffString % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
};

export const extractTime = (istString) =>
    istString.split(',')[1]?.trim() || istString;

export const formatTimeSimple = (date) =>
    new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const formatTimeInput = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

