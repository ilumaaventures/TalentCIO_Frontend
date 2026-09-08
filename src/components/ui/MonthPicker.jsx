import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Cross-platform MonthPicker component that provides a consistent month-selection popup
 * across all operating systems and browsers (including macOS / Safari / iOS where native
 * <input type="month"> has poor or inconsistent support).
 *
 * @param {string} value - Selected month in "YYYY-MM" format (e.g., "2026-09")
 * @param {function} onChange - Callback receiving updated "YYYY-MM" string
 * @param {string} className - Optional styling classes for the trigger input
 * @param {string} placeholder - Placeholder text when no month is selected
 * @param {boolean} disabled - Whether the picker is disabled
 */
const MonthPicker = ({
    value = '',
    onChange,
    className = '',
    placeholder = 'Select Month',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Parse initial year and month index (0-11)
    const parseValue = (val) => {
        if (val && typeof val === 'string' && val.includes('-')) {
            const [yStr, mStr] = val.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10) - 1;
            if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
                return { year: y, monthIndex: m };
            }
        }
        const now = new Date();
        return { year: now.getFullYear(), monthIndex: now.getMonth() };
    };

    const parsed = parseValue(value);
    const [viewYear, setViewYear] = useState(parsed.year);

    // Keep viewYear in sync when value changes externally
    useEffect(() => {
        if (value) {
            const p = parseValue(value);
            setViewYear(p.year);
        }
    }, [value]);

    // Handle outside click to close popover
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Selected month display label (e.g. "September 2026")
    const displayLabel = (() => {
        if (!value) return '';
        const p = parseValue(value);
        return `${MONTH_NAMES_FULL[p.monthIndex]} ${p.year}`;
    })();

    const handleSelectMonth = (monthIndex) => {
        const monthStr = String(monthIndex + 1).padStart(2, '0');
        const formatted = `${viewYear}-${monthStr}`;
        if (onChange) onChange(formatted);
        setIsOpen(false);
    };

    const handleThisMonth = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        setViewYear(y);
        const monthStr = String(m + 1).padStart(2, '0');
        const formatted = `${y}-${monthStr}`;
        if (onChange) onChange(formatted);
        setIsOpen(false);
    };

    const handleClear = () => {
        if (onChange) onChange('');
        setIsOpen(false);
    };

    const isSelected = (monthIndex) => {
        if (!value) return false;
        const p = parseValue(value);
        return p.year === viewYear && p.monthIndex === monthIndex;
    };

    const isCurrentRealMonth = (monthIndex) => {
        const now = new Date();
        return now.getFullYear() === viewYear && now.getMonth() === monthIndex;
    };

    return (
        <div ref={containerRef} className="relative inline-block w-full">
            {/* Trigger Button (mimics input) */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white text-left transition-all ${
                    isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-300 hover:border-slate-400'
                } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${className}`}
            >
                <span className={displayLabel ? 'font-medium text-slate-800' : 'text-slate-400'}>
                    {displayLabel || placeholder}
                </span>
                <Calendar size={16} className="text-slate-500 shrink-0 ml-2" />
            </button>

            {/* Custom Month Picker Dropdown Popover */}
            {isOpen && (
                <div
                    className="absolute z-50 mt-1.5 left-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95 duration-150"
                    style={{ minWidth: '250px' }}
                >
                    {/* Header: Year Selector */}
                    <div className="flex items-center justify-between bg-slate-100/80 rounded-lg px-2 py-1.5 mb-3">
                        <button
                            type="button"
                            onClick={() => setViewYear((prev) => prev - 1)}
                            className="p-1 rounded-md text-slate-600 hover:bg-white hover:shadow-xs transition"
                            title="Previous Year"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-800">{viewYear}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setViewYear((prev) => prev + 1)}
                            className="p-1 rounded-md text-slate-600 hover:bg-white hover:shadow-xs transition"
                            title="Next Year"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* 3x4 Grid of Months */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {MONTH_NAMES_SHORT.map((mShort, idx) => {
                            const selected = isSelected(idx);
                            const isCurrent = isCurrentRealMonth(idx);

                            return (
                                <button
                                    key={mShort}
                                    type="button"
                                    onClick={() => handleSelectMonth(idx)}
                                    title={MONTH_NAMES_FULL[idx]}
                                    className={`py-2 px-1 text-xs font-semibold rounded-lg text-center transition-all ${
                                        selected
                                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1'
                                            : isCurrent
                                            ? 'border border-blue-300 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {mShort}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Actions: Clear & This Month */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 transition"
                        >
                            Clear
                        </button>

                        <button
                            type="button"
                            onClick={handleThisMonth}
                            className="text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition"
                        >
                            This month
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthPicker;
