import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, RotateCcw, Check, X, Plus, Tag } from 'lucide-react';

const EditableBadge = ({
    storageKey = 'ta_interested_badge_config',
    defaultText = 'R0'
}) => {
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    text: typeof parsed.text === 'string' ? parsed.text : defaultText,
                    visible: typeof parsed.visible === 'boolean' ? parsed.visible : true
                };
            }
        } catch (e) {
            console.error('Error loading badge config:', e);
        }
        return { text: defaultText, visible: true };
    });

    const [isOpen, setIsOpen] = useState(false);
    const [tempText, setTempText] = useState(config.text);

    useEffect(() => {
        setTempText(config.text);
    }, [config.text]);

    const updateConfig = (newConfig) => {
        setConfig(newConfig);
        try {
            localStorage.setItem(storageKey, JSON.stringify(newConfig));
        } catch (e) {
            console.error('Error saving badge config:', e);
        }
    };

    const handleSave = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const trimmed = tempText.trim();
        if (trimmed) {
            updateConfig({ text: trimmed, visible: true });
        }
        setIsOpen(false);
    };

    const handleRemove = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        updateConfig({ ...config, visible: false });
        setIsOpen(false);
    };

    const handleReset = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setTempText(defaultText);
        updateConfig({ text: defaultText, visible: true });
        setIsOpen(false);
    };

    const openModal = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setTempText(config.text);
        setIsOpen(true);
    };

    return (
        <div className="absolute top-2 right-2 z-30" onClick={(e) => e.stopPropagation()}>
            {config.visible ? (
                <button
                    type="button"
                    onClick={openModal}
                    className="group/badge inline-flex items-center text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200/80 shadow-2xs transition-all cursor-pointer select-none"
                    title="Click to rename or remove badge"
                >
                    <span>{config.text}</span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={openModal}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-dashed border-slate-300 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer select-none"
                    title="Click to add badge back"
                >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Badge</span>
                </button>
            )}

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 cursor-default"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsOpen(false);
                    }}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xs p-4 text-left animate-in zoom-in-95 duration-150 cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-sm font-bold text-slate-800">Configure Badge</h3>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsOpen(false);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Badge Label
                                </label>
                                <input
                                    type="text"
                                    value={tempText}
                                    onChange={(e) => setTempText(e.target.value)}
                                    placeholder="e.g. R0"
                                    maxLength={15}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(e);
                                        if (e.key === 'Escape') setIsOpen(false);
                                    }}
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                {config.visible && (
                                    <button
                                        type="button"
                                        onClick={handleRemove}
                                        className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="text-xs text-slate-500 hover:text-slate-700 font-medium hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Reset to default 'R0'"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer ml-auto"
                                >
                                    <Check className="w-3.5 h-3.5" /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default EditableBadge;
