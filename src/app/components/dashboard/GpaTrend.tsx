"use client";

interface GpaPoint {
  label: string;
  gpa: number;
}

interface GpaTrendProps {
  data: GpaPoint[];
}

function compactSemesterLabel(label: string): string {
  const match = label.match(/(\d{4})년\s*(봄|여름|가을|겨울)학기/);
  if (!match) {
    return label;
  }
  return `${match[1].slice(2)}${match[2]}`;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 180;
const PADDING = 24;
const MAX_GPA = 4.3;

export function GpaTrend({ data }: GpaTrendProps) {
  if (data.length === 0) {
    return <p className="text-xs text-text-muted">학기별 GPA 데이터가 없습니다.</p>;
  }

  const xStep = data.length > 1 ? (CHART_WIDTH - PADDING * 2) / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = PADDING + index * xStep;
    const y = CHART_HEIGHT - PADDING - (item.gpa / MAX_GPA) * (CHART_HEIGHT - PADDING * 2);
    return { ...item, x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-[180px] min-w-[560px] w-full rounded-lg border border-border bg-surface-soft"
      >
        <line
          x1={PADDING}
          y1={CHART_HEIGHT - PADDING}
          x2={CHART_WIDTH - PADDING}
          y2={CHART_HEIGHT - PADDING}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={CHART_HEIGHT - PADDING} stroke="var(--color-border)" strokeWidth="1" />
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2" points={polyline} />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="3" fill="var(--color-accent)" />
            <text
              x={point.x}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-muted)"
            >
              {compactSemesterLabel(point.label)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
