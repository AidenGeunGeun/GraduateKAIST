# Phase 2: UI & Dashboard — Spec

**ID**: 364e8e13  
**Status**: APPROVED  
**Phase**: 2 of 3  
**Depends on**: Phase 1 (domain layer — complete)

---

## Intent

Build the complete user-facing interface for the KAIST Graduation Planner. Three moments: Upload (the anxious question), Dashboard (the reveal), What-if (the actionable plan). Dark mode default, Korean-first, dense and information-rich. All data processing uses the domain layer from Phase 1 — no new business logic.

---

## Goals

1. **Landing / Upload page** — File upload, department + admission year selection, privacy statement
2. **Dashboard** — At-a-glance status, per-category progress, missing courses, GPA, AU tracker, warnings
3. **What-if Simulator** — GPA projection with adjustable inputs
4. **Theme** — Dark mode default (with toggle), Pretendard font, Linear/Raycast-inspired density
5. **Responsive** — Mobile-first, works on phones and desktops
6. **State management** — Client-side state transitions (upload → analysis → results)

---

## Constraints

- ALL data processing uses existing domain services — do NOT duplicate or rewrite business logic
- Domain imports come from `@/domain/` — the domain layer remains framework-agnostic
- No backend, no API calls, no data leaves the browser
- Korean as primary language for all UI copy
- Tailwind CSS v4 (already configured, CSS-based `@theme` config in globals.css)
- Next.js App Router with `"use client"` where needed
- Lightweight charting only — no heavy libraries (recharts/chart.js are too heavy). Use CSS progress bars, simple inline SVG, or a micro-library like `@nivo/line` (treeshakeable) if needed for the GPA trend. Or just build a simple SVG line chart component.
- Phase 1 tests (84 tests) MUST continue to pass — do not modify domain code in ways that break existing tests
- All existing files in `src/domain/` and `src/infrastructure/` must not be deleted or have their public APIs broken

---

## Design System

### Typography
- **Primary font**: Pretendard — the Korean equivalent of Inter. Install via `@fontsource/pretendard` or self-hosted. Replace Geist Sans in layout.tsx.
- **Monospace**: Keep Geist Mono for code-like elements (course codes, credits)
- **Scale**: Compact — body 14px, headings 16-24px, data labels 12px

### Colors (Dark Mode Default)
The app uses dark mode by default. Add a toggle for light mode. Design with these semantic tokens in globals.css using Tailwind v4 `@theme`:

- **Background**: Deep neutral (zinc-950 / #09090b range)
- **Surface**: Slightly lighter cards (zinc-900 / #18181b range)
- **Border**: Subtle (zinc-800 / #27272a range)
- **Text primary**: zinc-50
- **Text secondary**: zinc-400
- **Accent / success**: Emerald or green for "fulfilled"
- **Warning**: Amber for "in progress" / warnings
- **Danger**: Red for "behind" / missing
- **Progress bars**: Use accent colors against surface backgrounds

Light mode: Invert appropriately. White/zinc-50 backgrounds, dark text.

### Density
- Compact padding: 8-12px in cards, 4-6px between items
- No hero sections, no excessive whitespace
- Data tables and cards should feel like Linear/Notion — clean rows, tight spacing
- Progress bars: thin (4-6px height), rounded

### Motion
- Progress bars animate on mount (0 → current value, ~500ms ease-out)
- Dashboard sections stagger-fade-in on load (50ms delay between sections)
- Theme toggle: smooth color transition (150ms)
- No bouncing, no confetti, no gratuitous effects

---

## Page Structure

This is a single-page application with two states: **Upload** and **Results**.

### State 1: Upload (Landing)

```
┌──────────────────────────────────────────┐
│  KAIST 졸업요건 분석기                      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │   📄 성적 엑셀 파일을 여기에 드래그하거나  │  │
│  │      클릭하여 업로드하세요              │  │
│  │                                    │  │
│  │   .xlsx 파일 (ERP 성적조회 다운로드)    │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  학과:  [항공우주공학과 ▾]                   │
│  입학년도: [2022 ▾]                        │
│                                          │
│  🔒 모든 성적 데이터는 브라우저에서만 처리됩니다. │
│     서버로 전송되지 않습니다.                 │
│                                          │
│  [분석 시작]                               │
└──────────────────────────────────────────┘
```

**Components:**
- **FileUpload**: Drag-and-drop zone + click-to-browse. Accepts `.xlsx` only. Shows filename after selection. Visual feedback on drag-over.
- **DepartmentSelector**: Dropdown with all KAIST departments. AE is the only fully-supported department — others show a notice: "공통 이수요건만 확인 가능합니다"
- **AdmissionYearSelector**: Dropdown for admission year (2016-2025 range). Groups into the policy ranges (2016-2022, 2023+).
- **PrivacyBadge**: Lock icon + Korean privacy statement. Always visible.
- **AnalyzeButton**: Disabled until file + department + year are all selected. On click: parse Excel → run analysis → transition to Results.

**Department list** (from product spec):
- 항공우주공학과 (AE) — fully supported
- All other departments listed in product spec Section 6 — common requirements only
- Show badge: "전체 지원" for AE, "공통만" for others

**Admission year range**: 2016-2025

### State 2: Results (Dashboard)

After analysis completes, the page transitions (smooth fade/slide) to the dashboard layout.

**Top bar**: "← 다시 분석하기" button to return to upload. Department + year displayed. Theme toggle.

**Layout (Desktop)**: Two-column. Left sidebar (narrow): navigation/summary. Main content: scrollable detail sections.

**Layout (Mobile)**: Single column, stacked sections.

#### Section A: At-a-Glance (Hero Status)

The emotional answer. One big number and a status.

```
┌──────────────────────────────────────┐
│  🎓 졸업까지 27학점 남음               │
│  ━━━━━━━━━━━━━━━━━━━━━░░░░░ 80.1%   │
│  136학점 중 109학점 이수              │
│                                      │
│  누적 GPA: 3.72 / 4.30               │
└──────────────────────────────────────┘
```

- **Status variants**:
  - `fulfilled`: "졸업요건 충족! 🎉" (green accent)
  - `in_progress`: "졸업까지 N학점 남음" (amber accent)
  - `behind`: "졸업요건 미충족 — N학점 부족" (red accent)
- Large progress bar showing total credits
- Cumulative GPA displayed prominently

#### Section B: Category Progress Cards

Grid of cards (2-3 columns desktop, 1 column mobile). Each card:

```
┌─────────────────────────┐
│ 기초필수          20/23  │
│ ━━━━━━━━━━━━━━░░░ 87%  │
│ 3학점 부족               │
└─────────────────────────┘
```

One card per category:
1. **기초필수** — credits progress bar
2. **기초선택** — credits progress bar
3. **교양필수** — credits progress bar + AU sub-tracker (show both)
4. **인문사회선택** — credits progress bar + 계열 distribution indicator (show which 계열 are represented)
5. **전공필수** — credits + missing course list (expandable)
6. **전공선택** — credits progress bar
7. **전공합계** — credits progress bar
8. **연구** — credits progress bar
9. **자유선택** — credits count (informational, no "required")

For **교양필수**, show the AU breakdown inline or as a sub-section:
```
교양필수  7/7학점 ✓  |  AU 6/8
  체육: 4/4 ✓  인성: 2/2 ✓  즐거운: 0/1 ✗  신나는: 0/1 ✗
```

For **인문사회선택**, show 계열 distribution:
```
인문사회선택  18/21학점
  인문: 6학점 ✓  사회: 9학점 ✓  예술: 3학점 ✓
```

For **전공필수**, show the course checklist:
```
전공필수  18/21학점  (6/7 과목)
  ✓ AE210 항공우주 열역학
  ✓ AE220 공기역학I
  ✗ AE208 항공우주공학 실험I    ← highlight missing
  ✓ AE307 항공우주공학 실험II
  ✓ AE300 비행역학 프로젝트
  ✓ AE330 항공우주 구조역학I
  ✓ AE400 항공우주 시스템설계I
```

#### Section C: GPA Details

- **Cumulative GPA**: Large number display
- **Semester trend**: Simple line chart or bar chart showing GPA by semester. Lightweight — build with SVG or use CSS-only bars per semester.
- **What-if Simulator**: Interactive section:
  ```
  남은 학점에서 평균 [B+ ▾] 을 받으면 → 예상 GPA: 3.65
  ```
  - Grade selector dropdown (A+ through D-)
  - Remaining credits auto-calculated from (required - earned)
  - Projected GPA updates live as the grade changes
  - Uses `GpaCalculator.whatIf()` from domain layer

#### Section D: AU Tracker

Compact section showing the 4 AU subcategories:
```
AU 이수현황  6/8
  체육:      4/4 ████████ ✓
  인성/리더십: 2/2 ████████ ✓
  즐거운:     0/1 ░░░░░░░░ ✗
  신나는:     0/1 ░░░░░░░░ ✗
```

#### Section E: Warnings Panel

If warnings exist, show prominently (amber/red background cards):
```
⚠️ 주의사항
• 물리학과 전필 과목(PH301)은 선택한 학과(AE)와 다릅니다. 학과 사무실에 확인하세요.
• 대학원 과목(AE556) 인정 여부를 확인하세요.
• 인문사회선택 계열 분포 요건이 충족되지 않았습니다.
```

#### Section F: Full Course List (Collapsible)

Expandable section showing all parsed courses grouped by semester. Compact table:
```
2022년 봄학기
  코드    | 과목명           | 구분 | 학점 | 성적
  AE210  | 항공우주 열역학    | 전필 | 3   | A+
  PH142  | 일반물리학I       | 기필 | 3   | B+
  ...
```

Color-code rows by lifecycle state:
- Active: normal
- Failed (F): red tint
- Superseded (Z): strikethrough, muted
- Incomplete (W/R): amber tint

---

## Component Architecture

The Orchestrator owns the exact implementation, but here's the expected component tree:

```
src/app/
  layout.tsx          — Root layout, Pretendard font, theme provider
  page.tsx            — Main page with upload/results state machine
  globals.css         — Tailwind v4 theme tokens, dark/light mode
  components/
    ThemeToggle.tsx
    upload/
      FileUpload.tsx
      DepartmentSelector.tsx
      AdmissionYearSelector.tsx
      PrivacyBadge.tsx
      AnalyzeButton.tsx
    dashboard/
      StatusHero.tsx
      CategoryCard.tsx
      CategoryGrid.tsx
      MajorCourseChecklist.tsx
      HssDistribution.tsx
      AuTracker.tsx
      GpaSection.tsx
      GpaTrend.tsx
      WhatIfSimulator.tsx
      WarningsPanel.tsx
      CourseListTable.tsx
    shared/
      ProgressBar.tsx
      Badge.tsx
```

---

## Integration Points with Domain Layer

```typescript
// In page.tsx or a hook:
import { ExcelTranscriptParser } from "@/infrastructure/excel-parser/ExcelTranscriptParser";
import { Transcript } from "@/domain/models/Transcript";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import { GpaCalculator } from "@/domain/services/GpaCalculator";
import { AuTracker } from "@/domain/services/AuTracker";
import { HssDistributionChecker } from "@/domain/services/HssDistributionChecker";
// Import requirement configs
import { AE_REQUIREMENT_2016_2022, ... } from "@/domain/configs/requirements";

// Flow:
// 1. User selects file → read as ArrayBuffer
// 2. ExcelTranscriptParser.parse(buffer) → CourseRecord[]
// 3. Transcript.from(records) → Transcript
// 4. Select RequirementSet based on department + admission year
// 5. RequirementAnalyzer.analyze(transcript, requirementSet, department) → AnalysisResult
// 6. GpaCalculator.calculateCumulative(transcript) → number
// 7. GpaCalculator.calculateBySemester(transcript) → Map
// 8. AuTracker.track(transcript.auRecords()) → AuResult
// 9. HssDistributionChecker.check(hssRecords, isDualMajor) → HssResult
// 10. Render dashboard with all results
```

---

## Error Handling

- **Invalid file type**: Show inline error "엑셀 파일(.xlsx)만 업로드 가능합니다"
- **Parse failure**: Show error with guidance "ERP 성적조회에서 다운로드한 엑셀 파일을 사용해주세요"
- **Empty transcript**: Show message "파싱된 과목이 없습니다. 파일 형식을 확인해주세요"
- **No matching requirement set**: Fallback gracefully — show what can be analyzed

All errors are user-friendly Korean messages. No stack traces in UI.

---

## Test Cases

### T13: File Upload Component

| # | Given | When | Then |
|---|-------|------|------|
| T13.1 | Upload area rendered | User drags .xlsx file | File accepted, filename displayed |
| T13.2 | Upload area rendered | User drags .pdf file | File rejected with error message |
| T13.3 | No file selected | Click "분석 시작" | Button is disabled |
| T13.4 | File + department + year selected | Click "분석 시작" | Analysis runs, transitions to dashboard |

### T14: Dashboard Rendering

| # | Given | When | Then |
|---|-------|------|------|
| T14.1 | Analysis result with status "fulfilled" | Dashboard renders | Shows "졸업요건 충족!" with green styling |
| T14.2 | Analysis result with status "behind" | Dashboard renders | Shows deficit message with red styling |
| T14.3 | Analysis result with 5/7 전공필수 courses | Dashboard renders | Shows 2 missing courses with names |
| T14.4 | Analysis result with warnings | Dashboard renders | Warnings panel visible with all warnings |
| T14.5 | Analysis result with AU data | Dashboard renders | AU tracker shows 4 subcategories |

### T15: What-if Simulator

| # | Given | When | Then |
|---|-------|------|------|
| T15.1 | Current GPA 3.5, 27 credits remaining | Select "A+" average | Shows projected GPA > 3.5 |
| T15.2 | Current GPA 3.5, 27 credits remaining | Select "C0" average | Shows projected GPA < 3.5 |
| T15.3 | All credits fulfilled (0 remaining) | View simulator | Shows current GPA as final, no adjustment needed |

### T16: Theme Toggle

| # | Given | When | Then |
|---|-------|------|------|
| T16.1 | Dark mode (default) | Toggle theme | Switches to light mode |
| T16.2 | Light mode | Toggle theme | Switches back to dark mode |
| T16.3 | Theme preference | Reload page | Persists via localStorage |

### T17: Responsive Layout

| # | Given | When | Then |
|---|-------|------|------|
| T17.1 | Desktop viewport (>1024px) | View dashboard | Two-column layout, category grid 2-3 cols |
| T17.2 | Mobile viewport (<640px) | View dashboard | Single column, stacked sections |

### T18: Integration (End-to-End Flow)

| # | Given | When | Then |
|---|-------|------|------|
| T18.1 | App loaded | Complete full flow: upload mock data → select AE + 2022 → analyze | Dashboard shows correct analysis results matching domain layer output |
| T18.2 | Dashboard shown | Click "다시 분석하기" | Returns to upload state, previous data cleared |

---

## Out of Scope (Phase 2)

- Google AdSense integration (Phase 3)
- Vercel Analytics (Phase 3)
- SEO metadata / Open Graph (Phase 3)
- 후원하기 link (Phase 3)
- Vercel deployment config (Phase 3)
- Performance optimization (Phase 3)
- Error boundary component (Phase 3)
- Accessibility audit (Phase 3)
- PWA / offline support
- Data export / PDF generation

---

## Verification Commands

```bash
# Domain tests still pass (regression check)
npx vitest run

# Type checking
npx tsc --noEmit

# Lint
npx next lint

# Dev server builds and runs
npx next build
```

---

## Acceptance Criteria

- [ ] AC1: Pretendard font loaded and applied as primary font (replacing Geist Sans)
- [ ] AC2: Dark mode is the default; light mode available via toggle; preference persisted in localStorage
- [ ] AC3: Landing page has file upload (drag-and-drop + click), department selector, admission year selector, privacy statement
- [ ] AC4: Department selector lists all KAIST departments with "전체 지원" badge for AE and "공통만" for others
- [ ] AC5: File upload accepts only .xlsx, shows filename after selection, rejects other formats with Korean error message
- [ ] AC6: "분석 시작" button disabled until file + department + year are all selected
- [ ] AC7: On analyze: Excel parsed → domain analysis runs → dashboard renders with results
- [ ] AC8: Status hero shows overall completion (credits earned/required, percentage, GPA) with color-coded status
- [ ] AC9: Category progress grid shows all categories with progress bars and correct earned/required numbers
- [ ] AC10: 전공필수 card shows individual course checklist with missing courses highlighted
- [ ] AC11: 인문사회선택 card shows 계열 distribution breakdown
- [ ] AC12: 교양필수 card shows both credit progress and AU subcategory breakdown
- [ ] AC13: AU tracker displays all 4 subcategories (체육, 인성/리더십, 즐거운, 신나는) with progress
- [ ] AC14: GPA section shows cumulative GPA + semester-by-semester visualization
- [ ] AC15: What-if simulator allows grade selection and shows projected GPA using GpaCalculator.whatIf()
- [ ] AC16: Warnings panel displays all warnings from AnalysisResult with appropriate styling
- [ ] AC17: Full course list shows all parsed courses grouped by semester with lifecycle state color-coding
- [ ] AC18: "다시 분석하기" returns to upload state
- [ ] AC19: Layout is responsive — works on mobile (single column) and desktop (multi-column)
- [ ] AC20: All Phase 1 domain tests still pass (84 tests, 0 failures)
- [ ] AC21: `npx tsc --noEmit` passes with 0 errors
- [ ] AC22: `npx next build` succeeds
- [ ] AC23: Progress bars animate on mount; dashboard sections have stagger-fade-in animation
- [ ] AC24: All UI copy is in Korean

---

## Completion Standard

Phase 2 is complete when:
1. All 24 acceptance criteria are satisfied
2. `npx vitest run` passes (84+ tests, 0 failures — Phase 1 tests intact)
3. `npx tsc --noEmit` passes with 0 errors
4. `npx next build` succeeds with 0 errors
5. The app is visually complete and functionally working (upload → analyze → dashboard → what-if → back)
