import { describe, expect, it } from "vitest";

import { CreditCategory } from "@/domain/models/CreditCategory";

describe("T3 CreditCategory parsing", () => {
  it("T3.1 parses 기필", () => {
    expect(CreditCategory.from("기필").value).toBe("기초필수");
  });

  it("T3.2 parses 인선(예일)", () => {
    expect(CreditCategory.from("인선(예일)").value).toBe("인선_예술");
  });

  it("T3.3 parses 인선(인핵) and maps to 인문", () => {
    const category = CreditCategory.from("인선(인핵)");

    expect(category.value).toBe("인선_인핵");
    expect(category.toGyeyol()).toBe("인문");
  });

  it("T3.4 parses 인선(인일)", () => {
    expect(CreditCategory.from("인선(인일)").value).toBe("인선_인문");
  });

  it("T3.5 parses 인선(사일)", () => {
    expect(CreditCategory.from("인선(사일)").value).toBe("인선_사회");
  });

  it("T3.6 parses 전필", () => {
    expect(CreditCategory.from("전필").value).toBe("전공필수");
  });

  it("T3.7 parses 자선", () => {
    expect(CreditCategory.from("자선").value).toBe("자유선택");
  });

  it("T3.8 parses 선택", () => {
    expect(CreditCategory.from("선택").value).toBe("선택");
  });
});
