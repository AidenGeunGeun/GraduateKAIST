# Robust Excel Parser

## Intent

The current Excel parser is brittle — it hard-codes column positions, throws on any unknown grade/category/semester, and returns either all records or a generic error. A friend's valid ERP transcript file triggered the error "ERP 성적조회에서 다운로드한 파일인지 확인해주세요" even though it was a real ERP file.

The goal is to make parsing resilient to format variations, gracefully degrade on partial data, and surface specific diagnostic information instead of a single unhelpful error.

## Scope

### In scope
- `src/infrastructure/excel-parser/ExcelTranscriptParser.ts` — major rewrite
- `src/infrastructure/excel-parser/ExcelTranscriptParser.test.ts` — new test cases
- `src/domain/models/Grade.ts` — graceful unknown handling
- `src/domain/models/CreditCategory.ts` — graceful unknown handling
- `src/domain/models/Semester.ts` — graceful unknown handling
- `src/domain/types.ts` — new `ParseResult` type, `CreditCategoryValue` union extension
- `src/app/page.tsx` — consume `ParseResult`, show warnings/summary
- `src/app/components/upload/FileUpload.tsx` — accept `.xls` format too

### Out of scope
- Manual column mapping UI (future)
- Preview data before analysis (future)
- Any changes to requirement analysis logic, GPA calculation, or dashboard components

## Changes

### 1. New `ParseResult` type (`src/domain/types.ts`)

Add a structured parse result:

```ts
interface ParseWarning {
  row: number;        // 1-indexed row in the spreadsheet
  message: string;    // Korean diagnostic message
}

interface ParseResult {
  records: CourseRecord[];
  warnings: ParseWarning[];
  totalRowsScanned: number;
  rowsParsed: number;
  rowsSkipped: number;
}
```

### 2. Dynamic column detection (`ExcelTranscriptParser.ts`)

Replace the hard-coded `COLUMN_INDEX` with header-text-based detection.

**Header matching rules** (normalized: trimmed, whitespace-collapsed):
| Logical column | Match patterns (any of) | Required? |
|---|---|---|
| semester | "학년도", "학기" | YES |
| department | "학과", "소속" | no |
| newCode | "교과목" (but NOT "교과목명") | no |
| oldCode | "과목번호" | YES |
| section | "분반" | no |
| category | "구분" | YES |
| nameKo | "교과목명" | no |
| nameEn | "영문" | no |
| credits | "학점" | YES |
| au | "AU", "au" (case-insensitive) | no |
| retakeFlag | "재수강" | no |
| gradeOriginal | "성적" AND "표기전" (both in same header) | no |
| gradeFinal | "성적" (rightmost column matching "성적" that is NOT gradeOriginal) | YES |

Header detection should:
- Scan up to 20 rows (not 15) to find the header row
- Scan all columns in the row (up to 30), not just 13
- Normalize text: trim + collapse whitespace
- Match in order of specificity (gradeOriginal before gradeFinal to avoid collision)

If any REQUIRED column is not found, return a `ParseResult` with 0 records and a specific warning: "필수 열 '{columnName}'을(를) 찾을 수 없습니다."

### 3. Multi-sheet scanning

Instead of only checking the first sheet:
- Iterate all sheets in the workbook
- For each, attempt header detection
- Use the first sheet where required columns are found
- If no sheet matches, return ParseResult with 0 records + warning "성적 데이터가 포함된 시트를 찾을 수 없습니다."

### 4. Row-level error collection

Instead of throwing on bad rows, collect warnings and continue:
- Unknown grade code → skip row, add warning "행 {N}: 알 수 없는 성적 코드 '{code}'"
- Unknown category label → skip row, add warning "행 {N}: 알 수 없는 이수구분 '{label}'"
- Invalid semester text → skip row, add warning "행 {N}: 학기 형식 오류 '{text}'"
- Missing required cell (oldCode or gradeFinal empty) → skip silently (this is normal for metadata/total rows)
- Summary/total rows → detect and skip: any row where the first non-empty cell contains "합계", "평균", "총", "소계"

### 5. Domain model changes

**`Grade.from(raw: string): Grade`** — currently throws on unknown. Change to:
- Add a static `UNKNOWN` grade with `{ points: null, isGpaVisible: false, earnsCreditOnPass: false }`
- New method: `Grade.tryFrom(raw: string): Grade | null` — returns null for unknown
- Keep `Grade.from()` behavior unchanged (other code depends on it throwing for truly invalid input)
- The parser uses `tryFrom()` instead of `from()`

**`CreditCategory.from(raw: string): CreditCategory`** — currently throws on unknown. Change to:
- Add `"자유선택"` as the fallback for unknown categories (already exists in the union)
- New method: `CreditCategory.tryFrom(raw: string): CreditCategory | null` — returns null for unknown
- Keep `CreditCategory.from()` unchanged
- The parser uses `tryFrom()`

**`Semester.fromText(raw: string): Semester`** — currently throws on non-matching. Change to:
- New method: `Semester.tryFromText(raw: string): Semester | null` — returns null for non-matching
- Keep `Semester.fromText()` unchanged
- The parser uses `tryFromText()`

### 6. File upload: accept `.xls` format

In `FileUpload.tsx`:
- Change `isXlsxFile` to `isExcelFile`
- Accept both `.xlsx` and `.xls` extensions
- Accept both MIME types: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `application/vnd.ms-excel`
- Update `accept` attribute to `".xlsx,.xls"`
- Update UI text: ".xlsx / .xls 파일 (ERP 성적조회 다운로드)"
- Update error message: "엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다"

### 7. UI: consume ParseResult (`page.tsx`)

Replace the current parse call:

**Before:** `records = parser.parse(buffer)` with try/catch  
**After:** `const parseResult = parser.parse(buffer)` (no try/catch needed — it never throws)

Logic:
- If `parseResult.records.length === 0` AND `parseResult.warnings.length > 0`: show the first warning as the error message (it will be specific: missing column, no valid sheet, etc.)
- If `parseResult.records.length === 0` AND no warnings: show "유효한 과목 데이터를 찾을 수 없습니다."
- If `parseResult.records.length > 0` AND `parseResult.warnings.length > 0`: proceed with analysis but show a parse summary banner at the top of the dashboard: "총 {totalRowsScanned}행 중 {rowsParsed}개 과목 인식 ({rowsSkipped}개 건너뜀)"
- If `parseResult.records.length > 0` AND no warnings: proceed normally (clean parse)

The parse summary banner should be a small amber/warning-colored bar above the StatusHero, showing the summary + an expandable list of individual warnings.

## Test Cases

All tests use the existing `buildWorkbook` helper.

### T-RP1: Dynamic column detection — standard layout
**Given** a workbook with standard ERP headers (A=학년도-학기 ... M=성적)  
**When** parsed  
**Then** all records parse correctly (backward compatible with existing tests)

### T-RP2: Dynamic column detection — extra columns prepended
**Given** a workbook with 2 extra columns prepended (학번, 이름) before the standard 13, so 학년도-학기 starts at column C  
**When** parsed  
**Then** records parse correctly, column mapping adjusts automatically

### T-RP3: Dynamic column detection — different column order
**Given** a workbook where 구분 and 학과 columns are swapped vs standard  
**When** parsed  
**Then** records parse correctly with proper field mapping

### T-RP4: Missing required column
**Given** a workbook with headers that do NOT include "과목번호"  
**When** parsed  
**Then** result has 0 records and a warning containing "과목번호"

### T-RP5: Multi-sheet — transcript on second sheet
**Given** a workbook with an empty first sheet and valid transcript data on the second sheet  
**When** parsed  
**Then** records from the second sheet are returned

### T-RP6: Unknown grade code — row skipped with warning
**Given** a workbook with 3 data rows, where row 2 has grade "IP" (not in grade table)  
**When** parsed  
**Then** result has 2 records, 1 warning mentioning "IP"

### T-RP7: Unknown category label — row skipped with warning
**Given** a workbook with 3 data rows, where row 2 has category "특별" (not in category map)  
**When** parsed  
**Then** result has 2 records, 1 warning mentioning "특별"

### T-RP8: Summary row detection
**Given** a workbook with valid data rows followed by a row starting with "합계"  
**When** parsed  
**Then** the "합계" row is not counted as skipped, records exclude it, no warning for it

### T-RP9: Metadata rows above header
**Given** a workbook with 3 metadata rows (이름, 학번, 소속) above the header row  
**When** parsed  
**Then** header is found at row 4, all data rows parse correctly

### T-RP10: `.xls` format (via SheetJS)
**Given** a workbook written in `.xls` format (bookType: "biff8")  
**When** parsed  
**Then** records parse correctly

### T-RP11: Whitespace variations in headers
**Given** a workbook where headers have extra spaces: "학년도 - 학기", " 과목번호 ", "성 적"  
**When** parsed  
**Then** columns are correctly detected

### T-RP12: No valid sheet found
**Given** a workbook with one sheet containing only random text (no recognizable headers)  
**When** parsed  
**Then** result has 0 records and a warning about no valid sheet

### T-RP13: Grade.tryFrom returns null for unknown
**Given** `Grade.tryFrom("IP")`  
**Then** returns null  
**Given** `Grade.tryFrom("A+")`  
**Then** returns a valid Grade with points 4.3

### T-RP14: CreditCategory.tryFrom returns null for unknown
**Given** `CreditCategory.tryFrom("특별")`  
**Then** returns null  
**Given** `CreditCategory.tryFrom("전필")`  
**Then** returns valid CreditCategory with value "전공필수"

### T-RP15: Semester.tryFromText returns null for unknown
**Given** `Semester.tryFromText("something weird")`  
**Then** returns null  
**Given** `Semester.tryFromText("2022년 봄학기")`  
**Then** returns valid Semester

### T-RP16: Partial success — some good rows, some bad
**Given** a workbook with 5 data rows: 3 valid, 1 unknown grade, 1 unknown category  
**When** parsed  
**Then** result has 3 records, 2 warnings, rowsParsed=3, rowsSkipped=2

## Acceptance Criteria

1. [ ] Parser returns `ParseResult` (never throws)
2. [ ] Column detection is dynamic via header text matching
3. [ ] Multi-sheet scanning works (first sheet with valid headers wins)
4. [ ] Unknown grades, categories, semesters produce row-level warnings (not crashes)
5. [ ] Summary/total rows ("합계", "평균") are silently skipped
6. [ ] `.xls` and `.xlsx` both accepted in file upload
7. [ ] `page.tsx` uses ParseResult: shows specific errors or parse summary banner
8. [ ] All 16 new test cases pass
9. [ ] All 82 existing tests still pass (no regressions)
10. [ ] `npx next build` succeeds
