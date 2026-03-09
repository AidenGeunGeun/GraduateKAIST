import { describe, expect, it } from "vitest";

import { buildPlannerRequirementSet, getProgramSupport, validateGeneratedPlannerData } from "@/domain/configs/planner";
import { CourseCode } from "@/domain/models/CourseCode";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Transcript } from "@/domain/models/Transcript";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("planner support semantics", () => {
  it("returns supported status for reviewed slices and common-only for unsupported gaps", () => {
    expect(getProgramSupport({ department: "AE", admissionYear: 2019, track: "심화전공" }).status).toBe(
      "common-only",
    );
    expect(getProgramSupport({ department: "AE", admissionYear: 2022, track: "심화전공" }).status).toBe(
      "supported",
    );
    expect(getProgramSupport({ department: "ME", admissionYear: 2019, track: "복수전공" }).status).toBe(
      "common-only",
    );
    expect(getProgramSupport({ department: "ME", admissionYear: 2022, track: "복수전공" }).status).toBe(
      "supported",
    );
    expect(getProgramSupport({ department: "CS", admissionYear: 2019, track: "부전공" }).status).toBe(
      "supported",
    );
    expect(getProgramSupport({ department: "EE", admissionYear: 2025, track: "심화전공" }).status).toBe(
      "supported",
    );
  });

  it("keeps OTHER departments and 자유융합전공 honest as common-only selections", () => {
    expect(getProgramSupport({ department: "OTHER", admissionYear: 2024, track: "심화전공" }).status).toBe(
      "common-only",
    );
    expect(getProgramSupport({ department: "AE", admissionYear: 2024, track: "자유융합전공" }).status).toBe(
      "common-only",
    );
  });

  it("validates the generated planner dataset", () => {
    expect(validateGeneratedPlannerData()).toEqual([]);
  });
});

describe("planner requirement loading", () => {
  it("attaches department requirement configs for supported selections", () => {
    const requirementSet = buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" });

    expect(requirementSet.programSupport?.status).toBe("supported");
    expect(requirementSet.departmentRequirement).not.toBeNull();
    expect(requirementSet.departmentRequirement?.department).toBe("AE");
    expect(requirementSet.departmentRequirement?.programType).toBe("심화전공");
  });

  it("keeps OTHER departments and 자유융합전공 on common-only fallback", () => {
    expect(buildPlannerRequirementSet({ department: "OTHER", admissionYear: 2022, track: "심화전공" }).departmentRequirement).toBeNull();
    expect(buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "자유융합전공" }).departmentRequirement).toBeNull();
  });

  it("loads department-specific analysis for supported selections", () => {
    const transcript = Transcript.from([
      createRecord({ courseCode: CourseCode.from("AE210", "AE.21000"), category: CreditCategory.from("전필") }),
      createRecord({ courseCode: CourseCode.from("AE220", "AE.22000"), category: CreditCategory.from("전필") }),
      createRecord({ courseCode: CourseCode.from("AE321", "AE.32100"), category: CreditCategory.from("전선") }),
    ]);

    const result = RequirementAnalyzer.analyze(
      transcript,
      buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" }),
    );

    expect(result.programSupport?.status).toBe("supported");
    expect(result.programAnalysis).not.toBeNull();
    expect(result.programAnalysis?.requiredCourses.some((course) => course.id === "ae210")).toBe(true);
  });
});
