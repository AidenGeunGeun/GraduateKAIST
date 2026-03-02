# KAIST Common Graduation Requirements 2019-2025 (공통학사요람)

> **Scope**: Common (공통) requirements ONLY. No per-department course lists.
> **Source**: Official KAIST PDF documents from ~/Downloads/KAIST_Graduation/, verified by investigators.
> **Purpose**: Authoritative reference for the graduation planner app implementation.

---

## 1. Admission Year Groups

Requirements are NOT identical across all years. There are 5 distinct groups.

**CRITICAL**: 체육 AU was retroactively abolished for ALL students. Per the 2023+ documents:
> "2022학년도 이전 입학생: 체육 4AU대신 교양, 기초, 전공, 연구과목 중 자유롭게 선택하여
> 2학점을 이수하고 이미 취득한 AU에 대해서는 1AU당 1학점으로 대체 인정"

This means ALL years are effectively **138학점 + 4AU**. The original 136학점+8AU for 2019-2022
is superseded: 136 + 2 replacement credits = 138, and 8AU - 4AU(체육) = 4AU remaining.

| Group | Years     | Total Credits | AU  | 인선 핵심유형 | 윤리및안전 과목수 | 기초필수③       | 인성/리더십 분배 |
| ----- | --------- | ------------- | --- | ------------- | ----------------- | --------------- | ---------------- |
| A     | 2019      | 138           | 4AU | No            | 4                 | PH151 only      | 자유 2과목       |
| B     | 2020-2021 | 138           | 4AU | No            | 4 (2021: 이수기한 변경) | PH151 or PH152  | 자유 2과목       |
| C     | 2022      | 138           | 4AU | Yes (2022 봄+) | 5 (+연구기술보안) | PH151 or PH152  | 자유 2과목       |
| D     | 2023-2024 | 138           | 4AU | Yes           | 5                 | PH151 or PH152  | 자유 2과목       |
| E     | 2025      | 138           | 4AU | Yes           | 5                 | PH151 or PH152  | I/II중1 + III/IV중1 |

### 1.1 체육 AU Conversion Rule (2019-2022 students)

If a pre-2023 student has 체육 AU records in their transcript:
- **Each 1AU체육 = 1학점** toward the 138학점 total
- These records should be counted as CREDITS, not as AU fulfillment
- 체육동아리(HSS048) is also no longer recognized

For the app: when processing AU records, if the course is 체육-category AND the student is pre-2023, convert AU to credits. For 2023+ students, 체육 records should not exist.

---

## 2. Overall Graduation Requirements (All Years)

| Item            | ALL years (2019-2025)                              |
| --------------- | -------------------------------------------------- |
| 총 이수학점     | **138학점 이상**                                    |
| 최소 GPA        | **2.0 / 4.3 이상**                                  |
| AU 총계         | **4AU** (인성/리더십 2 + 즐거운 1 + 신나는 1)        |
| 트랙 필수       | 심화/부전공/복수/자유융합 중 1+                     |
| 영어능력 졸업   | TOEFL iBT 83 / TOEIC 720 / IELTS 6.5 / New TEPS 326 |

---

## 3. 교양필수 (Liberal Arts Required)

### 3.1 Credit Courses (7학점, ALL years)

| Course                              | Credits | Code     |
| ----------------------------------- | ------- | -------- |
| English Presentation & Discussion   | 1       | HSS022   |
| Advanced English Listening          | 1       | HSS023   |
| Advanced English Reading            | 1       | HSS025   |
| Advanced English Writing            | 1       | HSS024   |
| 논술 (1 of 4 writing courses)       | 3       | HSS001-004 |
| **Total**                           | **7**   |          |

### 3.2 AU Requirements: 4AU (ALL years, after retroactive 체육 abolition)

| Category        | AU  | Courses/Programs                                     |
| --------------- | --- | ---------------------------------------------------- |
| 인성/리더십     | 2AU | 2019-2024: I~IV 중 자유 선택 2과목. **2025: I/II에서 1 + III/IV에서 1** |
| 즐거운 대학생활 | 1AU | HSS090, 1학년 1학기                                   |
| 신나는 대학생활 | 1AU | HSS091, 1학년 2학기                                   |

> **체육 AU**: Abolished for all students. Pre-2023 students with 체육 AU records:
> each 1AU converts to 1학점 toward 138 total. See Section 1.1.

### 3.3 인성/리더십 Programs (for reference)

| Course          | Programs                                                              |
| --------------- | --------------------------------------------------------------------- |
| 인성/리더십 I   | 7H 리더십, 7H Leadership, 커뮤니케이션 훈련, 초일류 리더십            |
| 인성/리더십 II  | 영리더 목요특강, 글로벌리더십, Wednesday Leadership Lecture           |
| 인성/리더십 III | Freshman Cultural Activity (FCA) — 재학학기 기준 2학기 이내 수강 가능 |
| 인성/리더십 IV  | 마음챙김 명상, 건강챙김, Meditation, 그룹리더십 GLA, 군복무경험, 사회체험 |

---

## 4. 인문사회선택 (인선, HSS Electives)

### 4.1 Base Requirements

| Condition              | 2019-2021 (Groups A-B)              | 2022+ (Groups C-E)                       |
| ---------------------- | ----------------------------------- | ---------------------------------------- |
| 총 이수학점            | **21학점 이상**                      | **21학점 이상**                            |
| 계열 분배              | 3계열 중 **2계열**에서 각 **1과목+(6학점)** | Same                                     |
| 핵심유형 요건          | **없음**                             | **핵심교과목 1과목(3학점) 이상** 포함 필수 |

### 4.2 계열 (Categories)
- **인문계열**: 철학, 역사, 언어학, 윤리학 etc.
- **사회계열**: 심리학, 법학, 경제학, 사회학, 정치학 etc.
- **문학과 예술계열**: 문학, 영화, 음악, 미술 etc.

### 4.3 유형 (Types) — 2022+ only
- **핵심(Core)**: Specially designated courses (varies by semester)
- **융합(Convergence)**: Cross-disciplinary HSS courses
- **일반(General)**: All other HSS electives

### 4.4 복수전공 Relaxation (ALL years)

| Condition         | Normal      | 복수전공 이수자                                       |
| ----------------- | ----------- | ----------------------------------------------------- |
| 총 이수학점       | 21학점      | **12학점 이상**                                        |
| 계열 분배         | 2계열 필수  | **계열 구분 없음**                                     |
| 핵심유형 (2022+)  | 1과목 필수  | **1과목 필수** (still required)                        |
| 핵심유형 (pre-2022)| N/A        | N/A                                                   |

### 4.5 제2외국어 Note
- 2021학년도 가을학기 이전 입학생: 인선으로 인정
- 2021학년도 가을학기 이후 입학생 (= 2022학번+): **자유선택으로만** 인정

---

## 5. 기초과목 (Foundation Courses) — 32학점 이상 (ALL years)

### 5.1 기초필수: 23학점

9 groups, choose 1 course from each:

| # | Options                                                  | Credits | Notes                    |
| - | -------------------------------------------------------- | ------- | ------------------------ |
| ① | 기초물리학I (PH121) / 일반물리학I (PH141) / 고급물리학I (PH161) | 3 | |
| ② | 기초물리학II (PH122) / 일반물리학II (PH142) / 고급물리학II (PH162) | 3 | |
| ③ | 일반물리학실험I (PH151)                                   | 1 | **2019 only**: PH151 only |
|   | 일반물리학실험I (PH151) / 일반물리학실험II (PH152)        | 1 | **2020+**: either one     |
| ④ | 기초생물학 (BS110) / 일반생물학 (BS120)                   | 3 | |
| ⑤ | 미적분학I (MAS101) / 고급미적분학I (MAS103)               | 3 | |
| ⑥ | 미적분학II (MAS102) / 고급미적분학II (MAS104)             | 3 | |
| ⑦ | 기초화학 (CH100) / 일반화학I (CH101) / 고급화학 (CH105)   | 3 | |
| ⑧ | 일반화학실험I (CH102) / 고급화학실험 (CH106)              | 1 | |
| ⑨ | 프로그래밍기초 (CS101) / 고급프로그래밍 (CS102)           | 3 | |

**Special PH171/PH172 rules (ALL years):**
- PH171 = 일반물리학I + 일반물리학실험I both satisfied (no double-enrollment)
- PH172 = 일반물리학II (기초필수) + 일반물리학실험II (기초선택) both satisfied

### 5.2 기초선택: 9학점 이상

| Condition                      | Normal                | 복수전공 이수자         |
| ------------------------------ | --------------------- | ----------------------- |
| 최소 학점                      | **9학점 이상**         | **3학점 or 6학점** (학과별) |

Key courses: PH152, MAS109, MAS201, MAS202, MAS250, CH103, CH104, BS122, BiS102, CE101, MAE106, MAE107, MAE208, MS211, NQE101, EE105, CS109, IE200, IE201, ID201, ID202, MGT201, ED100, ED200, STP110, ITC201-206, AA100

**MAS restriction (2023+):** MAS109 and MAS110 — only 1 counts toward 기초선택.

---

## 6. 전공과목 (Major Courses)

| Item        | ALL years          |
| ----------- | ------------------ |
| 최소 학점   | **40학점 이상**     |
| 세부 요건   | 학과별 상이 (공통요람에서는 총 학점만 규정) |

> Note: Without department data, the app checks only the aggregate 40학점 threshold
> by summing all courses categorized as 전필 or 전선 in the transcript.

---

## 7. 연구과목 (Research Courses)

| Condition    | Normal       | 복수전공 이수자 |
| ------------ | ------------ | --------------- |
| 최소 학점    | **3학점 이상** | **0학점 (면제)** |
| 졸업연구 필수 | Yes (3학점)  | No              |

Eligible courses: 졸업연구, 인턴십프로그램, 개별연구, 세미나

---

## 8. Track System (전공트랙)

### 8.1 Available Tracks (In Scope)

| Track        | Korean     | Min Credits      | Course Eligibility                                   |
| ------------ | ---------- | ---------------- | ---------------------------------------------------- |
| 심화전공     | 심화전공   | **12학점 이상**   | 학과별 지정 과목 (공통에서는 총 학점만 확인)          |
| 부전공       | 부전공     | **18학점 이상**   | 타 학과 전공과목 18학점+                              |
| 복수전공     | 복수전공   | **40학점 이상**   | 소속+복수 전공필수 포함 40학점 (학과별 상이)          |
| 자유융합전공 | 자유융합전공 | **12학점 이상** | 소속 외 **2개 이상 학사조직**의 전공교과목             |

### 8.2 Track Impact on Common Requirements

| Requirement      | 심화전공 | 부전공 | 복수전공                 | 자유융합전공 |
| ---------------- | -------- | ------ | ------------------------ | ------------ |
| 인선 학점        | 21       | 21     | **12** (계열 무관)        | 21           |
| 인선 핵심 (2022+)| 1과목    | 1과목  | **1과목** (still required) | 1과목        |
| 기초선택         | 9        | 9      | **3 or 6** (학과별)       | 9            |
| 연구과목         | 3        | 3      | **0 (면제)**               | 3            |
| 총 졸업학점      | Same     | Same   | Same                     | Same         |

### 8.3 Out of Scope Tracks
- **지정융합전공**: Documented but marked 미운영 (not operating) since 2023. Excluded.
- **특별지정전공**: Per-program requirements, too specific. Excluded.

### 8.4 복수전공 Additional Rules
- **학점 중복 인정**: 소속/복수전공 전공교과목 중복 시 **6학점까지** 인정 (2016+)
- **이수요건 기준**: 입학년도 OR 신청시점 OR 현재 이수요건 중 선택 가능

---

## 9. 자유선택 (Free Electives)

- No minimum credit requirement
- Used to fill remaining credits to reach 136/138 total
- Includes: 타 학과 전공필수/선택, 제2외국어 (2022+), 글쓰기의 기초 etc.

---

## 10. Requirement Summary Table by Year Group

### ALL Groups: Credit Structure (after 체육 AU abolition)

| Category     | Normal | 복수전공 |
| ------------ | ------ | -------- |
| 교양필수     | 7      | 7        |
| 인선         | 21     | 12       |
| 교양소계     | 28     | 19       |
| 기초필수     | 23     | 23       |
| 기초선택     | 9      | 3 or 6   |
| 전공합계     | 40     | 40       |
| 연구         | 3      | 0        |
| 자유선택     | 잔여   | 잔여     |
| **총계**     | **138** | **138** |
| **AU**       | **4**  | **4**    |

### Differences Between Groups (non-credit)

| Group | 인선 핵심유형          | 윤리및안전        | 기초필수③      | 인성/리더십 분배        |
| ----- | ---------------------- | ----------------- | -------------- | ----------------------- |
| A (2019) | No                  | 4과목             | PH151 only     | 자유 2과목              |
| B (2020-21) | No               | 4과목             | PH151/PH152    | 자유 2과목              |
| C (2022) | Yes (핵심 1과목 필수) | 5과목             | PH151/PH152    | 자유 2과목              |
| D (2023-24) | Yes              | 5과목             | PH151/PH152    | 자유 2과목              |
| E (2025) | Yes                 | 5과목             | PH151/PH152    | I/II중1 + III/IV중1     |

---

## 11. 윤리및안전 (Ethics & Safety) — Not AU, Separate Graduation Requirement

| Year Group | Courses Required | Deadline (원칙) |
| ---------- | ---------------- | --------------- |
| 2019       | 4: 실험실안전, 연구윤리, 인권·성평등, 사이버윤리 | 재학학기 기준 2학기 이내 |
| 2020       | 4 (same)         | 첫 학기 중간고사 전 |
| 2021       | 4 (same)         | 첫 학기 개강일 전 |
| 2022+      | **5**: 실험실안전, 연구윤리, 인권·성평등, 사이버윤리, **연구기술보안** | 첫 학기 개강일 전 |

> Note: 윤리및안전 does NOT appear in the transcript. The app cannot check this.
> Display as informational notice only.

---

## 12. 논술 Level Test Rules (ALL years)

| Grade | Action |
| ----- | ------ |
| A     | 수강 면제 (S 부여) |
| B     | 논술 교과목 중 1강좌 수강 |
| C     | 글쓰기의 기초 (자유선택, 1학점) 이수 후 논술 교과목 1강좌 수강 |

논술 courses: 논리적 글쓰기, 비평적 글쓰기, 실용적 글쓰기, 창의적 글쓰기

---

## 13. 영어 TOEFL/IELTS Exemption Rules (ALL years, 2015+)

| Score                   | Exempt Course                     |
| ----------------------- | --------------------------------- |
| Speaking 22+ / IELTS 7.0+ | English Presentation & Discussion |
| Listening 22+ / IELTS 7.0+ | Advanced English Listening       |
| Writing 22+ / IELTS 6.0+  | Advanced English Writing         |
| Reading 22+ / IELTS 7.0+  | Advanced English Reading         |

English courses must be completed within 4 semesters (excluding seasonal).

---

## 14. Special Rules

### 14.1 특강과목 Limits (2025학년도 봄학기부터 모든 재학생)
- General: 최대 **12학점**
- 복수전공: 최대 **15학점** (한 학사조직 최대 12학점)
- 디지털인문사회과학부 특강: 통산 미포함

### 14.2 Honor Program
- 재학 6학기 이내, 85학점+, GPA 3.7+ → 대학원 과목 수강 가능

### 14.3 AP Credit Recognition
- 한국과학영재학교: C+ 이상 → 성적 반영 or S 인정 택일
- 서울/경기과학고: B0 이상 → S 인정

### 14.4 복수전공 학점 중복 인정
- 소속/복수전공 전공교과목 중복 시 **6학점까지** 중복 인정 (2016+)

### 14.5 인턴십 졸업학점 인정
- 통산 **6학점 이내** (Co-op 예외)

---

## 15. What the App CANNOT Check (Informational Only)

These items are graduation requirements but cannot be verified from the transcript:
1. **윤리및안전** — separate online system, not in transcript
2. **영어능력 졸업요건** — TOEFL/TOEIC scores not in transcript
3. **TOPIK** (외국인) — not in transcript
4. **트랙 과목 적합성** — without per-department data, can only check credit totals
5. **인선 핵심/융합/일반 유형** — transcript 구분 column doesn't encode this
6. **인성/리더십 분배** (2025) — transcript doesn't distinguish I/II/III/IV
