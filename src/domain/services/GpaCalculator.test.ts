import { describe, expect, it } from "vitest";

import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";
import { Transcript } from "@/domain/models/Transcript";
import { GpaCalculator } from "@/domain/services/GpaCalculator";
import { createRecord } from "@/domain/test-utils/createRecord";

function getSemesterGpa(
  bySemester: Map<Semester, number>,
  semesterLabel: string,
): number | undefined {
  for (const [semester, gpa] of bySemester.entries()) {
    if (semester.toString() === semesterLabel) {
      return gpa;
    }
  }

  return undefined;
}

describe("T6 GPA calculation", () => {
  it("T6.1 calculates normal cumulative GPA", () => {
    const transcript = Transcript.from([
      createRecord({ gradeFinal: Grade.from("A+"), credits: 3 }),
      createRecord({ gradeFinal: Grade.from("B0"), credits: 3 }),
    ]);

    expect(GpaCalculator.calculateCumulative(transcript)).toBeCloseTo(3.65, 2);
  });

  it("T6.2 includes F in denominator", () => {
    const transcript = Transcript.from([
      createRecord({ gradeFinal: Grade.from("A+"), credits: 3 }),
      createRecord({ gradeFinal: Grade.from("F"), credits: 3 }),
    ]);

    expect(GpaCalculator.calculateCumulative(transcript)).toBeCloseTo(2.15, 2);
  });

  it("T6.3 excludes S from GPA", () => {
    const transcript = Transcript.from([
      createRecord({ gradeFinal: Grade.from("A+"), credits: 3 }),
      createRecord({ gradeFinal: Grade.from("S"), credits: 3 }),
    ]);

    expect(GpaCalculator.calculateCumulative(transcript)).toBeCloseTo(4.3, 2);
  });

  it("T6.4 excludes Z record entirely", () => {
    const transcript = Transcript.from([
      createRecord({ gradeFinal: Grade.from("B0"), credits: 3, retakeFlag: "Z" }),
    ]);

    expect(GpaCalculator.calculateCumulative(transcript)).toBe(0);
  });

  it("T6.5 calculates per-semester GPA", () => {
    const transcript = Transcript.from([
      createRecord({
        semester: Semester.fromText("2022년 봄학기"),
        gradeFinal: Grade.from("A+"),
      }),
      createRecord({
        semester: Semester.fromText("2022년 가을학기"),
        gradeFinal: Grade.from("B0"),
      }),
    ]);

    const bySemester = GpaCalculator.calculateBySemester(transcript);

    expect(getSemesterGpa(bySemester, "2022년 봄학기")).toBeCloseTo(4.3, 2);
    expect(getSemesterGpa(bySemester, "2022년 가을학기")).toBeCloseTo(3.0, 2);
  });

  it("T6.6 returns 0 when GPA-visible records do not exist", () => {
    const transcript = Transcript.from([
      createRecord({ gradeFinal: Grade.from("S"), credits: 3 }),
    ]);

    expect(GpaCalculator.calculateCumulative(transcript)).toBe(0);
  });

  it("T6.7 includes only letter grades in mixed set", () => {
    const transcript = Transcript.from([
      createRecord({ gradeFinal: Grade.from("A0"), credits: 3 }),
      createRecord({ gradeFinal: Grade.from("P"), credits: 3 }),
      createRecord({ gradeFinal: Grade.from("W"), credits: 1 }),
    ]);

    expect(GpaCalculator.calculateCumulative(transcript)).toBeCloseTo(4.0, 2);
  });

  it("T6.8 calculates what-if GPA", () => {
    const projected = GpaCalculator.whatIf(3.5, 90, 15, Grade.from("B+"));
    expect(projected).toBeCloseTo((3.5 * 90 + 3.3 * 15) / 105, 10);
  });
});
