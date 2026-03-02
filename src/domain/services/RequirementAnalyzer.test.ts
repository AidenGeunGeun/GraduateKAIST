import { describe, expect, it } from "vitest";

import { applyTrackModification, getRequirements } from "@/domain/configs/requirements";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Transcript } from "@/domain/models/Transcript";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import { createRecord } from "@/domain/test-utils/createRecord";

describe("RequirementAnalyzer common-only mode", () => {
  it("AC1 resolves 2019-2025 to 138 credits and 4 AU", () => {
    for (const year of [2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
      const requirements = getRequirements(year);
      expect(requirements.totalCredits).toBe(138);
      expect(requirements.auTotal).toBe(4);
    }
  });

  it("T7 returns 전공합계 from 전필+전선 with required 40", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("전필"), credits: 15 }),
      createRecord({ category: CreditCategory.from("전선"), credits: 20 }),
    ]);

    const requirements = applyTrackModification(getRequirements(2022), "심화전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);
    const majorTotal = result.categories.find((category) => category.category === "전공합계");

    expect(majorTotal?.creditsEarned).toBe(35);
    expect(majorTotal?.creditsRequired).toBe(40);
    expect(majorTotal?.fulfilled).toBe(false);
  });

  it("T3 applies 복수전공 modifications to 인선 and 연구 in analysis", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 12 }),
      createRecord({ category: CreditCategory.from("자선"), credits: 40 }),
    ]);

    const requirements = applyTrackModification(getRequirements(2022), "복수전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);
    const hss = result.categories.find((category) => category.category === "인선");
    const research = result.categories.find((category) => category.category === "연구");

    expect(hss?.creditsRequired).toBe(12);
    expect(hss?.fulfilled).toBe(true);
    expect(research?.creditsRequired).toBe(0);
    expect(research?.fulfilled).toBe(true);
  });

  it("T6 converts pre-2023 체육 AU to credits", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("자선"), credits: 130 }),
      createRecord({ nameKo: "체육", credits: 0, au: 2, category: CreditCategory.from("교필") }),
      createRecord({ nameKo: "체력육성", credits: 0, au: 2, category: CreditCategory.from("교필") }),
    ]);

    const requirements = applyTrackModification(getRequirements(2022), "심화전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);

    expect(result.totalCreditsEarned).toBe(134);
  });

  it("keeps HSS distribution warning when categories are imbalanced", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("인선(인일)"), credits: 21 }),
    ]);

    const requirements = applyTrackModification(getRequirements(2020), "심화전공");
    const result = RequirementAnalyzer.analyze(transcript, requirements);

    expect(result.warnings.some((warning) => warning.type === "HSS_DISTRIBUTION_INCOMPLETE")).toBe(true);
  });
});
