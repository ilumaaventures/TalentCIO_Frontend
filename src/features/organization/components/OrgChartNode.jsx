import React from 'react';
import { Users, ChevronDown, ChevronUp, ShieldAlert, Award, Briefcase } from 'lucide-react';
import { getEmploymentTypeStyle } from '../utils/employmentTypeColors';

const getInitials = (firstName = '', lastName = '') => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
};

const OrgChartNode = ({
    node,
    isExpanded,
    onToggleExpand,
    onSelectNode,
    isSelected = false
}) => {
    if (!node) return null;

    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isInactive = node.isActive === false;
    const empStyle = getEmploymentTypeStyle(node.employmentType);

    return (
        <div className="relative flex flex-col items-center select-none group">
            {/* Card Shell */}
            <div
                onClick={() => onSelectNode?.(node)}
                title={`View ${node.firstName} ${node.lastName}'s Profile`}
                className={`relative w-64 rounded-2xl p-4 pt-4.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 border ${
                    isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 shadow-blue-100'
                        : node.isMatch
                        ? 'border-amber-400 ring-2 ring-amber-300/30 bg-amber-50/40'
                        : isInactive
                        ? 'border-slate-300 bg-slate-100/70 opacity-70'
                        : `bg-white ${empStyle.cardBorder}`
                }`}
            >
                {/* Top Colored Accent Strip for Employment Type */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${empStyle.topBar}`} />

                {/* Status / Inactive indicator */}
                {isInactive && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full z-10">
                        <ShieldAlert size={10} />
                        <span>Inactive</span>
                    </div>
                )}

                <div className="flex items-center gap-3.5">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {node.profilePicture ? (
                            <img
                                src={node.profilePicture}
                                alt={node.firstName}
                                className={`w-12 h-12 rounded-full object-cover ring-2 ${empStyle.avatarRing} shadow-sm`}
                            />
                        ) : (
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${empStyle.avatarGradient} text-white font-bold text-xs flex items-center justify-center ring-2 ${empStyle.avatarRing} shadow-sm`}>
                                {getInitials(node.firstName, node.lastName)}
                            </div>
                        )}
                        {Boolean(node.grade) && (
                            <span
                                className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-white shadow-xs"
                                title={`Grade: ${node.grade}`}
                            >
                                {node.grade}
                            </span>
                        )}
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={`${node.firstName} ${node.lastName}`}>
                            {node.firstName} {node.lastName}
                        </h4>
                        <p className={`text-[11px] font-semibold truncate mt-0.5 ${empStyle.text}`} title={node.designation}>
                            {node.designation || 'Team Member'}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block max-w-[105px] truncate text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60" title={node.department}>
                                {node.department || 'Unassigned'}
                            </span>
                            <span
                                className={`inline-flex items-center gap-1 max-w-[110px] truncate text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${empStyle.badge}`}
                                title={`Type: ${node.employmentType || 'Full Time'}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${empStyle.dot}`} />
                                <span className="truncate">{node.employmentType || 'Full Time'}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Secondary Managers Indicator */}
                {Boolean(node.secondaryManagers && node.secondaryManagers.length > 0) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span className="truncate">Dual reports ({node.secondaryManagers.length})</span>
                    </div>
                )}

                {/* Floating Bottom Expand/Collapse Pill if has direct reports */}
                {hasChildren && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand?.(node._id);
                        }}
                        className={`absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold shadow-md transition-all duration-150 border z-20 ${
                            isExpanded
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                        title={isExpanded ? 'Collapse direct reports' : `Expand ${node.directReportsCount} direct reports`}
                    >
                        <Users size={11} />
                        <span>{node.directReportsCount}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                )}
            </div>

            {/* Downward line connector to children if expanded */}
            {hasChildren && isExpanded && (
                <div className="w-0.5 h-8 bg-slate-300" />
            )}
        </div>
    );
};

export default OrgChartNode;
