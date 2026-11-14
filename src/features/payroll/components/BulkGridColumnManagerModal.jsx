import React, { useState, useMemo } from 'react';
import {
    SlidersHorizontal,
    Search,
    CheckSquare,
    Square,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    X,
    Check,
    ListOrdered,
    Sparkles,
    Hash,
    GripVertical
} from 'lucide-react';

// Dedicated component for inline position numbers to avoid focus-loss while typing multi-digit numbers
const PositionInput = ({ position, totalCount, onCommit }) => {
    const [val, setVal] = useState(String(position));

    React.useEffect(() => {
        setVal(String(position));
    }, [position]);

    const handleBlur = () => {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 1 && num <= totalCount && num !== position) {
            onCommit(num);
        } else {
            setVal(String(position));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setVal(String(position));
            e.currentTarget.blur();
        }
    };

    return (
        <input
            type="number"
            min={1}
            max={totalCount}
            value={val}
            draggable={false}
            onDragStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-10 h-7 text-center font-mono tabular-nums text-xs font-black border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
            title={`Change column position (1 to ${totalCount}). Press Enter or click outside to apply.`}
        />
    );
};

export const BulkGridColumnManagerModal = ({
    isOpen,
    onClose,
    columnOrder = [],
    defaultColumnOrder = [],
    columnVisibility = {},
    columnDefinitions = {},
    onApplyLayout,
    onUpdateOrder,
    onUpdateVisibility,
    onResetDefaults
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [localOrder, setLocalOrder] = useState([...columnOrder]);
    const [localVisibility, setLocalVisibility] = useState({ ...columnVisibility });
    const [draggedKey, setDraggedKey] = useState(null);
    const [dragOverKey, setDragOverKey] = useState(null);

    // Sync state when opened
    React.useEffect(() => {
        if (isOpen) {
            setLocalOrder([...columnOrder]);
            setLocalVisibility({ ...columnVisibility });
            setSearchQuery('');
            setSelectedCategory('ALL');
        }
    }, [isOpen, columnOrder, columnVisibility]);

    // Categories
    const categories = useMemo(() => {
        const cats = new Set();
        Object.values(columnDefinitions).forEach(def => {
            if (def.category) cats.add(def.category);
        });
        return ['ALL', ...Array.from(cats)];
    }, [columnDefinitions]);

    // Filtered list
    const filteredColumns = useMemo(() => {
        return localOrder
            .map((key, index) => ({
                key,
                position: index + 1,
                def: columnDefinitions[key] || { label: key, category: 'General' },
                visible: localVisibility[key] !== false
            }))
            .filter(item => {
                const matchesSearch = !searchQuery.trim() ||
                    item.def.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.def.category && item.def.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (item.def.shortDesc && item.def.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()));

                const matchesCat = selectedCategory === 'ALL' || item.def.category === selectedCategory;

                return matchesSearch && matchesCat;
            });
    }, [localOrder, localVisibility, columnDefinitions, searchQuery, selectedCategory]);

    const totalCount = localOrder.length;
    const visibleCount = useMemo(() => {
        return Object.values(localVisibility).filter(Boolean).length;
    }, [localVisibility]);

    // Handlers
    const handleToggleOne = (key) => {
        setLocalVisibility(prev => {
            const current = prev[key] !== false;
            return {
                ...prev,
                [key]: !current
            };
        });
    };

    const handleSelectAll = (select) => {
        const next = {};
        localOrder.forEach(k => {
            next[k] = Boolean(select);
        });
        setLocalVisibility(next);
    };

    const handleMove = (key, direction) => {
        const currentIndex = localOrder.indexOf(key);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= localOrder.length) return;

        const updated = [...localOrder];
        const [moved] = updated.splice(currentIndex, 1);
        updated.splice(targetIndex, 0, moved);
        setLocalOrder(updated);
    };

    const handleDirectPositionChange = (key, newPosInput) => {
        const newPos = typeof newPosInput === 'number' ? newPosInput : parseInt(newPosInput, 10);
        if (isNaN(newPos)) return;

        const currentIndex = localOrder.indexOf(key);
        if (currentIndex === -1) return;

        // Clamp to 1..totalCount
        const targetIndex = Math.max(0, Math.min(localOrder.length - 1, newPos - 1));
        if (targetIndex === currentIndex) return;

        const updated = [...localOrder];
        const [moved] = updated.splice(currentIndex, 1);
        updated.splice(targetIndex, 0, moved);
        setLocalOrder(updated);
    };

    // Drag-and-drop reordering handler
    const handleReorderDrag = (sourceKey, targetKey) => {
        if (!sourceKey || !targetKey || sourceKey === targetKey) return;
        const sourceIndex = localOrder.indexOf(sourceKey);
        const targetIndex = localOrder.indexOf(targetKey);
        if (sourceIndex === -1 || targetIndex === -1) return;

        const updated = [...localOrder];
        const [moved] = updated.splice(sourceIndex, 1);
        updated.splice(targetIndex, 0, moved);
        setLocalOrder(updated);
    };

    const handleDragStart = (e, key) => {
        setDraggedKey(key);
        e.dataTransfer.setData('text/plain', key);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, key) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverKey !== key) {
            setDragOverKey(key);
        }
    };

    const handleDragLeave = (e, key) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            if (dragOverKey === key) {
                setDragOverKey(null);
            }
        }
    };

    const handleDrop = (e, targetKey) => {
        e.preventDefault();
        const sourceKey = draggedKey || e.dataTransfer.getData('text/plain');
        if (sourceKey && targetKey && sourceKey !== targetKey) {
            handleReorderDrag(sourceKey, targetKey);
        }
        setDraggedKey(null);
        setDragOverKey(null);
    };

    const handleDragEnd = () => {
        setDraggedKey(null);
        setDragOverKey(null);
    };

    // Presets
    const applyPreset = (presetType) => {
        if (presetType === 'takehome_first') {
            const priority = ['takeHome', 'monthlyGross', 'annualCTC', 'monthlyCTC', 'basic', 'hra', 'deductions'];
            const others = localOrder.filter(k => !priority.includes(k));
            const newOrder = [...priority.filter(k => localOrder.includes(k)), ...others];
            setLocalOrder(newOrder);
            // Ensure essential columns are visible
            const nextVis = { ...localVisibility };
            priority.forEach(k => { nextVis[k] = true; });
            setLocalVisibility(nextVis);
        } else if (presetType === 'statutory_first') {
            const statutory = ['pf', 'esi', 'pt', 'gratuity', 'lwf', 'tds', 'ltaStatutory', 'annualCTC', 'monthlyGross', 'takeHome'];
            const others = localOrder.filter(k => !statutory.includes(k));
            const newOrder = [...statutory.filter(k => localOrder.includes(k)), ...others];
            setLocalOrder(newOrder);
            const nextVis = { ...localVisibility };
            statutory.forEach(k => { nextVis[k] = true; });
            setLocalVisibility(nextVis);
        } else if (presetType === 'minimal') {
            const minimalKeys = ['annualCTC', 'monthlyCTC', 'basic', 'monthlyGross', 'deductions', 'takeHome'];
            const nextVis = {};
            localOrder.forEach(k => {
                nextVis[k] = minimalKeys.includes(k);
            });
            setLocalVisibility(nextVis);
        }
    };

    const handleSave = () => {
        if (typeof onApplyLayout === 'function') {
            onApplyLayout(localOrder, localVisibility);
        } else {
            onUpdateOrder?.(localOrder);
            onUpdateVisibility?.(localVisibility);
        }
        onClose();
    };

    const handleReset = () => {
        const defOrder = defaultColumnOrder && defaultColumnOrder.length > 0
            ? [...defaultColumnOrder]
            : Object.keys(columnDefinitions);
        const defVis = {};
        defOrder.forEach(k => { defVis[k] = true; });

        setLocalOrder(defOrder);
        setLocalVisibility(defVis);

        if (typeof onResetDefaults === 'function') {
            onResetDefaults();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200 shadow-2xs">
                            <SlidersHorizontal size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-800">Choose & Order Columns</h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200">
                                    {visibleCount} of {totalCount} Visible
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>Drag rows to set column order, or use position numbers & visibility toggles.</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Presets and Filter Bar */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                    {/* Quick Presets */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-500" />
                            <span>Quick Presets:</span>
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={() => applyPreset('takehome_first')}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-colors shadow-2xs text-[11px] cursor-pointer"
                            >
                                Take-Home First
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('statutory_first')}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-colors shadow-2xs text-[11px] cursor-pointer"
                            >
                                Statutory Focus
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('minimal')}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-colors shadow-2xs text-[11px] cursor-pointer"
                            >
                                Summary Only
                            </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] ml-auto">
                            <button
                                type="button"
                                onClick={() => handleSelectAll(true)}
                                className="px-2 py-0.5 text-blue-600 font-bold hover:underline cursor-pointer"
                            >
                                Show All
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                                type="button"
                                onClick={() => handleSelectAll(false)}
                                className="px-2 py-0.5 text-slate-500 font-bold hover:underline cursor-pointer"
                            >
                                Hide All
                            </button>
                        </div>
                    </div>

                    {/* Search & Category Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search columns by name or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
                            />
                        </div>

                        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                                        selectedCategory === cat
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column List with Number Positions and Steppers */}
                <div className="p-3 overflow-y-auto flex-1 space-y-1.5 divide-y divide-slate-100 max-h-[50vh]">
                    {filteredColumns.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-medium">
                            No columns match your search "{searchQuery}"
                        </div>
                    ) : (
                        filteredColumns.map(({ key, position, def, visible }) => {
                            const isFirst = position === 1;
                            const isLast = position === totalCount;
                            const isDragging = draggedKey === key;
                            const isDragOver = dragOverKey === key && !isDragging;

                            // Badge color by category
                            const catColors = {
                                'Base CTC': 'bg-blue-50 text-blue-700 border-blue-200',
                                'Earnings': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                'Allowances': 'bg-sky-50 text-sky-700 border-sky-200',
                                'Statutory': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                'Deductions': 'bg-rose-50 text-rose-700 border-rose-200',
                                'Summary': 'bg-slate-100 text-slate-700 border-slate-200',
                                'Net Pay': 'bg-green-100 text-green-800 border-green-300'
                            };
                            const badgeClass = catColors[def.category] || 'bg-slate-50 text-slate-600 border-slate-200';

                            return (
                                <div
                                    key={key}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, key)}
                                    onDragOver={(e) => handleDragOver(e, key)}
                                    onDragLeave={() => handleDragLeave(key)}
                                    onDrop={(e) => handleDrop(e, key)}
                                    onDragEnd={handleDragEnd}
                                    className={`group/row flex items-center justify-between gap-2.5 p-2 rounded-xl transition-all border select-none ${
                                        isDragging
                                            ? 'opacity-40 border-2 border-dashed border-blue-500 bg-blue-50/70 scale-[0.99]'
                                            : isDragOver
                                                ? 'border-2 border-blue-500 bg-blue-50/90 shadow-md ring-2 ring-blue-300/60 scale-[1.01]'
                                                : visible
                                                    ? 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-slate-300 shadow-2xs'
                                                    : 'bg-slate-50/50 opacity-60 border-slate-200/60'
                                    }`}
                                >
                                    {/* Left: Drag Grip Handle + Position number input + Up/Down arrows */}
                                    <div className="flex items-center gap-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                                        {/* Drag Grip Handle */}
                                        <div
                                            className="p-1 text-slate-300 group-hover/row:text-slate-600 hover:!text-blue-600 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100 transition-colors shrink-0"
                                            title="Click and drag to reorder this column"
                                        >
                                            <GripVertical size={16} />
                                        </div>

                                        <div className="relative flex items-center">
                                            <span className="text-[10px] text-slate-400 font-bold mr-1">#</span>
                                            <PositionInput
                                                position={position}
                                                totalCount={totalCount}
                                                onCommit={(newPos) => handleDirectPositionChange(key, newPos)}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                type="button"
                                                draggable={false}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onDragStart={(e) => e.stopPropagation()}
                                                onClick={() => handleMove(key, 'up')}
                                                disabled={isFirst}
                                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 transition-colors cursor-pointer"
                                                title="Move Column Earlier"
                                            >
                                                <ArrowUp size={11} />
                                            </button>
                                            <button
                                                type="button"
                                                draggable={false}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onDragStart={(e) => e.stopPropagation()}
                                                onClick={() => handleMove(key, 'down')}
                                                disabled={isLast}
                                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 transition-colors cursor-pointer"
                                                title="Move Column Later"
                                            >
                                                <ArrowDown size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Middle: Checkbox + Label + Category */}
                                    <div
                                        onClick={() => handleToggleOne(key)}
                                        className="flex-1 flex items-center gap-2.5 cursor-pointer min-w-0 select-none py-1"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visible}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleToggleOne(key);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs font-bold truncate ${visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                                    {def.label}
                                                </span>
                                                {def.category && (
                                                    <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-extrabold border ${badgeClass} shrink-0`}>
                                                        {def.category}
                                                    </span>
                                                )}
                                                {isDragOver && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100/90 px-1.5 py-0.2 rounded animate-pulse">
                                                        Drop here
                                                    </span>
                                                )}
                                            </div>
                                            {def.shortDesc && (
                                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                    {def.shortDesc}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Quick View/Hide Toggle Icon */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleOne(key)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                                            visible
                                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                                                : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                        title={visible ? 'Click to hide column' : 'Click to show column'}
                                    >
                                        {visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                        <span className="text-[10px]">{visible ? 'Shown' : 'Hidden'}</span>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Restore default column ordering and show all columns"
                    >
                        <RotateCcw size={13} />
                        <span>Reset to Defaults</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <Check size={14} />
                            <span>Apply Column Layout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkGridColumnManagerModal;

