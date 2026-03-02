import type {
  AuCategoryRequirement,
  RequirementSet,
  TrackModification,
  TrackType,
} from "@/domain/types";

const COMMON_AU_CATEGORIES: AuCategoryRequirement[] = [
  { name: "인성/리더십", required: 2 },
  { name: "즐거운", required: 1 },
  { name: "신나는", required: 1 },
];

const COMMON_BASE: RequirementSet["common"] = {
  기초필수: {
    required: 23,
    courseGroups: [
      ["PH121", "PH141", "PH161"],
      ["PH122", "PH142", "PH162"],
      ["PH151", "PH152"],
      ["BS110", "BS120"],
      ["MAS101", "MAS103"],
      ["MAS102", "MAS104"],
      ["CH100", "CH101", "CH105"],
      ["CH102", "CH106"],
      ["CS101", "CS102"],
    ],
  },
  기초선택: {
    required: 9,
  },
  교양필수: {
    requiredCredits: 7,
    requiredAU: 4,
  },
  인선: {
    required: 21,
  },
  연구: {
    required: 3,
  },
};

const COMMON_BASE_2019 = {
  ...COMMON_BASE,
  기초필수: {
    ...COMMON_BASE.기초필수,
    courseGroups: COMMON_BASE.기초필수.courseGroups.map((group, index) =>
      index === 2 ? ["PH151"] : [...group],
    ),
  },
};

function createRequirementSet(
  admissionYearRange: [number, number],
  common: RequirementSet["common"],
  hasHssCoreTypeRequirement: boolean,
): RequirementSet {
  return {
    admissionYearRange,
    totalCredits: 138,
    auTotal: 4,
    auCategories: COMMON_AU_CATEGORIES,
    hasHssCoreTypeRequirement,
    isDualMajor: false,
    common,
  };
}

export const REQUIREMENTS_2019: RequirementSet = createRequirementSet(
  [2019, 2019],
  COMMON_BASE_2019,
  false,
);

export const REQUIREMENTS_2020: RequirementSet = createRequirementSet([2020, 2021], COMMON_BASE, false);

export const REQUIREMENTS_2022: RequirementSet = createRequirementSet([2022, 2022], COMMON_BASE, true);

export const REQUIREMENTS_2023: RequirementSet = createRequirementSet([2023, 2024], COMMON_BASE, true);

export const REQUIREMENTS_2025: RequirementSet = createRequirementSet([2025, 2025], COMMON_BASE, true);

const TRACK_MODIFICATIONS: Record<TrackType, TrackModification> = {
  심화전공: { track: "심화전공", isDualMajor: false },
  부전공: { track: "부전공", isDualMajor: false },
  복수전공: {
    track: "복수전공",
    isDualMajor: true,
    인선Required: 12,
    기초선택Required: 6,
    연구Required: 0,
  },
  자유융합전공: { track: "자유융합전공", isDualMajor: false },
};

export function getRequirements(admissionYear: number): RequirementSet {
  if (admissionYear < 2019) {
    console.warn(`Unsupported admission year ${admissionYear}. Falling back to 2019 requirements.`);
    return REQUIREMENTS_2019;
  }

  if (admissionYear > 2025) {
    console.warn(`Unsupported admission year ${admissionYear}. Falling back to 2025 requirements.`);
    return REQUIREMENTS_2025;
  }

  if (admissionYear === 2019) {
    return REQUIREMENTS_2019;
  }

  if (admissionYear <= 2021) {
    return REQUIREMENTS_2020;
  }

  if (admissionYear === 2022) {
    return REQUIREMENTS_2022;
  }

  if (admissionYear <= 2024) {
    return REQUIREMENTS_2023;
  }

  return REQUIREMENTS_2025;
}

export function applyTrackModification(requirements: RequirementSet, track: TrackType): RequirementSet {
  const trackModification = TRACK_MODIFICATIONS[track];
  const modified: RequirementSet = {
    ...requirements,
    isDualMajor: trackModification.isDualMajor,
    common: {
      ...requirements.common,
      기초필수: {
        ...requirements.common.기초필수,
        courseGroups: requirements.common.기초필수.courseGroups.map((group) => [...group]),
      },
      기초선택: { ...requirements.common.기초선택 },
      교양필수: { ...requirements.common.교양필수 },
      인선: { ...requirements.common.인선 },
      연구: { ...requirements.common.연구 },
    },
  };

  if (trackModification.인선Required !== undefined) {
    modified.common.인선.required = trackModification.인선Required;
  }

  if (trackModification.기초선택Required !== undefined) {
    modified.common.기초선택.required = trackModification.기초선택Required;
  }

  if (trackModification.연구Required !== undefined) {
    modified.common.연구.required = trackModification.연구Required;
  }

  return modified;
}
