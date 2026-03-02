import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REQUIREMENTS_2019,
  REQUIREMENTS_2020,
  REQUIREMENTS_2022,
  REQUIREMENTS_2023,
  REQUIREMENTS_2025,
  applyTrackModification,
  getRequirements,
} from "@/domain/configs/requirements";

describe("Requirement factory and track modifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("T1 resolves 2019 config with 138/4 and no HSS core type requirement", () => {
    const requirements = getRequirements(2019);
    expect(requirements).toBe(REQUIREMENTS_2019);
    expect(requirements.totalCredits).toBe(138);
    expect(requirements.auTotal).toBe(4);
    expect(requirements.hasHssCoreTypeRequirement).toBe(false);
  });

  it("T2 resolves 2023 config with HSS core type requirement", () => {
    const requirements = getRequirements(2023);
    expect(requirements).toBe(REQUIREMENTS_2023);
    expect(requirements.totalCredits).toBe(138);
    expect(requirements.auTotal).toBe(4);
    expect(requirements.hasHssCoreTypeRequirement).toBe(true);
  });

  it("maps all supported years to expected year groups", () => {
    expect(getRequirements(2020)).toBe(REQUIREMENTS_2020);
    expect(getRequirements(2021)).toBe(REQUIREMENTS_2020);
    expect(getRequirements(2022)).toBe(REQUIREMENTS_2022);
    expect(getRequirements(2024)).toBe(REQUIREMENTS_2023);
    expect(getRequirements(2025)).toBe(REQUIREMENTS_2025);
  });

  it("T3 applies 복수전공 modification (인선 12, 연구 0, 기초선택 6)", () => {
    const modified = applyTrackModification(getRequirements(2022), "복수전공");
    expect(modified.common.인선.required).toBe(12);
    expect(modified.common.연구.required).toBe(0);
    expect(modified.common.기초선택.required).toBe(6);
    expect(modified.isDualMajor).toBe(true);
  });

  it("T4 keeps common requirements unchanged for non-dual-major tracks", () => {
    const base = getRequirements(2022);

    for (const track of ["심화전공", "부전공", "자유융합전공"] as const) {
      const modified = applyTrackModification(base, track);
      expect(modified.common.인선.required).toBe(21);
      expect(modified.common.연구.required).toBe(3);
      expect(modified.common.기초선택.required).toBe(9);
      expect(modified.isDualMajor).toBe(false);
    }
  });

  it("T9 falls back to nearest year group with warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const lower = getRequirements(2017);
    const upper = getRequirements(2026);

    expect(lower).toBe(REQUIREMENTS_2019);
    expect(upper).toBe(REQUIREMENTS_2025);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
