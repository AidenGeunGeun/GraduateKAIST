import { describe, expect, it } from "vitest";

import { CourseCode } from "@/domain/models/CourseCode";

describe("CourseCode", () => {
  it("keeps old-format numeric parts unchanged", () => {
    expect(CourseCode.from("AE350", "").numericPart).toBe(350);
  });

  it("derives approximate hundred-levels for dotted 5-digit codes", () => {
    expect(CourseCode.from("ME.20005", "").numericPart).toBe(200);
  });

  it("derives approximate hundred-levels for non-dotted 5-digit codes", () => {
    expect(CourseCode.from("AE30000", "").numericPart).toBe(300);
  });

  it("keeps department prefix extraction working for dotted codes", () => {
    expect(CourseCode.from("ME.20005", "").departmentPrefix).toBe("ME");
  });
});
