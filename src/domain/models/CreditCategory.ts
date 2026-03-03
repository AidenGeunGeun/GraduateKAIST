import type { CreditCategoryValue, Gyeyol } from "@/domain/types";

const HSS_PREFIX = "인선";

const RAW_CATEGORY_MAP: Record<string, CreditCategoryValue> = {
  기필: "기초필수",
  기선: "기초선택",
  교필: "교양필수",
  전필: "전공필수",
  전선: "전공선택",
  자선: "자유선택",
  연구: "연구",
  선택: "선택",
};

const HSS_SUBCATEGORY_MAP: Record<string, CreditCategoryValue> = {
  인일: "인선_인문",
  사일: "인선_사회",
  예일: "인선_예술",
  인핵: "인선_인핵",
};

const GYEYOL_MAP: Partial<Record<CreditCategoryValue, Gyeyol>> = {
  인선_인문: "인문",
  인선_인핵: "인문",
  인선_사회: "사회",
  인선_예술: "예술",
};

export class CreditCategory {
  readonly value: CreditCategoryValue;

  private constructor(value: CreditCategoryValue) {
    this.value = value;
  }

  static tryFrom(raw: string): CreditCategory | null {
    const normalized = raw.trim();

    if (normalized.startsWith(HSS_PREFIX)) {
      const subcategory = normalized.match(/\(([^)]+)\)/)?.[1] ?? "";
      const mapped = HSS_SUBCATEGORY_MAP[subcategory];
      if (!mapped) {
        return null;
      }

      return new CreditCategory(mapped);
    }

    const mapped = RAW_CATEGORY_MAP[normalized];
    if (!mapped) {
      return null;
    }

    return new CreditCategory(mapped);
  }

  static from(raw: string): CreditCategory {
    const category = CreditCategory.tryFrom(raw);

    if (!category) {
      throw new Error(`Invalid credit category: ${raw}`);
    }

    return category;
  }

  toGyeyol(): Gyeyol | null {
    return GYEYOL_MAP[this.value] ?? null;
  }
}
