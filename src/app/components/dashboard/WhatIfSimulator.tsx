"use client";

import { useMemo, useState } from "react";
import { track } from "@vercel/analytics";

import { WHAT_IF_GRADES } from "@/app/components/data";
import { Grade } from "@/domain/models/Grade";
import { GpaCalculator } from "@/domain/services/GpaCalculator";

interface WhatIfSimulatorProps {
  currentGpa: number;
  currentGpaCredits: number;
  remainingCredits: number;
}

export function WhatIfSimulator({ currentGpa, currentGpaCredits, remainingCredits }: WhatIfSimulatorProps) {
  const [targetGrade, setTargetGrade] = useState<(typeof WHAT_IF_GRADES)[number]>("B+");

  const projectedGpa = useMemo(() => {
    if (remainingCredits === 0) {
      return currentGpa;
    }
    return GpaCalculator.whatIf(
      currentGpa,
      currentGpaCredits,
      remainingCredits,
      Grade.from(targetGrade),
    );
  }, [currentGpa, currentGpaCredits, remainingCredits, targetGrade]);

  return (
    <div className="rounded-lg border border-border bg-surface-soft p-3">
      <h4 className="text-xs font-semibold text-text">가정 시뮬레이터</h4>
      {remainingCredits === 0 ? (
        <p className="mt-2 text-xs text-text-muted">
          이미 필요한 학점을 모두 이수했습니다. 최종 GPA는 현재와 동일합니다: {currentGpa.toFixed(2)}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs text-text-muted">남은 학점에서 평균</label>
          <select
            value={targetGrade}
            onChange={(event) => {
              setTargetGrade(event.target.value as (typeof WHAT_IF_GRADES)[number]);
              track("whatif_used");
            }}
            className="h-8 rounded border border-border bg-surface px-2 text-xs text-text"
          >
            {WHAT_IF_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <span className="text-xs text-text-muted">을 받으면</span>
          <p className="text-sm font-semibold text-accent">예상 GPA: {projectedGpa.toFixed(2)}</p>
        </div>
      )}
      <p className="mt-2 text-[11px] text-text-muted">남은 학점: {remainingCredits}학점</p>
    </div>
  );
}
