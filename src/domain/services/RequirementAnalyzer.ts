import { CourseRecord } from "@/domain/models/CourseRecord";
import { Transcript } from "@/domain/models/Transcript";
import { AuTracker } from "@/domain/services/AuTracker";
import { HssDistributionChecker } from "@/domain/services/HssDistributionChecker";
import type {
  AnalysisResult,
  CategoryResult,
  CourseInfo,
  DepartmentProgramRequirement,
  ProgramAnalysisResult,
  ProgramBucketResult,
  ProgramRequiredCourseResult,
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

function toCourseInfo(record: CourseRecord): CourseInfo {
  return {
    code: record.courseCode.oldCode,
    nameKo: record.nameKo,
    credits: record.credits,
  };
}

function recordKey(record: CourseRecord): string {
  return [record.semester.toString(), record.courseCode.oldCode, record.section].join("::");
}

function analyzeSupportedProgram(
  earnedRecords: CourseRecord[],
  requirement: DepartmentProgramRequirement,
): {
  analysis: ProgramAnalysisResult;
  warnings: Warning[];
} {
  const warnings: Warning[] = [];
  const manualReviewNotices = new Set<string>();
  const countedRecordKeys = new Set<string>();
  const countedRecords: CourseRecord[] = [];

  const requiredCourses: ProgramRequiredCourseResult[] = requirement.requiredCourseSlots.map((slot) => {
    const matchedRecord = earnedRecords.find((record) => slot.acceptedCourseCodes.includes(record.courseCode.oldCode));

    return {
      id: slot.id,
      label: slot.label,
      satisfied: matchedRecord !== undefined,
      acceptedCourseCodes: [...slot.acceptedCourseCodes],
      matchedCourse: matchedRecord ? toCourseInfo(matchedRecord) : undefined,
      detail: matchedRecord
        ? `${matchedRecord.courseCode.oldCode} ${matchedRecord.nameKo || slot.label} 이수`
        : `인정 코드: ${slot.acceptedCourseCodes.join(", ")}`,
    };
  });

  const creditBuckets: ProgramBucketResult[] = requirement.creditBuckets.map((bucket) => {
    const bucketEquivalencies = requirement.equivalencies.filter((equivalency) => equivalency.slotId === bucket.id);
    const manualReviewOnlyReason = bucket.manualReviewOnlyReason;
    const matchedCourseMap = new Map<string, CourseInfo>();
    let earnedCredits = 0;

    for (const record of earnedRecords) {
      const code = record.courseCode.oldCode;
      const isAllowedCategory =
        bucket.allowedCategories.length === 0 ||
        bucket.allowedCategories.includes(record.category.value as "전공필수" | "전공선택");

      if (!isAllowedCategory || bucket.excludedCourseCodes.includes(code)) {
        continue;
      }

      const matchesExplicitCode = bucket.eligibleCourseCodes.includes(code);
      const matchesEquivalency = bucketEquivalencies.some((equivalency) => equivalency.equivalentCodes.includes(code));
      const matchesPrefixRule =
        bucket.eligiblePrefixes.includes(record.courseCode.departmentPrefix) &&
        record.courseCode.numericPart >= bucket.minimumLevel;

      if (!matchesExplicitCode && !matchesEquivalency && !matchesPrefixRule && !bucket.manualReviewOnlyCourseCodes.includes(code)) {
        continue;
      }

      if (bucket.manualReviewOnlyCourseCodes.includes(code)) {
        const notice = `${requirement.displayName}: ${code} ${record.nameKo}은(는) 조건부/특강 과목이라 자동 집계하지 않았습니다.`;
        if (!manualReviewNotices.has(notice)) {
          manualReviewNotices.add(notice);
          warnings.push({
            type: "PROGRAM_MANUAL_REVIEW",
            message: notice,
            courseCode: code,
          });
        }
        continue;
      }

      if (!matchedCourseMap.has(code)) {
        matchedCourseMap.set(code, toCourseInfo(record));
        earnedCredits += record.credits;
      }

      if (manualReviewOnlyReason) {
        continue;
      }

      const key = recordKey(record);
      if (!countedRecordKeys.has(key)) {
        countedRecordKeys.add(key);
        countedRecords.push(record);
      }
    }

    const matchedCourses = [...matchedCourseMap.values()];
    const matchedCourseCount = matchedCourses.length;
    const usesCourseCount = bucket.requiredCourseCount !== undefined;
    const requiredCourseCount = bucket.requiredCourseCount ?? 0;
    let fulfilled = usesCourseCount
      ? matchedCourseCount >= requiredCourseCount
      : earnedCredits >= bucket.requiredCredits;
    let detail = usesCourseCount
      ? fulfilled
        ? "요건 충족"
        : `${requiredCourseCount - matchedCourseCount}과목 부족`
      : fulfilled
        ? "요건 충족"
        : `${bucket.requiredCredits - earnedCredits}학점 부족`;

    if (manualReviewOnlyReason) {
      fulfilled = false;
      detail = matchedCourseCount > 0 ? "수동 검토 필요" : manualReviewOnlyReason;

      if (matchedCourseCount > 0) {
        const notice = `${requirement.displayName}: ${bucket.label}은(는) ${manualReviewOnlyReason}`;
        if (!manualReviewNotices.has(notice)) {
          manualReviewNotices.add(notice);
          warnings.push({
            type: "PROGRAM_MANUAL_REVIEW",
            message: notice,
          });
        }
      }
    }

    return {
      id: bucket.id,
      label: bucket.label,
      earnedCredits,
      requiredCredits: bucket.requiredCredits,
      matchedCourseCount,
      requiredCourseCount: usesCourseCount ? requiredCourseCount : undefined,
      fulfilled,
      matchedCourses,
      detail,
    };
  });

  const eligibleMajorCredits = countedRecords.reduce((sum, record) => sum + record.credits, 0);
  const requiredMajorCredits = Math.max(0, ...requirement.creditBuckets.map((bucket) => bucket.requiredCredits));

  return {
    analysis: {
      displayName: requirement.displayName,
      supportStatus: requirement.supportStatus,
      requiredCourses,
      creditBuckets,
      eligibleMajorCredits,
      requiredMajorCredits,
      manualReviewNotices: [...manualReviewNotices],
      knownLimitations: requirement.knownLimitations,
    },
    warnings,
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

    let programAnalysis: ProgramAnalysisResult | null = null;

    if (requirementSet.programSupport?.status === "supported" && requirementSet.departmentRequirement) {
      const programResult = analyzeSupportedProgram(earnedRecords, requirementSet.departmentRequirement);
      programAnalysis = programResult.analysis;
      warnings.push(...programResult.warnings);
      categories.push({
        category: "전공합계",
        creditsEarned: programResult.analysis.eligibleMajorCredits,
        creditsRequired: programResult.analysis.requiredMajorCredits,
        fulfilled: programResult.analysis.eligibleMajorCredits >= programResult.analysis.requiredMajorCredits,
        missingCourses: [],
        details: `${programResult.analysis.displayName} 기준`,
      });
    } else {
      if (requirementSet.programSupport?.status === "partial") {
        warnings.push({
          type: "PROGRAM_PARTIAL_SUPPORT",
          message: `${requirementSet.programSupport.title}: 일부 규칙만 정규화되어 있어 공통 분석으로 안내합니다.`,
        });
      }

      const majorTotalCredits = sumCredits(
        earnedRecords.filter(
          (record) => record.category.value === "전공필수" || record.category.value === "전공선택",
        ),
      );
      categories.push(
        categoryResult(
          "전공합계",
          majorTotalCredits,
          40,
          [],
        ),
      );
    }

    const totalCreditsEarned = sumCredits(earnedRecords) + convertedPeCredits;
    const totalCreditsRequired = requirementSet.totalCredits;
    const supportedProgramFulfilled =
      programAnalysis === null ||
      (programAnalysis.requiredCourses.every((course) => course.satisfied) &&
        programAnalysis.creditBuckets.every((bucket) => bucket.fulfilled));
    const allFulfilled = categories.every((category) => category.fulfilled) && supportedProgramFulfilled;

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
      programSupport: requirementSet.programSupport,
      programAnalysis,
    };
  }
}
