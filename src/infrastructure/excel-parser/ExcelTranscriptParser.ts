import * as XLSX from "xlsx";

import { CourseCode } from "@/domain/models/CourseCode";
import { CourseRecord } from "@/domain/models/CourseRecord";
import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";
import type { ParseResult, ParseWarning, RetakeFlag } from "@/domain/types";

const MAX_HEADER_SCAN_ROWS = 20;
const MAX_HEADER_SCAN_COLS = 30;
const SUMMARY_ROW_KEYWORDS = ["합계", "평균", "총", "소계"];

type HeaderColumnKey =
  | "semester"
  | "department"
  | "newCode"
  | "oldCode"
  | "section"
  | "category"
  | "nameKo"
  | "nameEn"
  | "credits"
  | "au"
  | "retakeFlag"
  | "gradeOriginal"
  | "gradeFinal";

type RequiredColumnKey = "semester" | "oldCode" | "category" | "credits" | "gradeFinal";

type HeaderColumnMap = Partial<Record<HeaderColumnKey, number>>;

interface HeaderCandidate {
  headerRow: number;
  columns: HeaderColumnMap;
  detectedCount: number;
}

const REQUIRED_COLUMNS: RequiredColumnKey[] = ["semester", "oldCode", "category", "credits", "gradeFinal"];

const REQUIRED_COLUMN_LABELS: Record<RequiredColumnKey, string> = {
  semester: "학년도/학기",
  oldCode: "과목번호",
  category: "구분",
  credits: "학점",
  gradeFinal: "성적",
};

function asText(value: XLSX.CellObject["v"] | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeHeaderText(value: XLSX.CellObject["v"] | undefined): string {
  return asText(value).replace(/\s+/g, " ");
}

function compactHeaderText(value: XLSX.CellObject["v"] | undefined): string {
  return normalizeHeaderText(value).replace(/\s+/g, "");
}

function asNumber(value: XLSX.CellObject["v"] | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export class ExcelTranscriptParser {
  parse(file: ArrayBuffer): ParseResult {
    try {
      const workbook = XLSX.read(file, { type: "array" });
      let missingColumnWarning: ParseWarning | null = null;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          continue;
        }

        const range = this.readRange(worksheet);
        const headerCandidate = this.findHeaderCandidate(worksheet, range);
        if (!headerCandidate) {
          continue;
        }

        const missingRequired = this.findMissingRequiredColumns(headerCandidate.columns);
        if (missingRequired.length > 0) {
          if (!missingColumnWarning) {
            missingColumnWarning = {
              row: headerCandidate.headerRow + 1,
              message: `필수 열 '${REQUIRED_COLUMN_LABELS[missingRequired[0]]}'을(를) 찾을 수 없습니다.`,
            };
          }
          continue;
        }

        return this.parseSheet(worksheet, range, headerCandidate.headerRow, headerCandidate.columns);
      }

      if (missingColumnWarning) {
        return this.emptyResult([missingColumnWarning]);
      }

      return this.emptyResult([{ row: 0, message: "성적 데이터가 포함된 시트를 찾을 수 없습니다." }]);
    } catch (_error) {
      return this.emptyResult([{ row: 0, message: "엑셀 파일을 읽을 수 없습니다." }]);
    }
  }

  private parseSheet(
    sheet: XLSX.WorkSheet,
    range: XLSX.Range,
    headerRow: number,
    columns: HeaderColumnMap,
  ): ParseResult {
    const records: CourseRecord[] = [];
    const warnings: ParseWarning[] = [];
    let totalRowsScanned = 0;
    let rowsParsed = 0;
    let rowsSkipped = 0;
    let currentSemester = "";

    for (let row = headerRow + 1; row <= range.e.r; row += 1) {
      const rowValues = this.readRow(sheet, row, range.e.c);

      if (rowValues.every((value) => value === "")) {
        continue;
      }

      if (this.isSummaryRow(rowValues)) {
        continue;
      }

      const semesterText = this.readCellText(sheet, row, columns.semester) || currentSemester;
      if (!semesterText) {
        continue;
      }
      currentSemester = semesterText;

      const oldCode = this.readCellText(sheet, row, columns.oldCode);
      const finalGradeRaw = this.readCellText(sheet, row, columns.gradeFinal);
      if (!oldCode || !finalGradeRaw) {
        continue;
      }

      totalRowsScanned += 1;

      const semester = Semester.tryFromText(semesterText);
      if (!semester) {
        warnings.push({ row: row + 1, message: `행 ${row + 1}: 학기 형식 오류 '${semesterText}'` });
        rowsSkipped += 1;
        continue;
      }

      const categoryRaw = this.readCellText(sheet, row, columns.category);
      const category = CreditCategory.tryFrom(categoryRaw);
      if (!category) {
        warnings.push({ row: row + 1, message: `행 ${row + 1}: 알 수 없는 이수구분 '${categoryRaw}'` });
        rowsSkipped += 1;
        continue;
      }

      const finalGrade = Grade.tryFrom(finalGradeRaw);
      if (!finalGrade) {
        warnings.push({ row: row + 1, message: `행 ${row + 1}: 알 수 없는 성적 코드 '${finalGradeRaw}'` });
        rowsSkipped += 1;
        continue;
      }

      const originalGradeRaw = this.readCellText(sheet, row, columns.gradeOriginal) || finalGradeRaw;
      const originalGrade = Grade.tryFrom(originalGradeRaw);
      if (!originalGrade) {
        warnings.push({ row: row + 1, message: `행 ${row + 1}: 알 수 없는 성적 코드 '${originalGradeRaw}'` });
        rowsSkipped += 1;
        continue;
      }

      const newCode = this.readCellText(sheet, row, columns.newCode) || `${oldCode}.00000`;
      const retakeFlagRaw = this.readCellText(sheet, row, columns.retakeFlag) || "N";
      const retakeFlag = (["N", "Y", "Z"].includes(retakeFlagRaw) ? retakeFlagRaw : "N") as RetakeFlag;

      try {
        records.push(
          new CourseRecord({
            semester,
            department: this.readCellText(sheet, row, columns.department),
            courseCode: CourseCode.from(oldCode, newCode),
            section: this.readCellText(sheet, row, columns.section),
            category,
            nameKo: this.readCellText(sheet, row, columns.nameKo),
            nameEn: this.readCellText(sheet, row, columns.nameEn),
            credits: this.readCellNumber(sheet, row, columns.credits),
            au: this.readCellNumber(sheet, row, columns.au),
            retakeFlag,
            gradeOriginal: originalGrade,
            gradeFinal: finalGrade,
          }),
        );
        rowsParsed += 1;
      } catch (_error) {
        warnings.push({ row: row + 1, message: `행 ${row + 1}: 행 데이터를 해석할 수 없습니다.` });
        rowsSkipped += 1;
      }
    }

    return {
      records,
      warnings,
      totalRowsScanned,
      rowsParsed,
      rowsSkipped,
    };
  }

  private findHeaderCandidate(sheet: XLSX.WorkSheet, range: XLSX.Range): HeaderCandidate | null {
    const maxRow = Math.min(range.e.r, MAX_HEADER_SCAN_ROWS - 1);
    const maxCol = Math.min(range.e.c, MAX_HEADER_SCAN_COLS - 1);
    let bestCandidate: HeaderCandidate | null = null;

    for (let row = 0; row <= maxRow; row += 1) {
      const columns = this.detectHeaderColumns(sheet, row, maxCol);
      const detectedCount = Object.values(columns).filter((value) => value !== undefined).length;

      if (detectedCount === 0) {
        continue;
      }

      if (!bestCandidate || detectedCount > bestCandidate.detectedCount) {
        bestCandidate = { headerRow: row, columns, detectedCount };
      }
    }

    return bestCandidate;
  }

  private detectHeaderColumns(sheet: XLSX.WorkSheet, row: number, maxCol: number): HeaderColumnMap {
    const columns: HeaderColumnMap = {};
    const gradeFinalCandidates: number[] = [];

    for (let col = 0; col <= maxCol; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      const compactText = compactHeaderText(cell?.v);
      const lower = compactText.toLowerCase();
      if (!compactText) {
        continue;
      }

      if (
        columns.gradeOriginal === undefined &&
        compactText.includes("성적") &&
        compactText.includes("표기전")
      ) {
        columns.gradeOriginal = col;
        continue;
      }

      if (columns.semester === undefined && (compactText.includes("학년도") || compactText.includes("학기"))) {
        columns.semester = col;
      }

      if (columns.department === undefined && (compactText.includes("학과") || compactText.includes("소속"))) {
        columns.department = col;
      }

      if (
        columns.newCode === undefined &&
        compactText.includes("교과목") &&
        !compactText.includes("교과목명")
      ) {
        columns.newCode = col;
      }

      if (columns.oldCode === undefined && compactText.includes("과목번호")) {
        columns.oldCode = col;
      }

      if (columns.section === undefined && compactText.includes("분반")) {
        columns.section = col;
      }

      if (columns.category === undefined && compactText.includes("구분")) {
        columns.category = col;
      }

      if (columns.nameKo === undefined && compactText.includes("교과목명")) {
        columns.nameKo = col;
      }

      if (columns.nameEn === undefined && compactText.includes("영문")) {
        columns.nameEn = col;
      }

      if (columns.credits === undefined && compactText.includes("학점")) {
        columns.credits = col;
      }

      if (columns.au === undefined && lower.includes("au")) {
        columns.au = col;
      }

      if (columns.retakeFlag === undefined && compactText.includes("재수강")) {
        columns.retakeFlag = col;
      }

      if (compactText.includes("성적") && col !== columns.gradeOriginal) {
        gradeFinalCandidates.push(col);
      }
    }

    if (gradeFinalCandidates.length > 0) {
      columns.gradeFinal = gradeFinalCandidates[gradeFinalCandidates.length - 1];
    }

    return columns;
  }

  private readRange(sheet: XLSX.WorkSheet): XLSX.Range {
    return XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  }

  private readCellText(sheet: XLSX.WorkSheet, row: number, col: number | undefined): string {
    if (col === undefined) {
      return "";
    }

    return asText(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v);
  }

  private readCellNumber(sheet: XLSX.WorkSheet, row: number, col: number | undefined): number {
    if (col === undefined) {
      return 0;
    }

    return asNumber(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v);
  }

  private readRow(sheet: XLSX.WorkSheet, row: number, lastCol: number): string[] {
    const values: string[] = [];

    for (let col = 0; col <= lastCol; col += 1) {
      values.push(asText(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v));
    }

    return values;
  }

  private isSummaryRow(rowValues: string[]): boolean {
    const firstNonEmpty = rowValues.find((value) => value !== "");
    if (!firstNonEmpty) {
      return false;
    }

    return SUMMARY_ROW_KEYWORDS.some((keyword) => firstNonEmpty.includes(keyword));
  }

  private findMissingRequiredColumns(columns: HeaderColumnMap): RequiredColumnKey[] {
    return REQUIRED_COLUMNS.filter((key) => columns[key] === undefined);
  }

  private emptyResult(warnings: ParseWarning[]): ParseResult {
    return {
      records: [],
      warnings,
      totalRowsScanned: 0,
      rowsParsed: 0,
      rowsSkipped: 0,
    };
  }
}
