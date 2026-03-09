# Spec: CAIS Database + Data Layer Reset

**ID**: f2a3b8c1  
**Date**: 2026-03-10  
**Status**: approved

## Intent

Replace the fragmented, partially-incorrect department data layer with:

1. An authoritative SQLite course database scraped from KAIST CAIS (all departments, all semesters 2019–2026)
2. Correct department requirement rules re-encoded from official sources
3. A clean pipeline generating runtime data from these two sources

The old reviewed DB had modeling errors (심화전공 as additive for AE/CS when it is actually a subset constraint; wrong 전필 credits for ME/EE year groups). This spec replaces it entirely.

The app has not been publicly released with the old department data, so a full reset is acceptable.

---

## Phase 0: Retire Old Data Layer

### Files to DELETE

```
references/kaist-data/reviewed/          (entire directory)
references/kaist-data/raw/               (entire directory)
src/domain/generated/course-catalog.generated.json
src/domain/generated/program-requirements.generated.json
src/domain/generated/support-manifest.generated.json
scripts/generate-kaist-data.mjs
scripts/validate-kaist-data.mjs
scripts/lib/kaist-data-pipeline.mjs
scripts/fetch-streamdocs-rendering.py
src/domain/configs/planner.ts
src/domain/configs/planner.test.ts
```

### Files to KEEP (untouched)

- `src/domain/models/` — all domain models (Grade, Semester, CourseCode, CreditCategory, CourseRecord, Transcript)
- `src/domain/configs/requirements.ts` — common requirements (5 year groups, still correct)
- `src/domain/services/GpaCalculator.ts`, `HssDistributionChecker.ts`, `AuTracker.ts`
- `src/domain/services/RequirementAnalyzer.ts` — will be modified in Phase 3
- `src/infrastructure/excel-parser/`
- `src/app/` — UI (will need minor updates in Phase 3)
- All test files except `planner.test.ts`

### After deletion: temporary app state

`page.tsx` calls `buildPlannerRequirementSet()` and `getProgramSupport()` from the deleted `planner.ts`.

Create a **stub** `src/domain/configs/planner.ts` that compiles and makes the app runnable, but returns `null` / `"unsupported"` for all department-aware analysis. This allows the app to build while Phases 1–3 complete.

Stub contract (must match existing import signatures in `page.tsx`):
```ts
export function buildPlannerRequirementSet(selection: PlannerSelection): RequirementSet | null {
  return null; // department analysis pending data rebuild
}
export function getProgramSupport(selection: PlannerSelection): ProgramSupport {
  return {
    status: "unsupported",
    message: "전공 분석 데이터를 재구축 중입니다.",
  };
}
export function getSupportedDepartments(): string[] {
  return [];
}
export function derivePrimaryMajorRequirement(
  requirement: DepartmentProgramRequirement,
  track: TrackType
): DepartmentProgramRequirement {
  return requirement;
}
```

---

## Phase 1: CAIS SQLite Infrastructure

### 1.1 Install dependency

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### 1.2 CAIS scraper: `scripts/scrape-cais.mjs`

**Target URL**: `https://cais.kaist.ac.kr/totalOpeningCourse`  
**Method**: POST with form data, `processType=excel` for Excel download per query  
**Query parameters**:
- `strYear`: year (e.g., "2025")
- `strTerm`: term (1=Spring, 2=Summer, 3=Fall, 4=Winter)
- `processType`: "excel" for download, "content" for HTML

**Scope**: years 2019–2026, all 4 terms = 32 queries  
This captures: old-format course codes (pre-2025 semesters) AND new dotted codes (2024–2026 semesters), enabling bidirectional mapping.

**Scraping strategy** (try in order):

1. **Direct POST** (fastest):
   ```
   POST https://cais.kaist.ac.kr/totalOpeningCourse
   Content-Type: application/x-www-form-urlencoded
   Body: processType=excel&strYear=2025&strTerm=1
   ```
   If the response is an Excel file (Content-Type contains `spreadsheet` or `excel`), parse it with `xlsx`.
   If NetFunnel blocks (redirect to queue page or empty/error response), fall through to option 2.

2. **agent-browser fallback**: If direct POST fails for any query, log a warning and use `agent-browser` to:
   - Open the CAIS page
   - Set year and term filters
   - Click the Excel button
   - Download the result
   Use `agent-browser --session cais-scrape` to maintain session state.

**Query without department filter**: The page requires at least one of {department, course_no, course_code, course_title, instructor}. If year+term alone returns 0 results, use `strCourseTitle=%` (wildcard) or iterate all department codes. Test this first; if wildcard works, use it for all 32 queries. If not, iterate the known active department codes from the CAIS dropdown (186 options — use the list from the archived DOM).

**Output**: Excel files saved to `references/kaist-data/cais-raw/YYYY-T.xlsx` for provenance.

### 1.3 SQLite schema: `references/kaist-data/courses.db`

```sql
CREATE TABLE IF NOT EXISTS courses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  year            INTEGER NOT NULL,
  term            INTEGER NOT NULL,   -- 1=Spring 2=Summer 3=Fall 4=Winter
  dept_code       TEXT,
  dept_name_ko    TEXT,
  course_type_code TEXT,              -- "14"=전공필수 "34"=전공선택 "77"=트랙필수 etc.
  course_type_name TEXT,
  old_code        TEXT,               -- "Course no." column: AE321, ME303
  new_code        TEXT,               -- "Course Code" column: AE.32100, ME.20005
  section         TEXT,
  title_ko        TEXT,
  title_en        TEXT,
  credits         REAL,
  au              REAL,
  is_english      INTEGER DEFAULT 0,
  substitute_info TEXT,
  codeshare_info  TEXT,
  instructor      TEXT,
  scraped_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_old_code ON courses(old_code);
CREATE INDEX IF NOT EXISTS idx_new_code ON courses(new_code);
CREATE INDEX IF NOT EXISTS idx_dept ON courses(dept_code, dept_name_ko);
CREATE INDEX IF NOT EXISTS idx_year_term ON courses(year, term);
CREATE INDEX IF NOT EXISTS idx_title ON courses(title_ko);

-- Deduplicated course view (one row per logical course, both code formats)
CREATE VIEW IF NOT EXISTS unique_courses AS
SELECT
  COALESCE(new_code, old_code) AS canonical_code,
  old_code,
  new_code,
  title_ko,
  credits,
  dept_name_ko,
  course_type_code,
  course_type_name,
  MIN(year) AS first_offered,
  MAX(year) AS last_offered
FROM courses
WHERE old_code IS NOT NULL OR new_code IS NOT NULL
GROUP BY COALESCE(new_code, old_code), title_ko;
```

### 1.4 Scraper output

After all 32 queries complete, log a summary:
```
Scraped 2019–2026 (32 term queries)
Total rows inserted: N
Unique old codes: N
Unique new codes: N
Courses with both old and new codes: N
```

Add `references/kaist-data/courses.db` to `.gitignore` (binary, too large for repo).  
Add `references/kaist-data/cais-raw/` to `.gitignore`.  
Create `references/kaist-data/SCRAPE-MANIFEST.json` (checked in):
```json
{
  "scraped_at": "2026-03-10",
  "years": [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  "terms": [1, 2, 3, 4],
  "total_rows": N,
  "source": "https://cais.kaist.ac.kr/totalOpeningCourse"
}
```

Add to `package.json`:
```json
"scripts": {
  "db:scrape": "node scripts/scrape-cais.mjs",
  "db:generate": "node scripts/generate-course-catalog.mjs"
}
```

---

## Phase 2: Department Requirement Rules

### 2.1 New requirement rules format

Create `references/kaist-data/requirements/` directory.  
One JSON file per department. These are **human-maintained**, checked into the repo, and constitute the authoritative graduation rule source alongside CAIS.

**Lookup course codes from CAIS DB**: For rules where only Korean names are known (ME 전필, ME 기반과목, EE 전필), query the SQLite DB after Phase 1 completes:
```sql
SELECT DISTINCT old_code, new_code, title_ko
FROM courses
WHERE dept_name_ko LIKE '%기계%'
  AND title_ko LIKE '%고체역학%'
ORDER BY year DESC LIMIT 5;
```
Use this to fill in the course codes before writing the JSON files.

### 2.2 `references/kaist-data/requirements/ae.requirements.json`

```json
{
  "department": "AE",
  "departmentNameKo": "항공우주공학과",
  "source": "항공우주공학과_교과목이수요건.pdf (학과 홈페이지 공식 배포)",
  "yearGroups": [
    {
      "id": "ae-2016-2022",
      "admissionYears": [2016, 2017, 2018, 2019, 2020, 2021, 2022],
      "totalCredits": 136,
      "notes": "심화전공 과목은 전공선택과 동일 카테고리로 성적표에 표기. 동일 과목 이중 인정 불가.",
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 21,
              "courses": ["AE210", "AE21000", "AE220", "AE22000", "AE300", "AE30000",
                          "AE208", "AE20008", "AE307", "AE30007", "AE330", "AE33000",
                          "AE400", "AE40000"]
            },
            "전선": { "requiredCredits": 21 }
          },
          "심화전공": {
            "type": "subset_of_전선",
            "requiredCredits": 18,
            "note": "전선 21학점 중 18학점이 이 목록에서 와야 함. 500단위 이상 학사·대학원 상호인정 과목도 인정.",
            "eligibleOldCodes": ["AE321", "AE331", "AE401", "AE405", "AE409",
                                  "AE410", "AE420", "AE435", "AE450", "AE455",
                                  "AE480", "AE492", "AE493"],
            "eligibleNewCodes": ["LOOKUP_FROM_CAIS"]
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 21, "courses": ["AE210","AE21000","AE220","AE22000","AE300","AE30000","AE208","AE20008","AE307","AE30007","AE330","AE33000","AE400","AE40000"] },
              "전선": { "requiredCredits": 21 }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 42,
            "전필포함": 21,
            "note": "타 학사조직 전공과목 최대 6학점까지 중복인정 가능"
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 21, "courses": ["AE210","AE21000","AE220","AE22000","AE300","AE30000","AE208","AE20008","AE307","AE30007","AE330","AE33000","AE400","AE40000"] },
              "전선": { "requiredCredits": 21 }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 18,
            "전필포함": 9,
            "note": "전필 9학점은 전필 과목 중 어느 것이든 9학점. 타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 21, "courses": ["AE210","AE21000","AE220","AE22000","AE300","AE30000","AE208","AE20008","AE307","AE30007","AE330","AE33000","AE400","AE40000"] },
              "전선": { "requiredCredits": 21 }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    },
    {
      "id": "ae-2023-plus",
      "admissionYears": [2023, 2024, 2025],
      "totalCredits": 138,
      "notes": "전공 구조 동일. 졸업학점만 138로 증가 (공통요건 변경).",
      "tracks": "SAME_AS_ae-2016-2022"
    }
  ]
}
```

### 2.3 `references/kaist-data/requirements/cs.requirements.json`

```json
{
  "department": "CS",
  "departmentNameKo": "전산학부",
  "source": "전산학부 공식 홈페이지 이수요건 페이지",
  "yearGroups": [
    {
      "id": "cs-2016-2019",
      "admissionYears": [2016, 2017, 2018, 2019],
      "totalCredits": 136,
      "notes": "캡스톤 팀 프로젝트 요건 없음 (2020이후부터 적용).",
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 19,
              "courses": ["CS.20004", "CS.20006", "CS.30000", "CS.30101", "CS.30200", "CS.30300"]
            },
            "전선": { "requiredCredits": 30 }
          },
          "심화전공": {
            "type": "subset_of_전선",
            "requiredCredits": 12,
            "rule": "전선 중 2학점짜리 과목을 제외하고 12학점 이상 (credits >= 3인 전선 과목 합산)",
            "note": "특정 curated list 없음. 학점 수 조건만 있음."
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 19, "courses": ["CS.20004","CS.20006","CS.30000","CS.30101","CS.30200","CS.30300"] },
              "전선": { "requiredCredits": 30 }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 40,
            "전필포함": 19,
            "note": "타 학사조직 전공과목 최대 6학점까지 중복인정 가능"
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 19, "courses": ["CS.20004","CS.20006","CS.30000","CS.30101","CS.30200","CS.30300"] },
              "전선": { "requiredCredits": 30 }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 21,
            "전필포함": 15,
            "note": "전필 6과목 중 15학점 해당분 포함. 어느 과목이든 15학점 충족하면 됨. 타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 19, "courses": ["CS.20004","CS.20006","CS.30000","CS.30101","CS.30200","CS.30300"] },
              "전선": { "requiredCredits": 30 }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    },
    {
      "id": "cs-2020-2022",
      "admissionYears": [2020, 2021, 2022],
      "totalCredits": 136,
      "notes": "캡스톤 팀 프로젝트 필수 (전선 중 1과목).",
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 19,
              "courses": ["CS.20004", "CS.20006", "CS.30000", "CS.30101", "CS.30200", "CS.30300"]
            },
            "전선": {
              "requiredCredits": 30,
              "capstone": {
                "required": true,
                "requiredCount": 1,
                "eligibleCourses": ["CS.30500","CS.30600","CS.30704","CS.40008","CS.40009",
                                     "CS.40203","CS.40402","CS.40503","CS.40504","CS.40507",
                                     "CS.40509","CS.40703","CS.40704","CS.40802"]
              }
            }
          },
          "심화전공": {
            "type": "subset_of_전선",
            "requiredCredits": 12,
            "rule": "credits >= 3인 전선 과목 합산"
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 19, "courses": ["CS.20004","CS.20006","CS.30000","CS.30101","CS.30200","CS.30300"] },
              "전선": {
                "requiredCredits": 30,
                "capstone": { "required": true, "requiredCount": 1, "eligibleCourses": ["CS.30500","CS.30600","CS.30704","CS.40008","CS.40009","CS.40203","CS.40402","CS.40503","CS.40504","CS.40507","CS.40509","CS.40703","CS.40704","CS.40802"] }
              }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 40,
            "전필포함": 19,
            "note": "타 학사조직 전공과목 최대 6학점까지 중복인정 가능"
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 19, "courses": ["CS.20004","CS.20006","CS.30000","CS.30101","CS.30200","CS.30300"] },
              "전선": {
                "requiredCredits": 30,
                "capstone": { "required": true, "requiredCount": 1, "eligibleCourses": ["CS.30500","CS.30600","CS.30704","CS.40008","CS.40009","CS.40203","CS.40402","CS.40503","CS.40504","CS.40507","CS.40509","CS.40703","CS.40704","CS.40802"] }
              }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 21,
            "전필포함": 15,
            "note": "부전공 학생에게는 캡스톤 이수 권장 (필수 아님). 타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 19, "courses": ["CS.20004","CS.20006","CS.30000","CS.30101","CS.30200","CS.30300"] },
              "전선": { "requiredCredits": 30 }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    },
    {
      "id": "cs-2023-plus",
      "admissionYears": [2023, 2024, 2025],
      "totalCredits": 138,
      "notes": "전공 구조 동일. 졸업학점 138.",
      "tracks": "SAME_AS_cs-2020-2022"
    }
  ]
}
```

### 2.4 `references/kaist-data/requirements/me.requirements.json`

```json
{
  "department": "ME",
  "departmentNameKo": "기계공학과",
  "source": "me.kaist.ac.kr 이수요건 페이지",
  "notes": {
    "기반과목": "고체역학, 동역학, 시스템모델링및제어, 열역학, 열전달, 유체역학, 응용전자공학, 재료와가공의이해, 진동공학 (9과목). 코드는 CAIS DB에서 조회하여 기입.",
    "심화전공": "추가 학점 방식 (AE/CS와 다름). '일반전공 이수과목을 제외하고 전공과목 15학점 이상 이수'.",
    "심화전공_체크방법": "총 ME 전공선택 학점이 기본 전선 요건(36학점)을 15학점 이상 초과하면 충족으로 판단. 단, 기반과목 9/9 이수 별도 체크."
  },
  "yearGroups": [
    {
      "id": "me-2016-2021",
      "admissionYears": [2016, 2017, 2018, 2019, 2020, 2021],
      "totalCredits": 136,
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 12,
              "courseNames": ["기계기초실습", "기계공학실험", "창의적시스템구현Ⅰ", "공학설계"],
              "courses": ["LOOKUP_FROM_CAIS"]
            },
            "전선": {
              "requiredCredits": 36,
              "기반과목": {
                "required": 5,
                "total": 9,
                "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"],
                "courses": ["LOOKUP_FROM_CAIS"]
              }
            }
          },
          "심화전공": {
            "type": "additional",
            "requiredCredits": 15,
            "rule": "기본 전공(48학점) 초과 ME 전공과목 15학점 이상",
            "기반과목All": { "required": 9, "note": "심화전공은 기반과목 9/9 모두 이수 필수" }
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 12, "courseNames": ["기계기초실습","기계공학실험","창의적시스템구현Ⅰ","공학설계"], "courses": ["LOOKUP_FROM_CAIS"] },
              "전선": { "requiredCredits": 36, "기반과목": { "required": 5, "total": 9, "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"], "courses": ["LOOKUP_FROM_CAIS"] } }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 40,
            "전필포함": 12,
            "note": "타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 12, "courseNames": ["기계기초실습","기계공학실험","창의적시스템구현Ⅰ","공학설계"], "courses": ["LOOKUP_FROM_CAIS"] },
              "전선": { "requiredCredits": 36, "기반과목": { "required": 5, "total": 9, "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"], "courses": ["LOOKUP_FROM_CAIS"] } }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 21,
            "전필포함_min": 2,
            "note": "전필 과목 중 어느 2과목 이상 포함. 타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 12, "courseNames": ["기계기초실습","기계공학실험","창의적시스템구현Ⅰ","공학설계"], "courses": ["LOOKUP_FROM_CAIS"] },
              "전선": { "requiredCredits": 36, "기반과목": { "required": 5, "total": 9, "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"], "courses": ["LOOKUP_FROM_CAIS"] } }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    },
    {
      "id": "me-2022-plus",
      "admissionYears": [2022, 2023, 2024, 2025],
      "totalCredits": 136,
      "notes": "전필이 12→9로 감소 (기계공학실험 제외). 복수전공 secondary 전필포함도 9로 감소.",
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 9,
              "courseNames": ["기계기초실습", "창의적시스템구현Ⅰ", "공학설계"],
              "courses": ["LOOKUP_FROM_CAIS"]
            },
            "전선": {
              "requiredCredits": 36,
              "기반과목": {
                "required": 5,
                "total": 9,
                "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"],
                "courses": ["LOOKUP_FROM_CAIS"]
              }
            }
          },
          "심화전공": {
            "type": "additional",
            "requiredCredits": 15,
            "rule": "기본 전공(45학점) 초과 ME 전공과목 15학점 이상",
            "기반과목All": { "required": 9, "note": "심화전공은 기반과목 9/9 모두 이수 필수. 2024이후 입학생은 ME 개설 교과목만 인정" }
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 9, "courseNames": ["기계기초실습","창의적시스템구현Ⅰ","공학설계"], "courses": ["LOOKUP_FROM_CAIS"] },
              "전선": { "requiredCredits": 36, "기반과목": { "required": 5, "total": 9, "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"], "courses": ["LOOKUP_FROM_CAIS"] } }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 40,
            "전필포함": 9,
            "note": "타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 9, "courseNames": ["기계기초실습","창의적시스템구현Ⅰ","공학설계"], "courses": ["LOOKUP_FROM_CAIS"] },
              "전선": { "requiredCredits": 36, "기반과목": { "required": 5, "total": 9, "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"], "courses": ["LOOKUP_FROM_CAIS"] } }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 21,
            "전필포함_min": 2,
            "note": "타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 9, "courseNames": ["기계기초실습","창의적시스템구현Ⅰ","공학설계"], "courses": ["LOOKUP_FROM_CAIS"] },
              "전선": { "requiredCredits": 36, "기반과목": { "required": 5, "total": 9, "courseNames": ["고체역학","동역학","시스템모델링및제어","열역학","열전달","유체역학","응용전자공학","재료와가공의이해","진동공학"], "courses": ["LOOKUP_FROM_CAIS"] } }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    }
  ]
}
```

### 2.5 `references/kaist-data/requirements/ee.requirements.json`

```json
{
  "department": "EE",
  "departmentNameKo": "전기및전자공학부",
  "source": "ee.kaist.ac.kr/under-req/ 공식 페이지 (2016~2017, 2018~2022, 2023~)",
  "notes": {
    "심화전공": "추가 학점 방식. 전공 50학점 초과 EE 전공과목 12학점 이상. curated list 없음.",
    "전필_2016_2017": "6과목 고정: EE201, EE202, EE204, EE209, EE305, EE405",
    "전필_2018이후": "EE305+EE405 필수 + EE201/202/204/209/210/211 중 3과목 선택 = 15학점"
  },
  "yearGroups": [
    {
      "id": "ee-2016-2017",
      "admissionYears": [2016, 2017],
      "totalCredits": 136,
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 18,
              "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004",
                          "EE209","EE20009","EE305","EE30005","EE405","EE40005"]
            },
            "전선": { "requiredCredits": 32 }
          },
          "심화전공": {
            "type": "additional",
            "requiredCredits": 12,
            "rule": "전공 50학점 초과 EE 전공과목 12학점 이상"
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 18, "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004","EE209","EE20009","EE305","EE30005","EE405","EE40005"] },
              "전선": { "requiredCredits": 32 }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 40,
            "전필포함": 18
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 18, "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004","EE209","EE20009","EE305","EE30005","EE405","EE40005"] },
              "전선": { "requiredCredits": 32 }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 21,
            "전필포함": 12,
            "required전필": ["EE305", "EE30005"],
            "note": "EE305(전자설계및실험) 필수 포함. 타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 18, "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004","EE209","EE20009","EE305","EE30005","EE405","EE40005"] },
              "전선": { "requiredCredits": 32 }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    },
    {
      "id": "ee-2018-2022",
      "admissionYears": [2018, 2019, 2020, 2021, 2022],
      "totalCredits": 136,
      "notes": "전필 18→15학점. EE305+EE405 필수 + 선택 3과목.",
      "tracks": {
        "심화전공": {
          "전공": {
            "전필": {
              "requiredCredits": 15,
              "required": ["EE305","EE30005","EE405","EE40005"],
              "selectFrom": {
                "count": 3,
                "credits": 6,
                "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004",
                            "EE209","EE20009","EE210","EE20010","EE211","EE20011"]
              }
            },
            "전선": { "requiredCredits": 35 }
          },
          "심화전공": {
            "type": "additional",
            "requiredCredits": 12,
            "rule": "전공 50학점 초과 EE 전공과목 12학점 이상"
          },
          "연구": { "requiredCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 15, "required": ["EE305","EE30005","EE405","EE40005"], "selectFrom": { "count": 3, "credits": 6, "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004","EE209","EE20009","EE210","EE20010","EE211","EE20011"] } },
              "전선": { "requiredCredits": 35 }
            },
            "연구": { "requiredCredits": 0, "exempted": true }
          },
          "secondaryMajor": {
            "totalCredits": 40,
            "전필포함": 15
          }
        },
        "부전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 15, "required": ["EE305","EE30005","EE405","EE40005"], "selectFrom": { "count": 3, "credits": 6, "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004","EE209","EE20009","EE210","EE20010","EE211","EE20011"] } },
              "전선": { "requiredCredits": 35 }
            },
            "연구": { "requiredCredits": 3 }
          },
          "secondaryMajor": {
            "totalCredits": 21,
            "전필포함": 12,
            "required전필": ["EE305","EE30005"],
            "note": "EE30005(전자설계및실험) 필수 포함. 타 학사조직 전공과목과의 중복 인정 불가"
          }
        },
        "자유융합전공": {
          "primaryMajor": {
            "전공": {
              "전필": { "requiredCredits": 15, "required": ["EE305","EE30005","EE405","EE40005"], "selectFrom": { "count": 3, "credits": 6, "courses": ["EE201","EE20001","EE202","EE20002","EE204","EE20004","EE209","EE20009","EE210","EE20010","EE211","EE20011"] } },
              "전선": { "requiredCredits": 35 }
            },
            "연구": { "requiredCredits": 3 }
          }
        }
      }
    },
    {
      "id": "ee-2023-plus",
      "admissionYears": [2023, 2024, 2025],
      "totalCredits": 138,
      "notes": "전공 구조 동일. 졸업학점 138.",
      "tracks": "SAME_AS_ee-2018-2022"
    }
  ]
}
```

### 2.6 CAIS lookup for `LOOKUP_FROM_CAIS` entries

After Phase 1 completes, query the SQLite DB to resolve all `LOOKUP_FROM_CAIS` entries:

```js
// Example: find ME 전필 courses
db.prepare(`
  SELECT DISTINCT old_code, new_code, title_ko, credits
  FROM courses
  WHERE dept_name_ko LIKE '%기계%'
    AND (title_ko LIKE '%기계기초실습%' OR title_ko LIKE '%기계공학실험%' 
         OR title_ko LIKE '%창의적시스템구현%' OR title_ko LIKE '%공학설계%')
  ORDER BY year DESC
`).all();
```

Replace `LOOKUP_FROM_CAIS` with actual codes. Then run the same for ME 기반과목 9개 and any remaining unknowns.

Create `scripts/lookup-cais-codes.mjs` to automate this lookup and print resolved codes for manual insertion into the requirements JSONs.

---

## Phase 3: New Planner + Analyzer

### 3.1 New `src/domain/configs/planner.ts`

Replace the stub with a real implementation reading from the requirements JSON files.

Key functions (same API as before):
- `buildPlannerRequirementSet(selection: PlannerSelection): RequirementSet | null`
- `getProgramSupport(selection: PlannerSelection): ProgramSupport`
- `getSupportedDepartments(): string[]`
- `derivePrimaryMajorRequirement(req, track)` — derives 주전공 from any track's rules

Logic:
1. Load the appropriate requirements JSON for the selection's department + admissionYear
2. Find the matching yearGroup
3. Return the track-specific rules as a `RequirementSet`

`getSupportedDepartments()` returns `["AE", "ME", "CS", "EE"]`.

### 3.2 Fix `src/domain/services/RequirementAnalyzer.ts`

The `analyzeSupportedProgram()` function must handle two 심화전공 models:

**Model A — `subset_of_전선` (AE, CS)**:
```
- Count 전공선택 credits matching eligibleCourses (AE)
  OR count 전공선택 credits with credits >= 3 (CS)
- Check if sum >= requiredCredits
- These courses ALSO count toward 전선 total (no double-count issue in credit sum,
  but do not count the same course twice)
```

**Model B — `additional` (ME, EE)**:
```
- Count total 전공선택 credits (all 전공선택 category records from the dept)
- 전공합계 = 전필 earned + 전선 earned
- 심화전공 추가 = max(0, 전선 earned - required 전선)
  e.g. ME: if earned 전선 = 51학점, required = 36, then 심화전공 candidates = 15학점
- Check if 심화전공 candidates >= requiredCredits (15 for ME, 12 for EE)
- Also check 기반과목 requirement (ME only):
  - For 주전공: 5/9 이상
  - For 심화전공: 9/9 모두
```

**ME 기반과목 check**:
```
- Given the list of 기반과목 course codes from requirements JSON
- Check how many the student has earned (전공선택 category, earned credits > 0)
- Report: N/9 기반과목 이수
```

### 3.3 New `src/domain/configs/planner.test.ts`

Tests must validate against official rules (domain truth), not just code mechanics:

- T1: AE 2022학번 심화전공 — 전선 21학점 중 18이 curated list → fulfilled
- T2: AE 2022학번 심화전공 — 전선 21학점 중 12만 curated list → not fulfilled
- T3: CS 2021학번 심화전공 — 전선 30학점 중 12가 3학점 과목 → fulfilled  
- T4: CS 2021학번 — capstone 없음 → warning
- T5: ME 2020학번 심화전공 — 전선 51학점 (base 36 + 15 초과), 기반 9/9 → fulfilled
- T6: ME 2020학번 심화전공 — 전선 48학점 (base 36 + 12 초과), 기반 9/9 → not fulfilled (need 15)
- T7: ME 2020학번 심화전공 — 전선 51학점, 기반 7/9 → not fulfilled (기반 미충족)
- T8: EE 2020학번 심화전공 — 전선 47학점 (base 35 + 12 초과) → fulfilled
- T9: 복수전공 primary ME 2022학번 — 연구 면제 확인
- T10: 부전공 primary AE 2022학번 — 연구 포함 확인

---

## Generated Runtime Data

### `scripts/generate-course-catalog.mjs`

Reads `courses.db` → generates `src/domain/generated/course-catalog.generated.json`:
```json
{
  "generatedAt": "2026-03-10",
  "source": "CAIS scrape 2019-2026",
  "courses": [
    {
      "oldCode": "AE321",
      "newCode": "AE.32100",
      "titleKo": "압축성 공기역학",
      "credits": 3,
      "deptNameKo": "항공우주공학과",
      "courseTypeCode": "34"
    }
  ]
}
```

Scoped to AE/ME/CS/EE only for bundle size. Full DB stays in SQLite.

---

## Acceptance Criteria

1. `npx vitest run` — all tests pass
2. `npx next build` — succeeds
3. `node scripts/scrape-cais.mjs` — completes without unhandled errors; `courses.db` is created with > 10,000 rows
4. ME 기반과목 9개 모두 코드 확보 (LOOKUP_FROM_CAIS 없음)
5. AE 심화전공 eligible codes list has both old and new codes for all 13 courses
6. `buildPlannerRequirementSet({ department: "AE", admissionYear: 2022, track: "심화전공" })` returns non-null
7. App renders without runtime errors for all 4 supported departments
8. 심화전공 "subset" check (AE, CS) and "additional" check (ME, EE) both implemented in analyzer

## Out of Scope

- Other departments beyond AE/ME/CS/EE for requirement rules (CAIS DB covers all)
- Retirement of `references/kaist-data/requirements/` JSONs (these are the new authoritative source, kept)
- UI redesign
- Deployment
