import { CourseRecord } from "@/domain/models/CourseRecord";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Semester } from "@/domain/models/Semester";

export class Transcript {
  readonly records: CourseRecord[];

  private constructor(records: CourseRecord[]) {
    this.records = [...records].sort((a, b) => Semester.compare(a.semester, b.semester));
  }

  static from(records: CourseRecord[]): Transcript {
    return new Transcript(records);
  }

  activeRecords(): CourseRecord[] {
    return this.records.filter((record) => record.lifecycleState !== "Superseded");
  }

  gpaRecords(): CourseRecord[] {
    return this.activeRecords().filter((record) => record.gradeFinal.isGpaVisible);
  }

  earnedRecords(): CourseRecord[] {
    return this.activeRecords().filter((record) => record.gradeFinal.earnsCreditOnPass);
  }

  recordsByCategory(category: CreditCategory | string): CourseRecord[] {
    const value = typeof category === "string" ? category : category.value;
    return this.activeRecords().filter((record) => record.category.value === value);
  }

  semesterList(): Semester[] {
    const unique = new Map<string, Semester>();

    for (const record of this.activeRecords()) {
      unique.set(record.semester.toString(), record.semester);
    }

    return [...unique.values()].sort(Semester.compare);
  }

  auRecords(): CourseRecord[] {
    return this.activeRecords().filter((record) => record.isAuCourse);
  }
}
