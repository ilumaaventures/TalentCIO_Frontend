import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getHandoffSessionKey = (token) => `handoff-exchange:${token}`;
const inflightExchangeRequests = new Map();
const isLocalHost = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');

const getMarketingLoginUrl = () => {
    try {
        if (document.referrer) {
            const referrerUrl = new URL(document.referrer);
            return new URL('/company/login', referrerUrl.origin).toString();
        }
    } catch {
        // Ignore and use configured/default marketing URL.
    }

    const configuredBaseUrl = import.meta.env.VITE_MARKETING_URL || 'https://talentcio.in';
    return new URL('/company/login', configuredBaseUrl).toString();
};

const getExchangeRequest = (apiBaseUrl, token, subdomain) => {
    const requestKey = `${token}:${subdomain}`;

    if (!inflightExchangeRequests.has(requestKey)) {
        const request = axios.post(
            `${apiBaseUrl}/api/public/company-login/exchange`,
            { token, subdomain },
            { headers: { 'Content-Type': 'application/json' } }
        ).finally(() => {
            inflightExchangeRequests.delete(requestKey);
        });

        inflightExchangeRequests.set(requestKey, request);
    }

    return inflightExchangeRequests.get(requestKey);
};

export default function HandoffLogin() {
    const [searchParams] = useSearchParams();
    const { loginWithToken } = useAuth();
    const handoffToken = searchParams.get('token') || '';
    const tenantFromQuery = searchParams.get('tenant') || '';
    const hostname = window.location.hostname.toLowerCase();

    const resolvedSubdomain = useMemo(() => {
        let subdomain = tenantFromQuery?.trim().toLowerCase() || '';

        if (!subdomain) {
            const hostnameParts = hostname.split('.');
            subdomain = hostnameParts[0];
        }

        if (!subdomain || subdomain === 'localhost' || subdomain === '127') {
            return '';
        }

        return subdomain;
    }, [hostname, tenantFromQuery]);

    const buildPostLoginUrl = useCallback((subdomain) => {
        if (isLocalHost(hostname)) {
            const url = new URL('/', window.location.origin);
            url.searchParams.set('tenant', subdomain);
            return `${url.pathname}${url.search}`;
        }

        return '/';
    }, [hostname]);

    const buildResetPasswordUrl = useCallback((subdomain, email) => {
        const url = new URL('/reset-password', window.location.origin);

        if (isLocalHost(hostname)) {
            url.searchParams.set('tenant', subdomain);
        }

        if (email) {
            url.searchParams.set('email', email);
        }

        return `${url.pathname}${url.search}`;
    }, [hostname]);

    const initialErrorMessage = useMemo(() => {
        if (!handoffToken) return 'Invalid login link. Please login again.';
        if (!resolvedSubdomain) return 'Workspace could not be resolved. Please login again.';
        return '';
    }, [handoffToken, resolvedSubdomain]);
    const [status, setStatus] = useState(() => (initialErrorMessage ? 'error' : 'loading'));
    const [errorMsg, setErrorMsg] = useState(() => initialErrorMessage);

    useEffect(() => {
        if (initialErrorMessage) {
            return;
        }

        const sessionKey = getHandoffSessionKey(handoffToken);
        if (sessionStorage.getItem(sessionKey) === 'done' && localStorage.getItem('token')) {
            window.location.replace(buildPostLoginUrl(resolvedSubdomain));
            return;
        }

        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.talentcio.in';
        let active = true;

        getExchangeRequest(apiBaseUrl, handoffToken, resolvedSubdomain)
            .then((response) => {
                if (!active) return;
                sessionStorage.setItem(sessionKey, 'done');
                localStorage.setItem('tenant', resolvedSubdomain);
                loginWithToken(response.data.token, response.data.user);
                window.location.replace(buildPostLoginUrl(resolvedSubdomain));
            })
            .catch((error) => {
                if (!active) return;
                sessionStorage.removeItem(sessionKey);
                if (error.response?.data?.passwordResetRequired) {
                    window.location.replace(
                        buildResetPasswordUrl(resolvedSubdomain, error.response.data.email)
                    );
                    return;
                }
                const expired = error.response?.data?.expired;
                setStatus('error');
                setErrorMsg(
                    expired
                        ? 'Your login link expired. Please go back and login again.'
                        : (error.response?.data?.message || 'Login failed. Please try again.')
                );
            });

        return () => {
            active = false;
        };
    }, [buildPostLoginUrl, buildResetPasswordUrl, handoffToken, initialErrorMessage, loginWithToken, resolvedSubdomain]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-semibold text-slate-500">Signing you in...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4">
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-sm w-full shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
                    <span aria-hidden="true">!</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Sign-in Failed</h2>
                <p className="text-sm text-slate-500 mb-5">{errorMsg}</p>
                <div className="flex flex-col gap-3">
                    <a
                        href={getMarketingLoginUrl()}
                        className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition"
                    >
                        Back to Company Login
                    </a>
                    <a
                        href="/login"
                        className="inline-block px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition"
                    >
                        Use Workspace Login
                    </a>
                </div>
            </div>
        </div>
    );
}
