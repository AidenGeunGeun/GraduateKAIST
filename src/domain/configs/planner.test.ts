import { describe, expect, it } from "vitest";

import { buildPlannerRequirementSet, getProgramSupport, getSupportedDepartments } from "@/domain/configs/planner";

describe("planner", () => {
  it("returns the four supported departments", () => {
    expect(getSupportedDepartments()).toEqual(["AE", "ME", "CS", "EE"]);
  });

  it("builds AE 2022 심화전공 requirements", () => {
    const requirementSet = buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" });

    expect(requirementSet).not.toBeNull();
    expect(requirementSet?.programSupport?.status).toBe("supported");
    expect(requirementSet?.departmentRequirement?.department).toBe("AE");
    expect(requirementSet?.departmentRequirement?.advancedMajor?.type).toBe("subset_of_전선");
  });

  it("derives supported dual-major requirements", () => {
    const requirementSet = buildPlannerRequirementSet({
      department: "ME",
      secondaryDepartment: "AE",
      admissionYear: 2022,
      track: "복수전공",
    });

    expect(requirementSet?.programSupport?.status).toBe("supported");
    expect(requirementSet?.secondaryProgramSupport?.status).toBe("supported");
    expect(requirementSet?.departmentRequirement?.programType).toBe("주전공");
    expect(requirementSet?.secondaryDepartmentRequirement?.programType).toBe("복수전공");
  });

  it("keeps OTHER on common-only fallback", () => {
    expect(getProgramSupport({ department: "OTHER", admissionYear: 2024, track: "심화전공" }).status).toBe("common-only");
  });
});
