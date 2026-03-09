import { CategoryCard } from "@/app/components/dashboard/CategoryCard";
import { Badge } from "@/app/components/shared/Badge";
import type { ProgramAnalysisResult, ProgramSupportInfo } from "@/domain/types";

interface ProgramRequirementSectionProps {
  support: ProgramSupportInfo | undefined;
  analysis: ProgramAnalysisResult | null | undefined;
}

function badgeVariant(status: ProgramSupportInfo["status"]): "supported" | "partial" | "neutral" | "danger" {
  if (status === "supported") {
    return "supported";
  }

  if (status === "partial") {
    return "partial";
  }

  if (status === "common-only") {
    return "neutral";
  }

  return "danger";
}

export function ProgramRequirementSection({ support, analysis }: ProgramRequirementSectionProps) {
  if (!support) {
    return null;
  }

  if (!analysis) {
    return (
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">학과별 전공 분석 상태</h2>
            <p className="mt-1 text-xs text-text-muted">{support.message}</p>
          </div>
          <Badge variant={badgeVariant(support.status)}>{support.title}</Badge>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-surface-soft p-3 text-xs text-text-muted">
          이 학과는 아직 전공 규칙이 정리되지 않아 세부 분석을 제공하지 못합니다.
          해당 학과 학사팀 또는 포털에서 직접 확인하세요.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">학과별 전공 분석 상태</h2>
          <p className="mt-1 text-xs text-text-muted">{support.message}</p>
        </div>
        <Badge variant={badgeVariant(support.status)}>{support.title}</Badge>
      </div>

      {null}

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text">필수 과목 체크리스트</h3>
              <span className="text-xs text-text-muted">{analysis.displayName}</span>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-text">
              {analysis.requiredCourses.map((course) => (
                <li key={course.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text">{course.label}</p>
                      <p className="mt-1 text-[11px] text-text-muted">{course.detail}</p>
                    </div>
                    <Badge variant={course.satisfied ? "supported" : "danger"}>
                      {course.satisfied ? "이수" : "미이수"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {analysis.creditBuckets.map((bucket) => {
              const usesCourseCount = bucket.requiredCourseCount !== undefined;

              return (
                <CategoryCard
                  key={bucket.id}
                  title={bucket.label}
                  earned={usesCourseCount ? bucket.matchedCourseCount : bucket.earnedCredits}
                  required={usesCourseCount ? bucket.requiredCourseCount ?? 0 : bucket.requiredCredits}
                  fulfilled={bucket.fulfilled}
                  details={bucket.detail}
                >
                  <p className="text-[11px] text-text-muted">
                    인정 과목 {bucket.matchedCourseCount}개 · 총 {bucket.earnedCredits}학점
                  </p>
                </CategoryCard>
              );
            })}
          </div>
        </div>

        {analysis.manualReviewNotices.length > 0 || analysis.knownLimitations.length > 0 ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
            <h3 className="text-sm font-semibold text-warning">수동 검토 / 제한사항</h3>
            <ul className="mt-2 space-y-1 text-xs text-text">
              {analysis.manualReviewNotices.map((notice) => (
                <li key={notice}>• {notice}</li>
              ))}
              {analysis.knownLimitations.map((notice) => (
                <li key={notice}>• {notice}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
