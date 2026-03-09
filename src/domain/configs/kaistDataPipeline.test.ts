import { beforeAll, describe, expect, it } from "vitest";

import type { DepartmentProgramRequirement, SupportManifestEntry } from "@/domain/types";

import { buildPlannerDataset } from "../../../scripts/lib/kaist-data-pipeline.mjs";

describe("kaist data pipeline", () => {
  let programs: DepartmentProgramRequirement[] = [];
  let supportEntries: SupportManifestEntry[] = [];

  beforeAll(async () => {
    const dataset = await buildPlannerDataset();
    programs = dataset.programs as DepartmentProgramRequirement[];
    supportEntries = dataset.supportEntries as SupportManifestEntry[];
  });

  function findProgram(
    department: DepartmentProgramRequirement["department"],
    admissionYearRange: [number, number],
    programType: DepartmentProgramRequirement["programType"],
  ): DepartmentProgramRequirement {
    const program = programs.find(
      (entry) =>
        entry.department === department &&
        entry.programType === programType &&
        entry.admissionYearRange[0] === admissionYearRange[0] &&
        entry.admissionYearRange[1] === admissionYearRange[1],
    );

    expect(program).toBeDefined();
    return program!;
  }

  function findSupportEntry(
    department: SupportManifestEntry["department"],
    admissionYearRange: [number, number],
  ): SupportManifestEntry {
    const entry = supportEntries.find(
      (item) =>
        item.department === department &&
        item.admissionYearRange[0] === admissionYearRange[0] &&
        item.admissionYearRange[1] === admissionYearRange[1],
    );

    expect(entry).toBeDefined();
    return entry!;
  }

  it("generates supported runtime programs for every reviewed slice and track", () => {
    expect(programs).toHaveLength(54);
  });

  it("T1 generates AE 2020-2021 심화전공 with required slots, buckets, equivalencies, and manual-review notes", () => {
    const program = findProgram("AE", [2020, 2021], "심화전공");
    const ae210 = program.requiredCourseSlots.find((slot) => slot.id === "ae210");

    expect(program.supportStatus).toBe("supported");
    expect(program.requiredCourseSlots).toHaveLength(7);
    expect(program.creditBuckets).toHaveLength(4);
    expect(ae210?.acceptedCourseCodes).toContain("AE210");
    expect(ae210?.acceptedCourseCodes).toContain("ME211");
    expect(program.equivalencies).toHaveLength(4);
    expect(program.knownLimitations).toContain(
      "심화전공 표 외에 500단위 이상 상호인정 전공과목을 심화전공으로 인정한다고만 적혀 있어, 실제 인정 과목 목록과 승인 상태를 문서만으로 완결적으로 산정할 수 없다.",
    );
  });

  it("propagates requiredCourseCount buckets for ME, CS, and EE programs", () => {
    expect(findProgram("ME", [2020, 2020], "심화전공").creditBuckets.find((bucket) => bucket.id === "basis-minimum"))
      .toMatchObject({ requiredCourseCount: 5, requiredCredits: 0 });
    expect(findProgram("CS", [2020, 2020], "심화전공").creditBuckets.find((bucket) => bucket.id === "capstone-team-project"))
      .toMatchObject({ requiredCourseCount: 1, requiredCredits: 0 });
    expect(findProgram("EE", [2019, 2021], "심화전공").creditBuckets.find((bucket) => bucket.id === "required-pool-choice"))
      .toMatchObject({ requiredCourseCount: 3, requiredCredits: 0 });
  });

  it("does not backfill the CS capstone bucket into 2019 cohorts", () => {
    const program = findProgram("CS", [2019, 2019], "심화전공");

    expect(program.creditBuckets.some((bucket) => bucket.id === "capstone-team-project")).toBe(false);
  });

  it("marks reviewed slices as supported while keeping limited slices common-only", () => {
    expect(findSupportEntry("AE", [2019, 2019]).supportStatus).toBe("common-only");
    expect(findSupportEntry("AE", [2022, 2022]).supportStatus).toBe("supported");
    expect(findSupportEntry("ME", [2021, 2022]).supportStatus).toBe("supported");
    expect(findSupportEntry("CS", [2020, 2020]).supportStatus).toBe("supported");
    expect(findSupportEntry("EE", [2023, 2024]).supportStatus).toBe("supported");
  });
});
