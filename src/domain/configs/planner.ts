import aeRequirements from "../../../references/kaist-data/requirements/ae.requirements.json";
import csRequirements from "../../../references/kaist-data/requirements/cs.requirements.json";
import eeRequirements from "../../../references/kaist-data/requirements/ee.requirements.json";
import meRequirements from "../../../references/kaist-data/requirements/me.requirements.json";
import { DEPARTMENT_LABELS, SUPPORTED_DEPARTMENTS } from "@/domain/generated/departments.generated";
import type {
  AdvancedMajorRule,
  DepartmentProgramRequirement,
  DepartmentSelection,
  PlannerSelection,
  ProgramCreditRule,
  ProgramRequiredCourseGroup,
  ProgramSupportInfo,
  RequirementSet,
  SupportedDepartment,
  SupportedProgramType,
  TrackType,
} from "@/domain/types";

import { applyTrackModification, getRequirements } from "@/domain/configs/requirements";

const OTHER_DEPARTMENT_LABEL = "기타 / 미지원 학과";

const RAW_REQUIREMENTS = {
  AE: aeRequirements,
  ME: meRequirements,
  CS: csRequirements,
  EE: eeRequirements,
} as const;

type RawDepartmentRequirements = (typeof RAW_REQUIREMENTS)[SupportedDepartment];
type RawYearGroup = RawDepartmentRequirements["yearGroups"][number];
type RawTrackConfig = Exclude<RawYearGroup["tracks"], string>[keyof Exclude<RawYearGroup["tracks"], string>];

interface ProgramSupportOptions {
  department?: DepartmentSelection;
  queryTrack?: TrackType;
  displayTrack?: SupportedProgramType | TrackType;
}

function isSupportedDepartment(department: DepartmentSelection): department is SupportedDepartment {
  return SUPPORTED_DEPARTMENTS.includes(department as SupportedDepartment);
}

function dedupe<T>(values: T[]): T[] {
  return [...new Set(values)];
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

  return dedupe(variants);
}

function expandCodes(codes: string[] | undefined): string[] {
  return dedupe((codes ?? []).flatMap((code) => expandCodeVariants(code)));
}

function getDepartmentData(department: SupportedDepartment): RawDepartmentRequirements {
  return RAW_REQUIREMENTS[department];
}

function getSourceRefs(department: SupportedDepartment): string[] {
  const data = getDepartmentData(department) as RawDepartmentRequirements & { sourceRefs?: string[] };
  return data.sourceRefs && data.sourceRefs.length > 0
    ? ["references/kaist-data/requirements/source-provenance.json", ...data.sourceRefs]
    : ["references/kaist-data/requirements/source-provenance.json", data.source];
}

function getDepartmentLabelInternal(department: DepartmentSelection): string {
  if (department === "OTHER") {
    return OTHER_DEPARTMENT_LABEL;
  }

  const labels = DEPARTMENT_LABELS[department];
  return labels ? `${labels.labelKo} (${labels.labelShort})` : department;
}

function getYearGroup(department: SupportedDepartment, admissionYear: number): RawYearGroup | null {
  const groups = getDepartmentData(department).yearGroups;
  return groups.find((group) => group.admissionYears.includes(admissionYear)) ?? null;
}

function resolveTracks(department: SupportedDepartment, yearGroup: RawYearGroup): Exclude<RawYearGroup["tracks"], string> {
  if (typeof yearGroup.tracks !== "string") {
    return yearGroup.tracks;
  }

  const targetId = yearGroup.tracks.replace("SAME_AS_", "");
  const match = getDepartmentData(department).yearGroups.find((group) => group.id === targetId);
  if (!match) {
    throw new Error(`Missing SAME_AS target ${targetId} for ${department}`);
  }

  return resolveTracks(department, match);
}

function buildCourseGroupsFromPairs(prefix: string, codes: string[]): ProgramRequiredCourseGroup[] {
  const groups: ProgramRequiredCourseGroup[] = [];

  for (let index = 0; index < codes.length; index += 2) {
    const slice = codes.slice(index, index + 2);
    const base = slice[0];
    groups.push({
      id: `${prefix}-${index / 2 + 1}`,
      label: base,
      acceptedCourseCodes: expandCodes(slice),
      requiredCount: 1,
    });
  }

  return groups;
}

function buildPrimaryAdvancedRequirement(department: SupportedDepartment, admissionYear: number): DepartmentProgramRequirement | null {
  const yearGroup = getYearGroup(department, admissionYear);
  if (!yearGroup) {
    return null;
  }

  const tracks = resolveTracks(department, yearGroup);
  const track = tracks["심화전공"] as Record<string, unknown>;
  const major = track["전공"] as Record<string, unknown>;
  const required = major["전필"] as Record<string, unknown>;
  const elective = major["전선"] as Record<string, unknown>;
  const research = (track["연구"] as Record<string, unknown> | undefined) ?? {};
  const advanced = (track["심화전공"] as Record<string, unknown> | undefined) ?? {};

  const requiredCourses: ProgramRequiredCourseGroup[] = [];
  const sourceRefs = getSourceRefs(department);
  const creditRules: ProgramCreditRule[] = [];
  const knownLimitations: string[] = [];

  if (Array.isArray(required["courses"])) {
    requiredCourses.push(...buildCourseGroupsFromPairs(`${department.toLowerCase()}-required`, required["courses"] as string[]));
  }

  if (Array.isArray(required["required"])) {
    requiredCourses.push(...buildCourseGroupsFromPairs(`${department.toLowerCase()}-required-fixed`, required["required"] as string[]));
  }

  if (required["selectFrom"] && typeof required["selectFrom"] === "object") {
    const selectFrom = required["selectFrom"] as Record<string, unknown>;
    requiredCourses.push({
      id: `${department.toLowerCase()}-required-select`,
      label: "선택 전공필수군",
      acceptedCourseCodes: expandCodes((selectFrom["courses"] as string[]) ?? []),
      requiredCount: Number(selectFrom["count"] ?? 0),
    });
  }

  creditRules.push({
    id: "major-total",
    label: `전공 ${Number(required["requiredCredits"] ?? 0) + Number(elective["requiredCredits"] ?? 0)}학점 이상`,
    requiredCredits: Number(required["requiredCredits"] ?? 0) + Number(elective["requiredCredits"] ?? 0),
    eligiblePrefixes: [department],
    eligibleCourseCodes: expandCodes((elective["substitutions"] as string[]) ?? []),
    allowedCategories: ["전공필수", "전공선택"],
  });

  const electiveRule: ProgramCreditRule = {
    id: "major-elective",
    label: `전공선택 ${Number(elective["requiredCredits"] ?? 0)}학점 이상`,
    requiredCredits: Number(elective["requiredCredits"] ?? 0),
    eligiblePrefixes: [department],
    eligibleCourseCodes: expandCodes((elective["substitutions"] as string[]) ?? []),
    allowedCategories: ["전공선택"],
  };
  creditRules.push(electiveRule);

  if (elective["기반과목"] && typeof elective["기반과목"] === "object") {
    const basis = elective["기반과목"] as Record<string, unknown>;
    creditRules.push({
      id: "basis-minimum",
      label: `기반과목 ${basis["required"]}/${basis["total"]}`,
      requiredCourseCount: Number(basis["required"] ?? 0),
      eligibleCourseCodes: expandCodes((basis["courses"] as string[]) ?? []),
      allowedCategories: ["전공선택"],
    });
  }

  if (elective["capstone"] && typeof elective["capstone"] === "object") {
    const capstone = elective["capstone"] as Record<string, unknown>;
    creditRules.push({
      id: "capstone-team-project",
      label: "캡스톤 팀 프로젝트",
      requiredCourseCount: Number(capstone["requiredCount"] ?? 0),
      eligibleCourseCodes: expandCodes((capstone["eligibleCourses"] as string[]) ?? []),
      allowedCategories: ["전공선택", "연구"],
    });
  }

  if (!Boolean(research["exempted"]) && Number(research["requiredCredits"] ?? 0) > 0) {
    creditRules.push({
      id: "research",
      label: `연구 ${Number(research["requiredCredits"] ?? 0)}학점 이상`,
      requiredCredits: Number(research["requiredCredits"] ?? 0),
      eligibleCourseCodes: expandCodes((research["courses"] as string[]) ?? []),
      allowedCategories: ["연구", "전공선택"],
    });
  }

  let advancedMajor: AdvancedMajorRule | undefined;
  if (advanced["type"] === "subset_of_전선" || advanced["type"] === "additional") {
    advancedMajor = {
      type: advanced["type"],
      requiredCredits: Number(advanced["requiredCredits"] ?? 0),
      eligibleCourseCodes: expandCodes([
        ...(((advanced["eligibleOldCodes"] as string[]) ?? [])),
        ...(((advanced["eligibleNewCodes"] as string[]) ?? [])),
      ]),
      minimumCourseCredits: Number(advanced["minimumCourseCredits"] ?? 0) || undefined,
      note: String(advanced["note"] ?? advanced["rule"] ?? ""),
    };

    const basisAll = advanced["기반과목All"] as Record<string, unknown> | undefined;
    if (basisAll?.["courses"]) {
      advancedMajor.basisCourseRequirement = {
        required: Number(basisAll["required"] ?? 0),
        total: Number(basisAll["total"] ?? basisAll["required"] ?? 0),
        courseCodes: expandCodes(basisAll["courses"] as string[]),
      };
    } else if (elective["기반과목"] && advanced["type"] === "additional" && basisAll) {
      const basis = elective["기반과목"] as Record<string, unknown>;
      advancedMajor.basisCourseRequirement = {
        required: Number(basisAll["required"] ?? basis["total"] ?? 0),
        total: Number(basisAll["total"] ?? basis["total"] ?? 0),
        courseCodes: expandCodes((basis["courses"] as string[]) ?? []),
      };
    }
  }

  if (department === "AE") {
    const first = requiredCourses[0];
    if (first) {
      first.acceptedCourseCodes = dedupe([...first.acceptedCourseCodes, ...expandCodes(["ME211", "ME.20011"])]);
    }
    if (advancedMajor) {
      knownLimitations.push("AE 심화전공의 500단위 상호인정 과목은 자동 판정하지 않습니다.");
    }
  }

  if (department === "CS" && admissionYear >= 2021) {
    knownLimitations.push("CS URP495/IS500 상호인정 전선은 자동 집계하지 않고 수동 검토로 남깁니다.");
  }

  if (department === "ME") {
    knownLimitations.push("ME 심화전공은 기본 전공 초과 학점을 기준으로 계산합니다.");
  }

  return {
    department,
    admissionYearRange: [admissionYear, admissionYear],
    programType: "심화전공",
    displayName: `${getDepartmentLabelInternal(department)} 심화전공`,
    supportStatus: "supported",
    totalCredits: yearGroup.totalCredits,
    requiredCourses,
    creditRules,
    advancedMajor,
    knownLimitations,
    sourceRefs,
  };
}

function buildSecondaryRequirement(department: SupportedDepartment, admissionYear: number, track: Extract<TrackType, "복수전공" | "부전공">): DepartmentProgramRequirement | null {
  const yearGroup = getYearGroup(department, admissionYear);
  if (!yearGroup) {
    return null;
  }

  const tracks = resolveTracks(department, yearGroup);
  const advancedRequirement = buildPrimaryAdvancedRequirement(department, admissionYear);
  if (!advancedRequirement) {
    return null;
  }

  const trackConfig = tracks[track] as Record<string, unknown>;
  const secondary = trackConfig["secondaryMajor"] as Record<string, unknown>;
  const primary = trackConfig["primaryMajor"] as Record<string, unknown> | undefined;
  const majorConfig = (primary?.["전공"] as Record<string, unknown> | undefined) ?? {};
  const requiredConfig = (majorConfig["전필"] as Record<string, unknown> | undefined) ?? {};

  const requiredCourses: ProgramRequiredCourseGroup[] = [];
  const creditRules: ProgramCreditRule[] = [
    {
      id: `${track}-total`,
      label: `${track} ${Number(secondary["totalCredits"] ?? 0)}학점 이상`,
      requiredCredits: Number(secondary["totalCredits"] ?? 0),
      eligiblePrefixes: [department],
      allowedCategories: ["전공필수", "전공선택"],
    },
  ];

  const requiredPoolCodes = expandCodes([
    ...((requiredConfig["courses"] as string[]) ?? []),
    ...((requiredConfig["required"] as string[]) ?? []),
    ...((((requiredConfig["selectFrom"] as Record<string, unknown> | undefined)?.["courses"] as string[]) ?? [])),
  ]);

  if (secondary["required전필"] && Array.isArray(secondary["required전필"])) {
    requiredCourses.push(...buildCourseGroupsFromPairs(`${department.toLowerCase()}-${track}-required`, secondary["required전필"] as string[]));
  }

  if (secondary["전필포함"] !== undefined) {
    creditRules.push({
      id: `${track}-required-pool`,
      label: `전필포함 ${Number(secondary["전필포함"])}학점`,
      requiredCredits: Number(secondary["전필포함"]),
      eligibleCourseCodes: requiredPoolCodes,
      allowedCategories: ["전공필수", "전공선택"],
    });
  }

  if (secondary["전필포함_min"] !== undefined) {
    creditRules.push({
      id: `${track}-required-count`,
      label: `전필 ${Number(secondary["전필포함_min"])}과목 이상`,
      requiredCourseCount: Number(secondary["전필포함_min"]),
      eligibleCourseCodes: requiredPoolCodes,
      allowedCategories: ["전공필수", "전공선택"],
    });
  }

  return {
    department,
    admissionYearRange: [admissionYear, admissionYear],
    programType: track,
    displayName: `${getDepartmentLabelInternal(department)} ${track}`,
    supportStatus: "supported",
    totalCredits: yearGroup.totalCredits,
    requiredCourses,
    creditRules,
    knownLimitations: [String(secondary["note"] ?? "")].filter(Boolean),
    sourceRefs: advancedRequirement.sourceRefs,
  };
}

function coversTrack(track: TrackType): boolean {
  return track === "심화전공" || track === "복수전공" || track === "부전공" || track === "자유융합전공";
}

function programSupportStatus(selection: PlannerSelection, options: ProgramSupportOptions = {}): ProgramSupportInfo["status"] {
  const department = options.department ?? selection.department;
  const queryTrack = options.queryTrack ?? selection.track;

  if (!isSupportedDepartment(department)) {
    return "common-only";
  }

  if (!coversTrack(queryTrack)) {
    return "common-only";
  }

  return getYearGroup(department, selection.admissionYear) ? "supported" : "common-only";
}

function supportTitle(department: DepartmentSelection, displayTrack: SupportedProgramType | TrackType, status: ProgramSupportInfo["status"]): string {
  const label = displayTrack === "주전공" ? `${getDepartmentLabelInternal(department)} 전공 (주전공)` : `${getDepartmentLabelInternal(department)} ${displayTrack}`;
  return status === "supported" ? `${label} 지원` : `${label} 공통 분석`;
}

export function getDepartmentLabel(department: DepartmentSelection): string {
  return getDepartmentLabelInternal(department);
}

export function getDepartmentShortLabel(department: DepartmentSelection): string {
  return department === "OTHER" ? "기타" : DEPARTMENT_LABELS[department]?.labelShort ?? department;
}

export function getSupportedDepartments(): string[] {
  return [...SUPPORTED_DEPARTMENTS];
}

export function getProgramSupport(selection: PlannerSelection, options: ProgramSupportOptions = {}): ProgramSupportInfo {
  const department = options.department ?? selection.department;
  const displayTrack = options.displayTrack ?? selection.track;
  const status = programSupportStatus(selection, options);

  return {
    selection: { ...selection, department },
    status,
    title: supportTitle(department, displayTrack, status),
    message:
      status === "supported"
        ? "학과별 전공 규칙과 공통 졸업요건을 함께 분석합니다."
        : "선택한 조합은 공통 졸업요건만 분석합니다.",
    knownLimitations: [],
    datasetVersion: "cais-reset-2026-03-10",
    lastGeneratedAt: "2026-03-10",
    sourceRefs: isSupportedDepartment(department) ? getSourceRefs(department) : [],
  };
}

function derivePrimaryMajorRequirement(
  requirement: DepartmentProgramRequirement,
  track: TrackType,
): DepartmentProgramRequirement {
  const nextCreditRules = requirement.creditRules.filter((rule) => rule.id !== "research");

  if (track !== "복수전공") {
    const researchRule = requirement.creditRules.find((rule) => rule.id === "research");
    if (researchRule) {
      nextCreditRules.push(researchRule);
    }
  }

  return {
    ...requirement,
    programType: "주전공",
    displayName: `${getDepartmentLabelInternal(requirement.department)} 전공 (주전공)`,
    creditRules: requirement.creditRules.filter((rule) => rule.id !== "research" || track !== "복수전공"),
    advancedMajor: undefined,
  };
}

export function buildPlannerRequirementSet(selection: PlannerSelection): RequirementSet | null {
  const base = applyTrackModification(getRequirements(selection.admissionYear), selection.track);

  if (selection.track === "복수전공" || selection.track === "부전공") {
    const programSupport = getProgramSupport(selection, { queryTrack: "심화전공", displayTrack: "주전공" });
    const advancedRequirement = isSupportedDepartment(selection.department)
      ? buildPrimaryAdvancedRequirement(selection.department, selection.admissionYear)
      : null;
    const secondaryProgramSupport = selection.secondaryDepartment
      ? getProgramSupport(selection, { department: selection.secondaryDepartment, queryTrack: selection.track, displayTrack: selection.track })
      : undefined;

    return {
      ...base,
      selectedProgram: selection,
      programSupport,
      departmentRequirement: advancedRequirement ? derivePrimaryMajorRequirement(advancedRequirement, selection.track) : null,
      secondaryProgramSupport,
      secondaryDepartmentRequirement:
        selection.secondaryDepartment && isSupportedDepartment(selection.secondaryDepartment)
          ? buildSecondaryRequirement(selection.secondaryDepartment, selection.admissionYear, selection.track)
          : null,
    };
  }

  const programSupport = getProgramSupport(selection);
  const advancedRequirement = isSupportedDepartment(selection.department)
    ? buildPrimaryAdvancedRequirement(selection.department, selection.admissionYear)
    : null;

  return {
    ...base,
    selectedProgram: selection,
    programSupport,
    departmentRequirement:
      selection.track === "심화전공"
        ? advancedRequirement
        : selection.track === "자유융합전공" && advancedRequirement
          ? derivePrimaryMajorRequirement(advancedRequirement, "부전공")
          : null,
  };
}
