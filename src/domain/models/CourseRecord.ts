import type { LifecycleState, RetakeFlag } from "@/domain/types";

import { CourseCode } from "@/domain/models/CourseCode";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";

interface CourseRecordProps {
  semester: Semester;
  department: string;
  courseCode: CourseCode;
  section: string;
  category: CreditCategory;
  nameKo: string;
  nameEn: string;
  credits: number;
  au: number;
  retakeFlag: RetakeFlag;
  gradeOriginal: Grade;
  gradeFinal: Grade;
}

export class CourseRecord {
  readonly semester: Semester;

  readonly department: string;

  readonly courseCode: CourseCode;

  readonly section: string;

  readonly category: CreditCategory;

  readonly nameKo: string;

  readonly nameEn: string;

  readonly credits: number;

  readonly au: number;

  readonly retakeFlag: RetakeFlag;

  readonly gradeOriginal: Grade;

  readonly gradeFinal: Grade;

  constructor(props: CourseRecordProps) {
    this.semester = props.semester;
    this.department = props.department.trim();
    this.courseCode = props.courseCode;
    this.section = props.section.trim();
    this.category = props.category;
    this.nameKo = props.nameKo.trim();
    this.nameEn = props.nameEn.trim();
    this.credits = props.credits;
    this.au = props.au;
    this.retakeFlag = props.retakeFlag;
    this.gradeOriginal = props.gradeOriginal;
    this.gradeFinal = props.gradeFinal;
  }

  get lifecycleState(): LifecycleState {
    if (this.retakeFlag === "Z") {
      return "Superseded";
    }

    if (this.gradeFinal.display === "F") {
      return "Failed";
    }

    if (["W", "R", "I", "U", "NR"].includes(this.gradeFinal.display)) {
      return "Incomplete";
    }

    return "Active";
  }

  get isAuCourse(): boolean {
    return this.credits === 0 && this.au > 0;
  }
}
