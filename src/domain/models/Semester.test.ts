import { describe, expect, it } from "vitest";

import { Semester } from "@/domain/models/Semester";

describe("T2 Semester Value Object", () => {
  it("T2.1 parses spring semester", () => {
    const semester = Semester.fromText("2022년 봄학기");

    expect(semester.year).toBe(2022);
    expect(semester.season).toBe("봄");
    expect(semester.isPreEnrollment).toBe(false);
  });

  it("T2.2 parses winter semester", () => {
    const semester = Semester.fromText("2022년 겨울학기");

    expect(semester.year).toBe(2022);
    expect(semester.season).toBe("겨울");
  });

  it("T2.3 parses pre-enrollment semester", () => {
    const semester = Semester.fromText("기이수 인정 학점");

    expect(semester.isPreEnrollment).toBe(true);
  });

  it("T2.4 compares spring before fall in same year", () => {
    const spring = Semester.fromText("2022년 봄학기");
    const fall = Semester.fromText("2022년 가을학기");

    expect(Semester.compare(spring, fall)).toBeLessThan(0);
  });

  it("T2.5 compares earlier year before later year", () => {
    const fall2021 = Semester.fromText("2021년 가을학기");
    const spring2022 = Semester.fromText("2022년 봄학기");

    expect(Semester.compare(fall2021, spring2022)).toBeLessThan(0);
  });

  it("T2.6 sorts pre-enrollment before regular semesters", () => {
    const pre = Semester.fromText("기이수 인정 학점");
    const spring = Semester.fromText("2022년 봄학기");

    const sorted = [spring, pre].sort(Semester.compare);
    expect(sorted[0].isPreEnrollment).toBe(true);
  });
});
