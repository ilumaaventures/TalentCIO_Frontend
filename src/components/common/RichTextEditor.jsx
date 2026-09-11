import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Heading2,
    Heading3,
    Quote,
    RemoveFormatting,
    Code,
    Eye
} from 'lucide-react';
import { sanitizeTemplateHtml, hasHtmlMarkup } from '@/features/email/utils/templatePlaceholders';

// Converts plain text with newlines into HTML paragraphs/breaks if needed
const formatPlainTextToHtml = (text = '') => {
    if (!text) return '';
    if (hasHtmlMarkup(text)) return text;

    return text
        .split('\n')
        .map((line) => {
            const trimmed = line.trim();
            return trimmed ? `<p>${line}</p>` : '<p><br></p>';
        })
        .join('');
};

// Clean pasted Word/Google Docs HTML
const cleanPastedHtml = (html = '') => {
    if (!html) return '';

    let cleaned = html
        // Remove comments and metadata
        .replace(/<!--[\s\S]*?-->/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        // Clean mso styles and attributes
        .replace(/\s*mso-[^:]+:[^;"]+;?/gi, '')
        .replace(/\s*class="Mso[^"]*"/gi, '')
        .replace(/\s*style="[^"]*"/gi, (match) => {
            // Remove Microsoft specific styles from inline styles
            return match.replace(/mso-[^:]+:[^;"]+;?/gi, '');
        });

    return sanitizeTemplateHtml(cleaned);
};

const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = 'Enter detailed description here with formatting...',
    minHeight = '220px',
    maxHeight = '480px',
    disabled = false
}) => {
    const editorRef = useRef(null);
    const lastValueRef = useRef(value);
    const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'source'
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
        unorderedList: false,
        orderedList: false,
        h2: false,
        h3: false,
        blockquote: false
    });

    const normalizeEmpty = (html) => {
        if (!html) return '';
        const trimmed = html.trim();
        if (
            trimmed === '' ||
            trimmed === '<br>' ||
            trimmed === '<p></p>' ||
            trimmed === '<p><br></p>' ||
            trimmed === '<div><br></div>' ||
            trimmed === '<p><br/></p>'
        ) {
            return '';
        }
        return trimmed;
    };

    // Update active format indicators when selection changes
    const updateActiveFormats = useCallback(() => {
        if (document.activeElement !== editorRef.current) return;
        try {
            const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
            setActiveFormats({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikeThrough: document.queryCommandState('strikeThrough'),
                unorderedList: document.queryCommandState('insertUnorderedList'),
                orderedList: document.queryCommandState('insertOrderedList'),
                h2: formatBlock === 'h2',
                h3: formatBlock === 'h3',
                blockquote: formatBlock === 'blockquote'
            });
        } catch {
            // Ignore selection query errors
        }
    }, []);

    // Sync external value changes to editor without losing caret during active user typing
    useEffect(() => {
        if (viewMode === 'visual' && editorRef.current) {
            const currentContent = normalizeEmpty(editorRef.current.innerHTML);
            const incomingContent = normalizeEmpty(value);

            if (incomingContent !== currentContent && incomingContent !== lastValueRef.current) {
                const formattedContent = formatPlainTextToHtml(incomingContent);
                editorRef.current.innerHTML = formattedContent;
                lastValueRef.current = formattedContent;
            }
        }
    }, [value, viewMode]);

    const handleInput = () => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        const normalized = normalizeEmpty(html);
        lastValueRef.current = normalized;
        if (onChange) {
            onChange(normalized);
        }
        updateActiveFormats();
    };

    const execCommand = (command, commandValue = null) => {
        if (disabled || viewMode === 'source') return;
        if (editorRef.current) {
            editorRef.current.focus();
        }
        document.execCommand(command, false, commandValue);
        handleInput();
        updateActiveFormats();
    };

    const handleHeading = (tag) => {
        if (disabled || viewMode === 'source') return;
        if (editorRef.current) {
            editorRef.current.focus();
        }
        try {
            const currentTag = document.queryCommandValue('formatBlock').toLowerCase();
            if (currentTag === tag.toLowerCase()) {
                document.execCommand('formatBlock', false, '<p>');
            } else {
                document.execCommand('formatBlock', false, `<${tag}>`);
            }
        } catch {
            document.execCommand('formatBlock', false, `<${tag}>`);
        }
        handleInput();
        updateActiveFormats();
    };

    const handlePaste = (e) => {
        if (disabled || viewMode === 'source') return;
        e.preventDefault();

        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedHtml = clipboardData?.getData('text/html');
        const pastedText = clipboardData?.getData('text/plain');

        let insertHtml = '';
        if (pastedHtml && pastedHtml.trim()) {
            insertHtml = cleanPastedHtml(pastedHtml);
        } else if (pastedText && pastedText.trim()) {
            insertHtml = pastedText
                .split(/\r?\n/)
                .map((line) => (line.trim() ? `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<p><br></p>'))
                .join('');
        }

        if (insertHtml) {
            document.execCommand('insertHTML', false, insertHtml);
            handleInput();
        }
    };

    const isEditorEmpty = !normalizeEmpty(value);

    return (
        <div className="w-full rounded-xl border border-slate-300 bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all overflow-hidden flex flex-col">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-700">
                <div className="flex flex-wrap items-center gap-1">
                    <button
                        type="button"
                        title="Bold (Ctrl+B)"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('bold')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.bold ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Bold size={15} />
                    </button>
                    <button
                        type="button"
                        title="Italic (Ctrl+I)"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('italic')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.italic ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Italic size={15} />
                    </button>
                    <button
                        type="button"
                        title="Underline (Ctrl+U)"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('underline')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.underline ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Underline size={15} />
                    </button>
                    <button
                        type="button"
                        title="Strikethrough"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('strikeThrough')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.strikeThrough ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Strikethrough size={15} />
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-1" />

                    <button
                        type="button"
                        title="Section Heading (H2)"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => handleHeading('h2')}
                        className={`px-2 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                            activeFormats.h2 ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Heading2 size={15} />
                    </button>
                    <button
                        type="button"
                        title="Subheading (H3)"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => handleHeading('h3')}
                        className={`px-2 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                            activeFormats.h3 ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Heading3 size={15} />
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-1" />

                    <button
                        type="button"
                        title="Bullet List"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('insertUnorderedList')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.unorderedList ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <List size={15} />
                    </button>
                    <button
                        type="button"
                        title="Numbered List"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('insertOrderedList')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.orderedList ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <ListOrdered size={15} />
                    </button>
                    <button
                        type="button"
                        title="Quote"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => handleHeading('blockquote')}
                        className={`p-1.5 rounded-md transition-colors ${
                            activeFormats.blockquote ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-600'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <Quote size={15} />
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-1" />

                    <button
                        type="button"
                        title="Clear Formatting"
                        disabled={disabled || viewMode === 'source'}
                        onClick={() => execCommand('removeFormat')}
                        className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <RemoveFormatting size={15} />
                    </button>
                </div>

                {/* Mode Toggle: Visual vs HTML Code */}
                <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setViewMode('visual')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                            viewMode === 'visual'
                                ? 'bg-white text-blue-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Eye size={13} /> Visual Editor
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('source')}
                        className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                            viewMode === 'source'
                                ? 'bg-white text-blue-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Code size={13} /> HTML Source
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative flex-1 bg-white">
                {viewMode === 'visual' ? (
                    <>
                        <div
                            ref={editorRef}
                            contentEditable={!disabled}
                            onInput={handleInput}
                            onKeyUp={updateActiveFormats}
                            onMouseUp={updateActiveFormats}
                            onPaste={handlePaste}
                            style={{ minHeight, maxHeight }}
                            className="w-full p-4 overflow-y-auto text-sm text-slate-800 leading-relaxed outline-none font-normal 
                                [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-2 [&>h1]:text-slate-900
                                [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-3 [&>h2]:text-slate-900
                                [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mb-1 [&>h3]:mt-2 [&>h3]:text-slate-900
                                [&>p]:mb-2 [&>p]:leading-relaxed
                                [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ul]:space-y-1
                                [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&>ol]:space-y-1
                                [&>li]:leading-relaxed
                                [&>blockquote]:border-l-4 [&>blockquote]:border-blue-400 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-600 [&>blockquote]:my-2"
                        />
                        {isEditorEmpty && (
                            <div
                                onClick={() => editorRef.current?.focus()}
                                className="absolute top-4 left-4 text-sm text-slate-400 pointer-events-none select-none italic"
                            >
                                {placeholder}
                            </div>
                        )}
                    </>
                ) : (
                    <textarea
                        value={value}
                        onChange={(e) => {
                            lastValueRef.current = e.target.value;
                            if (onChange) onChange(e.target.value);
                        }}
                        disabled={disabled}
                        rows={10}
                        style={{ minHeight, maxHeight }}
                        placeholder="Enter HTML markup directly..."
                        className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 outline-none resize-y border-none leading-relaxed"
                    />
                )}
            </div>

            {/* Footer Helper */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
                <span>
                    {viewMode === 'visual'
                        ? 'Tip: Select text to apply bold, headings, or lists. You can also paste formatted text directly.'
                        : 'Editing raw HTML source. Switch back to Visual Editor to see formatted preview.'}
                </span>
                <span className="font-medium text-slate-400">
                    {isEditorEmpty ? 'Empty' : 'Formatted'}
                </span>
            </div>
        </div>
    );
};

export default RichTextEditor;
