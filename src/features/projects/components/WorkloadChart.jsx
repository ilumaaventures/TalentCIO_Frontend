import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Users, Clock, CheckSquare } from 'lucide-react';

export const WorkloadChart = ({ workload = [] }) => {
  const [metric, setMetric] = useState('tasks'); // 'tasks' | 'hours'

  if (!workload || workload.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-slate-400 py-12">
        <Users size={36} className="text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">No member workload data available</p>
        <p className="text-[11px] text-slate-400">Assign tasks to project members to see workload distribution.</p>
      </div>
    );
  }

  const chartData = workload.map((w) => {
    const name = w.user
      ? `${w.user.firstName || ''} ${w.user.lastName ? w.user.lastName[0] + '.' : ''}`.trim() || 'User'
      : 'Unassigned';

    return {
      name,
      openTasks: w.openTasks || 0,
      completedTasks: w.completedTasks || 0,
      estimatedHours: Number(w.estimatedHours || 0),
      loggedHours: Number(w.loggedHours || 0)
    };
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            Team Workload Distribution
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare active vs completed tasks or estimated vs logged hours per team member
          </p>
        </div>

        {/* Toggle metric */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('tasks')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              metric === 'tasks' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare size={13} /> Tasks
          </button>
          <button
            type="button"
            onClick={() => setMetric('hours')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              metric === 'hours' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={13} /> Hours
          </button>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={40}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                fontSize: '12px'
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            {metric === 'tasks' ? (
              <>
                <Bar dataKey="openTasks" name="Open Tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="completedTasks" name="Completed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </>
            ) : (
              <>
                <Bar dataKey="estimatedHours" name="Estimated Hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="loggedHours" name="Logged Hours" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WorkloadChart;
