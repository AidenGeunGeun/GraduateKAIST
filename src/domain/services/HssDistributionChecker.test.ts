import { describe, expect, it } from "vitest";

import { CreditCategory } from "@/domain/models/CreditCategory";
import { HssDistributionChecker } from "@/domain/services/HssDistributionChecker";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("T8 인선 distribution", () => {
  it("T8.1 fulfills with 3 계열 and 21 credits", () => {
    const records = [
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 9 }),
      createRecord({ category: CreditCategory.from("인선(사일)"), credits: 6 }),
      createRecord({ category: CreditCategory.from("인선(예일)"), credits: 6 }),
    ];

    const result = HssDistributionChecker.check(records, false);
    expect(result.fulfilled).toBe(true);
  });

  it("T8.2 fails when only one 계열 is present", () => {
    const records = [createRecord({ category: CreditCategory.from("인선(인일)"), credits: 21 })];

    const result = HssDistributionChecker.check(records, false);
    expect(result.fulfilled).toBe(false);
  });

  it("T8.3 fails when total is below 21", () => {
    const records = [
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 12 }),
      createRecord({ category: CreditCategory.from("인선(사일)"), credits: 6 }),
    ];

    const result = HssDistributionChecker.check(records, false);
    expect(result.fulfilled).toBe(false);
    expect(result.totalCredits).toBe(18);
  });

  it("T8.4 fulfills with two 계열 and 21 credits", () => {
    const records = [
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 12 }),
      createRecord({ category: CreditCategory.from("인선(사일)"), credits: 9 }),
    ];

    const result = HssDistributionChecker.check(records, false);
    expect(result.fulfilled).toBe(true);
  });

  it("T8.5 maps 인핵 to 인문 계열", () => {
    const records = [
      createRecord({ category: CreditCategory.from("인선(인핵)"), credits: 3 }),
      createRecord({ category: CreditCategory.from("인선(사일)"), credits: 3 }),
    ];

    const result = HssDistributionChecker.check(records, false);
    expect(result.gyeyolCredits.get("인문")).toBe(3);
    expect(result.gyeyolCredits.get("사회")).toBe(3);
    expect(result.fulfilled).toBe(false);
  });

  it("T8.6 applies relaxed dual-major rule", () => {
    const records = [createRecord({ category: CreditCategory.from("인선(인일)"), credits: 12 })];

    const result = HssDistributionChecker.check(records, true);
    expect(result.fulfilled).toBe(true);
  });
});
