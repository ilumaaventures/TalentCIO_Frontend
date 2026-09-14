import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';

export const StatCard = ({
  title,
  value,
  previousValue,
  changePercent,
  trend = 'up', // 'up' | 'down' | 'neutral'
  icon: Icon,
  iconColor = 'text-indigo-600 bg-indigo-50',
  description,
  onClick,
}) => {
  const isUp = trend === 'up';

  return (
    <Card
      padding="md"
      hover={!!onClick}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</h4>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(changePercent !== undefined || description) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs">
          {changePercent !== undefined && (
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                isUp ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}
            </span>
          )}
          <span className="text-slate-500">{description || (previousValue ? `vs ${previousValue} last period` : '')}</span>
        </div>
      )}
    </Card>
  );
};
