# Spec: Dual-Department Track System (주전공 + 복수/부전공)

## Intent

Remodel the track system to match KAIST's actual graduation structure: every student has a **주전공** (base primary major) and selects one additional track on top. When the track is 복수전공 or 부전공, a second department is involved and both departments' requirements must be analyzed.

## Domain Goal

A student uploading their transcript should see:
- Common graduation requirements (with track-appropriate relaxation)
- Primary department **주전공** analysis (base major — NOT 심화전공)
- If 심화전공: additional 심화 requirements on top of 주전공
- If 복수전공: secondary department's 복수전공 requirements
- If 부전공: secondary department's 부전공 requirements

## Context

### How KAIST tracks actually work (source: official KAIST pages)

The institutional rule is: "본인의 주 전공 이외에도 심화전공, 자유융합전공, 복수전공, 부전공 4가지 중 하나를 추가로 이수해야" (sts.kaist.ac.kr).

Department pages confirm "전공 N학점 이상 이수" as the base, then "전공 이외에 심화전공, 부전공, 복수전공... 반드시 한 가지 이상 선택하여 이수."

The tracks are:
- **심화전공**: 소속 학과에서 정한 전공 교과목 12학점 이상 추가 이수 (on top of base)
- **복수전공**: 복수전공 학과에서 요구하는 복수전공 교과목 40학점 이상 이수
- **부전공**: 부전공 학과에서 요구하는 부전공 교과목 18학점 이상 이수
- **자유융합전공**: 2개 이상 학사조직에서 12학점 이상 전공과목 이수

Key nuance: **복수전공 students get research exemption in their primary department** ("복수전공 이수자는 연구과목 이수를 면제함" — confirmed across CEE, BCS, SSE, AE, ME, CS, EE). 부전공 students do NOT get this exemption.

### What's wrong with the current model

The current code treats 심화전공/복수전공/부전공 as single-department program types. When a user selects "AE + 복수전공", the app shows AE's 복수전공 requirements — but this is semantically wrong:
- The user's **primary** department (AE) should be analyzed at **주전공 base** level
- The **secondary** department (the one they're double-majoring into) should be analyzed at 복수전공 level
- There is currently no way to specify the secondary department at all

### The 주전공 (base major) derivation

The reviewed DB has three program types: 심화전공, 복수전공, 부전공. It does NOT have a separate "주전공" type. However, 주전공 can be derived from 심화전공 by removing 심화-specific buckets:

| Dept | 심화전공 buckets | Which are 심화-specific |
|------|-----------------|----------------------|
| AE | 전공 42, 전공선택 21, **심화전공 18**, 연구 3 | `advanced-major` (id contains "advanced") |
| CS | 전공 49, 전공선택 30, **심화전공 12**, 연구 3 (+capstone in 2020-2022) | `advanced-major` |
| ME | 전공 48, 전공선택 36, 기반 5/9, **심화전공 15**, **기반 9/9**, 연구 3 | `advanced-major`, `basis-all` |
| EE | 전공 50, 전공선택 35, 전공필수군 3/6, **심화전공 12**, 연구 3 | `advanced-major` |

**Identification rule**: A bucket is 심화-specific if its `id` is `"advanced-major"` OR `"basis-all"`.

**주전공 for each track**:
- 심화전공: 주전공 base + 심화-specific buckets (i.e., full 심화전공 program — same as today)
- 복수전공 primary: 주전공 base **minus `research` bucket** (연구 면제)
- 부전공 primary: 주전공 base (연구 required)

## Ubiquitous Language

- **주전공**: The base primary major requirements (required courses + base credit buckets, excluding 심화-specific extras). Every student must complete this regardless of track.
- **심화전공**: 주전공 + additional 심화 course requirements in the same department.
- **복수전공**: A secondary department where the student completes that department's 복수전공 requirements (~40학점).
- **부전공**: A secondary department where the student completes that department's 부전공 requirements (~18학점).
- **Primary department**: The student's home department (주전공 is always analyzed here).
- **Secondary department**: The department in which the student is doing 복수전공 or 부전공.

## Domain Rules And Invariants

1. Every student has exactly one primary department.
2. Every student selects exactly one track.
3. The four tracks are mutually exclusive — you cannot do 심화전공 AND 복수전공.
4. For 복수전공 and 부전공, a secondary department is required and must differ from the primary.
5. Primary department always uses 주전공 base (derived from 심화전공 minus 심화-specific buckets).
6. For 심화전공 track: primary also includes 심화-specific buckets.
7. For 복수전공 track: primary 주전공 has research bucket removed (연구 면제). Common requirements relaxed (인선 12, 기초선택 6, 연구 0).
8. For 부전공 track: primary 주전공 includes research bucket. Common requirements NOT relaxed.
9. Each program analysis is independent — no automatic credit de-duplication across primary and secondary (overlap rules vary by department and are too complex for V1).
10. 자유융합전공 behavior is unchanged from current implementation.

## Use Cases

### UC1: 심화전공 (no change from current)
- User selects: AE department, 심화전공, 2022학번
- Analysis: common requirements + AE 심화전공 (full program, same as today)
- Display: one ProgramRequirementSection for AE 심화전공

### UC2: 복수전공 (new)
- User selects: AE department, 복수전공, secondary = CS, 2022학번
- Analysis:
  - Common: relaxed (인선 12, 기초선택 6, 연구 0)
  - Primary: AE 주전공 (7 required courses + 전공 42 + 전공선택 21 — NO 심화 18, NO 연구 3)
  - Secondary: CS 복수전공 (6 required courses + 복수전공 40)
- Display: two ProgramRequirementSection panels — "AE 주전공" and "CS 복수전공"

### UC3: 부전공 (new)
- User selects: AE department, 부전공, secondary = ME, 2022학번
- Analysis:
  - Common: NOT relaxed (인선 21, 기초선택 9, 연구 3)
  - Primary: AE 주전공 (7 required courses + 전공 42 + 전공선택 21 + 연구 3 — NO 심화 18)
  - Secondary: ME 부전공 (no required slots + 부전공 21 + 전공필수 2과목)
- Display: two ProgramRequirementSection panels — "AE 주전공" and "ME 부전공"

### UC4: Unsupported primary + supported secondary
- User selects: OTHER department, 복수전공, secondary = CS, 2022학번
- Analysis:
  - Common: relaxed
  - Primary: generic 전공합계 40학점 (no detailed analysis)
  - Secondary: CS 복수전공 (full analysis)
- Display: one ProgramRequirementSection for CS 복수전공

### UC5: Supported primary + unsupported secondary
- User selects: AE department, 복수전공, secondary = OTHER, 2022학번
- Analysis:
  - Common: relaxed
  - Primary: AE 주전공 (full analysis)
  - Secondary: common-only message
- Display: one ProgramRequirementSection for AE 주전공

### UC6: Primary = secondary blocked
- User selects: AE department, 복수전공, secondary = AE → blocked, error shown

## Acceptance Criteria

1. **AC1**: When track = 복수전공 or 부전공, a secondary department selector appears in the upload form.
2. **AC2**: Secondary selector excludes the primary department from options.
3. **AC3**: Primary department always analyzed as 주전공 (심화전공 minus `advanced-major` and `basis-all` buckets).
4. **AC4**: For 복수전공, primary 주전공 also excludes the `research` bucket (연구 면제).
5. **AC5**: For 부전공, primary 주전공 keeps the `research` bucket.
6. **AC6**: Secondary department analyzed using existing 복수전공/부전공 program types from the reviewed DB (unchanged).
7. **AC7**: Both program analyses rendered as separate ProgramRequirementSection panels.
8. **AC8**: Common requirements reflect track modification (복수전공 relaxes 인선/기초선택/연구; 부전공 does not).
9. **AC9**: 심화전공 behavior unchanged — single department, full program analysis.
10. **AC10**: 자유융합전공 behavior unchanged.
11. **AC11**: Dashboard header shows both departments when dual-dept (e.g., "AE 주전공 · CS 복수전공").
12. **AC12**: All existing tests continue to pass.
13. **AC13**: `npx next build` succeeds.
14. **AC14**: `npx vitest run` passes (new + existing tests).
15. **AC15**: `node scripts/validate-kaist-data.mjs` passes.

## Changes Required

### 1. `src/domain/types.ts`

- Add `"주전공"` to `SupportedProgramType` union (for display purposes).
- Add optional `secondaryDepartment?: DepartmentSelection` to `PlannerSelection`.
- Add optional fields to `RequirementSet`:
  - `secondaryProgramSupport?: ProgramSupportInfo`
  - `secondaryDepartmentRequirement?: DepartmentProgramRequirement | null`
- Add optional fields to `AnalysisResult`:
  - `secondaryProgramSupport?: ProgramSupportInfo`
  - `secondaryProgramAnalysis?: ProgramAnalysisResult | null`

### 2. `src/domain/configs/planner.ts`

- New function `derivePrimaryMajorRequirement(심화전공Requirement, track)`:
  - Takes the 심화전공 `DepartmentProgramRequirement` for the primary department
  - Removes buckets with id `"advanced-major"` or `"basis-all"` → this is 주전공 base
  - If track is 복수전공: also remove bucket with id `"research"`
  - Returns a new `DepartmentProgramRequirement` with `programType: "주전공"` and `displayName` updated
- Update `buildPlannerRequirementSet()`:
  - When track = 심화전공: behavior unchanged (load 심화전공 program)
  - When track = 복수전공 or 부전공:
    - Primary: load 심화전공 program for primary dept → pass through `derivePrimaryMajorRequirement(req, track)` → attach as `departmentRequirement`
    - Secondary: load 복수전공/부전공 program for secondary dept → attach as `secondaryDepartmentRequirement`
    - Compute `secondaryProgramSupport` from secondary selection
  - When track = 자유융합전공: unchanged
- Update `getProgramSupport()`:
  - New helper or parameter to support querying support for secondary selection

### 3. `src/domain/services/RequirementAnalyzer.ts`

- Update `analyze()`:
  - After computing primary program analysis (existing logic), check for `secondaryDepartmentRequirement`
  - If present and supported: run `analyzeSupportedProgram()` for secondary requirement → attach as `secondaryProgramAnalysis`
  - The `전공합계` category in common categories:
    - When dual-dept: do NOT add a single generic `전공합계` (each program section has its own credit totals)
    - When single-dept (심화전공): keep existing behavior
  - Overall status: must also consider secondary program fulfillment

### 4. `src/app/page.tsx`

- New state: `secondaryDepartment: DepartmentSelection | null`
- Conditionally render secondary department selector when track = 복수전공 or 부전공
- Reset `secondaryDepartment` when track changes away from 복수/부전공
- Pass `secondaryDepartment` into `buildPlannerRequirementSet()` via `PlannerSelection`
- `canAnalyze`: also require secondaryDepartment when track = 복수/부전공
- `DashboardState`: add `secondaryDepartment` field
- Dashboard header: show both departments when applicable
- Render TWO `ProgramRequirementSection` panels: one for primary, one for secondary

### 5. `src/app/components/upload/TrackSelector.tsx`

- Update help text to describe the actual track semantics clearly:
  - 심화전공: "소속 학과에서 추가 심화과목 12학점+ 이수"
  - 복수전공: "다른 학과에서 40학점+ 추가 이수 (인선·기초선택·연구 완화)"
  - 부전공: "다른 학과에서 18학점+ 추가 이수"
  - 자유융합전공: "2개+ 학사조직에서 12학점+ 이수"

### 6. `src/app/components/upload/DepartmentSelector.tsx`

- The existing selector becomes the "주전공 학과" selector. Update label from "학과" to "주전공 학과".
- Create a new `SecondaryDepartmentSelector` component (or reuse `DepartmentSelector` with filtered options and different label).
  - Label: "복수전공 학과" or "부전공 학과" (dynamic based on track)
  - Options: same department list but excluding primary department
  - Same styling as primary selector

### 7. `src/app/components/dashboard/ProgramRequirementSection.tsx`

- No structural changes needed — component already renders one analysis. It will simply be instantiated twice in `page.tsx`.
- The `displayName` field on each `ProgramAnalysisResult` already distinguishes them (e.g., "AE 주전공" vs "CS 복수전공").

### 8. `src/app/components/data.ts`

- No changes needed.

## Test Cases

### Domain tests

- **T1**: `derivePrimaryMajorRequirement` strips `advanced-major` bucket from AE 심화전공 → result has 3 buckets (major-total, major-elective, research), not 4
- **T2**: `derivePrimaryMajorRequirement` with 복수전공 also strips `research` → result has 2 buckets (major-total, major-elective)
- **T3**: `derivePrimaryMajorRequirement` strips `advanced-major` AND `basis-all` from ME → result has 4 buckets (major-total, major-elective, basis-minimum, research)
- **T4**: `derivePrimaryMajorRequirement` preserves requiredCourseSlots and equivalencies from the source 심화전공 program
- **T5**: `buildPlannerRequirementSet` with 복수전공 + secondary dept returns both primary and secondary department requirements
- **T6**: `buildPlannerRequirementSet` with 심화전공 (no secondary) returns same result as before (regression)
- **T7**: `RequirementAnalyzer.analyze` with dual-dept produces both `programAnalysis` and `secondaryProgramAnalysis`
- **T8**: `RequirementAnalyzer.analyze` with 부전공 keeps research bucket in primary, does NOT relax common requirements
- **T9**: `RequirementAnalyzer.analyze` with 복수전공 removes research from primary, relaxes common requirements

### UI validation (manual)

- **T10**: Track = 심화전공 → no secondary selector visible
- **T11**: Track = 복수전공 → secondary selector appears with label "복수전공 학과"
- **T12**: Track = 부전공 → secondary selector appears with label "부전공 학과"
- **T13**: Primary = AE, secondary options exclude AE
- **T14**: Dashboard shows two program sections when dual-dept
- **T15**: Dashboard header shows "AE · CS 복수전공 · 2022학번 기준"
- **T16**: Track changed from 복수전공 to 심화전공 → secondary selector disappears and secondaryDepartment resets

## Out of Scope

- Credit de-duplication / overlap enforcement between primary and secondary programs (complex, varies by department, deferred to future)
- Modeling a separate 주전공 program type in the reviewed JSON files (derivation from 심화전공 at runtime is sufficient)
- Adding 주전공 as a new entry in `program-requirements.generated.json` (derivation happens in planner.ts, not in the pipeline)
- Triple-program combinations (e.g., 심화전공 + 부전공 simultaneously)
- Changes to 자유융합전공 behavior

## Risks

- **ME `basis-all` identification**: The `basis-all` bucket must be correctly identified as 심화-specific. The bucket id is literally `"basis-all"` in the reviewed data, so the filter rule `id === "advanced-major" || id === "basis-all"` is deterministic and safe.
- **Research exemption completeness**: The research exemption for 복수전공 is confirmed across all 4 departments in our corpus. If a future department has different rules, the derivation function would need a per-department override.
- **Display name clarity**: "주전공" may be unfamiliar to some students. The display should clarify what it means (e.g., "AE 전공 (주전공)").

## Open Questions

None — domain model is confirmed by official KAIST sources, reviewed DB structure is known, and derivation rules are deterministic.
