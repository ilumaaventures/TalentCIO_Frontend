import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { normalizeMultiValueFilter, getMultiFilterLabel } from '../utils/candidateHelpers';

const MultiSelectFilter = ({
    label,
    options = [],
    selectedValues = [],
    onToggleValue,
    onClear,
    isOpen,
    onToggleOpen,
    emptyLabel,
    widthClass = 'w-40'
}) => {
    const normalizedSelectedValues = normalizeMultiValueFilter(selectedValues);
    const triggerRef = useRef(null);
    const [panelPosition, setPanelPosition] = useState(null);

    useEffect(() => {
        if (!isOpen || !triggerRef.current || typeof window === 'undefined') {
            setPanelPosition(null);
            return;
        }

        const rect = triggerRef.current.getBoundingClientRect();
        setPanelPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width
        });
    }, [isOpen]);

    return (
        <div className={`shrink-0 relative ${widthClass}`}>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{label}</label>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => onToggleOpen(isOpen ? null : label)}
                data-multi-filter-trigger="true"
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 outline-none transition hover:border-slate-400 focus:ring-2 focus:ring-blue-500"
            >
                <span className="truncate">{getMultiFilterLabel(normalizedSelectedValues, emptyLabel)}</span>
                <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && panelPosition && typeof document !== 'undefined' && createPortal(
                <div
                    data-multi-filter-panel="true"
                    className="fixed z-[10000] max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                    style={panelPosition}
                >
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Choose users</span>
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="space-y-1">
                        {options.length > 0 ? options.map((option) => {
                            const isChecked = normalizedSelectedValues.includes(option);
                            return (
                                <label
                                    key={option}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => onToggleValue(option)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="truncate">{option}</span>
                                </label>
                            );
                        }) : (
                            <div className="px-2 py-3 text-xs text-slate-400">No users found</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MultiSelectFilter;
