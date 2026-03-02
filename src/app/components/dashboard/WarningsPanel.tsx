import type { Warning } from "@/domain/types";

interface WarningsPanelProps {
  warnings: Warning[];
  informationalNotices: string[];
}

export function WarningsPanel({ warnings, informationalNotices }: WarningsPanelProps) {
  return (
    <section className="space-y-2">
      <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
        <h3 className="text-sm font-semibold text-accent">안내</h3>
        <ul className="mt-2 space-y-1 text-xs text-text">
          {informationalNotices.map((notice) => (
            <li key={notice}>• {notice}</li>
          ))}
        </ul>
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
          <h3 className="text-sm font-semibold text-warning">주의사항</h3>
          <ul className="mt-2 space-y-1 text-xs text-text">
            {warnings.map((warning, index) => (
              <li key={`${warning.type}-${warning.courseCode ?? index}`}>• {warning.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-3">
          <h3 className="text-sm font-semibold text-text">주의사항</h3>
          <p className="mt-2 text-xs text-text-muted">현재 감지된 주의사항이 없습니다.</p>
        </div>
      )}
    </section>
  );
}
