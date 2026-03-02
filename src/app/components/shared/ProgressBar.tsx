"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  tone?: "success" | "warning" | "danger" | "primary";
  showPercent?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  max,
  tone = "primary",
  showPercent = true,
  label = "진행률",
}: ProgressBarProps) {
  const [mounted, setMounted] = useState(false);
  const safeMax = max <= 0 ? 1 : max;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 20);
    return () => window.clearTimeout(id);
  }, []);

  const toneClass = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    primary: "bg-accent",
  } as const;

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={`${percent.toFixed(1)}%`}
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${toneClass[tone]}`}
          style={{ width: `${mounted ? percent : 0}%` }}
        />
      </div>
      {showPercent ? (
        <p className="mt-1 text-right text-[11px] text-text-muted">{percent.toFixed(1)}%</p>
      ) : null}
    </div>
  );
}
