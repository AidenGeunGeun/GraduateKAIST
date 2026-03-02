import * as XLSX from "xlsx";

import { CourseCode } from "@/domain/models/CourseCode";
import { CourseRecord } from "@/domain/models/CourseRecord";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";
import type { RetakeFlag } from "@/domain/types";

const COLUMN_INDEX = {
  semester: 0,
  department: 1,
  newCode: 2,
  oldCode: 3,
  section: 4,
  category: 5,
  nameKo: 6,
  nameEn: 7,
  credits: 8,
  au: 9,
  retakeFlag: 10,
  gradeOriginal: 11,
  gradeFinal: 12,
} as const;

function asText(value: XLSX.CellObject["v"] | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function asNumber(value: XLSX.CellObject["v"] | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export class ExcelTranscriptParser {
  parse(file: ArrayBuffer): CourseRecord[] {
    const workbook = XLSX.read(file, { type: "array" });
    const firstSheet = workbook.SheetNames[0];

    if (!firstSheet) {
      return [];
    }

    const worksheet = workbook.Sheets[firstSheet];
    const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
    const headerRow = this.findHeaderRow(worksheet, range.e.r);
    const records: CourseRecord[] = [];
    let currentSemester = "";

    for (let row = headerRow + 1; row <= range.e.r; row += 1) {
      const rowValues = this.readRow(worksheet, row);
      const isEmpty = rowValues.every((value) => value === "");

      if (isEmpty) {
        continue;
      }

      const semesterText = rowValues[COLUMN_INDEX.semester] || currentSemester;
      if (!semesterText) {
        continue;
      }

      currentSemester = semesterText;

      const oldCode = rowValues[COLUMN_INDEX.oldCode];
      const newCode = rowValues[COLUMN_INDEX.newCode] || `${oldCode}.00000`;
      const finalGradeRaw = rowValues[COLUMN_INDEX.gradeFinal];
      const originalGradeRaw = rowValues[COLUMN_INDEX.gradeOriginal] || finalGradeRaw;

      if (!oldCode || !finalGradeRaw) {
        continue;
      }

      const retakeFlagRaw = rowValues[COLUMN_INDEX.retakeFlag] || "N";
      const retakeFlag = (["N", "Y", "Z"].includes(retakeFlagRaw)
        ? retakeFlagRaw
        : "N") as RetakeFlag;

      records.push(
        new CourseRecord({
          semester: Semester.fromText(semesterText),
          department: rowValues[COLUMN_INDEX.department],
          courseCode: CourseCode.from(oldCode, newCode),
          section: rowValues[COLUMN_INDEX.section],
          category: CreditCategory.from(rowValues[COLUMN_INDEX.category]),
          nameKo: rowValues[COLUMN_INDEX.nameKo],
          nameEn: rowValues[COLUMN_INDEX.nameEn],
          credits: asNumber(worksheet[XLSX.utils.encode_cell({ r: row, c: COLUMN_INDEX.credits })]?.v),
          au: asNumber(worksheet[XLSX.utils.encode_cell({ r: row, c: COLUMN_INDEX.au })]?.v),
          retakeFlag,
          gradeOriginal: Grade.from(originalGradeRaw),
          gradeFinal: Grade.from(finalGradeRaw),
        }),
      );
    }

    return records;
  }

  private findHeaderRow(sheet: XLSX.WorkSheet, lastRow: number): number {
    const maxScanRows = Math.min(lastRow, 15);

    for (let row = 0; row <= maxScanRows; row += 1) {
      const rowTexts = [];
      for (let col = 0; col <= 12; col += 1) {
        rowTexts.push(asText(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v));
      }

      const hasSemesterHeader = rowTexts.some(
        (text) => text.includes("학년도") || text.includes("학기"),
      );

      if (hasSemesterHeader) {
        return row;
      }
    }

    return 0;
  }

  private readRow(sheet: XLSX.WorkSheet, row: number): string[] {
    const values: string[] = [];

    for (let col = 0; col <= 12; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      values.push(asText(cell?.v));
    }

    return values;
  }
}
