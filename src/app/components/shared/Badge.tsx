import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "supported" | "partial" | "neutral" | "danger";
  children: ReactNode;
}

export function Badge({ variant = "neutral", children }: BadgeProps) {
  const classNameByVariant = {
    supported: "border-success/50 bg-success/10 text-success",
    partial: "border-warning/50 bg-warning/10 text-warning",
    neutral: "border-border bg-surface-soft text-text-muted",
    danger: "border-danger/50 bg-danger/10 text-danger",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-tight ${classNameByVariant[variant]}`}
    >
      {children}
    </span>
  );
}
