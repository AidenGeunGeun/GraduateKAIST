import { GpaTrend } from "@/app/components/dashboard/GpaTrend";
import { WhatIfSimulator } from "@/app/components/dashboard/WhatIfSimulator";

interface GpaSectionProps {
  cumulativeGpa: number;
  semesterTrend: Array<{ label: string; gpa: number }>;
  currentGpaCredits: number;
  remainingCredits: number;
}

export function GpaSection({
  cumulativeGpa,
  semesterTrend,
  currentGpaCredits,
  remainingCredits,
}: GpaSectionProps) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-end justify-between">
        <h3 className="text-sm font-semibold text-text">GPA</h3>
        <p className="text-lg font-bold text-accent">{cumulativeGpa.toFixed(2)} / 4.30</p>
      </div>
      <GpaTrend data={semesterTrend} />
      <WhatIfSimulator
        currentGpa={cumulativeGpa}
        currentGpaCredits={currentGpaCredits}
        remainingCredits={remainingCredits}
      />
    </section>
  );
}
