import { CourseRecord } from "@/domain/models/CourseRecord";
import { Transcript } from "@/domain/models/Transcript";
import { AuTracker } from "@/domain/services/AuTracker";
import { HssDistributionChecker } from "@/domain/services/HssDistributionChecker";
import type {
  AnalysisResult,
  CategoryResult,
  CourseInfo,
  RequirementSet,
  Warning,
} from "@/domain/types";

function sumCredits(records: CourseRecord[]): number {
  return records.reduce((sum, record) => sum + record.credits, 0);
}

function categoryResult(
  category: string,
  creditsEarned: number,
  creditsRequired: number,
  missingCourses: CourseInfo[] = [],
): CategoryResult {
  const deficit = Math.max(creditsRequired - creditsEarned, 0);
  return {
    category,
    creditsEarned,
    creditsRequired,
    fulfilled: deficit === 0 && missingCourses.length === 0,
    missingCourses,
    details: deficit > 0 ? `${deficit}학점 부족` : "요건 충족",
  };
}

export class RequirementAnalyzer {
  static analyze(transcript: Transcript, requirementSet: RequirementSet): AnalysisResult {
    const earnedRecords = transcript.earnedRecords().filter((record) => record.credits > 0);
    const categories: CategoryResult[] = [];
    const warnings: Warning[] = [];

    const basicRequiredCredits = sumCredits(
      earnedRecords.filter((record) => record.category.value === "기초필수"),
    );
    categories.push(
      categoryResult("기초필수", basicRequiredCredits, requirementSet.common.기초필수.required),
    );

    const basicElectiveCredits = sumCredits(
      earnedRecords.filter((record) => record.category.value === "기초선택"),
    );
    categories.push(
      categoryResult("기초선택", basicElectiveCredits, requirementSet.common.기초선택.required),
    );

    const liberalArtsCredits = sumCredits(
      earnedRecords.filter((record) => record.category.value === "교양필수"),
    );
    const { auResult, convertedPeCredits } = AuTracker.track(
      transcript.auRecords(),
      requirementSet.auCategories,
      requirementSet.admissionYearRange[1] < 2023,
    );
    categories.push({
      category: "교양필수",
      creditsEarned: liberalArtsCredits,
      creditsRequired: requirementSet.common.교양필수.requiredCredits,
      fulfilled:
        liberalArtsCredits >= requirementSet.common.교양필수.requiredCredits &&
        auResult.fulfilled,
      missingCourses: [],
      details: `AU ${auResult.totalEarned}/${requirementSet.common.교양필수.requiredAU}`,
    });

    const hssRecords = earnedRecords.filter((record) => record.category.value.startsWith("인선_"));
    const hssResult = HssDistributionChecker.check(hssRecords, requirementSet.isDualMajor);
    categories.push({
      category: "인선",
      creditsEarned: hssResult.totalCredits,
      creditsRequired: requirementSet.common.인선.required,
      fulfilled: hssResult.fulfilled,
      missingCourses: [],
      details: hssResult.fulfilled
        ? "분포 충족"
        : `분포 미충족 (${hssResult.missingGyeyol.join(",") || "계열 수 부족"})`,
    });

    if (!hssResult.fulfilled) {
      warnings.push({
        type: "HSS_DISTRIBUTION_INCOMPLETE",
        message: "인문사회선택 계열 분포 요건이 충족되지 않았습니다.",
      });
    }

    const researchCredits = sumCredits(
      earnedRecords.filter((record) => record.category.value === "연구"),
    );
    categories.push(categoryResult("연구", researchCredits, requirementSet.common.연구.required));

    const majorTotalCredits = sumCredits(
      earnedRecords.filter(
        (record) => record.category.value === "전공필수" || record.category.value === "전공선택",
      ),
    );
    categories.push(categoryResult("전공합계", majorTotalCredits, 40));

    const totalCreditsEarned = sumCredits(earnedRecords) + convertedPeCredits;
    const totalCreditsRequired = requirementSet.totalCredits;
    const allFulfilled = categories.every((category) => category.fulfilled);

    let overallStatus: AnalysisResult["overallStatus"] = "behind";
    if (allFulfilled && totalCreditsEarned >= totalCreditsRequired) {
      overallStatus = "fulfilled";
    } else if (totalCreditsEarned >= totalCreditsRequired - 12) {
      overallStatus = "in_progress";
    }

    return {
      totalCreditsEarned,
      totalCreditsRequired,
      categories,
      warnings,
      overallStatus,
    };
  }
}
