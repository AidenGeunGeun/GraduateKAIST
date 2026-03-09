# Spec: Wave 3 — Department-Aware Analyzer Integration

## Intent

Wire the reviewed interpretation database (4 departments × 7 years) into the runtime pipeline, analyzer, and UI so users get department-specific graduation analysis — not just common-only.

## Domain Goal

When a user selects AE/ME/CS/EE with a supported admission year and program type, the planner must check their transcript against the actual department rules: required course slots, credit buckets, equivalencies, and manual-review cases — all backed by the reviewed source-of-truth files.

## Context

The reviewed interpretation database is complete and quality-verified:
- `references/kaist-data/reviewed/ae.reviewed.json` (4 year groups, 3 program types)
- `references/kaist-data/reviewed/me.reviewed.json` (4 year groups, 3 program types)
- `references/kaist-data/reviewed/cs.reviewed.json` (6 year groups, 3 program types)
- `references/kaist-data/reviewed/ee.reviewed.json` (4 year groups, 3 program types)

The runtime domain types (`DepartmentProgramRequirement`, `ProgramAnalysisResult`, etc.) and the analyzer function (`analyzeSupportedProgram()`) already exist in the codebase. The pipeline currently produces empty `program-requirements.generated.json` and `common-only` support manifest entries.

The UI already has `DepartmentSelector`, `ProgramRequirementSection`, and the wiring in `page.tsx` for supported programs.

## Changes Required

### 1. Pipeline: `scripts/lib/kaist-data-pipeline.mjs`

**`buildRuntimePrograms()`** — Replace the current throw-if-not-common-only guard with actual transformation logic:

For each reviewed department file, for each slice where `reviewedInterpretationStatus === "reviewed"`:
1. Look up the associated `ruleSet` by `ruleSetId`
2. For each `program` in the ruleSet:
   - Build a `DepartmentProgramRequirement` entry from:
     - `requiredCourseSlots` → `ProgramRequiredCourseSlot[]` (map `acceptedCourseCodes`, add equivalency codes from `explicitEquivalencies` where `appliesTo === "required-course-slot"`)
     - `eligibleCreditBuckets` → `ProgramCreditBucketRule[]` (map `requiredCredits`, `eligiblePrefixes`, `eligibleCourseCodes`, `minimumLevel` if present; mark manual-review-only courses from `manualReviewOnlyCases`)
     - `explicitEquivalencies` → `ProgramEquivalency[]`
     - `manualReviewOnlyCases` → `knownLimitations[]` strings
   - Set `supportStatus: "supported"` for all reviewed slices
   - Set `displayName` from the department's `displayName` + program type
   - Set `admissionYearRange` from the slice

**Handling `requiredCourseCount`**: Some reviewed credit buckets use `requiredCourseCount` instead of `requiredCredits` (e.g., ME basis courses "5 of 9", EE required-pool-choice "3 of 6", CS capstone "1 of N"). The pipeline must propagate this into the generated JSON. The `ProgramCreditBucketRule` type needs a new optional `requiredCourseCount` field.

**`buildSupportEntries()`** — Keep existing logic but allow `runtimeSupportStatus` values other than `common-only`. Reviewed slices that pass transformation should have `"supported"`.

### 2. Reviewed JSON files

Update all 4 department files: change `runtimeSupportStatus` from `"common-only"` to `"supported"` on every slice where `reviewedInterpretationStatus === "reviewed"`.

### 3. Validation: `scripts/validate-kaist-data.mjs`

Remove or update the guard:
```
"Wave 2 runtime support must remain common-only until analyzer wiring exists"
```
Replace with validation that `"supported"` slices must have a valid `ruleSetId` mapping (already partially enforced).

### 4. Domain types: `src/domain/types.ts`

Add `requiredCourseCount?: number` to `ProgramCreditBucketRule`. This handles the "N courses from a pool" pattern. When present, the analyzer checks course count rather than credit sum.

### 5. Analyzer: `src/domain/services/RequirementAnalyzer.ts`

Update `analyzeSupportedProgram()`:
- When a credit bucket has `requiredCourseCount`, check the count of distinct matched courses against the threshold instead of summing credits.
- The `fulfilled` check becomes: `matchedCourses.length >= bucket.requiredCourseCount` (when present), or `earnedCredits >= bucket.requiredCredits` (existing behavior).
- The `ProgramBucketResult` should report both earned credits and matched course count for UI display.

### 6. Pipeline: `scripts/generate-kaist-data.mjs`

No structural changes needed — it already calls `buildPlannerDataset()` and writes results. Just needs to run after the pipeline changes.

### 7. Planner config: `src/domain/configs/planner.ts`

Minimal changes expected — `buildPlannerRequirementSet()` already checks `programSupport.status === "supported"` and loads `departmentRequirement` from the generated JSON. Once the generated JSON has real data, this should work. May need to handle `requiredCourseCount` in `validateGeneratedPlannerData()`.

### 8. UI components

**Minor updates only** — the components already exist:
- `ProgramRequirementSection.tsx`: May need to display `requiredCourseCount`-based buckets differently (e.g., "3/5 과목" instead of "15/48 학점").
- `CategoryGrid.tsx`: No changes expected — `전공합계` card already renders from analyzer output.
- `Badge.tsx`: Already supports `supported`/`partial`/`neutral`/`danger` variants.
- `DepartmentSelector.tsx`: Already renders supported status from `getSupportedDepartments()`.

### 9. Tests

**New tests required:**
- Pipeline transformation tests: reviewed JSON → `DepartmentProgramRequirement` entries (spot-check AE, CS)
- Analyzer tests: `analyzeSupportedProgram()` with `requiredCourseCount` buckets
- Planner integration test: `buildPlannerRequirementSet({department: "AE", admissionYear: 2022, track: "심화전공"})` returns a `RequirementSet` with non-null `departmentRequirement`
- Validation: `node scripts/validate-kaist-data.mjs` still passes
- Build: `npx next build` still passes

**Existing tests must still pass:** `npx vitest run` (103 tests)

## Acceptance Criteria

1. `node scripts/generate-kaist-data.mjs` produces a non-empty `program-requirements.generated.json` with entries for all 4 departments × applicable year groups × 3 program types
2. `support-manifest.generated.json` shows `"supported"` for AE/ME/CS/EE entries (not `"common-only"`)
3. `node scripts/validate-kaist-data.mjs` passes with zero issues
4. `npx vitest run` passes (existing 103 tests + new tests)
5. `npx next build` passes
6. When a user selects AE 2022 심화전공 and uploads a transcript:
   - Dashboard shows per-course required slot checklist (AE210 ✓/✗, AE220 ✓/✗, etc.)
   - Dashboard shows credit bucket progress (전공 42학점, 전공선택 21학점, 심화전공 18학점, 연구 3학점)
   - Manual review cases appear as warnings
   - Equivalencies are applied (ME211 satisfies AE210 slot)
7. When a user selects ME 2022 심화전공: basis course pool check works (5-of-9 and 9-of-9)
8. When a user selects CS 2022 심화전공: capstone team project check works (1-of-N)
9. When a user selects EE 2022 심화전공: required-pool-choice check works (3-of-6)
10. `OTHER` department selection still falls back to common-only analysis
11. `자유융합전공` track still falls back to common-only analysis

## Out of Scope

- Adding new departments beyond AE/ME/CS/EE
- Changing the reviewed interpretation database
- Runtime scraping of KAIST websites
- New course catalog data
- Co-op credit substitution automation (remains manual-review-only)
- Old/new course code cross-mapping for 2025 dotted codes (separate concern)

## Test Cases

- T1: Pipeline generates AE 심화전공 2019-2021 with 7 required slots and 4 credit buckets
- T2: Pipeline generates ME 심화전공 2020 with basis-minimum bucket having `requiredCourseCount: 5`
- T3: Pipeline generates CS 심화전공 2020 with capstone bucket having `requiredCourseCount: 1`
- T4: Pipeline generates EE 심화전공 2019-2021 with required-pool-choice bucket having `requiredCourseCount: 3`
- T5: Analyzer matches AE210 via ME211 equivalency on required-course-slot
- T6: Analyzer counts 5 ME basis courses as fulfilled for `requiredCourseCount: 5`
- T7: Analyzer flags manual-review-only courses with PROGRAM_MANUAL_REVIEW warning
- T8: Support manifest shows `"supported"` for AE/ME/CS/EE
- T9: `buildPlannerRequirementSet` for AE 2022 심화전공 returns non-null `departmentRequirement`
- T10: `buildPlannerRequirementSet` for OTHER returns null `departmentRequirement`
- T11: All 103 existing tests still pass

## Risks

- **2025 dotted code matching**: Transcripts for 2025 students will use dotted codes (e.g., `AE.21000`). The parser's `CourseCode` model may need to handle dot-separated codes. This is flagged but may be out of scope if no 2025 transcripts exist yet.
- **Course code normalization**: The reviewed DB uses codes like `AE210` while transcripts may have `AE 210` or `AE210`. The existing `CourseCode.oldCode` normalization should handle this but needs verification.
