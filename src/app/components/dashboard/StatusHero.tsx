import { ProgressBar } from "@/app/components/shared/ProgressBar";

interface StatusHeroProps {
  earned: number;
  required: number;
  gpa: number;
  status: "fulfilled" | "in_progress" | "behind";
}

export function StatusHero({ earned, required, gpa, status }: StatusHeroProps) {
  const remaining = Math.max(required - earned, 0);
  const tone = status === "fulfilled" ? "success" : status === "in_progress" ? "warning" : "danger";
  const title =
    status === "fulfilled"
      ? "졸업요건 충족! 🎉"
      : status === "in_progress"
        ? `졸업까지 ${remaining}학점 남음`
        : `졸업요건 미충족 - ${remaining}학점 부족`;

  return (
    <section className="rounded-xl border border-border bg-surface p-4" role="status" aria-live="polite" aria-label="졸업 진행 상황">
      <p className={`text-lg font-semibold ${tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger"}`}>
        {title}
      </p>
      <div className="mt-3">
        <ProgressBar value={earned} max={required} tone={tone} label="전체 이수 진행률" />
      </div>
      <p className="mt-2 text-sm text-text-muted">
        {required}학점 중 {earned}학점 이수
      </p>
      <p className="mt-3 text-base font-semibold text-text">누적 GPA: {gpa.toFixed(2)} / 4.30</p>
    </section>
  );
}
