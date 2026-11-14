import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Clock, Download, Briefcase, Calendar, Layers } from 'lucide-react';
import { format } from 'date-fns';

// Subcomponents
import AttendanceAttachmentsView from '@/features/attendance/components/AttendanceAttachmentsView';
import AttendanceCalendar from '@/features/attendance/components/AttendanceCalendar';
import { RGDocumentTracker } from '@/features/attendance';
import DossierIncompleteModal from '@/features/employee-dossier/components/DossierIncompleteModal';

import AttendanceSkeleton from '../components/AttendanceSkeleton';
import AttendanceHeader from '../components/AttendanceHeader';
import AttendanceClockWidget from '../components/AttendanceClockWidget';
import AttendanceFlexibleOffCard from '../components/AttendanceFlexibleOffCard';
import AttendanceRecentActivity from '../components/AttendanceRecentActivity';
import AttendanceTeamMembers from '../components/AttendanceTeamMembers';
import AssignedTasksView from '../components/AssignedTasksView';
import RegularizationRequestsView from '../components/RegularizationRequestsView';
import RegularizationModal from '../components/RegularizationModal';

// Hooks
import useAttendanceUsers from '../hooks/useAttendanceUsers';
import useAttendanceData from '../hooks/useAttendanceData';
import useAttendanceClock from '../hooks/useAttendanceClock';
import useAttendanceRegularization from '../hooks/useAttendanceRegularization';
import useAttendanceAttachments from '../hooks/useAttendanceAttachments';
import useAttendanceTasks from '../hooks/useAttendanceTasks';

// Utilities
import { DEFAULT_ATTENDANCE_SHIFTS, resolveUserFlexPolicy } from '../utils/flexPolicy';
import { exportMonthlyTimesheet, exportAttendanceReport } from '../utils/attendanceExport';

const Attendance = () => {
    const { user, hasModule, isDossierComplete, dossierMissingSections, dossierMissingFields } = useAuth();
    const location = useLocation();

    const [calendarDate, setCalendarDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState('history');

    // Robust Check for Admin
    const isAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : r?.name;
        return roleName === 'Admin' || roleName === 'System Admin';
    })
        || user?.permissions?.includes('*')
        || user?.permissions?.includes('all')
        || user?.permissions?.includes('admin')
        || user?.permissions?.includes('attendance.view_all')
        || user?.role === 'Admin';

    // Robust Check for Manager
    const isManager = user?.roles?.some(r => (typeof r === 'string' ? r : r?.name) === 'Manager')
        || (user?.directReports && user.directReports.length > 0)
        || user?.role === 'Manager';

    const canViewAllUsers = isAdmin
        || user?.permissions?.includes('user.read')
        || user?.permissions?.includes('attendance.view_all')
        || user?.permissions?.includes('attendance.view_others');

    // Users & Team Management Hook
    const {
        usersList,
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
    } = useAttendanceUsers({
        currentUser: user,
        canViewAllUsers,
        isManager
    });

    // Attendance Data & Bootstrap Hook
    const {
        status,
        history,
        holidays,
        approvedLeaves,
        weeklyOffs,
        timesheetSummary,
        customFlexibleOffDays,
        fetchedAttendanceSettings,
        recentLogs,
        setRecentLogs,
        loading,
        fetchTodayStatus,
        fetchMonthHistory,
        applyImmediateAttendanceUpdate
    } = useAttendanceData({
        currentUser: user,
        selectedUserId,
        calendarDate,
        setViewUser
    });

    const attendanceSettings = fetchedAttendanceSettings || user?.company?.settings?.attendance || {};

    // Both "Documents" and "Submitted Docs" tabs are controlled by "Enable Attendance Documents" from SuperAdmin
    const isAttendanceDocumentsEnabled = Boolean(
        user?.company?.settings?.timesheet?.requireAttachment
        || user?.company?.settings?.attendance?.requireAttachment
        || attendanceSettings?.requireAttachment
    );
    const showDocumentsTab = isAttendanceDocumentsEnabled;
    const showRGDocumentTrackerTab = isAttendanceDocumentsEnabled;

    const effectiveFlexPolicy = useMemo(() => {
        return resolveUserFlexPolicy(viewUser || user, attendanceSettings);
    }, [viewUser, user, attendanceSettings]);

    const computedFlexibleOffDays = useMemo(() => {
        if (!effectiveFlexPolicy.enabled) return [];
        if (Array.isArray(customFlexibleOffDays) && customFlexibleOffDays.length > 0) {
            return customFlexibleOffDays;
        }
        return (viewUser || user)?.customFlexibleOffDays || [];
    }, [effectiveFlexPolicy.enabled, customFlexibleOffDays, viewUser, user]);

    const companyShiftOptions = Array.isArray(attendanceSettings.attendanceShifts) && attendanceSettings.attendanceShifts.length > 0
        ? attendanceSettings.attendanceShifts
        : DEFAULT_ATTENDANCE_SHIFTS;
    const activeAttendanceMode = status?.attendanceMode
        || viewUser?.attendanceMode
        || user?.attendanceMode
        || attendanceSettings.defaultAttendanceMode
        || 'clock_in_out';
    const activeShiftCode = String(
        status?.shiftCode
        || viewUser?.attendanceShiftCode
        || user?.attendanceShiftCode
        || attendanceSettings.defaultShiftCode
        || 'general'
    ).toLowerCase();
    const activeShift = companyShiftOptions.find(
        (shift) => String(shift?.code || '').toLowerCase() === activeShiftCode
    ) || companyShiftOptions[0] || null;
    const isPresentOnlyMode = activeAttendanceMode === 'present_only';
    const isMarkedPresent = isPresentOnlyMode && status?.status === 'PRESENT';
    const isClockedIn = !isPresentOnlyMode && Boolean(status?.clockIn && !status?.clockOut);
    const isClockedOut = !isPresentOnlyMode && Boolean(status?.clockIn && status?.clockOut);
    const isAttendanceActive = isPresentOnlyMode ? isMarkedPresent : isClockedIn;
    const isViewingOwnAttendance = !selectedUserId || String(selectedUserId) === String(user?._id);
    const attendanceStartLabel = isPresentOnlyMode ? 'Mark Present' : 'Check In';
    const attendanceStartActionText = isPresentOnlyMode ? 'mark attendance' : 'clock in';
    const attendanceStatusLabel = isPresentOnlyMode
        ? (isMarkedPresent ? 'Present Marked' : 'Not Marked')
        : (isClockedIn ? 'Clocked In' : isClockedOut ? 'Shift Ended' : 'Not Started');
    const attendanceStatusColorClass = isAttendanceActive
        ? 'text-[#08B87B]'
        : (isClockedOut ? 'text-slate-500' : 'text-slate-700');
    const activeShiftName = status?.shiftName || activeShift?.name || '--';
    const activeShiftWindow = (status?.shiftType || activeShift?.shiftType) === 'any'
        ? `Flexible up to ${status?.maxWorkingHours || activeShift?.maxWorkingHours || attendanceSettings.workingHours || 8} hrs`
        : `${status?.shiftStartTime || activeShift?.startTime || '--'} - ${status?.shiftEndTime || activeShift?.endTime || '--'}`;

    // Clock & Geolocation Hook
    const {
        currentTime,
        loadingLocation,
        showDossierModal,
        setShowDossierModal,
        handleClockIn,
        handleClockOut
    } = useAttendanceClock({
        currentUser: user,
        selectedUserId,
        calendarDate,
        isPresentOnlyMode,
        attendanceStartActionText,
        isDossierComplete,
        applyImmediateAttendanceUpdate,
        fetchTodayStatus,
        fetchMonthHistory
    });

    // Regularization Hook
    const {
        showRegModal,
        setShowRegModal,
        regDate,
        regForm,
        setRegForm,
        regularizationRequests,
        processingRegId,
        fetchRegularizations,
        handleRegularize,
        submitRegularization,
        processRegularization
    } = useAttendanceRegularization({
        holidays,
        weeklyOffs,
        isPresentOnlyMode,
        onRegularizationProcessed: () => {
            const now = new Date();
            fetchMonthHistory(now.getFullYear(), now.getMonth() + 1);
        }
    });

    // Attendance Attachments Hook
    const {
        attendanceAttachments,
        loadingAttachments,
        fetchAttendanceAttachments,
        handleUploadAttachment,
        handleDeleteAttachment,
        handleSubmitAttachment,
        handleReviewAttachment,
        handleReplaceAttachment
    } = useAttendanceAttachments({
        selectedUserId,
        calendarDate
    });

    // Work Tasks & Logs Hook
    const {
        assignedTasks,
        logForm,
        setLogForm,
        expandedLogTaskId,
        setExpandedLogTaskId,
        editingLogId,
        toggleLogForm,
        handleDeleteLog,
        handleLogWork
    } = useAttendanceTasks({
        currentUser: user,
        hasModule,
        activeTab,
        setRecentLogs
    });

    // Sync tab and user from URL search params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        const allowedTabs = ['history', 'tasks', 'regularize'];

        if (showDocumentsTab) {
            allowedTabs.push('documents');
        }

        if (showRGDocumentTrackerTab) {
            allowedTabs.push('rg-documents-summary');
        }

        if (tab && allowedTabs.includes(tab)) {
            setActiveTab(tab);
        } else if (location.pathname.includes('approvals') || location.pathname.includes('regularize')) {
            setActiveTab('regularize');
        } else if (tab === 'rg-documents-summary' && !showRGDocumentTrackerTab) {
            setActiveTab(showDocumentsTab ? 'documents' : 'history');
        }

        const qUserId = params.get('userId');
        if (qUserId) {
            setSelectedUserId(qUserId);
        } else {
            setSelectedUserId(user?._id);
        }
    }, [location, showDocumentsTab, showRGDocumentTrackerTab, user, setSelectedUserId]);

    useEffect(() => {
        if (!showRGDocumentTrackerTab && activeTab === 'rg-documents-summary') {
            setActiveTab(showDocumentsTab ? 'documents' : 'history');
        }
    }, [activeTab, showDocumentsTab, showRGDocumentTrackerTab]);

    useEffect(() => {
        if (activeTab === 'regularize') {
            fetchRegularizations();
        } else if (activeTab === 'documents') {
            fetchAttendanceAttachments();
        }
    }, [activeTab, calendarDate, fetchAttendanceAttachments, fetchRegularizations, selectedUserId]);

    const handleTrackerMonthChange = (monthKey) => {
        const normalizedValue = String(monthKey || '').trim();
        if (!normalizedValue) return;

        const [year, month] = normalizedValue.split('-').map(Number);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return;

        setCalendarDate(new Date(year, month - 1, 1));
    };

    const handleExportMonthlyTimesheet = () => {
        exportMonthlyTimesheet({
            exportUser: viewUser || user,
            calendarDate,
            history,
            approvedLeaves,
            holidays,
            weeklyOffs,
            standardHours: user?.company?.settings?.attendance?.workingHours || 8,
            timesheetSummary
        });
    };

    const handleExportAttendance = () => {
        exportAttendanceReport({
            exportUser: viewUser || user,
            history,
            holidays,
            approvedLeaves,
            weeklyOffs,
            computedFlexibleOffDays
        });
    };

    if (loading) return <AttendanceSkeleton />;

    const canExport = canViewAllUsers || isManager || user?.permissions?.includes('attendance.export');

    return (
        <>
            <div className="h-[calc(100vh-64px)] w-full bg-slate-100 font-sans flex flex-col overflow-hidden">
                {/* Header - Fixed */}
                <AttendanceHeader
                    selectedUserId={selectedUserId}
                    currentUserId={user?._id}
                    viewUser={viewUser}
                    currentTime={currentTime}
                    canExport={canExport}
                    exportFormat={user?.company?.settings?.attendance?.exportFormat}
                    onExportMonthlyTimesheet={handleExportMonthlyTimesheet}
                    onExportAttendance={handleExportAttendance}
                />

                {/* Main Content - Flex/Grid taking remaining height */}
                <div className="flex-1 overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">

                        {/* Widget Column - Scrollable */}
                        <div className="xl:col-span-1 space-y-6 overflow-y-auto pr-2 h-full custom-scrollbar pb-2">
                            <AttendanceClockWidget
                                status={status}
                                isAttendanceActive={isAttendanceActive}
                                isClockedIn={isClockedIn}
                                isClockedOut={isClockedOut}
                                isMarkedPresent={isMarkedPresent}
                                isPresentOnlyMode={isPresentOnlyMode}
                                isViewingOwnAttendance={isViewingOwnAttendance}
                                attendanceStatusColorClass={attendanceStatusColorClass}
                                attendanceStatusLabel={attendanceStatusLabel}
                                attendanceStartLabel={attendanceStartLabel}
                                loadingLocation={loadingLocation}
                                handleClockIn={handleClockIn}
                                handleClockOut={handleClockOut}
                                activeShiftName={activeShiftName}
                                activeShiftWindow={activeShiftWindow}
                                currentTime={currentTime}
                            />

                            <AttendanceFlexibleOffCard
                                effectiveFlexPolicy={effectiveFlexPolicy}
                                customFlexibleOffDays={customFlexibleOffDays}
                                calendarDate={calendarDate}
                            />

                            <AttendanceRecentActivity
                                hasProjectsModule={hasModule('projects')}
                                recentLogs={recentLogs}
                                isAttendanceActive={isAttendanceActive}
                                isPresentOnlyMode={isPresentOnlyMode}
                            />

                            <AttendanceTeamMembers
                                canViewAllUsers={canViewAllUsers}
                                isManager={isManager}
                                usersLoaded={usersLoaded}
                                loadingUsers={loadingUsers}
                                fetchUsers={fetchUsers}
                                teamMemberSearch={teamMemberSearch}
                                setTeamMemberSearch={setTeamMemberSearch}
                                currentUser={user}
                                selectedUserId={selectedUserId}
                                setSelectedUserId={setSelectedUserId}
                                filteredTeamMembers={filteredTeamMembers}
                                usersList={usersList}
                                debouncedTeamMemberSearch={debouncedTeamMemberSearch}
                            />
                        </div>

                        {/* Main Content Column with Tabs - Flex Column */}
                        <div className="xl:col-span-3 flex flex-col h-full overflow-hidden">
                            {/* Tab Navigation - Fixed */}
                            <div className="flex-none flex border-b border-slate-200 bg-white rounded-t-lg px-4 pt-2 mb-0">
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Calendar size={16} /> Attendance History
                                </button>
                                <button
                                    onClick={() => setActiveTab('regularize')}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'regularize' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Clock size={16} /> Regularization Requests
                                </button>
                                {hasModule('projects') && (
                                    <button
                                        onClick={() => setActiveTab('tasks')}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Briefcase size={16} /> Assigned to Me {assignedTasks.length > 0 && <span className="bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-full ml-1">{assignedTasks.length}</span>}
                                    </button>
                                )}
                                {showDocumentsTab && (
                                    <button
                                        onClick={() => setActiveTab('documents')}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'documents' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Download size={16} /> Documents
                                    </button>
                                )}
                                {showRGDocumentTrackerTab && (
                                    <button
                                        onClick={() => setActiveTab('rg-documents-summary')}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'rg-documents-summary' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Layers size={16} /> Submitted Docs
                                    </button>
                                )}
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="flex-1 bg-white rounded-b-lg shadow-sm border border-t-0 border-slate-200 p-6 overflow-y-auto custom-scrollbar relative">
                                {activeTab === 'history' ? (
                                    <AttendanceCalendar
                                        history={history}
                                        onMonthChange={(year, month) => {
                                            setCalendarDate(new Date(year, month - 1, 1));
                                            fetchMonthHistory(year, month);
                                        }}
                                        user={viewUser || user}
                                        date={calendarDate}
                                        holidays={holidays}
                                        approvedLeaves={approvedLeaves}
                                        onRegularize={handleRegularize}
                                        weeklyOffs={weeklyOffs}
                                        flexibleOffDays={computedFlexibleOffDays}
                                    />
                                ) : activeTab === 'regularize' ? (
                                    <RegularizationRequestsView
                                        requests={regularizationRequests}
                                        onProcess={processRegularization}
                                        processingId={processingRegId}
                                        currentUser={user}
                                    />
                                ) : activeTab === 'documents' ? (
                                    <AttendanceAttachmentsView
                                        attachments={attendanceAttachments}
                                        loading={loadingAttachments}
                                        onUpload={handleUploadAttachment}
                                        onDelete={handleDeleteAttachment}
                                        isReadOnly={selectedUserId !== user?._id && !isAdmin}
                                        isAdmin={isAdmin}
                                        monthName={format(calendarDate, 'MMMM yyyy')}
                                        monthValue={format(calendarDate, 'yyyy-MM')}
                                        onMonthChange={handleTrackerMonthChange}
                                        onSubmit={handleSubmitAttachment}
                                        onApprove={(id) => handleReviewAttachment(id, 'Approved')}
                                        onReject={(id, reason) => handleReviewAttachment(id, 'Rejected', reason)}
                                        onReplace={handleReplaceAttachment}
                                        canApprove={isAdmin}
                                    />
                                ) : activeTab === 'rg-documents-summary' && showRGDocumentTrackerTab ? (
                                    <RGDocumentTracker
                                        monthValue={format(calendarDate, 'yyyy-MM')}
                                        onMonthChange={handleTrackerMonthChange}
                                    />
                                ) : (
                                    <AssignedTasksView
                                        assignedTasks={assignedTasks}
                                        canLogWork={isAttendanceActive}
                                        attendanceActionLabel={isPresentOnlyMode ? 'Mark present' : 'Clock in'}
                                        onLogWork={handleLogWork}
                                        logForm={logForm}
                                        setLogForm={setLogForm}
                                        expandedLogTaskId={expandedLogTaskId}
                                        recentLogs={recentLogs}
                                        onDeleteLog={handleDeleteLog}
                                        toggleLogForm={toggleLogForm}
                                        editingLogId={editingLogId}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Regularization Modal */}
                <RegularizationModal
                    isOpen={showRegModal}
                    onClose={() => setShowRegModal(false)}
                    regDate={regDate}
                    regForm={regForm}
                    setRegForm={setRegForm}
                    onSubmit={submitRegularization}
                    isPresentOnlyMode={isPresentOnlyMode}
                />
            </div>

            <DossierIncompleteModal
                open={showDossierModal}
                onClose={() => setShowDossierModal(false)}
                missingSections={dossierMissingSections}
                missingFields={dossierMissingFields}
            />
        </>
    );
};

export default Attendance;
