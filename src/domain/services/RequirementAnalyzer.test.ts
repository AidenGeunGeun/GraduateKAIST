import { describe, expect, it } from "vitest";

import { buildPlannerRequirementSet } from "@/domain/configs/planner";
import { CourseCode } from "@/domain/models/CourseCode";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Transcript } from "@/domain/models/Transcript";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import { createRecord } from "@/domain/test-utils/createRecord";

function analyze(selection: Parameters<typeof buildPlannerRequirementSet>[0], records: ReturnType<typeof createRecord>[]) {
  const requirementSet = buildPlannerRequirementSet(selection);
  if (!requirementSet) {
    throw new Error("missing requirement set");
  }
  return RequirementAnalyzer.analyze(Transcript.from(records), requirementSet);
}

function aeRequired() {
  return ["AE210", "AE220", "AE300", "AE208", "AE307", "AE330", "AE400"].map((code) =>
    createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전필") }),
  );
}

function csRequired() {
  return [
    createRecord({ courseCode: CourseCode.from("CS204", ""), category: CreditCategory.from("전필"), credits: 3 }),
    createRecord({ courseCode: CourseCode.from("CS206", ""), category: CreditCategory.from("전필"), credits: 4 }),
    createRecord({ courseCode: CourseCode.from("CS300", ""), category: CreditCategory.from("전필"), credits: 3 }),
    createRecord({ courseCode: CourseCode.from("CS311", ""), category: CreditCategory.from("전필"), credits: 3 }),
    createRecord({ courseCode: CourseCode.from("CS320", ""), category: CreditCategory.from("전필"), credits: 3 }),
    createRecord({ courseCode: CourseCode.from("CS330", ""), category: CreditCategory.from("전필"), credits: 3 }),
  ];
}

function meRequired2020() {
  return ["ME200", "ME303", "ME400", "ME340"].map((code) =>
    createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전필") }),
  );
}

describe("RequirementAnalyzer department rules", () => {
  it("T1 AE 2022 심화전공 fulfills curated subset rule", () => {
    const result = analyze(
      { department: "AE", admissionYear: 2022, track: "심화전공" },
      [
        ...aeRequired(),
        createRecord({ courseCode: CourseCode.from("AE321", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE331", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE401", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE405", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE409", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE410", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE230", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(true);
  });

  it("T2 AE 2022 심화전공 fails when only 12 curated credits count", () => {
    const result = analyze(
      { department: "AE", admissionYear: 2022, track: "심화전공" },
      [
        ...aeRequired(),
        createRecord({ courseCode: CourseCode.from("AE321", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE331", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE401", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE230", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE311", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE370", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("COE491", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(false);
  });

  it("T3 CS 2021 심화전공 fulfills non-2-unit subset rule", () => {
    const result = analyze(
      { department: "CS", admissionYear: 2021, track: "심화전공" },
      [
        ...csRequired(),
        createRecord({ courseCode: CourseCode.from("CS350", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS360", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS374", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS423", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS442", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS453", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS454", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS457", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS459", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS473", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(true);
  });

  it("T4 CS 2021 warns when capstone is missing", () => {
    const result = analyze(
      { department: "CS", admissionYear: 2021, track: "심화전공" },
      [
        ...csRequired(),
        createRecord({ courseCode: CourseCode.from("CS460", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS461", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS462", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS463", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS464", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS465", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS466", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS467", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS468", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS469", ""), category: CreditCategory.from("전선"), credits: 3 }),
        createRecord({ courseCode: CourseCode.from("CS490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "capstone-team-project")?.fulfilled).toBe(false);
    expect(result.warnings.some((warning) => warning.message.includes("캡스톤 팀 프로젝트"))).toBe(true);
  });

  it("T5 ME 2020 심화전공 fulfills additional-credit model with 9/9 basis", () => {
    const result = analyze(
      { department: "ME", admissionYear: 2020, track: "심화전공" },
      [
        ...meRequired2020(),
        ...["ME231", "ME251", "ME361", "ME211", "ME311", "ME221", "ME207", "ME370", "ME351"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        ...["ME410", "ME411", "ME412", "ME413", "ME414", "ME415", "ME416", "ME417"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        createRecord({ courseCode: CourseCode.from("ME490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(true);
  });

  it("T6 ME 2020 심화전공 fails with only 12 additional elective credits", () => {
    const result = analyze(
      { department: "ME", admissionYear: 2020, track: "심화전공" },
      [
        ...meRequired2020(),
        ...["ME231", "ME251", "ME361", "ME211", "ME311", "ME221", "ME207", "ME370", "ME351"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        ...["ME410", "ME411", "ME412"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        createRecord({ courseCode: CourseCode.from("ME490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(false);
  });

  it("T7 ME 2020 심화전공 fails when basis courses are only 7/9", () => {
    const result = analyze(
      { department: "ME", admissionYear: 2020, track: "심화전공" },
      [
        ...meRequired2020(),
        ...["ME231", "ME251", "ME361", "ME211", "ME311", "ME221", "ME207"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        ...["ME410", "ME411", "ME412", "ME413", "ME414", "ME415", "ME416", "ME417", "ME418", "ME419"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        createRecord({ courseCode: CourseCode.from("ME490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(false);
  });

  it("T8 EE 2020 심화전공 fulfills additional-credit model", () => {
    const result = analyze(
      { department: "EE", admissionYear: 2020, track: "심화전공" },
      [
        createRecord({ courseCode: CourseCode.from("EE305", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("EE405", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("EE201", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("EE202", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("EE204", ""), category: CreditCategory.from("전필") }),
        ...["EE321", "EE322", "EE323", "EE324", "EE325", "EE326", "EE327", "EE328", "EE329", "EE330", "EE331", "EE332", "EE333", "EE334", "EE335"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        createRecord({ courseCode: CourseCode.from("EE336", ""), category: CreditCategory.from("전선"), credits: 2 }),
        createRecord({ courseCode: CourseCode.from("EE490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(true);
  });

  it("T9 복수전공 primary ME 2022 removes research requirement", () => {
    const result = analyze(
      { department: "ME", secondaryDepartment: "AE", admissionYear: 2022, track: "복수전공" },
      [],
    );

    expect(result.categories.find((category) => category.category === "연구")?.creditsRequired).toBe(0);
    expect(result.programAnalysis?.creditBuckets.some((bucket) => bucket.id === "research")).toBe(false);
  });

  it("T10 부전공 primary AE 2022 keeps research requirement", () => {
    const result = analyze(
      { department: "AE", secondaryDepartment: "ME", admissionYear: 2022, track: "부전공" },
      [],
    );

    expect(result.categories.find((category) => category.category === "연구")?.creditsRequired).toBe(3);
    expect(result.programAnalysis?.creditBuckets.some((bucket) => bucket.id === "research")).toBe(true);
  });

  it("counts AE substitution courses toward major-total", () => {
    const result = analyze(
      { department: "AE", admissionYear: 2022, track: "심화전공" },
      [
        ...aeRequired(),
        createRecord({ courseCode: CourseCode.from("ME231", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("ME311", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("ME301", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("COE491", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE321", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE331", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE401", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("AE490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "major-total")?.fulfilled).toBe(true);
  });

  it("does not count non-CS electives toward CS subset rule", () => {
    const result = analyze(
      { department: "CS", admissionYear: 2021, track: "심화전공" },
      [
        ...csRequired(),
        ...Array.from({ length: 10 }, (_, index) =>
          createRecord({ courseCode: CourseCode.from(`EE4${10 + index}`, ""), category: CreditCategory.from("전선"), credits: 3 }),
        ),
        createRecord({ courseCode: CourseCode.from("CS490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(false);
  });

  it("counts only ME 전공선택 courses for basis requirements", () => {
    const result = analyze(
      { department: "ME", admissionYear: 2020, track: "심화전공" },
      [
        ...meRequired2020(),
        createRecord({ courseCode: CourseCode.from("ME231", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("ME251", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("ME361", ""), category: CreditCategory.from("전필") }),
        createRecord({ courseCode: CourseCode.from("ME211", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("ME311", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("ME221", ""), category: CreditCategory.from("전선") }),
        createRecord({ courseCode: CourseCode.from("ME207", ""), category: CreditCategory.from("전선") }),
        ...["ME410", "ME411", "ME412", "ME413", "ME414", "ME415", "ME416", "ME417", "ME418", "ME419", "ME420", "ME421", "ME422"].map((code) =>
          createRecord({ courseCode: CourseCode.from(code, ""), category: CreditCategory.from("전선") }),
        ),
        createRecord({ courseCode: CourseCode.from("ME490", ""), category: CreditCategory.from("연구") }),
      ],
    );

    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "basis-minimum")?.matchedCourseCount).toBe(4);
    expect(result.programAnalysis?.creditBuckets.find((bucket) => bucket.id === "advanced-major")?.fulfilled).toBe(false);
  });
});
