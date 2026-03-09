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
  ProgramCreditRule,
  ProgramRequiredCourseGroup,
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

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function expandCodeVariants(code: string): string[] {
  const normalized = normalizeCode(code);
  const variants = [normalized];
  const dottedMatch = normalized.match(/^([A-Z]+)\.(\d+)$/);
  const undottedMatch = normalized.match(/^([A-Z]+)(\d{5})$/);

  if (dottedMatch) {
    variants.push(`${dottedMatch[1]}${dottedMatch[2]}`);
  }

  if (undottedMatch) {
    variants.push(`${undottedMatch[1]}.${undottedMatch[2]}`);
  }

  return [...new Set(variants)];
}

function recordCodes(record: CourseRecord): string[] {
  return [...new Set(expandCodeVariants(record.courseCode.oldCode).concat(record.courseCode.newCode ? expandCodeVariants(record.courseCode.newCode) : []))];
}

function matchesAnyCode(record: CourseRecord, acceptedCourseCodes: string[]): boolean {
  const accepted = new Set(acceptedCourseCodes.map(normalizeCode));
  return recordCodes(record).some((code) => accepted.has(code));
}

function toCourseInfo(record: CourseRecord): CourseInfo {
  return {
    code: record.courseCode.oldCode,
    nameKo: record.nameKo,
    credits: record.credits,
  };
}

function uniqueRecords(records: CourseRecord[]): CourseRecord[] {
  const seen = new Set<string>();
  const result: CourseRecord[] = [];

  for (const record of records) {
    const key = `${record.semester.toString()}::${record.courseCode.oldCode}::${record.section}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(record);
    }
  }

  return result;
}

function analyzeRequiredCourseGroup(earnedRecords: CourseRecord[], group: ProgramRequiredCourseGroup) {
  const matchedRecords = uniqueRecords(earnedRecords.filter((record) => matchesAnyCode(record, group.acceptedCourseCodes)));

  return {
    id: group.id,
    label: group.label,
    satisfied: matchedRecords.length >= group.requiredCount,
    acceptedCourseCodes: [...group.acceptedCourseCodes],
    matchedCourses: matchedRecords.map(toCourseInfo),
    matchedCount: matchedRecords.length,
    requiredCount: group.requiredCount,
    detail:
      matchedRecords.length >= group.requiredCount
        ? `${matchedRecords.length}/${group.requiredCount} 충족`
        : `${group.requiredCount - matchedRecords.length}과목 부족`,
  };
}

function ruleRecords(earnedRecords: CourseRecord[], rule: ProgramCreditRule): CourseRecord[] {
  return uniqueRecords(
    earnedRecords.filter((record) => {
      const category = record.category.value as "전공필수" | "전공선택" | "연구";
      if (!rule.allowedCategories.includes(category)) {
        return false;
      }

      if (rule.minimumCourseCredits !== undefined && record.credits < rule.minimumCourseCredits) {
        return false;
      }

      if ((rule.eligibleCourseCodes?.length ?? 0) > 0 && matchesAnyCode(record, rule.eligibleCourseCodes ?? [])) {
        return true;
      }

      return (rule.eligiblePrefixes ?? []).includes(record.courseCode.departmentPrefix);
    }),
  );
}

function analyzeCreditRule(earnedRecords: CourseRecord[], rule: ProgramCreditRule): ProgramBucketResult {
  const matchedRecords = ruleRecords(earnedRecords, rule);
  const earnedCredits = sumCredits(matchedRecords);
  const matchedCourseCount = matchedRecords.length;
  const requiredCredits = rule.requiredCredits ?? 0;
  const fulfilled =
    rule.requiredCourseCount !== undefined
      ? matchedCourseCount >= rule.requiredCourseCount
      : earnedCredits >= requiredCredits;

  let detail = "요건 충족";
  if (!fulfilled) {
    detail =
      rule.requiredCourseCount !== undefined
        ? `${rule.requiredCourseCount - matchedCourseCount}과목 부족`
        : `${requiredCredits - earnedCredits}학점 부족`;
  }

  return {
    id: rule.id,
    label: rule.label,
    earnedCredits,
    requiredCredits,
    matchedCourseCount,
    requiredCourseCount: rule.requiredCourseCount,
    fulfilled,
    matchedCourses: matchedRecords.map(toCourseInfo),
    detail,
  };
}

function countBasisCourses(earnedRecords: CourseRecord[], courseCodes: string[]): ProgramBucketResult {
  const matchedRecords = uniqueRecords(
    earnedRecords.filter((record) => record.category.value === "전공선택" && matchesAnyCode(record, courseCodes)),
  );
  return {
    id: "basis-all",
    label: "기반과목 전체 이수",
    earnedCredits: sumCredits(matchedRecords),
    requiredCredits: 0,
    matchedCourseCount: matchedRecords.length,
    requiredCourseCount: 0,
    fulfilled: false,
    matchedCourses: matchedRecords.map(toCourseInfo),
    detail: `${matchedRecords.length}과목 이수`,
  };
}

function analyzeAdvancedMajor(
  earnedRecords: CourseRecord[],
  requirement: DepartmentProgramRequirement,
  creditBuckets: ProgramBucketResult[],
): ProgramBucketResult | null {
  if (!requirement.advancedMajor) {
    return null;
  }

  const electiveRule = creditBuckets.find((bucket) => bucket.id === "major-elective");
  if (!electiveRule) {
    return null;
  }

  if (requirement.advancedMajor.type === "subset_of_전선") {
    const matchedRecords = uniqueRecords(
      earnedRecords.filter((record) => {
        if (record.category.value !== "전공선택") {
          return false;
        }

        if ((requirement.advancedMajor?.eligibleCourseCodes?.length ?? 0) > 0) {
          return matchesAnyCode(record, requirement.advancedMajor?.eligibleCourseCodes ?? []);
        }

        return (
          record.courseCode.departmentPrefix === requirement.department &&
          record.credits >= (requirement.advancedMajor?.minimumCourseCredits ?? 0)
        );
      }),
    );

    const earnedCredits = sumCredits(matchedRecords);
    return {
      id: "advanced-major",
      label: "심화전공",
      earnedCredits,
      requiredCredits: requirement.advancedMajor.requiredCredits,
      matchedCourseCount: matchedRecords.length,
      fulfilled: earnedCredits >= requirement.advancedMajor.requiredCredits,
      matchedCourses: matchedRecords.map(toCourseInfo),
      detail:
        earnedCredits >= requirement.advancedMajor.requiredCredits
          ? "요건 충족"
          : `${requirement.advancedMajor.requiredCredits - earnedCredits}학점 부족`,
    };
  }

  const earnedCredits = Math.max(0, electiveRule.earnedCredits - electiveRule.requiredCredits);
  let fulfilled = earnedCredits >= requirement.advancedMajor.requiredCredits;
  let detail =
    fulfilled ? "요건 충족" : `${requirement.advancedMajor.requiredCredits - earnedCredits}학점 부족`;

  if (requirement.advancedMajor.basisCourseRequirement) {
    const basisRecords = uniqueRecords(
      earnedRecords.filter(
        (record) =>
          record.category.value === "전공선택" &&
          matchesAnyCode(record, requirement.advancedMajor?.basisCourseRequirement?.courseCodes ?? []),
      ),
    );
    const basisCount = basisRecords.length;
    if (basisCount < requirement.advancedMajor.basisCourseRequirement.required) {
      fulfilled = false;
      detail = `기반과목 ${basisCount}/${requirement.advancedMajor.basisCourseRequirement.total}`;
    }
  }

  return {
    id: "advanced-major",
    label: "심화전공",
    earnedCredits,
    requiredCredits: requirement.advancedMajor.requiredCredits,
    matchedCourseCount: 0,
    fulfilled,
    matchedCourses: [],
    detail,
  };
}

function analyzeSupportedProgram(
  earnedRecords: CourseRecord[],
  requirement: DepartmentProgramRequirement,
): {
  analysis: ProgramAnalysisResult;
  warnings: Warning[];
} {
  const warnings: Warning[] = [];
  const requiredCourses = requirement.requiredCourses.map((group) => analyzeRequiredCourseGroup(earnedRecords, group));
  const creditBuckets = requirement.creditRules.map((rule) => analyzeCreditRule(earnedRecords, rule));
  const advancedMajor = analyzeAdvancedMajor(earnedRecords, requirement, creditBuckets);

  if (advancedMajor) {
    creditBuckets.push(advancedMajor);
  }

  if (requirement.advancedMajor?.basisCourseRequirement) {
    const basisCount = countBasisCourses(earnedRecords, requirement.advancedMajor.basisCourseRequirement.courseCodes);
    if (requirement.advancedMajor.type === "additional") {
      basisCount.label = `기반과목 ${basisCount.matchedCourseCount}/${requirement.advancedMajor.basisCourseRequirement.total}`;
      basisCount.requiredCourseCount = requirement.advancedMajor.basisCourseRequirement.required;
      basisCount.fulfilled = basisCount.matchedCourseCount >= requirement.advancedMajor.basisCourseRequirement.required;
      basisCount.detail = basisCount.fulfilled ? "요건 충족" : `${requirement.advancedMajor.basisCourseRequirement.required - basisCount.matchedCourseCount}과목 부족`;
      const existing = creditBuckets.find((bucket) => bucket.id === "basis-minimum");
      if (!existing) {
        creditBuckets.push(basisCount);
      }
    }
  }

  const capstoneBucket = creditBuckets.find((bucket) => bucket.id === "capstone-team-project");
  if (capstoneBucket && !capstoneBucket.fulfilled) {
    warnings.push({
      type: "PROGRAM_MANUAL_REVIEW",
      message: `${requirement.displayName}: 캡스톤 팀 프로젝트 이수 여부를 확인하세요.`,
    });
  }

  if (requirement.department === "CS" && requirement.admissionYearRange[0] <= 2021 && requirement.admissionYearRange[1] >= 2021) {
    warnings.push({
      type: "PROGRAM_MANUAL_REVIEW",
      message: `${requirement.displayName}: URP495 및 IS500 계열 전선 인정은 수동 검토가 필요합니다.`,
    });
  }

  const majorRule = creditBuckets.find((bucket) => bucket.id === "major-total") ?? creditBuckets[0];
  const eligibleMajorCredits = majorRule?.earnedCredits ?? 0;
  const requiredMajorCredits = majorRule?.requiredCredits ?? 0;

  return {
    analysis: {
      displayName: requirement.displayName,
      supportStatus: requirement.supportStatus,
      requiredCourses,
      creditBuckets,
      eligibleMajorCredits,
      requiredMajorCredits,
      manualReviewNotices: [...requirement.knownLimitations],
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

    const basicRequiredCredits = sumCredits(earnedRecords.filter((record) => record.category.value === "기초필수"));
    categories.push(categoryResult("기초필수", basicRequiredCredits, requirementSet.common.기초필수.required));

    const basicElectiveCredits = sumCredits(earnedRecords.filter((record) => record.category.value === "기초선택"));
    categories.push(categoryResult("기초선택", basicElectiveCredits, requirementSet.common.기초선택.required));

    const liberalArtsCredits = sumCredits(earnedRecords.filter((record) => record.category.value === "교양필수"));
    const { auResult, convertedPeCredits } = AuTracker.track(
      transcript.auRecords(),
      requirementSet.auCategories,
      requirementSet.admissionYearRange[1] < 2023,
    );
    categories.push({
      category: "교양필수",
      creditsEarned: liberalArtsCredits,
      creditsRequired: requirementSet.common.교양필수.requiredCredits,
      fulfilled: liberalArtsCredits >= requirementSet.common.교양필수.requiredCredits && auResult.fulfilled,
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
      details: hssResult.fulfilled ? "분포 충족" : `분포 미충족 (${hssResult.missingGyeyol.join(",") || "계열 수 부족"})`,
    });

    if (!hssResult.fulfilled) {
      warnings.push({
        type: "HSS_DISTRIBUTION_INCOMPLETE",
        message: "인문사회선택 계열 분포 요건이 충족되지 않았습니다.",
      });
    }

    const researchCredits = sumCredits(earnedRecords.filter((record) => record.category.value === "연구"));
    categories.push(categoryResult("연구", researchCredits, requirementSet.common.연구.required));

    let programAnalysis: ProgramAnalysisResult | null = null;
    let secondaryProgramAnalysis: ProgramAnalysisResult | null = null;

    if (requirementSet.programSupport?.status === "supported" && requirementSet.departmentRequirement) {
      const result = analyzeSupportedProgram(earnedRecords, requirementSet.departmentRequirement);
      programAnalysis = result.analysis;
      warnings.push(...result.warnings);

      if (requirementSet.secondaryProgramSupport?.status !== "supported") {
        categories.push({
          category: "전공합계",
          creditsEarned: result.analysis.eligibleMajorCredits,
          creditsRequired: result.analysis.requiredMajorCredits,
          fulfilled: result.analysis.eligibleMajorCredits >= result.analysis.requiredMajorCredits,
          missingCourses: [],
          details: `${result.analysis.displayName} 기준`,
        });
      }
    }

    if (requirementSet.secondaryProgramSupport?.status === "supported" && requirementSet.secondaryDepartmentRequirement) {
      const result = analyzeSupportedProgram(earnedRecords, requirementSet.secondaryDepartmentRequirement);
      secondaryProgramAnalysis = result.analysis;
      warnings.push(...result.warnings);
    }

    if (requirementSet.selectedProgram?.track === "자유융합전공") {
      const majorRecords = earnedRecords.filter((record) => record.category.value === "전공필수" || record.category.value === "전공선택");
      const majorTotalCredits = sumCredits(majorRecords);
      const distinctDepts = new Set(majorRecords.map((record) => record.courseCode.departmentPrefix));
      const deptCount = distinctDepts.size;
      const fulfilled = majorTotalCredits >= 12 && deptCount >= 2;

      categories.push({
        category: "전공합계",
        creditsEarned: majorTotalCredits,
        creditsRequired: 12,
        fulfilled,
        missingCourses: [],
        details: fulfilled ? `${deptCount}개 학과 · 요건 충족` : deptCount < 2 ? `${deptCount}개 학과 — 2개 이상 필요` : `${12 - majorTotalCredits}학점 부족`,
      });
    } else if (programAnalysis === null) {
      const majorTotalCredits = sumCredits(earnedRecords.filter((record) => record.category.value === "전공필수" || record.category.value === "전공선택"));
      categories.push(categoryResult("전공합계", majorTotalCredits, 40, []));
    }

    const totalCreditsEarned = sumCredits(earnedRecords) + convertedPeCredits;
    const totalCreditsRequired = requirementSet.totalCredits;
    const primaryProgramFulfilled =
      programAnalysis === null ||
      (programAnalysis.requiredCourses.every((course) => course.satisfied) && programAnalysis.creditBuckets.every((bucket) => bucket.fulfilled));
    const secondaryProgramFulfilled =
      secondaryProgramAnalysis === null ||
      (secondaryProgramAnalysis.requiredCourses.every((course) => course.satisfied) && secondaryProgramAnalysis.creditBuckets.every((bucket) => bucket.fulfilled));
    const allFulfilled = categories.every((category) => category.fulfilled) && primaryProgramFulfilled && secondaryProgramFulfilled;

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
      secondaryProgramSupport: requirementSet.secondaryProgramSupport,
      secondaryProgramAnalysis,
    };
  }
}
