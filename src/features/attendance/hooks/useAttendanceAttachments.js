import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/apiClient';

export const useAttendanceAttachments = ({
    selectedUserId,
    calendarDate
}) => {
    const [attendanceAttachments, setAttendanceAttachments] = useState({ files: [] });
    const [loadingAttachments, setLoadingAttachments] = useState(false);

    const fetchAttendanceAttachments = useCallback(async () => {
        if (!selectedUserId) return;
        setLoadingAttachments(true);
        try {
            const currentMonth = format(calendarDate, 'yyyy-MM');
            const res = await api.get(`/attendance/attachments/${selectedUserId}/${currentMonth}`);
            setAttendanceAttachments(res.data);
        } catch (error) {
            console.error('Error fetching attachments', error);
        } finally {
            setLoadingAttachments(false);
        }
    }, [calendarDate, selectedUserId]);

    const handleUploadAttachment = async (file) => {
        if (!file || !selectedUserId) return;
        const currentMonth = format(calendarDate, 'yyyy-MM');
        const formData = new FormData();
        formData.append('file', file);

        const loadingToast = toast.loading('Uploading document...');
        try {
            const res = await api.post(`/attendance/attachments/${selectedUserId}/${currentMonth}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttendanceAttachments(res.data);
            toast.success('Document uploaded successfully', { id: loadingToast });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload document', { id: loadingToast });
        }
    };

    const handleDeleteAttachment = async (fileId) => {
        if (!selectedUserId || !fileId) return;
        const currentMonth = format(calendarDate, 'yyyy-MM');
        const confirmDelete = window.confirm('Are you sure you want to delete this document?');
        if (!confirmDelete) return;

        const loadingToast = toast.loading('Deleting document...');
        try {
            const res = await api.delete(`/attendance/attachments/${selectedUserId}/${currentMonth}/${fileId}`);
            setAttendanceAttachments(res.data);
            toast.success('Document deleted successfully', { id: loadingToast });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete document', { id: loadingToast });
        }
    };

    const handleSubmitAttachment = async (fileId) => {
        if (!selectedUserId || !fileId) return;
        const currentMonth = format(calendarDate, 'yyyy-MM');
        try {
            const loadingToast = toast.loading('Submitting document...');
            await api.put(`/attendance/attachments/${selectedUserId}/${currentMonth}/${fileId}/submit`);
            toast.success('Document submitted for approval', { id: loadingToast });
            fetchAttendanceAttachments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit document');
        }
    };

    const handleReviewAttachment = async (fileId, status, reason = '') => {
        if (!selectedUserId || !fileId) return;
        const currentMonth = format(calendarDate, 'yyyy-MM');
        try {
            const action = status === 'Approved' ? 'Approving' : 'Rejecting';
            const loadingToast = toast.loading(`${action} document...`);
            await api.put(`/attendance/attachments/${selectedUserId}/${currentMonth}/${fileId}/review`, { status, reason });
            toast.success(`Document ${status.toLowerCase()}`, { id: loadingToast });
            fetchAttendanceAttachments();
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} document`);
        }
    };

    const handleReplaceAttachment = async (fileId, newFile) => {
        if (!selectedUserId || !fileId || !newFile) return;
        const currentMonth = format(calendarDate, 'yyyy-MM');
        const formData = new FormData();
        formData.append('file', newFile);

        const loadingToast = toast.loading('Replacing document...');
        try {
            await api.put(`/attendance/attachments/${selectedUserId}/${currentMonth}/${fileId}/replace`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Document replaced successfully', { id: loadingToast });
            fetchAttendanceAttachments();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to replace document', { id: loadingToast });
        }
    };

    return {
        attendanceAttachments,
        loadingAttachments,
        fetchAttendanceAttachments,
        handleUploadAttachment,
        handleDeleteAttachment,
        handleSubmitAttachment,
        handleReviewAttachment,
        handleReplaceAttachment
    };
};

export default useAttendanceAttachments;

