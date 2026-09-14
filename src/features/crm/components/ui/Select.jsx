import React from 'react';

export const Select = ({
  label,
  action,
  error,
  options = [],
  className = '',
  id,
  required,
  children,
  ...props
}) => {
  const selectId = id || props.name;

  return (
    <div className="w-full">
      {(label || action) && (
        <div className="flex items-center justify-between gap-1.5 mb-1.5 min-h-[18px]">
          {typeof label === 'string' ? (
            <label
              htmlFor={selectId}
              className="block text-xs font-semibold uppercase tracking-wider text-slate-600 truncate cursor-pointer"
            >
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
          ) : (
            label
          )}
          {action && <div className="shrink-0 flex items-center">{action}</div>}
        </div>
      )}
      <div className="relative rounded-lg shadow-2xs">
        <select
          id={selectId}
          className={`block w-full rounded-lg border text-sm transition-colors py-2 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white ${
            error
              ? 'border-rose-300 text-rose-900 bg-rose-50/20'
              : 'border-slate-300 text-slate-900 hover:border-slate-400'
          } ${className}`}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};
