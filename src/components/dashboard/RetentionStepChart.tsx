import React, { useMemo } from 'react';

interface RetentionStepChartProps {
  data?: { step: number; label: string; value: number }[];
}

export const RetentionStepChart: React.FC<RetentionStepChartProps> = ({ data }) => {
  const width = 320;
  const height = 110;
  const paddingX = 8;
  const paddingY = 12;

  const maxVal = 100;
  const minVal = 0;

  const safeData = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return [
      { step: 1, label: 'W1', value: 35 },
      { step: 2, label: 'W2', value: 50 },
      { step: 3, label: 'W3', value: 45 },
      { step: 4, label: 'W4', value: 65 },
      { step: 5, label: 'W5', value: 75 },
      { step: 6, label: 'W6', value: 80 },
    ];
  }, [data]);

  const { pathD, fillD, latestValue } = useMemo(() => {
    const count = safeData.length;
    const divisor = Math.max(1, count - 1);

    const points = safeData.map((d, i) => {
      const raw = typeof d.value === 'number' && Number.isFinite(d.value) ? d.value : 0;
      const clampedVal = Math.min(maxVal, Math.max(minVal, raw));
      const x = paddingX + (i / divisor) * (width - 2 * paddingX);
      const y = height - paddingY - (clampedVal / (maxVal - minVal)) * (height - 2 * paddingY);
      return {
        x: Math.max(paddingX, Math.min(width - paddingX, Number(x.toFixed(1)))),
        y: Math.max(paddingY, Math.min(height - paddingY, Number(y.toFixed(1)))),
        value: clampedVal,
      };
    });

    if (points.length === 0) {
      return { pathD: '', fillD: '', latestValue: 0 };
    }

    const baselineY = height - paddingY;
    let pD = `M ${points[0].x} ${points[0].y}`;
    let fD = `M ${points[0].x} ${baselineY} L ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      pD += ` H ${curr.x} V ${curr.y}`;
      fD += ` H ${curr.x} V ${curr.y}`;
    }

    fD += ` L ${points[points.length - 1].x} ${baselineY} Z`;

    const last = points[points.length - 1].value;
    return { pathD: pD, fillD: fD, latestValue: last };
  }, [safeData]);

  return (
    <div className="relative pt-2 overflow-hidden w-full">
      {/* Floating Value Pill Badge */}
      <div className="absolute top-0 right-4 z-10 bg-card/90 backdrop-blur-xs shadow-xs px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-text-primary border border-border-subtle">
        {latestValue > 0 ? `${latestValue}%` : '0%'}
      </div>

      <div className="w-full h-[110px] overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          style={{ overflow: 'hidden' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E85D9A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E85D9A" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Stepped Area Fill */}
          {fillD && <path d={fillD} fill="url(#retentionFill)" />}

          {/* Stepped Outline Stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#E85D9A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
