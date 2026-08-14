import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/lib/apiClient';

const BROADCAST_CHANNEL_NAME = 'talentcio_celebrations';

export const useIndependenceDayCelebration = (user) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({
    employeeName: '',
    companyName: 'Talentcio',
    eventKey: '',
    year: new Date().getFullYear(),
  });

  const location = useLocation();
  const checkingRef = useRef(false);
  const checkedThisSessionRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const broadcastChannelRef = useRef(null);

  // Helper to build local storage acknowledgment key for the current user and event
  const getLocalAckKey = useCallback((userId, eventKey) => {
    return `independence_day_ack_${userId}_${eventKey || ''}`;
  }, []);

  // Multi-tab synchronization setup
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;

    try {
      broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data?.type === 'CELEBRATION_ACKNOWLEDGED' && event.data?.userId === user?._id) {
          setShowCelebration(false);
        }
      };
    } catch {
      // BroadcastChannel optional fallback
    }

    const handleStorageEvent = (e) => {
      if (user?._id && e.key && e.key.startsWith(`independence_day_ack_${user._id}`) && e.newValue === 'true') {
        setShowCelebration(false);
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [user?._id]);

  // Main check function
  const checkStatus = useCallback(async (force = false, isExplicitPreview = false) => {
    if (!user?._id) return;

    const urlParams = new URLSearchParams(window.location.search);
    const hasPreviewParam = isExplicitPreview || urlParams.get('preview') === 'independence_day' || urlParams.get('previewIndependenceDay') === 'true';

    const now = Date.now();
    // Throttle frequent checks (at least 60 seconds apart on route changes unless forced)
    if (!force && !hasPreviewParam && now - lastCheckTimeRef.current < 60000) {
      return;
    }

    if (checkingRef.current && !hasPreviewParam) return;

    // Check if current year's celebration is already marked acknowledged in localStorage for this user (unless preview)
    const currentYear = new Date().getFullYear();
    const approxEventKey = `INDEPENDENCE_DAY_${currentYear}`;
    const localAck = localStorage.getItem(getLocalAckKey(user._id, approxEventKey));
    if (!hasPreviewParam && localAck === 'true') {
      return;
    }

    checkingRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      const endpoint = hasPreviewParam
        ? '/celebrations/independence-day-status?preview=true'
        : '/celebrations/independence-day-status';
      const response = await api.get(endpoint);
      const data = response.data;

      if (data?.shouldShow && data?.eventKey) {
        const isLocallyAcked = !hasPreviewParam && localStorage.getItem(getLocalAckKey(user._id, data.eventKey));
        if (!isLocallyAcked) {
          setCelebrationData({
            employeeName: data.employeeName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Team Member',
            companyName: data.companyName || user?.company?.name || 'Talentcio',
            eventKey: data.eventKey,
            year: data.year || currentYear,
          });
          setShowCelebration(true);
        }
      } else if (data?.alreadyAcknowledged && data?.eventKey && !hasPreviewParam) {
        // Cache server state in localStorage to prevent future checks this year
        localStorage.setItem(getLocalAckKey(user._id, data.eventKey), 'true');
      }
    } catch (error) {
      // Non-blocking error handling
      console.warn('[IndependenceDayCelebration] Status check skipped:', error?.message);
    } finally {
      checkingRef.current = false;
      checkedThisSessionRef.current = true;
    }
  }, [user, getLocalAckKey]);

  // Expose global window helper for easy testing / previewing in DevTools
  useEffect(() => {
    window.previewIndependenceDay = () => {
      checkStatus(true, true);
    };
    return () => {
      delete window.previewIndependenceDay;
    };
  }, [checkStatus]);

  // Trigger check on user login / initial mount
  useEffect(() => {
    if (user?._id) {
      checkStatus(true);
    }
  }, [user?._id, checkStatus]);

  // Trigger check on page / module navigation (if not already acknowledged)
  useEffect(() => {
    if (user?._id && !showCelebration) {
      checkStatus(false);
    }
  }, [location.pathname, user?._id, showCelebration, checkStatus]);

  // Acknowledge and close modal
  const handleAcknowledge = useCallback(async () => {
    const eventKey = celebrationData.eventKey;
    setShowCelebration(false);

    // Remove preview URL parameter if present so it doesn't re-trigger on route changes
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('previewIndependenceDay') || url.searchParams.get('preview') === 'independence_day') {
        url.searchParams.delete('previewIndependenceDay');
        if (url.searchParams.get('preview') === 'independence_day') {
          url.searchParams.delete('preview');
        }
        window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash);
      }
    }

    if (user?._id && eventKey) {
      // 1. Mark in localStorage immediately for instant client-side suppression
      const ackKey = getLocalAckKey(user._id, eventKey);
      localStorage.setItem(ackKey, 'true');

      // 2. Broadcast to other open tabs
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'CELEBRATION_ACKNOWLEDGED',
            userId: user._id,
            eventKey
          });
        }
      } catch {
        // ignore broadcast errors
      }

      // 3. Persist acknowledgment to backend database
      try {
        await api.post('/celebrations/acknowledge', {
          eventKey,
          celebrationType: 'INDEPENDENCE_DAY',
          metadata: {
            closedAt: new Date().toISOString(),
          }
        });
      } catch (error) {
        console.error('[IndependenceDayCelebration] Acknowledge error:', error);
      }
    }
  }, [user?._id, celebrationData.eventKey, getLocalAckKey]);

  return {
    showCelebration,
    celebrationData,
    handleAcknowledge,
    checkStatus
  };
};

export default useIndependenceDayCelebration;
