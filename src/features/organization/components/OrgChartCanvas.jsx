import React, { useState, useRef, useEffect, useCallback } from 'react';
import OrgChartNode from './OrgChartNode';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Move } from 'lucide-react';

const TreeNode = ({
    node,
    expandedMap,
    onToggleExpand,
    onSelectNode,
    selectedNodeId,
    isFirst = false,
    isLast = false,
    isOnly = false,
    isRoot = false
}) => {
    if (!node) return null;

    const isExpanded = expandedMap[String(node._id)] !== false;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isSelected = String(selectedNodeId) === String(node._id);

    return (
        <div className="flex flex-col items-center">
            {/* Top stem and horizontal sibling line if not a root node */}
            {!isRoot && (
                <div className="relative w-full flex justify-center">
                    {/* Horizontal connector line segment */}
                    {!isOnly && (
                        <>
                            {isFirst && (
                                <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300" />
                            )}
                            {isLast && (
                                <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300" />
                            )}
                            {!isFirst && !isLast && (
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-300" />
                            )}
                        </>
                    )}

                    {/* Vertical stem down to the card */}
                    <div className="w-0.5 h-6 bg-slate-300" />
                </div>
            )}

            {/* Node Card */}
            <OrgChartNode
                node={node}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                onSelectNode={onSelectNode}
                isSelected={isSelected}
            />

            {/* Children Row with accurate connectors */}
            {hasChildren && isExpanded && (
                <div className="flex items-start justify-center gap-8 pt-0">
                    {node.children.map((child, index) => (
                        <TreeNode
                            key={child._id}
                            node={child}
                            expandedMap={expandedMap}
                            onToggleExpand={onToggleExpand}
                            onSelectNode={onSelectNode}
                            selectedNodeId={selectedNodeId}
                            isFirst={index === 0}
                            isLast={index === node.children.length - 1}
                            isOnly={node.children.length === 1}
                            isRoot={false}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const OrgChartCanvas = ({
    tree = [],
    selectedNode,
    onSelectNode
}) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [expandedMap, setExpandedMap] = useState({});

    const canvasContainerRef = useRef(null);
    const treeContentRef = useRef(null);

    // Initialize 2 levels expanded by default
    useEffect(() => {
        const initialMap = {};
        const walk = (nodes, depth = 0) => {
            for (const n of nodes) {
                initialMap[String(n._id)] = depth < 2;
                if (n.children) walk(n.children, depth + 1);
            }
        };
        walk(tree, 0);
        setExpandedMap(initialMap);
    }, [tree]);

    const handleToggleExpand = useCallback((nodeId) => {
        setExpandedMap((prev) => ({
            ...prev,
            [String(nodeId)]: !prev[String(nodeId)]
        }));
    }, []);

    const handleExpandAll = () => {
        const newMap = {};
        const walk = (nodes) => {
            for (const n of nodes) {
                newMap[String(n._id)] = true;
                if (n.children) walk(n.children);
            }
        };
        walk(tree);
        setExpandedMap(newMap);
    };

    const handleCollapseAll = () => {
        const newMap = {};
        const walk = (nodes) => {
            for (const n of nodes) {
                newMap[String(n._id)] = false;
                if (n.children) walk(n.children);
            }
        };
        walk(tree);
        setExpandedMap(newMap);
    };

    // Auto-center and fit
    const centerAndFitView = useCallback(() => {
        if (!canvasContainerRef.current) return;
        const container = canvasContainerRef.current;
        const containerWidth = container.clientWidth || 1000;
        
        // Reset scale and position
        setScale(1);
        setPosition({ x: 0, y: 20 });
    }, []);

    // Zoom controls
    const zoomIn = () => setScale((s) => Math.min(s + 0.15, 2));
    const zoomOut = () => setScale((s) => Math.max(s - 0.15, 0.4));
    const resetZoom = () => {
        centerAndFitView();
    };

    // Panning
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.cursor-pointer')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Native active wheel listener to prevent browser back swipe navigation
    useEffect(() => {
        const el = canvasContainerRef.current;
        if (!el) return;

        const onWheel = (e) => {
            // Stop browser swipe-to-navigate back/forward
            e.preventDefault();
            e.stopPropagation();

            if (e.ctrlKey || e.metaKey) {
                const delta = e.deltaY < 0 ? 0.05 : -0.05;
                setScale((s) => Math.min(Math.max(Number((s + delta).toFixed(2)), 0.35), 2));
            } else {
                setPosition((pos) => ({
                    x: pos.x - e.deltaX * 0.9,
                    y: pos.y - e.deltaY * 0.9
                }));
            }
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    if (!tree || tree.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[550px] bg-slate-50 border border-slate-200/80 rounded-3xl p-6 text-center shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                    <Maximize2 size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Organization Data Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                    No active employees match the current filters. Adjust your filters or add reporting managers to build the chart.
                </p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[720px] overflow-hidden bg-slate-50 border border-slate-200/90 rounded-3xl shadow-sm select-none">
            {/* Canvas Toolbar Controls */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200 shadow-md">
                <button
                    type="button"
                    onClick={zoomIn}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Zoom In (or Ctrl + Scroll)"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    type="button"
                    onClick={zoomOut}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Zoom Out (or Ctrl + Scroll)"
                >
                    <ZoomOut size={16} />
                </button>
                <span className="text-[11px] font-bold text-slate-600 px-1.5 min-w-[42px] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    type="button"
                    onClick={resetZoom}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Reset View & Center"
                >
                    <RotateCcw size={16} />
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <button
                    type="button"
                    onClick={handleExpandAll}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                    Expand All
                </button>
                <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                    Collapse All
                </button>
            </div>

            {/* Draggable & Scalable Infinite Canvas Stage */}
            <div
                ref={canvasContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative flex items-start justify-center"
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
                    backgroundSize: '24px 24px',
                    overscrollBehavior: 'none',
                    touchAction: 'none'
                }}
            >
                <div
                    ref={treeContentRef}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'top center',
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                    className="inline-flex items-start justify-center gap-16 min-w-max px-32 py-16"
                >
                    {tree.map((rootNode) => (
                        <TreeNode
                            key={rootNode._id}
                            node={rootNode}
                            expandedMap={expandedMap}
                            onToggleExpand={handleToggleExpand}
                            onSelectNode={onSelectNode}
                            selectedNodeId={selectedNode?._id}
                            isRoot={true}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrgChartCanvas;
