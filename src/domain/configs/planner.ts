import courseCatalogData from "@/domain/generated/course-catalog.generated.json";
import programRequirementsData from "@/domain/generated/program-requirements.generated.json";
import supportManifestData from "@/domain/generated/support-manifest.generated.json";
import type {
  CourseCatalogEntry,
  DepartmentProgramRequirement,
  DepartmentSelection,
  PlannerSelection,
  ProgramSupportInfo,
  RequirementSet,
  SupportManifestEntry,
  SupportedDepartment,
  SupportedProgramType,
  TrackType,
} from "@/domain/types";

import { applyTrackModification, getRequirements } from "@/domain/configs/requirements";

const SUPPORTED_DEPARTMENTS: SupportedDepartment[] = ["AE", "ME", "CS", "EE"];
const SUPPORTED_PROGRAM_TYPES: SupportedProgramType[] = ["심화전공", "복수전공", "부전공"];

const DEPARTMENT_LABELS: Record<DepartmentSelection, string> = {
  AE: "항공우주공학과 (AE)",
  ME: "기계공학과 (ME)",
  CS: "전산학부 (CS)",
  EE: "전기및전자공학부 (EE)",
  OTHER: "기타 / 미지원 학과",
};

const courseCatalog = courseCatalogData.courses as unknown as CourseCatalogEntry[];
const departmentRequirements = programRequirementsData.programs as unknown as DepartmentProgramRequirement[];
const supportManifest = supportManifestData.entries as unknown as SupportManifestEntry[];

function isSupportedProgramType(track: TrackType): track is SupportedProgramType {
  return SUPPORTED_PROGRAM_TYPES.some((programType) => programType === track);
}

function isSupportedDepartment(department: DepartmentSelection): department is SupportedDepartment {
  return SUPPORTED_DEPARTMENTS.includes(department as SupportedDepartment);
}

function coversYear(range: [number, number], year: number): boolean {
  return year >= range[0] && year <= range[1];
}

function getSupportManifestEntry(selection: PlannerSelection): SupportManifestEntry | null {
  if (!isSupportedDepartment(selection.department) || !isSupportedProgramType(selection.track)) {
    return null;
  }

  const track = selection.track;

  return (
    supportManifest.find(
      (entry) =>
        entry.department === selection.department &&
        coversYear(entry.admissionYearRange, selection.admissionYear) &&
        entry.supportedProgramTypes.includes(track),
    ) ?? null
  );
}

function getDepartmentRequirement(selection: PlannerSelection): DepartmentProgramRequirement | null {
  if (!isSupportedDepartment(selection.department) || !isSupportedProgramType(selection.track)) {
    return null;
  }

  return (
    departmentRequirements.find(
      (requirement) =>
        requirement.department === selection.department &&
        requirement.programType === selection.track &&
        coversYear(requirement.admissionYearRange, selection.admissionYear),
    ) ?? null
  );
}

export function getDepartmentLabel(department: DepartmentSelection): string {
  return DEPARTMENT_LABELS[department];
}

export function getSupportedDepartments(): Array<{ value: DepartmentSelection; label: string; supported: boolean }> {
  const departmentAwareDepartments = new Set(
    supportManifest.filter((entry) => entry.supportStatus === "supported" || entry.supportStatus === "partial").map((entry) => entry.department),
  );

  return [
    ...SUPPORTED_DEPARTMENTS.map((department) => ({
      value: department,
      label: DEPARTMENT_LABELS[department],
      supported: departmentAwareDepartments.has(department),
    })),
    { value: "OTHER" as const, label: DEPARTMENT_LABELS.OTHER, supported: false },
  ];
}

export function getProgramSupport(selection: PlannerSelection): ProgramSupportInfo {
  if (!isSupportedDepartment(selection.department)) {
    return {
      selection,
      status: "common-only",
      title: `${getDepartmentLabel(selection.department)} 공통 분석`,
      message: "선택한 학과는 아직 전공 규칙이 정리되지 않아 공통 요건만 분석합니다.",
      knownLimitations: [],
      datasetVersion: supportManifestData.datasetVersion,
      lastGeneratedAt: supportManifestData.generatedAt,
      sourceRefs: [],
    };
  }

  if (!isSupportedProgramType(selection.track)) {
    return {
      selection,
      status: "common-only",
      title: `${getDepartmentLabel(selection.department)} ${selection.track}`,
      message: "자유융합전공은 2개 이상 학사조직에서 12학점 이상 전공과목을 이수해야 합니다. 공통 요건과 전공학점/학과 분포를 함께 확인합니다.",
      knownLimitations: [],
      datasetVersion: supportManifestData.datasetVersion,
      lastGeneratedAt: supportManifestData.generatedAt,
      sourceRefs: [],
    };
  }

  const supportEntry = getSupportManifestEntry(selection);
  if (!supportEntry) {
    return {
      selection,
      status: "common-only",
      title: `${getDepartmentLabel(selection.department)} ${selection.track} 공통 분석`,
      message: "선택한 조합은 아직 전공 규칙이 정리되지 않아 공통 요건만 분석합니다.",
      knownLimitations: [],
      datasetVersion: supportManifestData.datasetVersion,
      lastGeneratedAt: supportManifestData.generatedAt,
      sourceRefs: [],
    };
  }

  const displayName = `${getDepartmentLabel(selection.department)} ${selection.track}`;
  return {
    selection,
    status: supportEntry.supportStatus,
    title:
      supportEntry.supportStatus === "supported"
        ? `${displayName} 지원`
        : supportEntry.supportStatus === "partial"
          ? `${displayName} 부분 지원`
          : `${displayName} 공통 분석`,
    message:
      supportEntry.supportStatus === "supported"
        ? "학사요람 기반으로 학과 전공 필수과목과 전공학점을 함께 분석합니다."
        : supportEntry.supportStatus === "partial"
          ? "일부 전공 규칙만 확인 가능합니다. 수동 검토가 필요한 항목은 별도로 표시됩니다."
          : "아직 학과 전공 규칙이 정리되지 않아 공통 요건만 분석합니다.",
    knownLimitations: supportEntry.knownLimitations,
    datasetVersion: supportManifestData.datasetVersion,
    lastGeneratedAt: supportManifestData.generatedAt,
    sourceRefs: supportEntry.sourceRefs,
  };
}

export function buildPlannerRequirementSet(selection: PlannerSelection): RequirementSet {
  const base = applyTrackModification(getRequirements(selection.admissionYear), selection.track);
  const programSupport = getProgramSupport(selection);
  const departmentRequirement = programSupport.status === "supported" ? getDepartmentRequirement(selection) : null;

  return {
    ...base,
    selectedProgram: selection,
    programSupport,
    departmentRequirement,
  };
}

export function validateGeneratedPlannerData(): string[] {
  const issues: string[] = [];
  const catalogCodes = new Set<string>();
  const aliasToCanonical = new Map<string, string>();
  const courseCodePattern = /^[A-Z]+(?:\.\d+|\d+)$/;
  const hasRecognizableCourseCode = (code: string) =>
    catalogCodes.has(code) || aliasToCanonical.has(code) || courseCodePattern.test(code);

  for (const course of courseCatalog) {
    if (catalogCodes.has(course.canonicalCode)) {
      issues.push(`Duplicate canonical course identifier: ${course.canonicalCode}`);
    }
    catalogCodes.add(course.canonicalCode);

    for (const alias of course.aliases) {
      const existing = aliasToCanonical.get(alias);
      if (existing && existing !== course.canonicalCode) {
        issues.push(`Conflicting alias/equivalency mapping: ${alias} -> ${existing}, ${course.canonicalCode}`);
      }
      aliasToCanonical.set(alias, course.canonicalCode);
    }
  }

  const equivalencyMap = new Map<string, string>();

  for (const requirement of departmentRequirements) {
    if (!SUPPORTED_DEPARTMENTS.includes(requirement.department)) {
      issues.push(`Unsupported department marked as supported: ${requirement.department}`);
    }
    if (!SUPPORTED_PROGRAM_TYPES.includes(requirement.programType)) {
      issues.push(`Unsupported program type marked as supported: ${requirement.department} ${requirement.programType}`);
    }
    if (requirement.admissionYearRange[0] < 2019 || requirement.admissionYearRange[1] > 2025) {
      issues.push(
        `Unsupported year/program combination accidentally marked as supported: ${requirement.department} ${requirement.programType}`,
      );
    }

    const slotUsage = new Map<string, string>();
    for (const slot of requirement.requiredCourseSlots) {
      if (!hasRecognizableCourseCode(slot.canonicalCode)) {
        issues.push(`Missing referenced course in requirement configs: ${requirement.displayName} -> ${slot.canonicalCode}`);
      }

      for (const code of slot.acceptedCourseCodes) {
        if (!hasRecognizableCourseCode(code)) {
          issues.push(`Missing referenced course in requirement configs: ${requirement.displayName} -> ${code}`);
        }

        const existingSlot = slotUsage.get(code);
        if (existingSlot && existingSlot !== slot.id) {
          issues.push(
            `Overlapping required-course slots that cannot be disambiguated: ${requirement.displayName} -> ${existingSlot}/${slot.id} (${code})`,
          );
        }
        slotUsage.set(code, slot.id);
      }
    }

    for (const equivalency of requirement.equivalencies) {
      for (const code of equivalency.equivalentCodes) {
        const existing = equivalencyMap.get(code);
        if (existing && existing !== equivalency.canonicalCode) {
          issues.push(`Conflicting aliases/equivalencies: ${code} -> ${existing}, ${equivalency.canonicalCode}`);
        }
        equivalencyMap.set(code, equivalency.canonicalCode);
      }
    }

    for (const bucket of requirement.creditBuckets) {
      if (bucket.requiredCredits <= 0 && (bucket.requiredCourseCount ?? 0) <= 0) {
        issues.push(`Program bucket must define requiredCredits or requiredCourseCount: ${requirement.displayName} -> ${bucket.id}`);
      }

      for (const code of [
        ...bucket.eligibleCourseCodes,
        ...bucket.excludedCourseCodes,
        ...bucket.manualReviewOnlyCourseCodes,
      ]) {
        if (!hasRecognizableCourseCode(code)) {
          issues.push(`Missing referenced course in requirement configs: ${requirement.displayName} -> ${code}`);
        }
      }
    }
  }

  for (const department of SUPPORTED_DEPARTMENTS) {
    const departmentEntries = supportManifest.filter((item) => item.department === department);
    if (departmentEntries.length === 0) {
      issues.push(`Missing support manifest entry: ${department}`);
      continue;
    }

    for (const track of SUPPORTED_PROGRAM_TYPES) {
      for (const year of [2019, 2022, 2025]) {
        const entry = departmentEntries.find(
          (item) => coversYear(item.admissionYearRange, year) && item.supportedProgramTypes.includes(track),
        );
        if (!entry) {
          issues.push(`Missing support manifest entry for selection: ${department} ${year} ${track}`);
          continue;
        }

        const support = getProgramSupport({ department, admissionYear: year, track });
        if (support.status !== entry.supportStatus) {
          issues.push(`Support manifest does not resolve expected selection: ${department} ${year} ${track} -> ${support.status}`);
        }

        if (support.status === "supported") {
          const requirement = getDepartmentRequirement({ department, admissionYear: year, track });
          if (!requirement) {
            issues.push(`Supported selection missing department requirement: ${department} ${year} ${track}`);
          }
        }
      }
    }
  }

  return issues;
}

export function getCourseCatalog(): CourseCatalogEntry[] {
  return courseCatalog;
}
