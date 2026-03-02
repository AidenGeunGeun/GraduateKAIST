import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { ExcelTranscriptParser } from "@/infrastructure/excel-parser/ExcelTranscriptParser";

function buildWorkbook(rows: (string | number | null)[][], merges: XLSX.Range[] = []): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "성적");

  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
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

    const records = parser.parse(workbook);

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

    const [record] = parser.parse(workbook);
    expect(record.semester.year).toBe(2022);
    expect(record.semester.season).toBe("봄");
  });

  it("T12.3 parses pre-enrollment semester", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["기이수 인정 학점", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "A0", "A0"],
    ]);

    const [record] = parser.parse(workbook);
    expect(record.semester.isPreEnrollment).toBe(true);
  });

  it("T12.4 uses column M as final grade", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["2022년 봄학기", "항공우주공학과", "AE.22000", "AE220", "A", "전필", "공기역학I", "Aerodynamics I", 3, 0, "N", "B0", "A+"],
    ]);

    const [record] = parser.parse(workbook);
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

    const records = parser.parse(workbook);
    expect(records).toHaveLength(2);
    expect(records[1].semester.toString()).toBe("2022년 봄학기");
  });

  it("T12.6 parses parenthetical category like 인선(예일)", () => {
    const workbook = buildWorkbook([
      ["학년도-학기", "학과", "교과목", "과목번호", "분반", "구분", "교과목명", "영문교과목명", "학점", "AU", "재수강", "성적(P/NR표기전)", "성적"],
      ["2022년 가을학기", "인문사회과학부", "HSS.10000", "HSS100", "A", "인선(예일)", "서양미술사", "History of Western Art", 3, 0, "N", "A0", "A0"],
    ]);

    const [record] = parser.parse(workbook);
    expect(record.category.value).toBe("인선_예술");
  });
});
