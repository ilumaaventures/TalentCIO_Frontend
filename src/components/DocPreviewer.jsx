import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import axios from 'axios';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';

export const isOfficeDoc = (urlOrFileName) => {
    if (!urlOrFileName) return false;
    const str = String(urlOrFileName).split('?')[0].toLowerCase();
    return str.endsWith('.docx') || str.endsWith('.doc') || str.endsWith('.rtf');
};

export const isPdfDoc = (urlOrFileName) => {
    if (!urlOrFileName) return false;
    const str = String(urlOrFileName).split('?')[0].toLowerCase();
    return str.endsWith('.pdf');
};

export const isImageFile = (urlOrFileName) => {
    if (!urlOrFileName) return false;
    const str = String(urlOrFileName).split('?')[0].toLowerCase();
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(str);
};

export default function DocPreviewer({ url, file, className = "w-full h-full min-h-[500px]", title = "Document Preview" }) {
    const docxContainerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [useGoogleFallback, setUseGoogleFallback] = useState(false);

    const targetUrl = url || (file ? (file instanceof File || file instanceof Blob ? URL.createObjectURL(file) : '') : '');
    const fileName = file?.name || (typeof url === 'string' ? url : '');
    const isDocx = isOfficeDoc(fileName || targetUrl);
    const isPdf = isPdfDoc(fileName || targetUrl);
    const isImg = isImageFile(fileName || targetUrl);

    useEffect(() => {
        let isSubscribed = true;

        if (isDocx && docxContainerRef.current) {
            setLoading(true);
            setError(null);
            setUseGoogleFallback(false);
            docxContainerRef.current.innerHTML = '';

            const renderDocx = async () => {
                try {
                    let buffer = null;
                    if (file && (file instanceof File || file instanceof Blob)) {
                        buffer = await file.arrayBuffer();
                    } else if (url) {
                        try {
                            const resp = await axios.get(url, { responseType: 'arraybuffer' });
                            buffer = resp.data;
                        } catch (fetchErr) {
                            console.warn('CORS or fetch error loading docx, trying Google Docs Viewer fallback:', fetchErr.message);
                            if (isSubscribed) {
                                setUseGoogleFallback(true);
                                setLoading(false);
                            }
                            return;
                        }
                    }

                    if (buffer && docxContainerRef.current && isSubscribed) {
                        await renderAsync(buffer, docxContainerRef.current, null, {
                            className: "docx-preview-rendered",
                            inWrapper: false,
                            breakPages: false,
                            ignoreWidth: true,
                            ignoreHeight: true,
                            debug: false
                        });
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('docx-preview render error:', err);
                    if (isSubscribed) {
                        if (url && !url.startsWith('blob:')) {
                            setUseGoogleFallback(true);
                        } else {
                            setError('Failed to render Word document preview');
                        }
                        setLoading(false);
                    }
                }
            };

            renderDocx();
        }

        return () => {
            isSubscribed = false;
        };
    }, [url, file, isDocx]);

    if (!targetUrl && !file) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-400 rounded-xl h-full">
                <FileText size={48} className="mb-2 text-slate-300" />
                <p className="text-sm font-medium">No document provided for preview</p>
            </div>
        );
    }

    const secureUrl = typeof targetUrl === 'string' ? targetUrl.replace(/^http:\/\//i, 'https://') : '';

    // If it's an image
    if (isImg) {
        return (
            <div className={`flex items-center justify-center bg-slate-900/5 p-4 rounded-xl overflow-auto ${className}`}>
                <img src={secureUrl} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
            </div>
        );
    }

    // If docx and fallback to Google Docs Viewer (when direct fetch CORS error or remote URL fallback)
    if (isDocx && useGoogleFallback && secureUrl && !secureUrl.startsWith('blob:')) {
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(secureUrl)}&embedded=true`;
        return (
            <div className={`relative w-full h-full bg-white overflow-hidden ${className}`}>
                <iframe
                    src={googleDocsUrl}
                    className="w-full h-full border-none"
                    title={title}
                />
            </div>
        );
    }

    // If docx with direct in-browser rendering via docx-preview
    if (isDocx) {
        return (
            <div className={`relative w-full h-full bg-slate-100 overflow-auto p-4 ${className}`}>
                {loading && (
                    <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <p className="text-xs font-semibold text-slate-600">Rendering Word Document...</p>
                    </div>
                )}
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-amber-50/50 rounded-xl border border-amber-100">
                        <AlertCircle size={40} className="text-amber-500 mb-2" />
                        <p className="text-sm font-semibold text-slate-700 mb-2">{error}</p>
                        {secureUrl && (
                            <a
                                href={secureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                            >
                                <Download size={14} /> Download / Open Document
                            </a>
                        )}
                    </div>
                ) : (
                    <div
                        ref={docxContainerRef}
                        className="docx-preview-root bg-white shadow-sm rounded-lg p-6 min-h-full max-w-4xl mx-auto overflow-x-auto text-slate-800 text-sm leading-relaxed"
                    />
                )}
            </div>
        );
    }

    // If PDF or fallback URL
    const embedUrl = isPdf ? `${secureUrl}#toolbar=0&navpanes=0&view=FitH` : secureUrl;
    const isGenericOffice = /\.(pptx?|xlsx?)$/i.test(secureUrl);
    const finalIframeUrl = (isGenericOffice && !secureUrl.startsWith('blob:'))
        ? `https://docs.google.com/gview?url=${encodeURIComponent(secureUrl)}&embedded=true`
        : embedUrl;

    return (
        <div className={`relative w-full h-full bg-white overflow-hidden ${className}`}>
            <iframe
                src={finalIframeUrl}
                className="w-full h-full border-none"
                title={title}
            />
        </div>
    );
}
