import { describe, expect, it } from "vitest";

import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { Transcript } from "@/domain/models/Transcript";
import { createRecord } from "@/domain/test-utils/createRecord";

function earnedCreditsByCategory(transcript: Transcript, categoryValue: string): number {
  return transcript
    .earnedRecords()
    .filter((record) => record.category.value === categoryValue)
    .reduce((sum, record) => sum + record.credits, 0);
}

describe("T7 Category credit counting", () => {
  it("T7.1 counts earned 기초필수 credits", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("기필"), credits: 3 }),
      createRecord({ category: CreditCategory.from("기필"), credits: 3 }),
      createRecord({ category: CreditCategory.from("기필"), credits: 3 }),
    ]);

    expect(earnedCreditsByCategory(transcript, "기초필수")).toBe(9);
  });

  it("T7.2 excludes F credits from earned totals", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("기필"), credits: 3, gradeFinal: Grade.from("A0") }),
      createRecord({ category: CreditCategory.from("기필"), credits: 3, gradeFinal: Grade.from("B0") }),
      createRecord({ category: CreditCategory.from("기필"), credits: 3, gradeFinal: Grade.from("F") }),
    ]);

    expect(earnedCreditsByCategory(transcript, "기초필수")).toBe(6);
  });

  it("T7.3 excludes Z-flagged major required credits", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("전필"), credits: 3, retakeFlag: "Z" }),
    ]);

    expect(earnedCreditsByCategory(transcript, "전공필수")).toBe(0);
  });

  it("T7.4 does not count AU in 교양필수 credit totals", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("교필"), credits: 0, au: 2, gradeFinal: Grade.from("S") }),
    ]);

    expect(earnedCreditsByCategory(transcript, "교양필수")).toBe(0);
  });

  it("T7.5 combines major required and elective to major total", () => {
    const transcript = Transcript.from([
      createRecord({ category: CreditCategory.from("전필"), credits: 9 }),
      createRecord({ category: CreditCategory.from("전선"), credits: 12 }),
    ]);

    const majorRequired = earnedCreditsByCategory(transcript, "전공필수");
    const majorElective = earnedCreditsByCategory(transcript, "전공선택");

    expect(majorRequired + majorElective).toBe(21);
  });
});
