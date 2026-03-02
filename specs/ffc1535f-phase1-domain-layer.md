# Phase 1: Domain Layer — Spec

**ID**: ffc1535f  
**Status**: DRAFT — awaiting approval  
**Phase**: 1 of N  

---

## Intent

Implement the domain layer for the KAIST Graduation Planner — pure TypeScript business logic with zero framework dependencies, fully test-driven. This layer handles: Excel transcript parsing, course record modeling, grade system, GPA calculation, requirement configuration, and graduation requirement analysis.

The domain layer is the foundation. It must be correct before any UI work begins.

---

## Goals

1. **Project scaffolding** — Next.js App Router + TypeScript + Vitest + Tailwind CSS project setup
2. **Reference docs** — Product spec and data references persisted in `references/`
3. **Domain model** — Value objects, entities, and aggregates per the DDD ubiquitous language
4. **Excel parser** — Infrastructure adapter that converts ERP Excel export into domain objects
5. **GPA calculator** — Handles all grade types, retake exclusions, F duality
6. **Requirement configs** — Data-driven requirement sets (common + AE department)
7. **Requirement analyzer** — Compares transcript against requirement set, produces gap analysis
8. **Comprehensive test suite** — Every business rule from the product spec has a corresponding test

---

## Constraints

- Domain layer MUST have zero dependency on React, Next.js, or any UI library
- All domain types are under `src/domain/` — framework code stays in `src/app/`
- Excel parsing adapter under `src/infrastructure/` — domain never imports xlsx directly
- Requirement configs are data files (JSON or TS objects), not hard-coded logic
- Use `xlsx` (SheetJS community edition) for Excel parsing — client-side compatible, no Node-only APIs
- All tests written with Vitest
- Korean text in domain types (category names, grade labels) — this is a Korean-domain app
- No .env files or secrets in this phase

---

## Architecture (DDD Layers)

```
src/
  domain/           # Pure business logic — zero external dependencies
    models/         # Value objects, entities, aggregates
    services/       # GPA calculation, requirement analysis
    configs/        # Requirement data (common + per-department)
    types.ts        # Shared domain type definitions
  infrastructure/   # External world adapters
    excel-parser/   # xlsx -> domain CourseRecord[] adapter
  app/              # Next.js App Router (empty in Phase 1, scaffolded)
```

This structure is a guideline. The Orchestrator owns exact file organization.

---

## Domain Model

### Value Objects

**Grade**
- Properties: display (string), points (number | null), isGpaVisible (boolean), earnsCreditOnPass (boolean)
- Factory: `Grade.from("A+")` → Grade with points=4.3, gpaVisible=true
- Must handle all 15 codes: A+, A0, A-, B+, B0, B-, C+, C0, C-, D+, D0, D-, F, S, U, W, R, I, P, NR
- F: points=0.0, gpaVisible=true, earnsCredit=false (the duality)
- S/P: gpaVisible=false, earnsCredit=true
- U/W/R/NR: gpaVisible=false, earnsCredit=false

**Semester**
- Properties: year (number), season (봄|여름|가을|겨울), or isPreEnrollment (boolean for 기이수 인정 학점)
- Comparable for sorting: year ascending, then 봄 < 여름 < 가을 < 겨울
- Parsing: from "2022년 봄학기" or "기이수 인정 학점"

**CourseCode**
- Properties: oldCode (string like "AE210"), newCode (string like "AE.21000")
- Department prefix extraction: "AE210" → "AE"
- Numeric part extraction: "AE210" → 210 (for graduate course detection: >= 500)

**CreditCategory**
- Enum-like: 기필, 기선, 교필, 인선_인문, 인선_사회, 인선_예술, 인선_인핵, 전필, 전선, 자선, 연구, 선택
- Parsing: from 구분 field string (e.g., "인선(예일)" → 인선_예술)
- Mapping: 인선 subcategories to 계열 (인핵 → 인문계열)

### Entities

**CourseRecord**
- Properties: semester, department (offering dept), courseCode, section, category, nameKo, nameEn, credits, au, retakeFlag (N|Y|Z), gradeOriginal, gradeFinal
- Derived: lifecycleState (Active | Failed | Superseded | Incomplete)
  - Superseded: retakeFlag === "Z"
  - Failed: gradeFinal is F (and not superseded)
  - Incomplete: gradeFinal is W or R (and not superseded)
  - Active: passing grade (A+ through D-, S, P) and not superseded
- Derived: isAuCourse → credits === 0 && au > 0

### Aggregates

**Transcript**
- Collection of CourseRecord[] grouped by Semester
- Factory: `Transcript.from(records: CourseRecord[])` — groups and sorts
- Queries:
  - `activeRecords()` — excludes Superseded (Z) records
  - `gpaRecords()` — active records with GPA-visible grades
  - `earnedRecords()` — active records that earn credits (passing, non-F)
  - `recordsByCategory(cat)` — filtered by CreditCategory
  - `semesterList()` — sorted semester list
  - `auRecords()` — records where isAuCourse=true

---

## Services

### GpaCalculator

**`calculateCumulative(transcript: Transcript): number`**
- Uses `transcript.gpaRecords()`
- `sum(points * credits) / sum(credits)` across all GPA-visible, non-Z records
- Returns 0.0 if no GPA-visible records exist

**`calculateBySemester(transcript: Transcript): Map<Semester, number>`**
- Same calculation per semester group

**`whatIf(currentGpa, currentCredits, additionalCredits, targetGrade): number`**
- Projects future GPA: `(currentGpa * currentCredits + targetGrade.points * additionalCredits) / (currentCredits + additionalCredits)`

### RequirementAnalyzer

**`analyze(transcript: Transcript, requirementSet: RequirementSet, department: string): AnalysisResult`**

The core operation. Compares earned credits/courses against requirements. Produces:

**AnalysisResult:**
- totalCreditsEarned: number
- totalCreditsRequired: number
- categories: CategoryResult[] (one per requirement bucket)
- warnings: Warning[]
- overallStatus: "fulfilled" | "in_progress" | "behind"

**CategoryResult:**
- category: string (e.g., "기초필수")
- creditsEarned: number
- creditsRequired: number
- fulfilled: boolean
- missingCourses: CourseInfo[] (for 전공필수 — specific courses not yet taken)
- details: string (human-readable notes)

**Warning types:**
- CROSS_DEPARTMENT_MAJOR_REQUIRED — 전필 course from different department
- GRADUATE_COURSE_AMBIGUOUS — 500+ level course as 선택
- HSS_DISTRIBUTION_INCOMPLETE — 인선 계열 distribution not met

### HssDistributionChecker

**`check(hssRecords: CourseRecord[], isDualMajor: boolean): HssResult`**
- Groups earned 인선 records by 계열
- Checks: total >= 21 (or 12 for 복수전공) AND 2+ 계열 with >= 3 credits each (or no restriction for 복수전공)
- Returns: { totalCredits, gyeyolCounts: Map<계열, credits>, fulfilled, missingGyeyol }

### AuTracker

**`track(auRecords: CourseRecord[]): AuResult`**
- Groups AU records into subcategories (체육, 인성/리더십, 즐거운, 신나는)
- Detection via course name pattern matching (체육/체력 → 체육, 인성리더십 → 인성, etc.)
- Returns: per-subcategory { earned, required, fulfilled }

---

## Requirement Configs

### Structure

```typescript
interface RequirementSet {
  admissionYearRange: [number, number]; // inclusive
  department: string; // "AE", "COMMON", etc.
  totalCredits: number;
  common: CommonRequirements;
  departmentReqs?: DepartmentRequirements;
}

interface CommonRequirements {
  기초필수: { required: number; courseGroups: string[][] };
  기초선택: { required: number; designatedCourses?: string[]; designatedMinCount?: number };
  교양필수: { requiredCredits: number; requiredAU: number };
  인문사회선택: { required: number; distribution: string };
  연구: { required: number };
}

interface DepartmentRequirements {
  전공필수: { required: number; courses: MajorCourse[] };
  전공선택: { required: number };
  전공합계: number;
  substitutions: Record<string, string[]>; // courseCode -> substitute codes
}

interface MajorCourse {
  code: string;
  nameKo: string;
  credits: number;
  substitutes?: string[];
}
```

### Required Configs for Phase 1

1. **Common 2016-2022** — shared requirements for all departments, 2016-2022 admission
2. **Common 2023+** — shared requirements for 2023+ admission (P/NR, adjusted totals)
3. **AE 2016-2022** — AE department-specific with 7 전공필수, substitutions
4. **AE 2023+** — AE department-specific for 2023+ (138 total credits)

---

## Infrastructure: Excel Parser

### ExcelTranscriptParser

**`parse(file: ArrayBuffer): CourseRecord[]`**

1. Read Excel file using `xlsx` library (SheetJS)
2. Auto-detect header row by searching for "학년도" or "학기" in first rows
3. Map columns A-M to domain fields per transcript-format.md
4. Handle merged cells for semester column (A) — semester applies to all rows until next semester header
5. Always use column M (성적, final grade) as the grade of record
6. Parse semester strings: regex `(\d{4})년\s*(봄|여름|가을|겨울)학기` and literal "기이수 인정 학점"
7. Parse 구분 field: handle parenthetical subcategories like "인선(예일)"
8. Convert each row to CourseRecord
9. Skip completely empty rows
10. Return CourseRecord[]

---

## Test Cases

### T1: Grade Value Object

| # | Given | When | Then |
|---|-------|------|------|
| T1.1 | Grade "A+" | Convert to points | 4.3 |
| T1.2 | Grade "B0" | Convert to points | 3.0 |
| T1.3 | Grade "F" | Check isGpaVisible | true |
| T1.4 | Grade "F" | Check earnsCredit | false |
| T1.5 | Grade "F" | Convert to points | 0.0 |
| T1.6 | Grade "S" | Check isGpaVisible | false |
| T1.7 | Grade "S" | Check earnsCredit | true |
| T1.8 | Grade "P" | Check earnsCredit | true |
| T1.9 | Grade "NR" | Check earnsCredit | false |
| T1.10 | Grade "W" | Check isGpaVisible | false |
| T1.11 | Grade "W" | Check earnsCredit | false |
| T1.12 | Invalid grade "X" | Create Grade | Throws error |

### T2: Semester Value Object

| # | Given | When | Then |
|---|-------|------|------|
| T2.1 | "2022년 봄학기" | Parse | { year: 2022, season: "봄" } |
| T2.2 | "2022년 겨울학기" | Parse | { year: 2022, season: "겨울" } |
| T2.3 | "기이수 인정 학점" | Parse | { isPreEnrollment: true } |
| T2.4 | 봄 2022 vs 가을 2022 | Compare | 봄 < 가을 |
| T2.5 | 가을 2021 vs 봄 2022 | Compare | 2021 < 2022 |
| T2.6 | Pre-enrollment vs any semester | Sort | Pre-enrollment comes first |

### T3: CreditCategory Parsing

| # | Given | When | Then |
|---|-------|------|------|
| T3.1 | "기필" | Parse | 기초필수 |
| T3.2 | "인선(예일)" | Parse | 인선_예술 |
| T3.3 | "인선(인핵)" | Parse | 인선_인핵 (maps to 인문계열) |
| T3.4 | "인선(인일)" | Parse | 인선_인문 |
| T3.5 | "인선(사일)" | Parse | 인선_사회 |
| T3.6 | "전필" | Parse | 전공필수 |
| T3.7 | "자선" | Parse | 자유선택 |
| T3.8 | "선택" | Parse | 선택 (graduate elective) |

### T4: CourseRecord Lifecycle State

| # | Given | When | Then |
|---|-------|------|------|
| T4.1 | Record with grade "A+", retakeFlag "N" | Get state | Active |
| T4.2 | Record with grade "F", retakeFlag "N" | Get state | Failed |
| T4.3 | Record with retakeFlag "Z" | Get state | Superseded (regardless of grade) |
| T4.4 | Record with grade "W", retakeFlag "N" | Get state | Incomplete |
| T4.5 | Record with grade "R" | Get state | Incomplete |
| T4.6 | Record with grade "S" | Get state | Active |
| T4.7 | Record with grade "P" | Get state | Active |
| T4.8 | Record with grade "F", retakeFlag "Z" | Get state | Superseded (Z overrides F) |
| T4.9 | AU course (credits=0, au=2) | Check isAuCourse | true |
| T4.10 | Regular course (credits=3, au=0) | Check isAuCourse | false |

### T5: Retake Filtering (Transcript)

| # | Given | When | Then |
|---|-------|------|------|
| T5.1 | Two records same course: Z(B0) + Y(A+) | Get activeRecords | Only Y(A+) included |
| T5.2 | Z(W) + Y(A-) | Get activeRecords | Only Y(A-) included |
| T5.3 | Y(F) for retaken course | Get activeRecords | Y(F) IS included (active, just failed) |
| T5.4 | N(F) with no Y | Get activeRecords | N(F) IS included |
| T5.5 | Multiple Z records, one Y | Get activeRecords | Only Y included |

### T6: GPA Calculation

| # | Given | When | Then |
|---|-------|------|------|
| T6.1 | A+(3cr), B0(3cr) | Calculate cumulative | (4.3*3 + 3.0*3) / 6 = 3.65 |
| T6.2 | A+(3cr), F(3cr) | Calculate cumulative | (4.3*3 + 0*3) / 6 = 2.15 |
| T6.3 | A+(3cr), S(3cr) | Calculate cumulative | 4.3 (S excluded from denominator) |
| T6.4 | B0(3cr) with Z flag | Calculate cumulative | 0.0 or empty (Z excluded entirely) |
| T6.5 | A+(3cr) Spring, B0(3cr) Fall | Calculate by semester | Spring=4.3, Fall=3.0 |
| T6.6 | No GPA-visible records (all S) | Calculate cumulative | 0.0 (no division by zero) |
| T6.7 | A0(3cr), P(3cr), W(1cr) | Calculate cumulative | 4.0 (only A0 in calculation) |
| T6.8 | Current GPA 3.5, 90cr earned, add 15cr at B+ avg | What-if | (3.5*90 + 3.3*15) / 105 = 3.471... |

### T7: Category Credit Counting

| # | Given | When | Then |
|---|-------|------|------|
| T7.1 | 3 기필 courses (3cr each), all passing | Count 기초필수 credits | 9 |
| T7.2 | 2 기필 courses (3cr each), 1 with F | Count 기초필수 earned | 6 (F earns 0) |
| T7.3 | 전필 course with Z flag | Count 전공필수 credits | 0 (Z excluded) |
| T7.4 | 교필 AU course (0 credits, 2 AU) | Count 교양필수 credits | 0 (AU separate) |
| T7.5 | Mix of 전필(9cr) + 전선(12cr) | Count 전공합계 | 21 |

### T8: 인선 Distribution

| # | Given | When | Then |
|---|-------|------|------|
| T8.1 | 인문 9cr, 사회 6cr, 예술 6cr (21 total) | Check distribution | Fulfilled (3 계열, 21cr) |
| T8.2 | 인문 21cr, 사회 0, 예술 0 | Check distribution | NOT fulfilled (only 1 계열) |
| T8.3 | 인문 12cr, 사회 6cr (18 total) | Check distribution | NOT fulfilled (< 21cr) |
| T8.4 | 인문 12cr, 사회 9cr (21 total) | Check distribution | Fulfilled (2 계열, 21cr) |
| T8.5 | 인핵 3cr, 사회 3cr (6 total) | Check distribution | 2 계열 met (인핵→인문), but total insufficient |
| T8.6 | 복수전공 student, 인문 12cr only | Check distribution | Fulfilled (relaxed: 12cr, no 계열 restriction) |

### T9: AU Tracking

| # | Given | When | Then |
|---|-------|------|------|
| T9.1 | 체육 courses with S grade, total 4AU | Track AU | 체육 fulfilled |
| T9.2 | 인성리더십I(1AU) + II(1AU) with S | Track AU | 인성/리더십 fulfilled |
| T9.3 | 즐거운 대학생활(1AU) with R grade | Track AU | 즐거운 NOT fulfilled (R = incomplete) |
| T9.4 | 신나는 대학생활(1AU) with S | Track AU | 신나는 fulfilled |
| T9.5 | 체력육성 credits=0 AU=2 교필 | Classify | AU course, counts toward 체육 |
| T9.6 | 체력육성 credits=2 자선 | Classify | Credit course, counts as 자선 |

### T10: Requirement Analysis (AE 2016-2022)

| # | Given | When | Then |
|---|-------|------|------|
| T10.1 | AE student, 6 of 7 전필 courses passed | Analyze 전공필수 | 1 missing course identified by name/code |
| T10.2 | AE student has ME211 (substitute for AE210) | Analyze 전공필수 | AE210 counted as fulfilled via substitution |
| T10.3 | AE student, 전필 21cr + 전선 15cr = 36 total | Analyze 전공합계 | Need 6 more (42 required) |
| T10.4 | AE student, 130 total credits | Analyze total | 6 credits short (136 required) |
| T10.5 | AE student, all requirements met, 136+ credits | Analyze overall | Status = "fulfilled" |

### T11: Warnings

| # | Given | When | Then |
|---|-------|------|------|
| T11.1 | 전필 course from 물리학과, user selected AE | Analyze | Warning: CROSS_DEPARTMENT_MAJOR_REQUIRED |
| T11.2 | Course code AE556 with category "선택" | Analyze | Warning: GRADUATE_COURSE_AMBIGUOUS |
| T11.3 | 인선 from only 1 계열 | Analyze | Warning: HSS_DISTRIBUTION_INCOMPLETE |
| T11.4 | 전필 course from 항공우주공학과, user selected AE | Analyze | No warning (same department) |

### T12: Excel Parser

| # | Given | When | Then |
|---|-------|------|------|
| T12.1 | Valid Excel with standard headers | Parse | Returns CourseRecord[] with correct field mapping |
| T12.2 | Semester "2022년 봄학기" in column A | Parse semester | { year: 2022, season: "봄" } |
| T12.3 | "기이수 인정 학점" in column A | Parse semester | Pre-enrollment record |
| T12.4 | Grade in column M differs from column L | Parse | Uses column M value |
| T12.5 | Row with all empty cells | Parse | Skipped |
| T12.6 | 구분 = "인선(예일)" | Parse category | Correctly extracts subcategory |

---

## Out of Scope (Phase 1)

- UI / React components (Phase 2)
- File upload component / drag-and-drop
- Dashboard visualization
- Dark mode / Tailwind theming
- Analytics or AdSense
- Vercel deployment
- Departments other than AE
- 심화전공/부전공/복수전공/자유융합 track analysis (flags only, no full check)
- What-if simulator UI (only the calculation service)
- Mobile responsiveness
- i18n framework (domain uses Korean natively)

---

## Verification Commands

```bash
# Run all domain tests
npx vitest run

# Run tests in watch mode (for development)
npx vitest

# Type checking
npx tsc --noEmit

# Lint
npx next lint
```

---

## Acceptance Criteria

- [ ] AC1: Next.js 14+ App Router project scaffolded with TypeScript, Vitest, Tailwind CSS
- [ ] AC2: Reference docs exist at `references/product-spec.md`, `references/transcript-format.md`, `references/requirements.md`
- [ ] AC3: Grade value object handles all 15+ grade codes with correct points, GPA visibility, and credit-earning properties
- [ ] AC4: Semester parsing handles regular semesters and "기이수 인정 학점", with correct sort ordering
- [ ] AC5: CreditCategory parsing handles all 구분 codes including parenthetical subcategories
- [ ] AC6: CourseRecord lifecycle state correctly derives Active/Failed/Superseded/Incomplete
- [ ] AC7: Transcript aggregate correctly filters superseded (Z) records from all query methods
- [ ] AC8: GPA calculator produces correct results for: normal grades, F inclusion, S/P exclusion, Z exclusion, empty transcript, per-semester breakdown
- [ ] AC9: 인선 distribution checker validates 계열 diversity requirement including 인핵→인문 mapping and 복수전공 relaxation
- [ ] AC10: AU tracker categorizes and counts AU progress for all 4 subcategories
- [ ] AC11: Requirement configs exist for Common 2016-2022, Common 2023+, AE 2016-2022, AE 2023+
- [ ] AC12: RequirementAnalyzer correctly identifies missing 전공필수 courses including substitution matching
- [ ] AC13: Warning system flags cross-department 전필, graduate-level 선택, and incomplete 인선 distribution
- [ ] AC14: Excel parser reads standard ERP export format, handles merged semester cells, uses column M for grades
- [ ] AC15: All tests pass (`npx vitest run` exits 0)
- [ ] AC16: Type checking passes (`npx tsc --noEmit` exits 0)
- [ ] AC17: No domain code imports from React, Next.js, or any UI library

---

## Completion Standard

Phase 1 is complete when:
1. All 17 acceptance criteria are satisfied
2. `npx vitest run` passes with 0 failures
3. `npx tsc --noEmit` passes with 0 errors
4. Domain layer is independently testable with no UI dependencies
