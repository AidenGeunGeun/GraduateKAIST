# Phase 4: Year-Specific Requirements + Track System + Common-Only Mode

## Intent

Expand the graduation planner from a 2-era (2016-2022 / 2023+) model with department-specific analysis to a **7-year (2019-2025) model with track selection and common requirements only**. Remove department selector. Add track selector. Users see "공통학사요람만 지원" messaging.

## Reference Document

**`references/graduation-requirements-2019-2025.md`** — the authoritative source for all requirement values, year groupings, track modifications, and AU rules. Read this file in its entirety before implementing.

## Goals

1. Support admission years 2019-2025 with correct per-year requirements
2. Support 4 tracks: 심화전공, 부전공, 복수전공, 자유융합전공
3. Remove department selector and all department-specific analysis
4. Show clear "공통학사요람만 지원" messaging
5. Maintain all existing tests (update as needed for removed department logic)

## Constraints

- Must NOT break existing transcript parsing (ExcelTranscriptParser is unchanged)
- Admission years outside 2019-2025: show warning, fall back to nearest group
- Track selection is user input (not detectable from transcript)
- Items the app cannot check (윤리및안전, 영어능력, 인선 핵심유형, 인성/리더십 분배) should be shown as **informational notices**, not as pass/fail checks

---

## Changes Required

### A. Domain Types (`src/domain/types.ts`)

1. Add `TrackType` union: `'심화전공' | '부전공' | '복수전공' | '자유융합전공'`
2. Remove `DepartmentRequirements` interface (no more per-department course checking)
3. Remove `MajorCourse` interface
4. Update `RequirementSet` to include:
   - `admissionYearRange: [number, number]`
   - `totalCredits: number` (136 or 138)
   - `common` categories with `required` credits
   - `auTotal: number` (8 or 4)
   - `auCategories` array with subcategory names and required AU
   - `hasHssCoreTypeRequirement: boolean` (핵심유형 required or not)
5. Update `AnalysisResult` to remove department-specific fields
6. Add `TrackModification` type: describes how a track changes common requirements

### B. Requirement Configs (`src/domain/configs/requirements.ts`)

Replace the current 2-config + 2-AE-config system with **5 year-group configs**.

**CRITICAL**: 체육 AU was retroactively abolished for ALL students. ALL configs use totalCredits=138 and auTotal=4. See `references/graduation-requirements-2019-2025.md` Section 1 for details. Pre-2023 students with 체육 AU records: convert each 1AU to 1학점 toward the 138 total.

| Config Key           | Years     | Total | AU | 인선핵심 | Notes |
| -------------------- | --------- | ----- | -- | -------- | ----- |
| `REQUIREMENTS_2019`  | 2019      | 138   | 4  | No       | 기초필수③ PH151 only |
| `REQUIREMENTS_2020`  | 2020-2021 | 138   | 4  | No       | 기초필수③ PH151/PH152 |
| `REQUIREMENTS_2022`  | 2022      | 138   | 4  | Yes      | 인선핵심유형 |
| `REQUIREMENTS_2023`  | 2023-2024 | 138   | 4  | Yes      | Same as 2022 structurally |
| `REQUIREMENTS_2025`  | 2025      | 138   | 4  | Yes      | 인성분배 제약 |

Each config contains:
- `common`: 기초필수(23), 기초선택(9), 교양필수(7), 인선(21), 연구(3) — same for all
- `totalCredits`: 138 (all years)
- `auTotal`: 4 (all years)
- `auCategories`: 3 subcategories: 인성/리더십(2), 즐거운(1), 신나는(1)
- `hasHssCoreTypeRequirement`: boolean (false for A/B, true for C/D/E)
- `기초필수CourseGroups`: 9 course groups with the correct ③ variants

Add a **`getRequirements(admissionYear: number): RequirementSet`** factory function.

Add a **`applyTrackModification(requirements: RequirementSet, track: TrackType): RequirementSet`** function that returns a modified copy:
- 복수전공: 인선 21→12 (계열무관), 연구 3→0, 기초선택 9→6 (default to 6 as safer option since we don't know the department)
- Others: no modification to common requirements

### C. Services

#### RequirementAnalyzer (`src/domain/services/RequirementAnalyzer.ts`)
- Remove `department` parameter from `analyze()`
- Signature becomes: `analyze(transcript, requirementSet)`
- Remove 전필 substitution matching, cross-department warnings, graduate course warnings
- Keep: category credit totals, fulfillment status, overall status
- 전공 checking becomes simple: sum 전필+전선 credits from transcript, check against 40학점

#### HssDistributionChecker (`src/domain/services/HssDistributionChecker.ts`)
- `check(records, isDualMajor)` — `isDualMajor` is now derived from track selection (`track === '복수전공'`)
- No change to core logic (계열 distribution checking)

#### AuTracker (`src/domain/services/AuTracker.ts`)
- Must accept the AU config from the requirement set (not hardcoded 8AU)
- ALL years now have 3 subcategories: 인성/리더십(2AU), 즐거운(1AU), 신나는(1AU)
- 체육 AU records: for pre-2023 students, convert each 체육 1AU to 1학점 (add to earned credits total), do NOT count toward AU fulfillment
- Return fulfillment per subcategory as before

#### GpaCalculator — No changes needed

### D. UI Changes

#### Remove
- `DepartmentSelector` component — delete
- Department state from `page.tsx`
- `MajorCourseChecklist` component — delete (no per-department course checking)
- Department-related items from `data.ts`

#### Add/Modify
- **`TrackSelector`** component: dropdown with 4 options (심화전공, 부전공, 복수전공, 자유융합전공)
- **`AdmissionYearSelector`**: keep, but restrict to 2019-2025
- **`page.tsx`**: replace department state with track state. Update analysis pipeline:
  ```
  getRequirements(admissionYear) → applyTrackModification(req, track) → analyze(transcript, modifiedReq)
  ```
- **`StatusHero`**: keep as-is
- **`CategoryGrid`**: reduce from 9 categories. Show:
  - 기초필수, 기초선택, 교양필수, 인선, 연구, 전공합계, 총계
  - Remove separate 전필/전선 cards (merge into 전공합계)
- **`HssDistribution`**: keep, but pass `isDualMajor` from track
- **`AuTracker` component**: adapt to show correct subcategories based on year
- **`WarningsPanel`**: remove department-specific warnings. Add informational notices:
  - "공통학사요람 기준입니다. 학과별 세부 요건은 학과 이수요건을 참조하세요."
  - "인선 핵심/융합/일반 유형 구분은 성적표에서 확인할 수 없습니다." (2022+ only)
  - "윤리및안전, 영어능력 졸업요건은 별도 시스템에서 확인하세요."
- **`Footer`** or upload area: display "공통학사요람만 지원" badge/notice

### E. What to Keep Unchanged
- `ExcelTranscriptParser` — no changes
- `Grade`, `Semester`, `CourseCode`, `CreditCategory`, `CourseRecord`, `Transcript` models — no changes
- `GpaCalculator`, `GpaSection`, `GpaTrend`, `WhatIfSimulator` — no changes
- Theme, layout, error boundary, analytics — no changes
- File upload flow — no changes

---

## Acceptance Criteria

1. [ ] Admission years 2019-2025 all return totalCredits=138, auTotal=4
2. [ ] Track selector replaces department selector in UI
3. [ ] 복수전공 track correctly modifies 인선(12), 연구(0), 기초선택(6)
4. [ ] 심화전공, 부전공, 자유융합전공 do NOT modify common requirements
5. [ ] AU tracker shows 3 subcategories for ALL years (인성/리더십, 즐거운, 신나는). 체육 AU records from pre-2023 students convert to credits.
6. [ ] Department selector is removed from UI
7. [ ] MajorCourseChecklist is removed from UI
8. [ ] CategoryGrid shows merged 전공합계 instead of separate 전필/전선
9. [ ] "공통학사요람만 지원" notice is visible in the UI
10. [ ] Informational notices for un-checkable items (윤리및안전, 영어능력, 인선유형)
11. [ ] All domain tests pass (updated for removed department logic)
12. [ ] `npx next build` succeeds
13. [ ] `npx next lint` passes
14. [ ] Real transcript (2022학번) still produces sensible results without department

---

## Test Cases

### T1: Year-specific requirement resolution (2019)
- **Given** admissionYear = 2019
- **When** getRequirements(2019) is called
- **Then** returns totalCredits=138, auTotal=4, hasHssCoreTypeRequirement=false

### T2: Year-specific requirement resolution (2023)
- **Given** admissionYear = 2023
- **When** getRequirements(2023) is called
- **Then** returns totalCredits=138, auTotal=4, hasHssCoreTypeRequirement=true

### T3: Track modification — 복수전공
- **Given** base requirements with 인선=21, 연구=3, 기초선택=9
- **When** applyTrackModification(req, '복수전공') is called
- **Then** returns 인선=12, 연구=0, 기초선택=6

### T4: Track modification — 심화전공 (no change)
- **Given** base requirements with 인선=21, 연구=3, 기초선택=9
- **When** applyTrackModification(req, '심화전공') is called
- **Then** returns same values (인선=21, 연구=3, 기초선택=9)

### T5: AU categories — ALL years
- **Given** any admissionYear (2019-2025)
- **When** AuTracker processes AU records
- **Then** checks 3 subcategories: 인성/리더십(2), 즐거운(1), 신나는(1). No 체육 for anyone.

### T6: 체육 AU conversion for pre-2023 student
- **Given** admissionYear = 2022, transcript has 2 체육 AU records (2AU each = 4AU total)
- **When** analysis is performed
- **Then** 체육 AU is converted to 4학점 toward 138 total credits. 체육 does NOT appear in AU fulfillment.

### T7: Analysis without department
- **Given** a transcript with 전필 and 전선 courses
- **When** analyze(transcript, requirementSet) is called (no department param)
- **Then** returns 전공합계 category with earned = sum of 전필+전선 credits, required = 40

### T8: HSS distribution with 복수전공
- **Given** track = '복수전공', 인선 records totaling 15학점
- **When** HssDistributionChecker.check(records, true) is called
- **Then** fulfilled = true (12학점 threshold, no 계열 restriction)

### T9: Out-of-range admission year
- **Given** admissionYear = 2017
- **When** getRequirements(2017) is called
- **Then** falls back to 2019 config (nearest supported) and returns a warning

### T10: Real transcript regression
- **Given** the same 2022학번 transcript
- **When** analyzed with track = '심화전공', admissionYear = 2022
- **Then** 기초필수, 기초선택, 교양필수, 인선, 총학점 results are consistent with Phase 1 results. 전공 shows as 전공합계 only.

---

## Out of Scope

- Per-department course lists and 전필/전선 specific checking
- 지정융합전공 and 특별지정전공
- 인선 핵심/융합/일반 유형 detection from transcript (informational notice only)
- 인성/리더십 I/II/III/IV distribution checking (informational notice only for 2025)
- 윤리및안전 checking
- 영어능력 졸업요건 checking
- Admission years before 2019

---

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Removing department analysis loses value for AE users who had full checking | Clear messaging: "공통학사요람 기준" + future per-department support note |
| 기초선택 for 복수전공 is 3 or 6 (학과별) — we default to 6 | Note in UI that this varies by department |
| Users may not know their track | Default to 심화전공 (most common), clear label for each option |
