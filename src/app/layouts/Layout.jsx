import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import socket from '../api/socket';
import AnnouncementUnreadModal from './announcements/AnnouncementUnreadModal';
import BirthdayCelebrationModal from './BirthdayCelebrationModal';
import DossierGateBanner from './DossierGateBanner';
import {
    getAcknowledgedAnnouncementIds,
    getAnnouncementSessionGateKey,
    sortAnnouncementsByPublishedAt,
    storeAcknowledgedAnnouncementIds,
    REACTION_TYPES,
} from './announcements/announcementUtils';

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

    const loadUnreadAnnouncements = useCallback(async (ignoreSessionGate = false) => {
        if (!user?._id) {
            setAnnouncementGateLoading(false);
            return;
        }

        const sessionGateKey = getAnnouncementSessionGateKey(user._id);
        if (!ignoreSessionGate && sessionStorage.getItem(sessionGateKey) === '1') {
            setAnnouncementGateLoading(false);
            return;
        }

        try {
            setAnnouncementGateLoading(true);
            const response = await api.get('/announcements?limit=5');
            if (!isMountedRef.current) return;

            const announcements = sortAnnouncementsByPublishedAt(
                Array.isArray(response.data?.announcements) ? response.data.announcements : []
            );
            const acknowledgedIds = new Set(getAcknowledgedAnnouncementIds(user._id));
            const unread = announcements.filter(
                (announcement) => !announcement.viewerAcknowledged && !acknowledgedIds.has(String(announcement._id))
            );

            setUnreadAnnouncements(unread);
            setAnnouncementIndex(0);
            setAnnouncementConfirmed(false);
            setAnnouncementAckBuffer([]);

            if (unread.length === 0) {
                sessionStorage.setItem(sessionGateKey, '1');
            } else if (ignoreSessionGate) {
                sessionStorage.removeItem(sessionGateKey);
            }
        } catch (error) {
            console.error('Failed to load unread announcements:', error);
            if (isMountedRef.current) {
                sessionStorage.setItem(sessionGateKey, '1');
                setUnreadAnnouncements([]);
            }
        } finally {
            if (isMountedRef.current) {
                setAnnouncementGateLoading(false);
            }
        }
    }, [user?._id]);

    useEffect(() => {
        void loadUnreadAnnouncements(false);
    }, [loadUnreadAnnouncements]);

    useEffect(() => {
        if (!user?._id) return;

        const handleRealtimeAnnouncement = (notification) => {
            if (
                notification?.preferenceKey === 'announcement_published' ||
                notification?.metadata?.announcementId ||
                notification?.link === '/announcements'
            ) {
                void loadUnreadAnnouncements(true);
            }
        };

        socket.on('notification', handleRealtimeAnnouncement);
        return () => {
            socket.off('notification', handleRealtimeAnnouncement);
        };
    }, [user?._id, loadUnreadAnnouncements]);

    const dismissAnnouncementGateForSession = () => {
        if (!user?._id) return;
        sessionStorage.setItem(getAnnouncementSessionGateKey(user._id), '1');
        setUnreadAnnouncements([]);
        setAnnouncementIndex(0);
        setAnnouncementConfirmed(false);
        setAnnouncementAckBuffer([]);
    };

    const handleAnnouncementContinue = async () => {
        const currentAnnouncement = unreadAnnouncements[announcementIndex];
        if (!currentAnnouncement || !user?._id) return;

        try {
            await api.post(`/announcements/${currentAnnouncement._id}/acknowledge`);
        } catch (error) {
            console.error('Failed to acknowledge announcement on server:', error);
        }

        const nextAckBuffer = [...announcementAckBuffer, String(currentAnnouncement._id)];

        if (announcementIndex === unreadAnnouncements.length - 1) {
            storeAcknowledgedAnnouncementIds(user._id, nextAckBuffer);
            dismissAnnouncementGateForSession();
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

            <main className="flex-1 flex flex-col md:pl-64 transition-all duration-300 min-h-screen overflow-x-hidden min-w-0">
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

            {announcementGateLoading ? (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-100/90 backdrop-blur-sm">
                    <Loader className="animate-spin text-blue-600" size={30} />
                </div>
            ) : null}

            {!announcementGateLoading && unreadAnnouncements.length > 0 ? (
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
        </div>
    );
};

export default Layout;
