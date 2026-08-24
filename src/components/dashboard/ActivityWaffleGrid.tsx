import React from 'react';
import { ActivityPoint } from '../../types';

interface ActivityWaffleGridProps {
  data: ActivityPoint[];
  totalTransactions?: string;
  comparison?: string;
}

export const ActivityWaffleGrid: React.FC<ActivityWaffleGridProps> = ({
  data: _data,
  totalTransactions = '106k',
  comparison = '+34,002',
}) => {
  // 7 columns (days of week), each with 4-5 dots/squares with varying intensity
  const columns = [
    { day: 'Mon', levels: [2, 1, 0, 0] },
    { day: 'Tue', levels: [3, 2, 2, 0] },
    { day: 'Wed', levels: [4, 4, 3, 3, 2], isPeak: true }, // Peak
    { day: 'Thu', levels: [3, 3, 2, 1] },
    { day: 'Fri', levels: [2, 2, 1, 0] },
    { day: 'Sat', levels: [1, 1, 0, 0] },
    { day: 'Sun', levels: [1, 0, 0, 0] },
  ];

  const getColorClass = (level: number) => {
    switch (level) {
      case 4:
        return 'bg-emerald-600';
      case 3:
        return 'bg-emerald-500';
      case 2:
        return 'bg-emerald-400/80';
      case 1:
        return 'bg-emerald-300/60';
      default:
        return 'bg-emerald-100/40';
    }
  };

  return (
    <div className="relative pt-1">
      {/* Floating Peak Pill Badge */}
      <div className="flex justify-end mb-2">
        <span className="bg-card shadow-ergon-pill px-2.5 py-0.5 rounded-full text-[10px] font-bold text-text-primary border border-border-subtle">
          Peak: <strong className="text-emerald-700 dark:text-emerald-400">Wed</strong>
        </span>
      </div>

      <div className="flex items-end justify-between gap-4 mt-2">
        <div>
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary block">
            {totalTransactions}
          </span>
        </div>

        {/* Waffle / Dot Matrix Visualizer */}
        <div className="flex items-end gap-1.5 pb-1">
          {columns.map((col, cIdx) => (
            <div key={cIdx} className="flex flex-col-reverse gap-1 items-center">
              {col.levels.map((lvl, rIdx) => (
                <div
                  key={rIdx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${getColorClass(lvl)}`}
                  title={`${col.day} intensity`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="text-right">
          <span className="text-[10px] text-text-secondary block">vs last period</span>
          <span className="text-xs font-bold text-emerald-700">{comparison}</span>
        </div>
      </div>
    </div>
  );
};
