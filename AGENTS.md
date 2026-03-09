# GraduateKAIST Agent Guide

## Purpose

This repository is a KAIST graduation planner. Work in this repo MUST be domain-first.

The planner MUST NOT claim department/program support unless the relevant rules are backed by official KAIST source material stored in the repository with clear provenance.

## Core Rule: Domain Before Modeling

Before implementing or changing graduation logic for a department/program, agents MUST complete domain acquisition first.

Domain acquisition means:

- identify the official KAIST source pages/documents
- collect raw artifacts or raw-source metadata into the repo
- record provenance for every modeled rule
- document unknowns and ambiguity explicitly

Agents MUST NOT:

- mark a department/program as `supported` based only on product ideas, summaries, or inferred rules
- model department-specific rules from memory or convenience
- silently generalize one year range across multiple admission years without source evidence
- present partial rule coverage as full graduation precision

If official-source coverage is incomplete, the result MUST be `partial` or `common-only`.

## Support Status Semantics

- `supported`: official sources collected, key rules encoded, major edge cases covered, confidence high
- `partial`: some official sources collected, some rules encoded, important gaps remain, UI must warn clearly
- `common-only`: no trustworthy department-specific rule set; only common KAIST graduation logic may be shown
- `unsupported`: no usable rule set; do not claim department analysis

## KAIST Data Collection Workflow

### 1. Collect Bulletin / Department Requirement Sources

Use `agent-browser` for the KAIST bulletin site because the site uses a custom PDF viewer.

Start from the live bulletin SSO entry page, NOT the dead curriculum shell page.

- Correct working entry pattern:
  - `https://bulletin.kaist.ac.kr/com/lgin/SsoCtr/initPageWork.do?requestTimeStr=<timestamp>`
- Known bad path for this workflow:
  - `https://bulletin.kaist.ac.kr/com/curriculum/main/main.do`
  - this can render a `페이지를 찾을 수 없습니다.` shell and MUST NOT be treated as the real bulletin workflow

Typical flow:

1. Open bulletin landing page.
2. Enter `과거 학사요람 조회` if historical year coverage is needed.
3. Switch between:
   - `공통`
   - `전공별 교과과정`
4. Select year.
5. Select target department.
6. Record visible document types, labels, and viewer URLs.
7. Extract `streamdocsId` values from embedded viewer iframes.
8. Save raw metadata and provenance in `references/kaist-data/raw/`.

Verified working behavior:

- opening the `initPageWork.do?requestTimeStr=...` URL lands on a live `학사요람` page
- clicking `과거 학사요람 조회` reveals year buttons such as `2025 년도`, `2024 년도`, `2023 년도`, etc.
- switching to `전공별 교과과정` exposes a department tree (for example `항공우주공학과`, `전산학부`, `전기및전자공학부`)
- selecting a department loads document-type buttons such as `교과목이수요건`, `교과목일람표`, `교과목개요`
- after department selection, `document.querySelectorAll('iframe')` includes a StreamDocs viewer URL with `streamdocsId=<id>`
- the StreamDocs metadata endpoint is directly reachable at:
  - `https://pdfviewer.kaist.ac.kr/streamdocs/v4/documents/<streamdocsId>/document`

Useful browser steps:

```bash
agent-browser open "https://bulletin.kaist.ac.kr/com/lgin/SsoCtr/initPageWork.do?requestTimeStr=$(date +%s%3N)" --session kaist-bulletin
agent-browser snapshot -i
agent-browser click @e6
agent-browser snapshot -i
agent-browser eval "JSON.stringify(Array.from(document.querySelectorAll('iframe')).map(f => f.src), null, 2)"
```

Rendered-page extraction note:

- The StreamDocs renderings endpoint can be fetched directly for page images:
  - `https://pdfviewer.kaist.ac.kr/streamdocs/v4/documents/<streamdocsId>/renderings/<page>?zoom=<n>&jpegQuality=o&renderAnnots=false&increasePrint=false`
- Observed quirk: the response is currently served as `application/octet-stream` and the first byte of the PNG signature may be corrupted (`01 50 4e 47 ...` instead of `89 50 4e 47 ...`).
- If using rendered-page extraction, repair the first byte to `0x89` before treating the payload as a PNG.
- Helper script for this workflow:
  - `scripts/fetch-streamdocs-rendering.py <url> <output-path>`

Concrete successful navigation cues:

- the page title area shows `학사요람`
- top navigation includes `교과과정구조`, `개설교과과정`, `원규집`
- left side shows year selection and tabs such as `공통` and `전공별 교과과정`
- after selecting a department/document, the page includes a StreamDocs iframe like:
  - `https://pdfviewer.kaist.ac.kr/streamdocs/view/sd;streamdocsId=<id>`

Troubleshooting rules:

- If snapshot text shows `페이지를 찾을 수 없습니다.`, the agent is on the wrong page and MUST restart from the `initPageWork.do` URL above.
- Prefer `snapshot -i` after every click so refs stay valid.
- If refs are stale after a page transition, re-run `snapshot -i` before clicking again.
- After department selection, use `agent-browser eval` on `document.querySelectorAll('iframe')` to extract viewer URLs instead of relying only on visible controls.
- Do NOT assume a document-tab click succeeded unless the iframe URL/`streamdocsId` changes or other page evidence confirms the switch.
- Record both the bulletin page URL and the embedded viewer URL. The viewer URL alone is not enough provenance.

Interpretation workflow rule:

- For domain interpretation, prefer text-first sources: checked-in raw text artifacts, browser-visible text, official metadata, and structured notes.
- Rendered-page extraction is a fallback only for specific passages that cannot be read otherwise.
- MUST NOT block a run on OCR tooling. If OCR tools such as `tesseract` are unavailable, keep working from text-first artifacts and record the blocked passage as unresolved instead of stalling.
- MUST NOT treat rendered images as the default reading path for a whole document when text-first paths are available.

What to save from bulletin collection:

- year
- department
- document type (`교과목이수요건`, `교과목일람표`, `교과목개요`, etc.)
- page URL
- iframe/viewer URL
- `streamdocsId`
- any official file/document metadata available from StreamDocs
- notes about whether the rule came from a table, prose paragraph, footnote, or substitution section

Expected raw artifacts:

- source manifest
- bulletin crawl manifest
- department/year/document inventory
- extracted StreamDocs metadata
- notes for unresolved or ambiguous passages

### 2. Collect ERP Course Catalog Sources

Use the ERP `개설교과과정` pages as the course-catalog side of the corpus.

Observed flow:

- bulletin top nav -> `개설교과과정`
- redirects to ERP external page:
  - `https://erp.kaist.ac.kr/com/lgin/SsoCtr/initExtPageWork.do?link=estblSubjt`
- exposes course filters and category labels

Verified ERP page cues:

- page text includes filters such as `학년도`, `학기`, `개설학과`, `과정구분`, `과목구분`, `교과목명`, `교과목코드`, `담당교수`
- results area includes `개설교과목`, `총건수`, and fields such as `개설년도`, `개설학기`, `개설학과`, `과목구분`, `교과목코드`, `교과목명`, `분반`, `상호인정`

Important principle:

- ERP category labels are useful catalog data, but they are NOT by themselves graduation truth.

Collect and save:

- year/semester query parameters
- department filters used
- category filters used
- raw export endpoints or raw exported results when available
- provenance for snapshots or exports

At minimum, preserve enough raw material to answer:

- which lectures exist
- which departments offer them
- which raw labels ERP assigns to them
- which year/semester snapshot the data came from

### 3. Build Curated Overrides Only After Raw Sources Exist

Overrides are allowed only for:

- substitutions/equivalencies
- department aliases
- known extraction mistakes
- explicit manual-review-only cases
- prose rules that require hand-encoding after source review

Overrides MUST reference the official-source artifacts they interpret.

Overrides MUST NOT replace missing domain acquisition.

## Provenance Requirements

Every modeled department/program rule SHOULD be traceable to one or more raw source references.

When encoding a requirement, capture:

- source identifier
- department
- admission year range
- program type
- exact course codes / rule text
- whether the rule is explicit, inferred, or manual-review-only

If a rule is inferred rather than explicit, the dataset MUST mark it accordingly and support status MUST be downgraded if the inference is material.

## DDD Workflow For This Repo

For any meaningful graduation-rule work, use this order:

1. Domain acquisition
2. Ubiquitous language
3. Domain rules and invariants
4. Support boundary definition
5. Acceptance examples from real rules/docs
6. Only then implementation and tests

### Required Ubiquitous Language

Use terms consistently:

- `common requirements`
- `department program requirements`
- `supported`, `partial`, `common-only`, `unsupported`
- `required course slot`
- `eligible credit bucket`
- `equivalency`
- `manual review`
- `source provenance`

### Required Domain Questions Before Coding

Agents MUST answer these before implementing department logic:

- Which official KAIST documents define the program?
- Which admission year boundaries actually change the rules?
- Which courses are required slots versus generic credit buckets?
- Which substitutions are explicit?
- Which courses can count only with approval or special conditions?
- Which rules cannot be determined from transcript data alone?
- What part of the result must be shown as manual review instead of auto-judged?

If these answers are missing, do not proceed to full implementation.

## Testing Standard

TDD in this repo means tests must validate domain truth, not only code mechanics.

Required test levels for department/program support:

- source/dataset validation tests
- rule interpretation tests from official examples
- analyzer tests for required slots, equivalencies, and ineligible courses
- fallback tests for `partial` / `common-only`

Do not treat green tests as proof of correctness if the source corpus is incomplete.

## Implementation Guardrails

- Transcript analysis MUST remain browser-local.
- Runtime app behavior MUST NOT scrape KAIST websites.
- Generated data should be deterministic and checked into the repo.
- Unsupported combinations must degrade honestly.
- If a requirement cannot be auto-verified from the transcript and trusted rules, surface a warning instead of guessing.

## Immediate Repo Policy

Until a department/program has official-source-backed raw artifacts and validated rules, agents SHOULD treat department-aware analysis as exploratory or partial.

Do not upgrade support claims without upgrading the corpus first.
