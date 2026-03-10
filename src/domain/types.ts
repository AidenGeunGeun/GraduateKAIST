import type { CourseRecord } from "@/domain/models/CourseRecord";
import type { SupportedDepartment as GeneratedSupportedDepartment } from "@/domain/generated/departments.generated";

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

export type SupportedProgramType = TrackType | "주전공";

export type SupportedDepartment = GeneratedSupportedDepartment;

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
  secondaryDepartment?: DepartmentSelection;
  admissionYear: number;
  track: TrackType;
}

export interface ProgramRequiredCourseGroup {
  id: string;
  label: string;
  acceptedCourseCodes: string[];
  requiredCount: number;
  notes?: string;
}

export interface ProgramCreditRule {
  id: string;
  label: string;
  requiredCredits?: number;
  requiredCourseCount?: number;
  eligiblePrefixes?: string[];
  eligibleCourseCodes?: string[];
  allowedCategories: Array<"전공필수" | "전공선택" | "연구">;
  minimumCourseCredits?: number;
  notes?: string;
}

export interface AdvancedMajorRule {
  type: "subset_of_전선" | "additional";
  requiredCredits: number;
  eligibleCourseCodes?: string[];
  minimumCourseCredits?: number;
  note: string;
  basisCourseRequirement?: {
    required: number;
    total: number;
    courseCodes: string[];
  };
}

export interface DepartmentProgramRequirement {
  department: SupportedDepartment;
  admissionYearRange: [number, number];
  programType: SupportedProgramType;
  displayName: string;
  supportStatus: Extract<ProgramSupportStatus, "supported" | "partial">;
  totalCredits?: number;
  requiredCourses: ProgramRequiredCourseGroup[];
  creditRules: ProgramCreditRule[];
  advancedMajor?: AdvancedMajorRule;
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
  secondaryProgramSupport?: ProgramSupportInfo;
  secondaryDepartmentRequirement?: DepartmentProgramRequirement | null;
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
  matchedCourses: CourseInfo[];
  matchedCount: number;
  requiredCount: number;
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
  secondaryProgramSupport?: ProgramSupportInfo;
  secondaryProgramAnalysis?: ProgramAnalysisResult | null;
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
