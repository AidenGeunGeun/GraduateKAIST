# KAIST ERP Transcript Format Reference

## Table of Contents
1. [Excel Column Structure](#1-excel-column-structure)
2. [Semester Format](#2-semester-format)
3. [Course Code Format](#3-course-code-format)
4. [Grade System](#4-grade-system)
5. [Retake Flag Logic](#5-retake-flag-logic)
6. [Credit Categories](#6-credit-categories)
7. [GPA Calculation](#7-gpa-calculation)
8. [Edge Cases & Gotchas](#8-edge-cases--gotchas)

---

## 1. Excel Column Structure

The ERP transcript export (성적조회 -> 엑셀) has these columns in order:

| Col | Korean Header | Meaning | Examples |
|-----|--------------|---------|----------|
| A | 학년도-학기 | Year-Semester | `2022년 봄학기`, `기이수 인정 학점` |
| B | 학과 | Offering Department | `항공우주공학과`, `물리학과` |
| C | 교과목 | New Course Code | `AE.21000`, `PH.10042` |
| D | 과목번호 | Old Course Code | `AE210`, `PH142` |
| E | 분반 | Section | `A`, `B`, `12`, empty |
| F | 구분 | Credit Category | `기필`, `전필`, `인선(예일)` |
| G | 교과목명 | Course Name (Korean) | `항공우주 열역학` |
| H | 영문교과목명 | Course Name (English) | `Aerospace Thermodynamics` |
| I | 학점 | Credits | `3`, `1`, `0` |
| J | AU | Activity Units | `0`, `1`, `2` |
| K | 재수강 | Retake Flag | `N`, `Y`, `Z` |
| L | 성적(P/NR표기전) | Grade (before P/NR) | `A+`, `B0`, `S`, `W` |
| M | 성적 | Final Grade | Same as L for pre-2023 |

Auto-detect headers by looking for `학년도` or `학기` in the first row. Some exports may have slight header text variations.

---

## 2. Semester Format

Parse with regex: `(\d{4})년\s*(봄|여름|가을|겨울)학기`

| Pattern | Meaning |
|---------|---------|
| `2022년 봄학기` | Spring 2022 |
| `2022년 여름학기` | Summer 2022 |
| `2022년 가을학기` | Fall 2022 |
| `2022년 겨울학기` | Winter 2022 |
| `기이수 인정 학점` | AP/Transfer credits (special — not a regular semester) |

Semester ordering for display: 봄 -> 여름 -> 가을 -> 겨울. Place 기이수 인정 학점 first or in a separate section.

---

## 3. Course Code Format

Two formats coexist in the transcript:

| Format | Pattern | Example | Column |
|--------|---------|---------|--------|
| New | `XX.NNNNN` | `AE.21000` | C (교과목) |
| Old | `XXNNN` | `AE210` | D (과목번호) |

Both refer to the same course. Old codes are more commonly used in department requirement documents. Use old code (column D) for matching against requirement lists.

---

## 4. Grade System

### 4.1 Letter Grades

| Grade | Points | GPA? | Credit Earned? |
|-------|--------|------|----------------|
| A+ | 4.3 | Yes | Yes |
| A0 | 4.0 | Yes | Yes |
| A- | 3.7 | Yes | Yes |
| B+ | 3.3 | Yes | Yes |
| B0 | 3.0 | Yes | Yes |
| B- | 2.7 | Yes | Yes |
| C+ | 2.3 | Yes | Yes |
| C0 | 2.0 | Yes | Yes |
| C- | 1.7 | Yes | Yes |
| D+ | 1.3 | Yes | Yes |
| D0 | 1.0 | Yes | Yes |
| D- | 0.7 | Yes | Yes |
| F | 0.0 | Yes (counts in denominator) | **No** |

### 4.2 Special Codes

| Code | Meaning | GPA? | Credit? |
|------|---------|------|---------|
| S | Satisfactory (Pass) | No | Yes |
| U | Unsatisfactory (S/U fail) | No | No |
| W | Withdrawal | No | No |
| R | Incomplete / Not completed | No | No |
| I | Incomplete (rare, converts to F) | Depends | No until resolved |
| P | Pass (2023+ P/NR system) | No | Yes |
| NR | Not Reported (2023+ P/NR) | No | No |

### 4.3 P/NR System

Applies to 2023학번 이후 only. Column L = original grade, Column M = converted grade.
- Pre-2023 students: columns L and M are identical
- 2023+ students: column M may show P or NR conversions
- **Always use column M** as the official grade

---

## 5. Retake Flag Logic

| Flag | Meaning | Action |
|------|---------|--------|
| N | Normal (first/only attempt) | Count normally |
| Y | Retake — this is the NEW attempt | Count this grade (replaces old) |
| Z | Superseded by retake | **EXCLUDE entirely** — no credits, no GPA |

When a student retakes a course, TWO rows appear:
- One with `Z` (old attempt) — ignore completely
- One with `Y` (new attempt) — use this one

Match retake pairs by course code (column C or D).

Edge cases:
- `Z` + `W`: Student withdrew first, retook later. Ignore Z row.
- `Z` + letter grade: Student passed initially but retook. Z row's grade is overridden by Y row.
- `Y` + `F`: Student retook but failed again. The F from Y row counts in GPA.
- `N` + `F`: Student failed but hasn't retaken yet. F counts in GPA, no credit earned.

---

## 6. Credit Categories (구분 field)

| Code | Full Korean | English | Requirement Bucket |
|------|------------|---------|-------------------|
| 기필 | 기초필수 | Basic Required | 기초필수 (23학점) |
| 기선 | 기초선택 | Basic Elective | 기초선택 (9학점+) |
| 교필 | 교양필수 | Liberal Arts Required | 교양필수 (7학점 + 8AU) |
| 인선(인일) | 인문사회선택 (인문계열) | HSS - Humanities | 인선 인문 |
| 인선(사일) | 인문사회선택 (사회계열) | HSS - Social Sciences | 인선 사회 |
| 인선(예일) | 인문사회선택 (문학과예술) | HSS - Literature & Arts | 인선 문학과예술 |
| 인선(인핵) | 인문사회선택 (인문핵심) | HSS - Humanities Core | 인선 인문 (maps to 인문계열) |
| 전필 | 전공필수 | Major Required | 전공필수 |
| 전선 | 전공선택 | Major Elective | 전공선택 |
| 자선 | 자유선택 | Free Elective | 자유선택 |
| 연구 | 연구 | Research | 연구 (3학점+) |
| 선택 | 선택 | Graduate Elective | May count as 전선 (department policy) |

---

## 7. GPA Calculation

```
GPA = sum(grade_points * credits) / sum(credits)
```

**Include**: All letter grades A+ through F (including F at 0.0)
**Exclude**: S, U, W, R, P, NR grades. Also exclude any row with 재수강 = Z.

F handling: 0.0 grade points, credits ARE in denominator, credits NOT earned toward graduation total.

For semester GPA: calculate per-semester using the parsed 학년도-학기 grouping.
For cumulative GPA: calculate across all semesters.

---

## 8. Edge Cases & Gotchas

### 8.1 체력육성 Dual Format
Same course name, two modes:
- **AU version**: credits=0, AU>0, category=교필 -> counts toward 교필 AU requirement
- **Credit version**: credits>0, category=자선 -> counts as 자선 credits, NOT toward AU

Detection: check if `credits == 0 && AU > 0`

### 8.2 기이수 인정 학점 (AP/Transfer)
Special semester identifier for pre-enrollment credits. Treated as earned credits with their listed grades (usually S or letter grades). Include in credit totals and GPA as appropriate.

### 8.3 Cross-Department 전필
After changing majors, old department's 전필 courses still appear in transcript but do NOT count toward new department's 전공필수. Flag with warning: "This 전필 course is from [old department] — verify with your department if it counts."

Detection: compare the course's 학과 (column B) with the user's selected department.

### 8.4 Graduate Courses (500+ level)
May appear as `선택` rather than `전선`. Whether they count toward 전공선택 depends on department policy. Flag with warning.

Detection: course code number >= 500 (e.g., AE556)

### 8.5 인선 Distribution Requirement
Need courses from **2+ of 3 계열** (인문, 사회, 문학과예술), each with at least 1 course (>=6학점 total from the 2+ 계열), totaling 21학점.
- 인핵 maps to 인문계열
- 복수전공 students: 계열 구분 없이 12학점 이상 (relaxed requirement)

### 8.6 논술 Identification
논술 courses have HSS codes, are 3학점, categorized as 교필.

### 8.7 AU Courses
Credits = 0, AU > 0. Don't count toward credit totals. DO count toward AU requirements.
S = completed, R = not completed.

### 8.8 Column L vs M for Grades
Pre-2023: identical. 2023+: M may have P/NR. Always read column M (index 12, 0-based) as the official grade.
