import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ROOT, buildPlannerDataset, buildCodeEquivalenceLookup, deriveLevel } from "./kaist-data-pipeline.mjs";

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

function findProgram(dataset: Awaited<ReturnType<typeof buildPlannerDataset>>, criteria: {
  department: string;
  admissionYear: number;
  programType: string;
}) {
  const program = dataset.programs.find(
    (entry) =>
      entry.department === criteria.department &&
      entry.programType === criteria.programType &&
      entry.admissionYearRange[0] <= criteria.admissionYear &&
      entry.admissionYearRange[1] >= criteria.admissionYear,
  );

  expect(program).toBeDefined();
  return program!;
}

describe("KAIST data pipeline code equivalence", () => {
  it("loads the 19-pair map and builds bidirectional dotted/non-dotted variants", async () => {
    const mapPath = path.join(ROOT, "references/kaist-data/reviewed/code-equivalence-map.json");
    const map = JSON.parse(await readFile(mapPath, "utf8"));
    const lookup = buildCodeEquivalenceLookup(map);

    expect(map.pairs).toHaveLength(19);
    expect(lookup.get("ME303")).toEqual(sorted(["ME.20005", "ME20005"]));
    expect(lookup.get("ME.20005")).toEqual(sorted(["ME303", "ME20005"]));
    expect(lookup.get("ME20005")).toEqual(sorted(["ME303", "ME.20005"]));
    expect(lookup.get("AE210")).toEqual(sorted(["AE21000", "AE.21000"]));
    expect(lookup.get("AE21000")).toEqual(sorted(["AE210", "AE.21000"]));
    expect(lookup.get("AE.21000")).toEqual(sorted(["AE210", "AE21000"]));
  });

  it("enriches required-course slots and credit buckets with equivalent codes", async () => {
    const dataset = await buildPlannerDataset();
    const expected = ["ME303", "ME.20005", "ME20005"];

    const oldMajor = findProgram(dataset, { department: "ME", admissionYear: 2022, programType: "심화전공" });
    const oldSlot = oldMajor.requiredCourseSlots.find((slot: { id: string }) => slot.id === "me303");
    expect(oldSlot?.acceptedCourseCodes).toEqual(expect.arrayContaining(expected));

    const newMajor = findProgram(dataset, { department: "ME", admissionYear: 2025, programType: "심화전공" });
    const newSlot = newMajor.requiredCourseSlots.find((slot: { id: string }) => slot.id === "me303");
    expect(newSlot?.acceptedCourseCodes).toEqual(expect.arrayContaining(expected));

    const oldMinor = findProgram(dataset, { department: "ME", admissionYear: 2022, programType: "부전공" });
    const oldBucket = oldMinor.creditBuckets.find((bucket: { id: string }) => bucket.id === "minor-required-slots");
    expect(oldBucket?.eligibleCourseCodes).toEqual(expect.arrayContaining(expected));

    const newMinor = findProgram(dataset, { department: "ME", admissionYear: 2025, programType: "부전공" });
    const newBucket = newMinor.creditBuckets.find((bucket: { id: string }) => bucket.id === "minor-required-slots");
    expect(newBucket?.eligibleCourseCodes).toEqual(expect.arrayContaining(expected));
  });

  it("derives approximate levels from 5-digit codes", () => {
    expect(deriveLevel("ME.30040")).toBe(300);
    expect(deriveLevel("CS.20004")).toBe(200);
    expect(deriveLevel("EE.40005")).toBe(400);
  });
});
