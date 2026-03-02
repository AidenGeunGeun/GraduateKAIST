# KAIST Graduation Planner — Domain & Product Specification

A client-side web application that answers one question: **"나 졸업 가능해?"**

Students upload their KAIST ERP transcript (Excel), select their department and admission year, and instantly see their graduation progress — what's done, what's missing, and what to take next. All processing happens in the browser. No student data ever leaves the machine.

## Reference Files

Read these before making any decisions. They contain the detailed data tables, grade systems, and edge case documentation that define the domain.

| File | Contents |
|------|----------|
| `references/transcript-format.md` | Excel column structure, grade system (points, special codes, P/NR), retake flag logic (Z/Y), credit categories (구분), GPA calculation rules, all known edge cases |
| `references/requirements.md` | Graduation requirement tables by admission year, common requirements (all departments), AE department-specific requirements, specialization tracks, official source URLs |

---

## 1. Domain Model (Ubiquitous Language)

These are the core concepts. Every part of the system — data, logic, UI — should use this vocabulary consistently.

### Transcript
A student's complete academic history, parsed from the ERP Excel export. A collection of Course Records grouped by Semester. May include a special "기이수 인정 학점" group for AP/transfer credits earned before enrollment.

### Course Record
A single row in the transcript: one course, one semester, one outcome. Every Course Record has a **lifecycle state**:

- **Active** — Counts toward graduation and GPA. Has a passing letter grade (A+ through D-) or S.
- **Failed** — Has an F grade. Counts in GPA (0.0 points, credits in denominator) but earns zero credits toward graduation. Still "active" in the sense that it exists and has impact.
- **Superseded** — Retake flag = Z. This record is dead. A newer attempt (flag = Y) replaces it. Completely invisible to every calculation.
- **Incomplete** — Grade is W (withdrawal) or R (registered/incomplete). No GPA impact, no credits. Exists in the transcript but contributes nothing.

### Grade
A value with two faces: its display form ("A+", "S", "W") and its numeric impact (4.3, null, null). The critical insight is that some grades are visible to GPA calculation and some are invisible:

- **GPA-visible**: A+ through F (including F at 0.0)
- **GPA-invisible**: S, U, W, R, P, NR

F is uniquely destructive — it puts credits in the GPA denominator (hurting the average) while contributing zero earned credits toward graduation.

### Credit Category (구분)
The registrar-assigned label that routes a course into a graduation requirement bucket. The student doesn't choose this. The category is *mostly* trustworthy — except after a major change, where old-department 전필 courses become misleading. See Business Rules for details.

### Requirement Set
The graduation rulebook for a specific **(admission year x department)** pair. Has two layers:

- **Common Layer** — Shared across all departments: 기초필수, 기초선택, 교양필수, 인문사회선택, 연구, and the specialization track requirement. Defined by admission year.
- **Department Layer** — Department-specific: 전공필수 (specific course list), 전공선택 minimum, 전공합계, 총 졸업이수학점, 기초선택 designated courses, and substitution rules.

### Admission Year (입학년도)
Not just a number — a **policy selector**. Determines which version of every requirement applies. The major boundaries are ~2015, 2016~2022, and 2023+. The 2023+ cohort lives in a different regulatory universe (P/NR grade conversion, different total credit requirements).

### Analysis Result
The gap between what the student has and what they need. Per-category: earned vs required, with specific missing courses identified where applicable. Includes warnings for ambiguous cases that require human judgment (e.g., cross-department 전필, graduate courses as 선택).

---

## 2. Business Rules

These are the hard rules the domain logic must enforce. The reference docs have the raw data tables; this section describes the *logic and reasoning* behind the rules.

### The Retake Problem
When a student retakes a course, two rows appear in the transcript: one with flag Z (the old attempt, now dead) and one with flag Y (the new attempt, now active). Z records are completely invisible — excluded from credit counts, GPA, everything. Match Z/Y pairs by course code. Edge cases:
- Z + W: Student withdrew the first attempt, retook later. Z is still dead.
- N + F with no Y anywhere: Student failed but hasn't retaken yet. The F is alive and painful.

### The F Duality
F simultaneously carries 0.0 grade points AND zero earned credits. But the credits DO count in the GPA denominator. This means F actively drags down GPA while contributing nothing toward graduation. This duality is the single most common calculation bug in naive implementations.

### The Category Trust Problem
The 구분 field from the registrar is the source of truth for routing courses to requirement buckets — but it breaks after a major change. A 전필 (major required) course from a student's *previous* department still appears as 전필 in the transcript, but it does NOT satisfy the *new* department's 전공필수 requirement. Detection: compare the course's offering department against the student's selected department. When they mismatch for 전필 courses, flag it as a warning — don't silently count it, don't silently exclude it. Let the student decide.

### The 인선 Distribution Rule
인문사회선택 isn't just "accumulate 21 credits." There's a distribution constraint: courses must come from **2+ of the 3 계열** (인문, 사회, 문학과예술), with at least one course (3학점) from each of those 2+ 계열. The newer 인핵 (인문핵심) subcategory maps to 인문계열 for this purpose. This requires tracking *which* 계열 are represented, not just total credits. 복수전공 students get a relaxed rule: 12학점 with no 계열 restriction.

### The AU Parallel Track
Activity Unit (AU) requirements exist in a completely separate dimension from credit requirements. 교양필수 requires both 7 credits AND 8 AU. AU courses have 0 credits and are invisible to credit totals. The 체력육성 course is the tricky case: the same course name exists in AU mode (0 credits, 교필) and credit mode (2 credits, 자선). Distinguish by checking: credits = 0 AND AU > 0 → AU version.

### The Column M Rule
The transcript has two grade columns: 성적(P/NR표기전) (column L, original grade) and 성적 (column M, official grade). For pre-2023 students they're identical. For 2023+ students, column M reflects P/NR conversion. Always use column M as the grade of record.

### GPA Calculation
`GPA = Σ(grade_points x credits) / Σ(credits)` where the sum includes only GPA-visible grades (A+ through F). Exclude S/U/W/R/P/NR. Exclude all Z (superseded) rows. F contributes 0.0 x credits to numerator and credits to denominator.

---

## 3. Product Flow

Three moments define the user experience:

### Moment 1: "나 졸업 가능해?"
The student arrives with anxiety and an Excel file. The landing experience answers this emotional question. Upload area dominates the screen. Department and admission year selection. Nothing else. No signup, no onboarding, no tutorial. A visible privacy statement: "모든 성적 데이터는 브라우저에서만 처리됩니다."

### Moment 2: The Reveal
Upload completes, the dashboard materializes. The **first thing visible** is the answer to "am I on track?" — a single headline status (e.g., "27학점 남음" or "졸업요건 충족!"). Then progressively more detail as they scroll: per-category progress, missing courses, GPA.

### Moment 3: "뭘 들어야 하지?"
The actionable part. Which specific courses are missing (especially 전공필수). Which categories are short on credits. What happens to GPA under different scenarios (what-if simulator). This is where students spend time and return each semester.

---

## 4. Design Principles

**Korean-first, bilingual-ready.** Primary audience thinks in Korean. All UI copy, course names, category labels default to Korean. English course names available as secondary information. Typography optimized for Korean text (Pretendard or equivalent — the Korean counterpart to Inter).

**Dark mode default, light available.** The audience is KAIST students at 3am. Respect their eyes.

**Density over whitespace.** These students read datasheets and papers. They want information density, not a marketing page. Think Linear/Notion density — compact, information-rich cards — not Apple-style hero sections.

**Motion with purpose.** Progress bars filling on upload, charts animating on load — these create the emotional payoff of seeing your progress visualized. But no gratuitous animation. Every motion communicates a state change.

**Privacy as brand.** The "no data leaves your browser" guarantee isn't a footnote. It's a trust signal that should be prominent at upload time. KAIST students are technical enough to appreciate this and skeptical enough to care.

**Design references.** Linear (clean density), Raycast (dark mode done right), Notion Korean localization (bilingual UI balance). Avoid generic dashboard aesthetics.

---

## 5. Dashboard Anatomy

The results view should present these information groups. Layout and visual treatment are implementation decisions — what matters is that all of these are represented:

### At-a-Glance Status
The headline answer. Total credits earned vs required. Overall completion percentage. A clear "on track" / "needs attention" / "behind" signal.

### Category Progress
Per-bucket breakdown — each graduation requirement category showing earned vs required:
- 기초필수 (23학점)
- 기초선택 (9학점+)
- 교양필수 (7학점 + 8AU — credits and AU shown separately)
- 인문사회선택 (21학점, with 계열 distribution indicator)
- 전공필수 (department-specific, with individual course checklist)
- 전공선택 (credit total)
- 전공합계 (credit total)
- 자유선택 (overflow bucket)
- 연구 (3학점+)

### Missing Courses
Specific courses the student still needs. Most critical for 전공필수 where exact courses are mandated. Show course code, name, and credits.

### GPA Section
- Current cumulative GPA
- Semester-by-semester trend
- What-if simulator: "If I average [X grade] for my remaining [N credits], my GPA will be [Y]"

### AU Tracker
Separate from credits. Shows progress on:
- 체육과목 (4AU)
- 인성/리더십 (2AU)
- 즐거운 대학생활 (1AU)
- 신나는 대학생활 (1AU)

### Warnings Panel
Edge cases that need human verification. The system should flag but never silently resolve:
- Cross-department 전필 courses (after major change)
- Graduate-level courses (500+) categorized as 선택 that may or may not count as 전선
- Any ambiguous classification the system can't resolve with certainty

---

## 6. Scope Strategy

### V1 (Ship This)
- Common requirements fully analyzed for ALL students (기초필수, 기초선택, 교양필수, 인선, 연구, AU, GPA) — this covers ~60% of graduation requirements regardless of department
- AE (항공우주공학과) as the fully-specified reference department (전공필수 course list, substitution rules, 심화전공 designated courses)
- For unsupported departments: show all common requirement progress + raw 전공 credit totals without specific course checking
- Clear messaging: "항공우주공학과 외 학과는 공통 이수요건만 확인 가능합니다"
- Admission year support: 2016~2022 and 2023+

### V2 (Iterate)
- Add top departments by enrollment (CS, EE, ME, MAS, CH — roughly 5 more)
- Each department is a config addition — no logic changes needed if V1 domain design is clean

### V3 (Crowdsource)
- Contribution flow where students submit their department's requirements
- Owner verifies and merges
- Scales to all ~18 undergraduate departments without solo PDF archaeology

### KAIST Undergraduate Departments (Full List)
자연과학대학: Physics (PH), Mathematical Sciences (MAS), Chemistry (CH)
생명과학기술대학: Biological Sciences (BS)
공과대학: Mechanical Engineering (ME), Aerospace Engineering (AE), Electrical Engineering (EE), School of Computing (CS), Civil and Environmental Engineering (CE), Bio and Brain Engineering (BiS), Industrial Design (ID), Industrial and Systems Engineering (IE), Chemical and Biomolecular Engineering (CBE), Materials Science and Engineering (MSE), Nuclear and Quantum Engineering (NQE), Semiconductor System Engineering (SSE)
인문사회융합과학대학: Digital Humanities and Computational Social Sciences (HSS)
경영대학: Business and Technology Management (BTM)

---

## 7. Deployment & Monetization

**Deployment**: Static site on Vercel. No backend, no database, no server costs. Custom domain. The entire app is client-side — Vercel just serves the static bundle.

**Monetization**: Google AdSense with two placements maximum — one between upload and results, one sidebar (desktop) / bottom (mobile). Keep it tasteful. Audience is ~3,600 undergrads so revenue expectations should be modest. A "후원하기" (buy me a coffee / donate) link will likely outperform ads for this niche. Include both.

**Analytics**: Basic pageview analytics (Vercel Analytics or similar) for traffic tracking. Never capture or transmit any transcript content. The analytics boundary is: page views and feature usage events (uploaded, selected department, used what-if simulator) — never course data, grades, or GPA.

---

## 8. Domain-Driven Design Notes

This project follows DDD + TDD principles. Guidance for the implementing team:

**The domain layer has zero framework dependencies.** All graduation logic — parsing, filtering, classification, GPA calculation, requirement comparison — is pure business logic with no dependency on any UI or infrastructure library. This makes it independently testable.

**Test-driven development.** Write domain tests first. The business rules in Section 2 map directly to test cases: retake filtering, F grade handling, 인선 distribution checking, AU tracking, cross-department 전필 detection. If these pass, the domain is correct. The UI is just a view.

**Department configs are data, not code.** Adding a department should require adding a configuration — not modifying application logic. The common requirements are a separate shared config. This separation is what makes V2/V3 scaling possible.

**The Aggregate Root is the Requirement Set.** A (department x admission year) pair selects a Requirement Set. The Analysis is performed by comparing a Transcript against a Requirement Set. This is the central operation of the entire system.

**Value Objects are everywhere.** Grade, CourseCode, Semester, CreditCategory, AdmissionYear — these all have validation rules and equality semantics that deserve to be explicit types, not raw strings/numbers. The implementing team decides how to express this.

**Infrastructure adapts the messy world.** Excel parsing is an infrastructure concern. The domain doesn't know about Excel — it works with Course Records. An adapter layer translates between the two.

**No implementation prescriptions.** This spec defines *what* and *why*. The implementing team decides *how*: file structure, framework choices, state management patterns, component architecture. The domain model and business rules are the constraints; everything else is a decision for the team writing the code.
