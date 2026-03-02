import { CourseRecord } from "@/domain/models/CourseRecord";
import type { Gyeyol, HssResult } from "@/domain/types";

const GYEYOL_LIST: Gyeyol[] = ["인문", "사회", "예술"];

export class HssDistributionChecker {
  static check(hssRecords: CourseRecord[], isDualMajor: boolean): HssResult {
    const gyeyolCredits = new Map<Gyeyol, number>([
      ["인문", 0],
      ["사회", 0],
      ["예술", 0],
    ]);

    let totalCredits = 0;

    for (const record of hssRecords) {
      if (!record.gradeFinal.earnsCreditOnPass) {
        continue;
      }

      const gyeyol = record.category.toGyeyol();
      if (!gyeyol) {
        continue;
      }

      totalCredits += record.credits;
      gyeyolCredits.set(gyeyol, (gyeyolCredits.get(gyeyol) ?? 0) + record.credits);
    }

    if (isDualMajor) {
      return {
        totalCredits,
        gyeyolCredits,
        fulfilled: totalCredits >= 12,
        missingGyeyol: [],
      };
    }

    const coveredGyeyol = GYEYOL_LIST.filter((gyeyol) => (gyeyolCredits.get(gyeyol) ?? 0) >= 3);
    const fulfilled = totalCredits >= 21 && coveredGyeyol.length >= 2;
    const missingGyeyol = GYEYOL_LIST.filter((gyeyol) => (gyeyolCredits.get(gyeyol) ?? 0) < 3);

    return {
      totalCredits,
      gyeyolCredits,
      fulfilled,
      missingGyeyol,
    };
  }
}
