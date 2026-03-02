import { ProgressBar } from "@/app/components/shared/ProgressBar";

import type { ReactNode } from "react";

interface CategoryCardProps {
  title: string;
  earned: number;
  required: number;
  fulfilled?: boolean;
  details?: string;
  children?: ReactNode;
  informational?: boolean;
}

export function CategoryCard({
  title,
  earned,
  required,
  fulfilled = false,
  details,
  children,
  informational = false,
}: CategoryCardProps) {
  const tone = informational ? "primary" : fulfilled ? "success" : earned >= required ? "success" : "warning";

  return (
    <article className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="font-mono text-xs text-text-muted">
          {required > 0 ? `${earned}/${required}` : `${earned}`}
        </p>
      </div>
      {required > 0 ? (
        <div className="mt-2">
          <ProgressBar value={earned} max={required} tone={tone} label={`${title} 진행률`} />
        </div>
      ) : null}
      {details ? <p className="mt-2 text-xs text-text-muted">{details}</p> : null}
      {children ? <div className="mt-2 space-y-1.5">{children}</div> : null}
    </article>
  );
}
