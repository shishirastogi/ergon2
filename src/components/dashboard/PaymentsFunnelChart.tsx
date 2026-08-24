import React, { useState, useMemo } from 'react';
import { FunnelStage } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';

interface PaymentsFunnelChartProps {
  data: FunnelStage[];
}

export const PaymentsFunnelChart: React.FC<PaymentsFunnelChartProps> = ({ data }) => {
  const [activeStage, setActiveStage] = useState<number>(() => {
    const focusedIdx = (data || []).findIndex((d) => d.isFocused);
    return focusedIdx >= 0 ? focusedIdx : Math.min(2, Math.max(0, (data?.length || 1) - 1));
  });

  const chartData = data && data.length > 0 ? data : [];
  const colCount = chartData.length || 5;

  const { maxVal, yAxisTicks, isAllZero } = useMemo(() => {
    const maxCount = Math.max(...chartData.map((d) => d.count || 0), 0);
    const zero = maxCount === 0;
    const ceiling = zero ? 100 : Math.ceil(maxCount * 1.2);

    const ticks = zero
      ? [100, 75, 50, 25]
      : [
          ceiling,
          Math.round(ceiling * 0.75),
          Math.round(ceiling * 0.5),
          Math.round(ceiling * 0.25),
        ];

    return { maxVal: ceiling, yAxisTicks: ticks, isAllZero: zero };
  }, [chartData]);

  const formatTickLabel = (tick: number) => {
    if (tick >= 1_000_000) return `${(tick / 1_000_000).toFixed(1)}M`;
    if (tick >= 10_000) return `${Math.round(tick / 1_000)}k`;
    if (tick >= 1_000) return `${(tick / 1_000).toFixed(1)}k`;
    return String(tick);
  };

  return (
    <div className="relative pt-1 pb-1 w-full">
      {/* Funnel Stage Column Labels - Dynamic single row without wrapping */}
      <div
        className="grid gap-2 sm:gap-3 mb-5 w-full"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {chartData.map((item, idx) => {
          const isFocused = idx === activeStage;
          return (
            <button
              key={item.stage || idx}
              type="button"
              onClick={() => setActiveStage(idx)}
              className={`text-left cursor-pointer p-1.5 sm:p-2 rounded-xl transition-all duration-150 ${
                isFocused
                  ? 'bg-card-alt/80 border border-border-subtle shadow-xs'
                  : 'hover:bg-card-alt/40 border border-transparent opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isFocused ? 'bg-accent-blue' : 'bg-text-secondary/40'
                  }`}
                />
                <span className="text-[10px] sm:text-[11px] font-semibold text-text-secondary truncate block">
                  {item.label}
                </span>
              </div>
              <span
                className={`text-sm sm:text-base font-bold tracking-tight block ${
                  isFocused ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {formatCompactNumber(item.count || 0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart Canvas Area */}
      <div className="relative h-[210px] sm:h-[230px] flex items-end w-full">
        {/* Y-Axis Labels and Subtle Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-1">
          {yAxisTicks.map((tick) => (
            <div key={tick} className="flex items-center gap-2 w-full">
              <span className="text-[10px] font-medium text-text-secondary w-7 text-right shrink-0">
                {formatTickLabel(tick)}
              </span>
              <div className="flex-1 border-b border-border-subtle" />
            </div>
          ))}
          {/* Baseline 0 line */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] font-medium text-text-secondary w-7 text-right shrink-0">
              0
            </span>
            <div className="flex-1 border-b border-border-subtle" />
          </div>
        </div>

        {/* Funnel Bars - Dynamic single-row columns matching exact data length */}
        <div
          className="grid gap-2 sm:gap-3 w-full h-[88%] pl-9 relative z-10 items-end"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {chartData.map((item, idx) => {
            const isFocused = idx === activeStage;
            const count = item.count || 0;
            const heightPercent = isAllZero
              ? 0
              : Math.min(100, Math.max(10, (count / maxVal) * 100));

            return (
              <div
                key={item.stage || idx}
                onClick={() => setActiveStage(idx)}
                className={`relative flex flex-col items-center justify-end h-full group cursor-pointer transition-all ${
                  isFocused ? 'z-30' : 'z-10'
                }`}
              >
                {/* Floating pill indicator above bar */}
                <div
                  className={`mb-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    isFocused
                      ? 'bg-accent-blue text-white shadow-xs scale-105'
                      : 'bg-card text-text-secondary shadow-xs border border-border-subtle opacity-70 group-hover:opacity-100'
                  }`}
                >
                  {count > 0 ? (
                    <span>{formatCompactNumber(count)}</span>
                  ) : (
                    <div className="w-3.5 h-1 rounded-full bg-current opacity-60" />
                  )}
                </div>

                {/* The Bar: Dynamic gradient when focused / striped when inactive / baseline when 0 */}
                {count > 0 ? (
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-xl transition-all duration-300 relative overflow-hidden ${
                      isFocused
                        ? 'bg-bar-gradient-blue shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/40'
                        : 'bg-striped-blue group-hover:opacity-90'
                    }`}
                  >
                    {/* 3D Top bevel effect */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-white/35" />
                  </div>
                ) : (
                  <div
                    className={`w-full h-2 rounded-full transition-all ${
                      isFocused
                        ? 'bg-accent-blue/40 border border-accent-blue ring-2 ring-accent-blue/20'
                        : 'bg-border-subtle/80 group-hover:bg-text-secondary/30'
                    }`}
                  />
                )}

                {/* Floating Tooltip for Active Stage */}
                {isFocused && (
                  <div className="absolute -top-11 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
                    <div className="bg-card px-3.5 py-1.5 rounded-full shadow-ergon-float border border-border-subtle text-[11px] font-medium text-text-primary flex items-center gap-2">
                      <span className="font-bold text-accent-blue">
                        {item.label}: {formatCompactNumber(count)}
                      </span>
                      <span className="text-text-secondary">|</span>
                      <span>
                        Conversion: <strong className="text-emerald-600 dark:text-emerald-400">{item.conversionRate || 0}%</strong>
                      </span>
                      {item.dropOffRate !== undefined && item.dropOffRate !== 0 && (
                        <>
                          <span className="text-text-secondary">|</span>
                          <span>
                            Drop-off: <strong className="text-rose-600 dark:text-rose-400">{item.dropOffRate}%</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
