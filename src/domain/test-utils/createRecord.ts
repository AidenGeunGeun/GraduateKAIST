import { CourseCode } from "@/domain/models/CourseCode";
import { CourseRecord } from "@/domain/models/CourseRecord";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";

type RecordInput = ConstructorParameters<typeof CourseRecord>[0];

export function createRecord(overrides: Partial<RecordInput> = {}): CourseRecord {
  const defaults: RecordInput = {
    semester: Semester.fromText("2022년 봄학기"),
    department: "항공우주공학과",
    courseCode: CourseCode.from("AE210", "AE.21000"),
    section: "A",
    category: CreditCategory.from("전필"),
    nameKo: "테스트 과목",
    nameEn: "Test Course",
    credits: 3,
    au: 0,
    retakeFlag: "N",
    gradeOriginal: Grade.from("A+"),
    gradeFinal: Grade.from("A+"),
  };

  return new CourseRecord({ ...defaults, ...overrides });
}
