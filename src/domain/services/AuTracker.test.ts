import { describe, expect, it } from "vitest";

import { getRequirements } from "@/domain/configs/requirements";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { AuTracker } from "@/domain/services/AuTracker";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("AU tracking (4AU common-only)", () => {
  it("tracks 3 categories and fulfills at 2+1+1", () => {
    const requirements = getRequirements(2022);
    const records = [
      createRecord({ nameKo: "인성리더십I", credits: 0, au: 1, gradeFinal: Grade.from("S") }),
      createRecord({ nameKo: "인성리더십II", credits: 0, au: 1, gradeFinal: Grade.from("S") }),
      createRecord({ nameKo: "즐거운 대학생활", credits: 0, au: 1, gradeFinal: Grade.from("S") }),
      createRecord({ nameKo: "신나는 대학생활", credits: 0, au: 1, gradeFinal: Grade.from("S") }),
    ];

    const { auResult } = AuTracker.track(records, requirements.auCategories, true);
    expect(auResult.totalRequired).toBe(4);
    expect(Object.keys(auResult.categories).sort()).toEqual(["신나는", "인성/리더십", "즐거운"].sort());
    expect(auResult.fulfilled).toBe(true);
  });

  it("excludes R-grade AU from earned progress", () => {
    const requirements = getRequirements(2024);
    const records = [
      createRecord({
        nameKo: "즐거운 대학생활",
        credits: 0,
        au: 1,
        gradeFinal: Grade.from("R"),
      }),
    ];

    const { auResult } = AuTracker.track(records, requirements.auCategories, false);
    expect(auResult.categories.즐거운.earned).toBe(0);
    expect(auResult.categories.즐거운.fulfilled).toBe(false);
  });

  it("converts pre-2023 체육 AU to credits and excludes it from AU completion", () => {
    const requirements = getRequirements(2022);
    const records = [
      createRecord({
        category: CreditCategory.from("교필"),
        nameKo: "체육",
        credits: 0,
        au: 2,
        gradeFinal: Grade.from("S"),
      }),
      createRecord({
        category: CreditCategory.from("교필"),
        nameKo: "체력육성",
        credits: 0,
        au: 2,
        gradeFinal: Grade.from("S"),
      }),
    ];

    const { auResult, convertedPeCredits } = AuTracker.track(records, requirements.auCategories, true);
    expect(convertedPeCredits).toBe(4);
    expect(auResult.totalEarned).toBe(0);
    expect(auResult.fulfilled).toBe(false);
  });

  it("does not convert 체육 AU for 2023+", () => {
    const requirements = getRequirements(2023);
    const records = [
      createRecord({
        category: CreditCategory.from("교필"),
        nameKo: "체육",
        credits: 0,
        au: 2,
        gradeFinal: Grade.from("S"),
      }),
    ];

    const { convertedPeCredits } = AuTracker.track(records, requirements.auCategories, false);
    expect(convertedPeCredits).toBe(0);
  });

  it("does not mark overall AU fulfilled with imbalanced categories", () => {
    const requirements = getRequirements(2025);
    const records = [
      createRecord({ nameKo: "인성리더십I", credits: 0, au: 2, gradeFinal: Grade.from("S") }),
      createRecord({ nameKo: "인성리더십II", credits: 0, au: 2, gradeFinal: Grade.from("S") }),
    ];

    const { auResult } = AuTracker.track(records, requirements.auCategories, false);
    expect(auResult.totalEarned).toBe(4);
    expect(auResult.categories.즐거운.fulfilled).toBe(false);
    expect(auResult.fulfilled).toBe(false);
  });
});
