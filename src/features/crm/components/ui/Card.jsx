import React from 'react';

export const Card = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl shadow-xs transition-all duration-150 ${
        paddings[padding]
      } ${hover ? 'hover:border-slate-300 hover:shadow-sm' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
