"use client";

import { ProgressBar } from "@/app/components/shared/ProgressBar";
import type { AuResult } from "@/domain/types";

interface AuTrackerProps {
  auResult: AuResult;
}

const ORDER = ["인성/리더십", "즐거운", "신나는"] as const;

const DISPLAY_LABELS: Record<(typeof ORDER)[number], string> = {
  "인성/리더십": "인성/리더십",
  즐거운: "즐대생",
  신나는: "신대생",
};

export function AuTracker({ auResult }: AuTrackerProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">AU 이수현황</h3>
        <p className="font-mono text-xs text-text-muted">
          {auResult.totalEarned}/{auResult.totalRequired}
        </p>
      </div>
      <div className="space-y-2">
        {ORDER.map((key) => {
          const value = auResult.categories[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">{DISPLAY_LABELS[key]}</span>
                <span className={value.fulfilled ? "text-success" : "text-warning"}>
                  {value.earned}/{value.required} {value.fulfilled ? "✓" : "✗"}
                </span>
              </div>
              <ProgressBar
                value={value.earned}
                max={value.required}
                showPercent={false}
                tone={value.fulfilled ? "success" : "warning"}
                label={`${DISPLAY_LABELS[key]} AU 진행률`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
