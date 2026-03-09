import { CategoryCard } from "@/app/components/dashboard/CategoryCard";
import { HssDistribution } from "@/app/components/dashboard/HssDistribution";
import type { AnalysisResult, AuResult, CategoryResult, HssResult } from "@/domain/types";

interface CategoryGridProps {
  categories: AnalysisResult["categories"];
  auResult: AuResult;
  hssResult: HssResult;
  totalCreditsEarned: number;
  totalCreditsRequired: number;
}

function findCategory(categories: CategoryResult[], key: string): CategoryResult | undefined {
  return categories.find((category) => category.category === key);
}

export function CategoryGrid({
  categories,
  auResult,
  hssResult,
  totalCreditsEarned,
  totalCreditsRequired,
}: CategoryGridProps) {
  const basicRequired = findCategory(categories, "기초필수");
  const basicElective = findCategory(categories, "기초선택");
  const liberalArts = findCategory(categories, "교양필수");
  const hss = findCategory(categories, "인선");
  const research = findCategory(categories, "연구");
  const majorTotal = findCategory(categories, "전공합계");

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {basicRequired ? (
        <CategoryCard
          title="기초필수"
          earned={basicRequired.creditsEarned}
          required={basicRequired.creditsRequired}
          fulfilled={basicRequired.fulfilled}
          details={basicRequired.details}
        />
      ) : null}

      {basicElective ? (
        <CategoryCard
          title="기초선택"
          earned={basicElective.creditsEarned}
          required={basicElective.creditsRequired}
          fulfilled={basicElective.fulfilled}
          details={basicElective.details}
        />
      ) : null}

      {liberalArts ? (
        <CategoryCard
          title="교양필수"
          earned={liberalArts.creditsEarned}
          required={liberalArts.creditsRequired}
          fulfilled={liberalArts.fulfilled}
          details={`학점 ${liberalArts.creditsEarned}/${liberalArts.creditsRequired} | AU ${auResult.totalEarned}/${auResult.totalRequired}`}
        >
          <div className="grid grid-cols-3 gap-1 text-[11px] text-text-muted">
            <span>
              인성 {auResult.categories["인성/리더십"].earned}/
              {auResult.categories["인성/리더십"].required}
            </span>
            <span>
              즐대생 {auResult.categories.즐거운.earned}/{auResult.categories.즐거운.required}
            </span>
            <span>
              신대생 {auResult.categories.신나는.earned}/{auResult.categories.신나는.required}
            </span>
          </div>
        </CategoryCard>
      ) : null}

      {hss ? (
        <CategoryCard
          title="인선"
          earned={hss.creditsEarned}
          required={hss.creditsRequired}
          fulfilled={hss.fulfilled}
          details={hss.details}
        >
          <HssDistribution hssResult={hssResult} />
        </CategoryCard>
      ) : null}

      {research ? (
        <CategoryCard
          title="연구"
          earned={research.creditsEarned}
          required={research.creditsRequired}
          fulfilled={research.fulfilled}
          details={research.details}
        />
      ) : null}

      {majorTotal ? (
        <CategoryCard
          title="전공합계"
          earned={majorTotal.creditsEarned}
          required={majorTotal.creditsRequired}
          fulfilled={majorTotal.fulfilled}
          details={majorTotal.details}
        />
      ) : null}

      <CategoryCard
        title="총계"
        earned={totalCreditsEarned}
        required={totalCreditsRequired}
        fulfilled={totalCreditsEarned >= totalCreditsRequired}
        details={
          totalCreditsEarned >= totalCreditsRequired
            ? "총학점 요건 충족"
            : `${totalCreditsRequired - totalCreditsEarned}학점 부족`
        }
      />
    </section>
  );
}
