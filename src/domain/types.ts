import type { CourseRecord } from "@/domain/models/CourseRecord";

export type Season = "봄" | "여름" | "가을" | "겨울";

export type RetakeFlag = "N" | "Y" | "Z";

export type LifecycleState = "Active" | "Failed" | "Superseded" | "Incomplete";

export type CreditCategoryValue =
  | "기초필수"
  | "기초선택"
  | "교양필수"
  | "인선_인문"
  | "인선_사회"
  | "인선_예술"
  | "인선_인핵"
  | "전공필수"
  | "전공선택"
  | "자유선택"
  | "연구"
  | "선택";

export type Gyeyol = "인문" | "사회" | "예술";

export type TrackType = "심화전공" | "부전공" | "복수전공" | "자유융합전공";

export type SupportedProgramType = Extract<TrackType, "심화전공" | "부전공" | "복수전공">;

export type SupportedDepartment = "AE" | "ME" | "CS" | "EE";

export type DepartmentSelection = SupportedDepartment | "OTHER";

export type ProgramSupportStatus = "supported" | "partial" | "common-only" | "unsupported";

export type AuCategoryName = "인성/리더십" | "즐거운" | "신나는";

export interface AuCategoryRequirement {
  name: AuCategoryName;
  required: number;
}

export interface CommonRequirements {
  기초필수: { required: number; courseGroups: string[][] };
  기초선택: {
    required: number;
    designatedCourses?: string[];
    designatedMinCount?: number;
  };
  교양필수: { requiredCredits: number; requiredAU: number };
  인선: { required: number };
  연구: { required: number };
}

export interface TrackModification {
  track: TrackType;
  isDualMajor: boolean;
  인선Required?: number;
  기초선택Required?: number;
  연구Required?: number;
}

export interface PlannerSelection {
  department: DepartmentSelection;
  admissionYear: number;
  track: TrackType;
}

export interface CourseCatalogEntry {
  canonicalCode: string;
  aliases: string[];
  nameKo: string;
  nameEn: string;
  offeringDepartments: string[];
  observedYears: number[];
  observedSemesters: Season[];
  rawCategoryLabels: string[];
  level: number;
  crossListings: string[];
  sourceRefs: string[];
}

export interface ProgramRequiredCourseSlot {
  id: string;
  label: string;
  canonicalCode: string;
  acceptedCourseCodes: string[];
  sourceRefs: string[];
}

export interface ProgramCreditBucketRule {
  id: string;
  label: string;
  requiredCredits: number;
  requiredCourseCount?: number;
  eligiblePrefixes: string[];
  minimumLevel: number;
  allowedCategories: Array<"전공필수" | "전공선택">;
  eligibleCourseCodes: string[];
  excludedCourseCodes: string[];
  manualReviewOnlyCourseCodes: string[];
  manualReviewOnlyReason?: string;
  sourceRefs: string[];
}

export interface ProgramEquivalency {
  slotId: string;
  canonicalCode: string;
  equivalentCodes: string[];
  note: string;
  sourceRefs: string[];
}

export interface DepartmentProgramRequirement {
  department: SupportedDepartment;
  admissionYearRange: [number, number];
  programType: SupportedProgramType;
  displayName: string;
  supportStatus: Extract<ProgramSupportStatus, "supported" | "partial">;
  requiredCourseSlots: ProgramRequiredCourseSlot[];
  creditBuckets: ProgramCreditBucketRule[];
  equivalencies: ProgramEquivalency[];
  knownLimitations: string[];
  sourceRefs: string[];
}

export interface SupportManifestEntry {
  department: SupportedDepartment;
  admissionYearRange: [number, number];
  supportedProgramTypes: SupportedProgramType[];
  supportStatus: Extract<ProgramSupportStatus, "supported" | "partial" | "common-only">;
  knownLimitations: string[];
  sourceRefs: string[];
}

export interface ProgramSupportInfo {
  selection: PlannerSelection;
  status: ProgramSupportStatus;
  title: string;
  message: string;
  knownLimitations: string[];
  datasetVersion: string;
  lastGeneratedAt: string;
  sourceRefs: string[];
}

export interface RequirementSet {
  admissionYearRange: [number, number];
  totalCredits: number;
  auTotal: number;
  auCategories: AuCategoryRequirement[];
  hasHssCoreTypeRequirement: boolean;
  isDualMajor: boolean;
  common: CommonRequirements;
  selectedProgram?: PlannerSelection;
  programSupport?: ProgramSupportInfo;
  departmentRequirement?: DepartmentProgramRequirement | null;
}

export interface CourseInfo {
  code: string;
  nameKo: string;
  credits: number;
}

export interface CategoryResult {
  category: string;
  creditsEarned: number;
  creditsRequired: number;
  fulfilled: boolean;
  missingCourses: CourseInfo[];
  details: string;
}

export interface ProgramRequiredCourseResult {
  id: string;
  label: string;
  satisfied: boolean;
  acceptedCourseCodes: string[];
  matchedCourse?: CourseInfo;
  detail: string;
}

export interface ProgramBucketResult {
  id: string;
  label: string;
  earnedCredits: number;
  requiredCredits: number;
  matchedCourseCount: number;
  requiredCourseCount?: number;
  fulfilled: boolean;
  matchedCourses: CourseInfo[];
  detail: string;
}

export interface ProgramAnalysisResult {
  displayName: string;
  supportStatus: ProgramSupportStatus;
  requiredCourses: ProgramRequiredCourseResult[];
  creditBuckets: ProgramBucketResult[];
  eligibleMajorCredits: number;
  requiredMajorCredits: number;
  manualReviewNotices: string[];
  knownLimitations: string[];
}

export type WarningType =
  | "HSS_DISTRIBUTION_INCOMPLETE"
  | "PROGRAM_MANUAL_REVIEW"
  | "PROGRAM_PARTIAL_SUPPORT"
  | "FREE_CONVERGENCE_DEPT_COUNT";

export interface Warning {
  type: WarningType;
  message: string;
  courseCode?: string;
}

export interface ParseWarning {
  row: number;
  message: string;
}

export interface ParseResult {
  records: CourseRecord[];
  warnings: ParseWarning[];
  totalRowsScanned: number;
  rowsParsed: number;
  rowsSkipped: number;
}

export interface AnalysisResult {
  totalCreditsEarned: number;
  totalCreditsRequired: number;
  categories: CategoryResult[];
  warnings: Warning[];
  overallStatus: "fulfilled" | "in_progress" | "behind";
  programSupport?: ProgramSupportInfo;
  programAnalysis?: ProgramAnalysisResult | null;
}

export interface HssResult {
  totalCredits: number;
  gyeyolCredits: Map<Gyeyol, number>;
  fulfilled: boolean;
  missingGyeyol: Gyeyol[];
}

export interface AuCategoryResult {
  earned: number;
  required: number;
  fulfilled: boolean;
}

export interface AuResult {
  categories: Record<AuCategoryName, AuCategoryResult>;
  totalEarned: number;
  totalRequired: number;
  fulfilled: boolean;
}
