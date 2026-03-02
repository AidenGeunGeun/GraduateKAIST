import type { HssResult } from "@/domain/types";

interface HssDistributionProps {
  hssResult: HssResult;
}

const GYEYOL = ["인문", "사회", "예술"] as const;

export function HssDistribution({ hssResult }: HssDistributionProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {GYEYOL.map((gyeyol) => {
        const credits = hssResult.gyeyolCredits.get(gyeyol) ?? 0;
        const fulfilled = credits >= 3;
        return (
          <div key={gyeyol} className="rounded border border-border bg-surface-soft px-2 py-1">
            <p className="text-[11px] text-text-muted">{gyeyol}</p>
            <p className={`text-xs font-semibold ${fulfilled ? "text-success" : "text-warning"}`}>
              {credits}학점 {fulfilled ? "✓" : "✗"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
