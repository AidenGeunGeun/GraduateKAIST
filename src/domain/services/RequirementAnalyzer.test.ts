import { describe, expect, it } from "vitest";

import { buildPlannerRequirementSet } from "@/domain/configs/planner";
import { CourseCode } from "@/domain/models/CourseCode";
import { applyTrackModification, getRequirements } from "@/domain/configs/requirements";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Transcript } from "@/domain/models/Transcript";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("RequirementAnalyzer common-only mode", () => {
  it("AC1 resolves 2019-2025 to 138 credits and 4 AU", () => {
    for (const year of [2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
      const requirements = getRequirements(year);
      expect(requirements.totalCredits).toBe(138);
      expect(requirements.auTotal).toBe(4);
    }
  });

  it("T7 returns 전공합계 from 전필+전선 with required 40", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("전필"), credits: 15 }),
      createRecord({ category: CreditCategory.from("전선"), credits: 20 }),
    ]);

    const requirements = applyTrackModification(getRequirements(2022), "심화전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);
    const majorTotal = result.categories.find((category) => category.category === "전공합계");

    expect(majorTotal?.creditsEarned).toBe(35);
    expect(majorTotal?.creditsRequired).toBe(40);
    expect(majorTotal?.fulfilled).toBe(false);
  });

  it("T3 applies 복수전공 modifications to 인선 and 연구 in analysis", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 12 }),
      createRecord({ category: CreditCategory.from("자선"), credits: 40 }),
    ]);

    const requirements = applyTrackModification(getRequirements(2022), "복수전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);
    const hss = result.categories.find((category) => category.category === "인선");
    const research = result.categories.find((category) => category.category === "연구");

    expect(hss?.creditsRequired).toBe(12);
    expect(hss?.fulfilled).toBe(true);
    expect(research?.creditsRequired).toBe(0);
    expect(research?.fulfilled).toBe(true);
  });

  it("T6 converts pre-2023 체육 AU to credits", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("자선"), credits: 130 }),
      createRecord({ nameKo: "체육", credits: 0, au: 2, category: CreditCategory.from("교필") }),
      createRecord({ nameKo: "체력육성", credits: 0, au: 2, category: CreditCategory.from("교필") }),
    ]);

    const requirements = applyTrackModification(getRequirements(2022), "심화전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);

    expect(result.totalCreditsEarned).toBe(134);
  });

  it("keeps HSS distribution warning when categories are imbalanced", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 21 }),
    ]);

    const requirements = applyTrackModification(getRequirements(2020), "심화전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);

    expect(result.warnings.some((warning) => warning.type === "HSS_DISTRIBUTION_INCOMPLETE")).toBe(true);
  });
});

describe("RequirementAnalyzer supported programs", () => {
  it("T5 matches AE210 via ME211 equivalency on required-course-slot", () => {
    const transcript = Transcript.from([
      createRecord({
        department: "기계공학과",
        courseCode: CourseCode.from("ME211", "ME.21100"),
        category: CreditCategory.from("전필"),
        nameKo: "열역학",
      }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" }),
    );
    const ae210 = result.programAnalysis?.requiredCourses.find((course) => course.id === "ae210");

    expect(result.programSupport?.status).toBe("supported");
    expect(ae210?.satisfied).toBe(true);
    expect(ae210?.matchedCourse?.code).toBe("ME211");
    expect(ae210?.acceptedCourseCodes).toContain("ME211");
  });

  it("applies AE bucket equivalencies when counting major-elective credits", () => {
    const transcript = Transcript.from([
      createRecord({
        department: "기계공학과",
        courseCode: CourseCode.from("ME231", "ME.23100"),
        category: CreditCategory.from("전선"),
        nameKo: "유체역학",
      }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" }),
    );
    const majorElective = result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "major-elective");

    expect(majorElective?.earnedCredits).toBe(3);
    expect(majorElective?.matchedCourseCount).toBe(1);
    expect(majorElective?.matchedCourses[0]?.code).toBe("ME231");
  });

  it("counts AE advanced-major explicit courses even when transcript labels them as 연구", () => {
    const transcript = Transcript.from([
      createRecord({
        courseCode: CourseCode.from("AE401", "AE.40100"),
        category: CreditCategory.from("연구"),
        nameKo: "항공우주 시스템 설계 II",
      }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" }),
    );
    const advancedMajor = result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major");

    expect(advancedMajor?.earnedCredits).toBe(3);
    expect(advancedMajor?.matchedCourses[0]?.code).toBe("AE401");
  });

  it("T6 counts 5 ME basis courses as fulfilled for requiredCourseCount buckets", () => {
    const transcript = Transcript.from([
      createRecord({ courseCode: CourseCode.from("ME207", "ME.20700"), category: CreditCategory.from("전선") }),
      createRecord({ courseCode: CourseCode.from("ME211", "ME.21100"), category: CreditCategory.from("전필") }),
      createRecord({ courseCode: CourseCode.from("ME221", "ME.22100"), category: CreditCategory.from("전선") }),
      createRecord({ courseCode: CourseCode.from("ME231", "ME.23100"), category: CreditCategory.from("전선") }),
      createRecord({ courseCode: CourseCode.from("ME251", "ME.25100"), category: CreditCategory.from("전선") }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "ME", admissionYear: 2022, track: "심화전공" }),
    );
    const basisMinimum = result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "basis-minimum");

    expect(basisMinimum).toMatchObject({
      fulfilled: true,
      matchedCourseCount: 5,
      requiredCourseCount: 5,
      earnedCredits: 15,
    });
  });

  it("keeps ME advanced-major bucket in manual review instead of auto-fulfilling it", () => {
    const transcript = Transcript.from([
      createRecord({ courseCode: CourseCode.from("ME351", "ME.35100"), category: CreditCategory.from("전선") }),
      createRecord({ courseCode: CourseCode.from("ME361", "ME.36100"), category: CreditCategory.from("전선") }),
      createRecord({ courseCode: CourseCode.from("ME370", "ME.37000"), category: CreditCategory.from("전선") }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "ME", admissionYear: 2022, track: "심화전공" }),
    );
    const advancedMajor = result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major");

    expect(advancedMajor?.fulfilled).toBe(false);
    expect(advancedMajor?.detail).toBe("수동 검토 필요");
    expect(result.warnings.some((warning) => warning.type === "PROGRAM_MANUAL_REVIEW")).toBe(true);
  });

  it("matches new-format transcript codes against pre-2025 ME required slots", () => {
    const transcript = Transcript.from([
      createRecord({
        courseCode: CourseCode.from("ME.20005", ""),
        category: CreditCategory.from("전필"),
        nameKo: "기계공학실험",
      }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "ME", admissionYear: 2022, track: "심화전공" }),
    );
    const me303 = result.programAnalysis?.requiredCourses.find((course) => course.id === "me303");

    expect(result.programSupport?.status).toBe("supported");
    expect(me303?.satisfied).toBe(true);
    expect(me303?.matchedCourse?.code).toBe("ME.20005");
    expect(me303?.acceptedCourseCodes).toEqual(expect.arrayContaining(["ME303", "ME.20005", "ME20005"]));
  });

  it("surfaces transcript-time manual-review warnings for CS URP/IS500 elective cases", () => {
    const transcript = Transcript.from([
      createRecord({
        department: "융합인재학부",
        courseCode: CourseCode.from("URP495", "URP.49500"),
        category: CreditCategory.from("전선"),
        nameKo: "학부연구프로그램",
      }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "CS", admissionYear: 2021, track: "심화전공" }),
    );

    expect(result.warnings.some((warning) => warning.type === "PROGRAM_MANUAL_REVIEW")).toBe(true);
  });

  it("reports both course-count and credit progress for CS capstone buckets", () => {
    const transcript = Transcript.from([
      createRecord({
        courseCode: CourseCode.from("CS408", "CS.40008"),
        category: CreditCategory.from("연구"),
        nameKo: "캡스톤 팀 프로젝트",
      }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "CS", admissionYear: 2022, track: "심화전공" }),
    );
    const capstone = result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "capstone-team-project");

    expect(capstone).toMatchObject({
      fulfilled: true,
      matchedCourseCount: 1,
      requiredCourseCount: 1,
      earnedCredits: 3,
    });
  });

  it("keeps manual-review warnings for bucket-level manual-review-only courses", () => {
    const requirements = applyTrackModification(getRequirements(2022), "심화전공");
    const transcript = Transcript.from([
      createRecord({ courseCode: CourseCode.from("AE500", "AE.50000"), category: CreditCategory.from("전선") }),
    ]);

    const result = RequirementAnalyzer.analyze(transcript, {
      ...requirements,
      programSupport: {
        selection: { department: "AE", admissionYear: 2022, track: "심화전공" },
        status: "supported",
        title: "항공우주공학과 (AE) 심화전공 지원",
        message: "테스트",
        knownLimitations: [],
        datasetVersion: "test",
        lastGeneratedAt: "2026-03-09T00:00:00.000Z",
        sourceRefs: [],
      },
      departmentRequirement: {
        department: "AE",
        admissionYearRange: [2022, 2022],
        programType: "심화전공",
        displayName: "항공우주공학과 심화전공",
        supportStatus: "supported",
        requiredCourseSlots: [],
        creditBuckets: [
          {
            id: "manual-review-bucket",
            label: "수동 검토 버킷",
            requiredCredits: 3,
            eligiblePrefixes: ["AE"],
            minimumLevel: 0,
            allowedCategories: ["전공선택"],
            eligibleCourseCodes: [],
            excludedCourseCodes: [],
            manualReviewOnlyCourseCodes: ["AE500"],
            sourceRefs: [],
          },
        ],
        equivalencies: [],
        knownLimitations: [],
        sourceRefs: [],
      },
    });

    expect(result.warnings.some((warning) => warning.type === "PROGRAM_MANUAL_REVIEW")).toBe(true);
  });
});
