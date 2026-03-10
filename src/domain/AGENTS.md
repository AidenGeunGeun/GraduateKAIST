# Domain Layer Guide

## Overview

The domain layer is the business logic core of the graduation planner. It is intentionally isolated from Next.js, React, and the database. All graduation rule logic lives here. No domain file may import from `app/`, `pages/`, or any UI layer.

## Directory Structure

```
src/domain/
├── types.ts                  — All shared interfaces and type unions
├── models/                   — Immutable value objects (no side effects)
│   ├── Grade.ts              — Grade.from("A+"), Grade.tryFrom(), points/earnsCredit/isGpaVisible
│   ├── Semester.ts           — Semester.fromText("2022년 봄학기"), sorting, isPreEnrollment
│   ├── CourseCode.ts         — old/new code, departmentPrefix, numericPart (5-digit → level)
│   ├── CreditCategory.ts     — CreditCategory.from("인선(예일)") → 인선_예술
│   ├── CourseRecord.ts       — Entity: lifecycleState (Active/Superseded/Failed/Incomplete)
│   └── Transcript.ts         — Aggregate: activeRecords(), earnedRecords(), auRecords()
├── services/                 — Pure functions that compute results from domain objects
│   ├── GpaCalculator.ts      — calculateCumulative, calculateBySemester, whatIf
│   ├── RequirementAnalyzer.ts— analyze(transcript, requirementSet) → AnalysisResult (main entry point)
│   ├── HssDistributionChecker.ts — 인선 계열 분포 검사
│   └── AuTracker.ts          — AU 카테고리별 이수 체크 (즐대생/신대생 등)
├── configs/                  — Runtime requirement configuration
│   ├── requirements.ts       — Common requirements per admission year; applyTrackModification()
│   └── planner.ts            — Department requirements loader; buildPlannerRequirementSet()
├── generated/                — Auto-generated, committed, never hand-edited
│   ├── departments.generated.ts — SupportedDepartment type + DEPARTMENT_LABELS (from registry.json)
│   └── course-catalog.generated.json — AE/ME/CS/EE course list with old+new codes (from CAIS DB)
└── test-utils/               — Shared test helpers
    └── createRecord.ts
```

## Key Invariants

These invariants MUST NOT be broken. Tests validate them; logic must preserve them.

- `CourseRecord.lifecycleState === "Superseded"` when `retakeFlag === "Z"` — these records NEVER count toward anything.
- `earnedRecords()` only returns records where `grade.earnsCredit === true` AND `lifecycleState !== Superseded`.
- Grade `"W"` (철회) → `earnsCredit = false`. Grade `"R"` (재수강삭제) → `earnsCredit = false`.
- AU courses have `credits === 0` and `au > 0` — they are completely separate from credit courses.
- 체육 AU retroactively abolished: pre-2023 students' 체육 AU converts 1 AU → 1학점 toward total (handled in `AuTracker`).
- Course code matching is bidirectional: old (`AE210`) ↔ new non-dotted (`AE21000`) ↔ new dotted (`AE.21000`) — `expandCodeVariants()` in `planner.ts` handles all three forms at runtime.

## RequirementAnalyzer — Entry Point

```typescript
// 1. Build the requirement set for the student's selection
const requirementSet = buildPlannerRequirementSet(selection); // returns RequirementSet | null

// 2. Run analysis
const result = RequirementAnalyzer.analyze(transcript, requirementSet);
```

`RequirementSet` carries: common requirement thresholds, track-modified values, `programSupport`, `departmentRequirement`, `secondaryProgramSupport`, `secondaryDepartmentRequirement`.

`analyze()` returns `AnalysisResult`: a structured summary of fulfilled/unfulfilled buckets, manual-review flags, and GPA.

## Track System

There are 4 tracks. Each modifies what is shown and how common requirements are adjusted.

| Track        | Common requirement change                           | Primary shows              | Secondary shows         |
|--------------|-----------------------------------------------------|----------------------------|-------------------------|
| 심화전공     | None (baseline)                                     | 심화전공 rules             | —                       |
| 복수전공     | 인선 21→12, 기초선택 9→6, 연구 면제                 | 주전공 (심화전공 minus advanced-major bucket) | 복수전공 rules |
| 부전공       | None                                                | 주전공 (includes research) | 부전공 rules            |
| 자유융합전공 | Depends on composition                              | Analyzed specially — not via `departmentRequirement` | — |

`applyTrackModification()` in `requirements.ts` mutates common thresholds based on track. `buildPlannerRequirementSet()` in `planner.ts` applies this and wires in department rules.

자유융합전공 requires 2개 이상 학사조직 + 12학점 이상 전공. It is analyzed separately inside `RequirementAnalyzer` rather than through `departmentRequirement`.

## Adding or Modifying Tests

Tests MUST validate domain truth (real rule scenarios), not just code mechanics. A green test suite against wrong domain rules is worthless.

- Test files live next to source files: `models/Grade.test.ts`, `services/RequirementAnalyzer.test.ts`, etc.
- Domain-config tests live in `configs/planner.test.ts` — test real department rule scenarios here.
- Shared helpers live in `test-utils/createRecord.ts`.
- Run tests: `npx vitest run` (or `npm run test:run`).

Do not add tests that only verify TypeScript types or trivial pass-throughs. Test real scenarios: e.g., "AE 2020 학번 학생이 전필 X를 이수하면 해당 슬롯이 충족된다."
