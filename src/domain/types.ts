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

export interface RequirementSet {
  admissionYearRange: [number, number];
  totalCredits: number;
  auTotal: number;
  auCategories: AuCategoryRequirement[];
  hasHssCoreTypeRequirement: boolean;
  isDualMajor: boolean;
  common: CommonRequirements;
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

export type WarningType = "HSS_DISTRIBUTION_INCOMPLETE";

export interface Warning {
  type: WarningType;
  message: string;
  courseCode?: string;
}

export interface AnalysisResult {
  totalCreditsEarned: number;
  totalCreditsRequired: number;
  categories: CategoryResult[];
  warnings: Warning[];
  overallStatus: "fulfilled" | "in_progress" | "behind";
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
