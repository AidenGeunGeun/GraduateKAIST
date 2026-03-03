import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { CreditCategory } from "@/domain/models/CreditCategory";
import { Grade } from "@/domain/models/Grade";
import { Semester } from "@/domain/models/Semester";
import { ExcelTranscriptParser } from "@/infrastructure/excel-parser/ExcelTranscriptParser";

type CellValue = string | number | null;

interface SheetSpec {
  name: string;
  rows: CellValue[][];
  merges?: XLSX.Range[];
}

const STANDARD_HEADERS = [
  "학년도-학기",
  "학과",
  "교과목",
  "과목번호",
  "분반",
  "구분",
  "교과목명",
  "영문교과목명",
  "학점",
  "AU",
  "재수강",
  "성적(P/NR표기전)",
  "성적",
];

function buildWorkbook(
  rows: CellValue[][],
  merges: XLSX.Range[] = [],
  bookType: XLSX.BookType = "xlsx",
): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "성적");

  return XLSX.write(workbook, { type: "array", bookType }) as ArrayBuffer;
}

function buildWorkbookWithSheets(sheets: SheetSpec[], bookType: XLSX.BookType = "xlsx"): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    worksheet["!merges"] = sheet.merges ?? [];
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  return XLSX.write(workbook, { type: "array", bookType }) as ArrayBuffer;
}

describe("T12 Excel transcript parser", () => {
  const parser = new ExcelTranscriptParser();

  it("T12.1 parses standard ERP headers and maps fields", () => {
    const workbook = buildWorkbook([
      [
        "학년도-학기",
        "학과",
        "교과목",
        "과목번호",
        "분반",
        "구분",
        "교과목명",
        "영문교과목명",
        "학점",
        "AU",
        "재수강",
        "성적(P/NR표기전)",
        "성적",
      ],
      [
        "2022년 봄학기",
        "항공우주공학과",
        "AE.21000",
        "AE210",
        "A",
        "전필",
        "항공우주 열역학",
        "Aerospace Thermodynamics",
        3,
        0,
        "N",
        "B0",
        "A+",
      ],
    ]);

    const parseResult = parser.parse(workbook);
    const records = parseResult.records;

    expect(records).toHaveLength(1);
    expect(records[0].department).toBe("항공우주공학과");
    expect(records[0].courseCode.oldCode).toBe("AE210");
    expect(records[0].category.value).toBe("전공필수");
  });

  it("T12.2 parses regular semester string", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "A0", "A0"],
    ]);

    const [record] = parser.parse(workbook).records;
    expect(record.semester.year).toBe(2022);
    expect(record.semester.season).toBe("봄");
  });

  it("T12.3 parses pre-enrollment semester", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["기이수 인정 학점", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "A0", "A0"],
    ]);

    const [record] = parser.parse(workbook).records;
    expect(record.semester.isPreEnrollment).toBe(true);
  });

  it("T12.4 uses column M as final grade", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "B0", "A+"],
    ]);

    const [record] = parser.parse(workbook).records;
    expect(record.gradeOriginal.display).toBe("B0");
    expect(record.gradeFinal.display).toBe("A+");
  });

  it("T12.5 skips empty rows and supports merged semester cells", () => {
    const workbook = buildWorkbook(
      [
        ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
        ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "A0", "A0"],
        [null, "항공우주공학과", "AE.20800", "AE208", "A", "전필", "항공우주공학 실험I", "Aerospace Lab I", 3, 0, "N", "A0", "A0"],
        [null, null, null, null, null, null, null, null, null, null, null, null, null],
      ],
      [{ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }],
    );

    const records = parser.parse(workbook).records;
    expect(records).toHaveLength(2);
    expect(records[1].semester.toString()).toBe("2022년 봄학기");
  });

  it("T12.6 parses parenthetical category like 인선(예일)", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["2022년 가을학기", "인문사회과학부", "HSS.10000", "HSS100", "A", "인선(예일)", "서양미술사", "History of Western Art", 3, 0, "N", "A0", "A0"],
    ]);

    const [record] = parser.parse(workbook).records;
    expect(record.category.value).toBe("인선_예술");
  });
});

describe("Robust parser (T-RP)", () => {
  const parser = new ExcelTranscriptParser();

  it("T-RP1: Dynamic column detection — standard layout", () => {
    const workbook = buildWorkbook([
      STANDARD_HEADERS,
      [
        "2022년 봄학기",
        "항공우주공학과",
        "AE.21000",
        "AE210",
        "A",
        "전필",
        "항공우주 열역학",
        "Aerospace Thermodynamics",
        3,
        0,
        "N",
        "B0",
        "A+",
      ],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
    expect(result.rowsParsed).toBe(1);
    expect(result.rowsSkipped).toBe(0);
  });

  it("T-RP2: Dynamic column detection — extra columns prepended", () => {
    const workbook = buildWorkbook([
      ["학번", "이름", ...STANDARD_HEADERS],
      [
        "20250001",
        "홍길동",
        "2022년 봄학기",
        "항공우주공학과",
        "AE.21000",
        "AE210",
        "A",
        "전필",
        "항공우주 열역학",
        "Aerospace Thermodynamics",
        3,
        0,
        "N",
        "B0",
        "A+",
      ],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].courseCode.oldCode).toBe("AE210");
    expect(result.records[0].department).toBe("항공우주공학과");
  });

  it("T-RP3: Dynamic column detection — different column order", () => {
    const workbook = buildWorkbook([
      [
        "학년도-학기",
        "구분",
        "학과",
        "교과목",
        "과목번호",
        "분반",
        "교과목명",
        "영문교과목명",
        "학점",
        "AU",
        "재수강",
        "성적(P/NR표기전)",
        "성적",
      ],
      [
        "2022년 봄학기",
        "전필",
        "항공우주공학과",
        "AE.21000",
        "AE210",
        "A",
        "항공우주 열역학",
        "Aerospace Thermodynamics",
        3,
        0,
        "N",
        "B0",
        "A+",
      ],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].department).toBe("항공우주공학과");
    expect(result.records[0].category.value).toBe("전공필수");
  });

  it("T-RP4: Missing required column", () => {
    const workbook = buildWorkbook([
      [
        "학년도-학기",
        "학과",
        "교과목",
        "분반",
        "구분",
        "교과목명",
        "영문교과목명",
        "학점",
        "AU",
        "재수강",
        "성적(P/NR표기전)",
        "성적",
      ],
      ["2022년 봄학기", "항공우주공학과", "AE.21000", "A", "전필", "항공우주 열역학", "Aerospace Thermodynamics", 3, 0, "N", "B0", "A+"],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("과목번호");
  });

  it("T-RP5: Multi-sheet — transcript on second sheet", () => {
    const workbook = buildWorkbookWithSheets([
      { name: "메모", rows: [["임시 메모"], ["랜덤 텍스트"]] },
      {
        name: "성적",
        rows: [
          STANDARD_HEADERS,
          [
            "2022년 봄학기",
            "항공우주공학과",
            "AE.21000",
            "AE210",
            "A",
            "전필",
            "항공우주 열역학",
            "Aerospace Thermodynamics",
            3,
            0,
            "N",
            "B0",
            "A+",
          ],
        ],
      },
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].courseCode.oldCode).toBe("AE210");
  });

  it("T-RP6: Unknown grade code — row skipped with warning", () => {
    const workbook = buildWorkbook([
      STANDARD_HEADERS,
      ["2022년 봄학기", "항공우주공학과", "AE.21000", "AE210", "A", "전필", "항공우주 열역학", "Aerospace Thermodynamics", 3, 0, "N", "A0", "A0"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "IP", "IP"],
      ["2022년 봄학기", "항공우주공학과", "AE.23000", "AE230", "A", "전필", "추진공학", "Propulsion", 3, 0, "N", "B0", "B0"],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("IP");
  });

  it("T-RP7: Unknown category label — row skipped with warning", () => {
    const workbook = buildWorkbook([
      STANDARD_HEADERS,
      ["2022년 봄학기", "항공우주공학과", "AE.21000", "AE210", "A", "전필", "항공우주 열역학", "Aerospace Thermodynamics", 3, 0, "N", "A0", "A0"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "특별", "공기역학I", "Aerodynamics I", 3, 0, "N", "A0", "A0"],
      ["2022년 봄학기", "항공우주공학과", "AE.23000", "AE230", "A", "전필", "추진공학", "Propulsion", 3, 0, "N", "B0", "B0"],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("특별");
  });

  it("T-RP8: Summary row detection", () => {
    const workbook = buildWorkbook([
      STANDARD_HEADERS,
      ["2022년 봄학기", "항공우주공학과", "AE.21000", "AE210", "A", "전필", "항공우주 열역학", "Aerospace Thermodynamics", 3, 0, "N", "A0", "A0"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "B0", "B0"],
      ["합계", null, null, null, null, null, null, null, 6, 0, null, null, null],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.rowsSkipped).toBe(0);
  });

  it("T-RP9: Metadata rows above header", () => {
    const workbook = buildWorkbook([
      ["이름", "홍길동"],
      ["학번", "20250001"],
      ["소속", "항공우주공학과"],
      STANDARD_HEADERS,
      ["2022년 봄학기", "항공우주공학과", "AE.21000", "AE210", "A", "전필", "항공우주 열역학", "Aerospace Thermodynamics", 3, 0, "N", "A0", "A0"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "B0", "B0"],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(2);
    expect(result.records[0].courseCode.oldCode).toBe("AE210");
  });

  it("T-RP10: .xls format (via SheetJS)", () => {
    const workbook = buildWorkbook(
      [
        STANDARD_HEADERS,
        [
          "2022년 봄학기",
          "항공우주공학과",
          "AE.21000",
          "AE210",
          "A",
          "전필",
          "항공우주 열역학",
          "Aerospace Thermodynamics",
          3,
          0,
          "N",
          "A0",
          "A0",
        ],
      ],
      [],
      "biff8",
    );

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].courseCode.oldCode).toBe("AE210");
  });

  it("T-RP11: Whitespace variations in headers", () => {
    const workbook = buildWorkbook([
      [
        "학년도 - 학기",
        "학과",
        "교과목",
        " 과목번호 ",
        "분반",
        "구분",
        "교과목명",
        "영문교과목명",
        "학점",
        "AU",
        "재수강",
        "성적 (P/NR 표기전)",
        "성 적",
      ],
      [
        "2022년 봄학기",
        "항공우주공학과",
        "AE.21000",
        "AE210",
        "A",
        "전필",
        "항공우주 열역학",
        "Aerospace Thermodynamics",
        3,
        0,
        "N",
        "B0",
        "A+",
      ],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].gradeFinal.display).toBe("A+");
  });

  it("T-RP12: No valid sheet found", () => {
    const workbook = buildWorkbookWithSheets([{ name: "메모", rows: [["안녕하세요"], ["테스트 데이터"]] }]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("성적 데이터가 포함된 시트");
  });

  it("T-RP13: Grade.tryFrom returns null for unknown", () => {
    expect(Grade.tryFrom("IP")).toBeNull();

    const grade = Grade.tryFrom("A+");
    expect(grade).not.toBeNull();
    expect(grade?.points).toBe(4.3);
  });

  it("T-RP14: CreditCategory.tryFrom returns null for unknown", () => {
    expect(CreditCategory.tryFrom("특별")).toBeNull();

    const category = CreditCategory.tryFrom("전필");
    expect(category).not.toBeNull();
    expect(category?.value).toBe("전공필수");
  });

  it("T-RP15: Semester.tryFromText returns null for unknown", () => {
    expect(Semester.tryFromText("something weird")).toBeNull();

    const semester = Semester.tryFromText("2022년 봄학기");
    expect(semester).not.toBeNull();
    expect(semester?.year).toBe(2022);
    expect(semester?.season).toBe("봄");
  });

  it("T-RP16: Partial success — some good rows, some bad", () => {
    const workbook = buildWorkbook([
      STANDARD_HEADERS,
      ["2022년 봄학기", "항공우주공학과", "AE.21000", "AE210", "A", "전필", "항공우주 열역학", "Aerospace Thermodynamics", 3, 0, "N", "A0", "A0"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "B0", "B0"],
      ["2022년 봄학기", "항공우주공학과", "AE.23000", "AE230", "A", "전필", "추진공학", "Propulsion", 3, 0, "N", "A-", "A-"],
      ["2022년 봄학기", "항공우주공학과", "AE.24000", "AE240", "A", "전필", "유체역학", "Fluid Mechanics", 3, 0, "N", "IP", "IP"],
      ["2022년 봄학기", "항공우주공학과", "AE.25000", "AE250", "A", "특별", "항공전자", "Avionics", 3, 0, "N", "A0", "A0"],
    ]);

    const result = parser.parse(workbook);

    expect(result.records).toHaveLength(3);
    expect(result.warnings).toHaveLength(2);
    expect(result.rowsParsed).toBe(3);
    expect(result.rowsSkipped).toBe(2);
    expect(result.totalRowsScanned).toBe(5);
  });
});
