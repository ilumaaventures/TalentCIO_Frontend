import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const sizes = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  };

  const dotColors = {
    neutral: 'bg-slate-400',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizes[size]} ${variants[variant] || variants.neutral} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.neutral}`} />}
      {children}
    </span>
  );
};
