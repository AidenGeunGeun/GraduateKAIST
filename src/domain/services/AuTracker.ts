import { CourseRecord } from "@/domain/models/CourseRecord";
import type { AuCategoryName, AuCategoryRequirement, AuResult } from "@/domain/types";

function classifyAuSubcategory(nameKo: string): AuCategoryName | "PE_CONVERT" | null {
  if (/체육|체력/.test(nameKo)) {
    return "PE_CONVERT";
  }

  if (/인성[\s/]*리더십/.test(nameKo)) {
    return "인성/리더십";
  }

  if (/즐거운\s*대학생활|즐거운/.test(nameKo)) {
    return "즐거운";
  }

  if (/신나는\s*대학생활|신나는/.test(nameKo)) {
    return "신나는";
  }

  return null;
}

export class AuTracker {
  static track(
    auRecords: CourseRecord[],
    auCategories: AuCategoryRequirement[],
    shouldConvertPeToCredits: boolean,
  ): { auResult: AuResult; convertedPeCredits: number } {
    const required: Record<AuCategoryName, number> = {
      "인성/리더십": 0,
      즐거운: 0,
      신나는: 0,
    };
    const earned: Record<AuCategoryName, number> = {
      "인성/리더십": 0,
      즐거운: 0,
      신나는: 0,
    };
    let convertedPeCredits = 0;

    for (const category of auCategories) {
      required[category.name] = category.required;
    }

    for (const record of auRecords) {
      if (!record.isAuCourse || !record.gradeFinal.earnsCreditOnPass) {
        continue;
      }

      const subcategory = classifyAuSubcategory(record.nameKo);
      if (!subcategory) {
        continue;
      }

      if (subcategory === "PE_CONVERT") {
        if (shouldConvertPeToCredits) {
          convertedPeCredits += record.au;
        }
        continue;
      }

      earned[subcategory] += record.au;
    }

    const categories: AuResult["categories"] = {
      "인성/리더십": {
        earned: earned["인성/리더십"],
        required: required["인성/리더십"],
        fulfilled: earned["인성/리더십"] >= required["인성/리더십"],
      },
      즐거운: {
        earned: earned.즐거운,
        required: required.즐거운,
        fulfilled: earned.즐거운 >= required.즐거운,
      },
      신나는: {
        earned: earned.신나는,
        required: required.신나는,
        fulfilled: earned.신나는 >= required.신나는,
      },
    };

    const totalEarned = Object.values(earned).reduce((sum, value) => sum + value, 0);
    const totalRequired = Object.values(required).reduce((sum, value) => sum + value, 0);
    const fulfilled = Object.values(categories).every((category) => category.fulfilled);

    return {
      auResult: {
        categories,
        totalEarned,
        totalRequired,
        fulfilled,
      },
      convertedPeCredits,
    };
  }
}
