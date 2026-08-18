import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import Topbar from '@/components/navigation/Topbar';
import { Loader } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import api from '@/lib/apiClient';
import socket from '@/lib/socket';
import AnnouncementUnreadModal from '@/features/announcements/components/AnnouncementUnreadModal';
import BirthdayCelebrationModal from '@/components/common/BirthdayCelebrationModal';
import IndependenceDayCelebrationModal from '@/components/celebration/IndependenceDayCelebrationModal';
import useIndependenceDayCelebration from '@/hooks/useIndependenceDayCelebration';
import DossierGateBanner from '@/features/employee-dossier/components/DossierGateBanner';
import {
    getAcknowledgedAnnouncementIds,
    getAnnouncementSessionGateKey,
    sortAnnouncementsByPublishedAt,
    storeAcknowledgedAnnouncementIds,
    REACTION_TYPES,
} from '@/features/announcements/utils/announcementUtils';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isNavigating, setIsNavigating] = useState(false);
    const [announcementGateLoading, setAnnouncementGateLoading] = useState(true);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState([]);
    const [announcementIndex, setAnnouncementIndex] = useState(0);
    const [announcementConfirmed, setAnnouncementConfirmed] = useState(false);
    const [announcementAckBuffer, setAnnouncementAckBuffer] = useState([]);
    const [reactionLoadingKey, setReactionLoadingKey] = useState('');
    const [showBirthdayModal, setShowBirthdayModal] = useState(false);
    const [birthdayEmployeeName, setBirthdayEmployeeName] = useState('');
    const location = useLocation();
    const timerRef = useRef(null);
    const { user } = useAuth();
    const {
        showCelebration: showIndependenceDayModal,
        celebrationData: independenceDayData,
        handleAcknowledge: handleIndependenceDayAcknowledge
    } = useIndependenceDayCelebration(user);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (user?.company?.settings?.themeColor) {
            document.documentElement.style.setProperty('--primary-color', user.company.settings.themeColor);
            // Also set a hover variant or lighter variant if needed
            document.documentElement.style.setProperty('--primary-hover', `${user.company.settings.themeColor}dd`);
            const shadowColor = user.company.settings.themeColor.startsWith('#')
                ? `${user.company.settings.themeColor}4d`
                : 'rgba(37, 99, 235, 0.3)';
            document.documentElement.style.setProperty('--primary-color-shadow', shadowColor);
        }
    }, [user]);

    useEffect(() => {
        if (!user?._id) return;

        // Use sessionStorage so the modal only shows once per login session.
        // sessionStorage is cleared when the tab/browser is closed, so a new
        // login will always show it again. Page refreshes within the same
        // session will NOT re-trigger the modal.
        const sessionKey = `birthday_shown_${user._id}`;
        if (sessionStorage.getItem(sessionKey)) return;

        let isActive = true;
        const checkBirthday = async () => {
            try {
                const response = await api.get('/auth/birthday-status');
                if (!isActive) return;

                if (response.data?.isBirthday) {
                    setBirthdayEmployeeName(response.data.employeeName || `${user.firstName || ''} ${user.lastName || ''}`.trim());
                    setShowBirthdayModal(true);
                }
                // Mark as checked for this session regardless of result
                sessionStorage.setItem(sessionKey, 'true');
            } catch (error) {
                console.error('Failed to check birthday status:', error);
            }
        };

        checkBirthday();

        return () => {
            isActive = false;
        };
    }, [user?._id]);

    useEffect(() => {
        // Show progress bar on route change
        const startTimer = setTimeout(() => {
            setProgress(0);
            setIsNavigating(true);
        }, 0);

        // Quickly animate to 80% then wait for render
        const t1 = setTimeout(() => setProgress(60), 50);
        const t2 = setTimeout(() => setProgress(80), 150);

        // After a short delay, complete and hide
        const t3 = setTimeout(() => {
            setProgress(100);
            const t4 = setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 300);
            timerRef.current = t4;
        }, 400);

        timerRef.current = t3;

        return () => {
            clearTimeout(startTimer);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [location.pathname]);

    const loadUnreadAnnouncements = useCallback(async () => {
        if (!user?._id) {
            setAnnouncementGateLoading(false);
            return;
        }

        try {
            setAnnouncementGateLoading(true);
            const response = await api.get(`/announcements?limit=20&_t=${Date.now()}`);
            if (!isMountedRef.current) return;

            const announcements = sortAnnouncementsByPublishedAt(
                Array.isArray(response.data?.announcements) ? response.data.announcements : []
            );
            const acknowledgedIds = new Set(getAcknowledgedAnnouncementIds(user._id));
            const unread = announcements.filter(
                (announcement) =>
                    announcement.status === 'published' &&
                    !announcement.isExpired &&
                    !announcement.viewerAcknowledged &&
                    !acknowledgedIds.has(String(announcement._id))
            );

            setUnreadAnnouncements(unread);
            setAnnouncementIndex(0);
            setAnnouncementConfirmed(false);
            setAnnouncementAckBuffer([]);
        } catch (error) {
            console.error('Failed to load unread announcements:', error);
            if (isMountedRef.current) {
                setUnreadAnnouncements([]);
            }
        } finally {
            if (isMountedRef.current) {
                setAnnouncementGateLoading(false);
            }
        }
    }, [user?._id]);

    useEffect(() => {
        void loadUnreadAnnouncements();
    }, [loadUnreadAnnouncements]);

    useEffect(() => {
        if (!user?._id) return;

        const handleRealtimeAnnouncement = (notification) => {
            if (
                notification?.preferenceKey === 'announcement_published' ||
                notification?.metadata?.announcementId ||
                notification?.link === '/announcements' ||
                notification?.title?.toLowerCase().includes('announcement')
            ) {
                void loadUnreadAnnouncements();
            }
        };

        socket.on('notification', handleRealtimeAnnouncement);
        return () => {
            socket.off('notification', handleRealtimeAnnouncement);
        };
    }, [user?._id, loadUnreadAnnouncements]);

    const handleAnnouncementContinue = async () => {
        const currentAnnouncement = unreadAnnouncements[announcementIndex];
        if (!currentAnnouncement || !user?._id) return;

        try {
            await api.post(`/announcements/${currentAnnouncement._id}/acknowledge`);
        } catch (error) {
            console.error('Failed to acknowledge announcement on server:', error);
        }

        const nextAckBuffer = [...announcementAckBuffer, String(currentAnnouncement._id)];
        storeAcknowledgedAnnouncementIds(user._id, [String(currentAnnouncement._id), ...nextAckBuffer]);

        if (announcementIndex >= unreadAnnouncements.length - 1) {
            setUnreadAnnouncements([]);
            setAnnouncementIndex(0);
            setAnnouncementConfirmed(false);
            setAnnouncementAckBuffer([]);
            return;
        }

        setAnnouncementAckBuffer(nextAckBuffer);
        setAnnouncementIndex((current) => current + 1);
        setAnnouncementConfirmed(false);
    };

    const handleReaction = async (announcementId, reactionType) => {
        try {
            setReactionLoadingKey(`${announcementId}:${reactionType}`);
            const response = await api.post(`/announcements/${announcementId}/react`, { type: reactionType });
            if (!isMountedRef.current) return;

            setUnreadAnnouncements((current) =>
                current.map((announcement) =>
                    announcement._id === announcementId ? response.data.announcement : announcement
                )
            );
        } catch (error) {
            console.error('Failed to update reaction:', error);
        } finally {
            if (isMountedRef.current) {
                setReactionLoadingKey('');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex font-sans overflow-x-hidden w-screen">
            {/* Top navigation progress bar */}
            {isNavigating && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: `${progress}%`,
                        height: 3,
                        background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                        zIndex: 9999,
                        transition: 'width 0.25s ease',
                        borderRadius: '0 2px 2px 0',
                    }}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col md:pl-64 pt-16 transition-all duration-300 min-h-screen min-w-0">
                <Topbar toggleSidebar={() => setIsSidebarOpen(true)} />
                <DossierGateBanner />

                <div className="flex-1 overflow-x-hidden">
                    <Suspense fallback={
                        <div className="flex h-full w-full items-center justify-center py-32">
                            <Loader className="animate-spin text-blue-600" size={32} />
                        </div>
                    }>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            {unreadAnnouncements.length > 0 ? (
                <AnnouncementUnreadModal
                    announcements={unreadAnnouncements}
                    activeIndex={announcementIndex}
                    acknowledged={announcementConfirmed}
                    onAcknowledgedChange={setAnnouncementConfirmed}
                    onContinue={handleAnnouncementContinue}
                    reactionTypes={REACTION_TYPES}
                    reactionLoadingKey={reactionLoadingKey}
                    onReact={handleReaction}
                />
            ) : null}

            {showBirthdayModal && (
                <BirthdayCelebrationModal
                    employeeName={birthdayEmployeeName}
                    onClose={() => setShowBirthdayModal(false)}
                />
            )}

            {showIndependenceDayModal && (
                <IndependenceDayCelebrationModal
                    employeeName={independenceDayData.employeeName}
                    companyName={independenceDayData.companyName}
                    year={independenceDayData.year}
                    onClose={handleIndependenceDayAcknowledge}
                />
            )}
        </div>
    );
};

export default Layout;
