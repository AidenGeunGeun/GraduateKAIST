# Department-Aware Planner + KAIST Data Pipeline

## Intent

Upgrade the planner from a common-only graduation analyzer into a supported-department graduation planner backed by a versioned KAIST data corpus. The new system must remain privacy-preserving in the browser for transcript analysis while moving all KAIST requirement and catalog collection into an offline, reproducible ingestion pipeline committed to the repository.

The immediate product goal is to make the app materially useful for students in supported departments, especially `심화전공`, by validating specific major requirements rather than only counting `전공합계` credits.

## Goals

- Build an offline ingestion pipeline that collects and normalizes KAIST academic data needed for department-aware graduation analysis.
- Support department-aware analysis for `AE`, `ME`, `CS`, and `EE` first.
- Support admission years `2019-2025` first.
- Support one selected program at a time in the analyzer: department + admission year + track/program type.
- Restore department/program selection in the UI for supported departments.
- Replace current `전공합계`-only major analysis with course-level and rule-level checks for supported departments.
- Preserve current common graduation analysis, GPA logic, AU logic, HSS logic, and transcript parsing unless intentionally superseded.
- Preserve Zero Data Retention: transcript files remain browser-only; no runtime scraping or remote transcript processing is introduced.

## Product Scope

### In Scope

- Supported departments: `AE`, `ME`, `CS`, `EE`
- Supported admission years: `2019-2025`
- Supported program types for supported departments:
  - `심화전공`
  - `복수전공`
  - `부전공`
- `자유융합전공` support only if the supported department/program documents expose reliable and machine-actionable rules. If not, it must remain explicitly unsupported for this phase.
- A planner mode that analyzes one selected target program at a time.
- Common graduation analysis plus selected program analysis in the same result.
- Fallback common-only analysis when the selected department/year/program is unsupported.

### Out of Scope

- Full KAIST-wide department support in this phase
- Simultaneous whole-student certification across multiple majors/minors/programs with all overlap restrictions resolved globally
- Manual petition workflows, advisor approvals, or registrar exceptions
- Live scraping in production/browser runtime
- Schedule planning or timetable optimization
- Recommendation engines for next-semester planning
- A guarantee that the planner alone is sufficient for official graduation certification

## Current State

The current application is intentionally common-only:

- `src/app/page.tsx` loads transcript data and analyzes only common requirements plus a simplified `전공합계` bucket.
- `src/domain/configs/requirements.ts` models common rules by admission-year groups and applies only track-wide common modifications.
- `src/domain/services/RequirementAnalyzer.ts` computes:
  - `기초필수`
  - `기초선택`
  - `교양필수`
  - `인선`
  - `연구`
  - `전공합계`
- `src/app/page.tsx` and `src/app/components/shared/Footer.tsx` explicitly communicate that the app supports only `공통학사요람`.

This is safe but inadequate for `심화전공` or department-specific program analysis, because the current analyzer does not know which courses satisfy department rules, substitutions, advanced-major buckets, or elective eligibility.

## Data Sources

### Source A: KAIST ERP Course Offerings

Use the ERP `개설교과과정` interface as the canonical course catalog source.

Observed properties from investigation:

- URL flow reaches `https://erp.kaist.ac.kr/com/lgin/SsoCtr/initExtPageWork.do?link=estblSubjt`
- Search results expose a large real course dataset (observed total: `5591` for default `2026 봄학기` search)
- Fields visible or inferable include:
  - opening year
  - opening semester
  - offering department
  - program/course level
  - raw category label
  - course code
  - course name
  - section
  - cross-recognition indicator
  - instructor / schedule / room in some result rows
- Observed backend endpoints in page JS:
  - `/sch/sles/SlesseCtr/findAllEstblSubjtList.do`
  - `/sch/sles/SlesseCtr/findAllEstblSubjtListExcelQ01.do`
  - `/sch/sles/SlesseCtr/findAllEstblSubjtListExcelQ02.do`
  - `/sch/sles/SlesseCtr/findAllEstblSubjtSyyComboList.do`
- The page JS also documents an external-access restriction: broad whole-catalog queries may require exactly one year and one semester when `subjtCd` is not specified.

### Source B: KAIST Bulletin / Department Requirement Documents

Use the KAIST bulletin site and StreamDocs-backed department documents as the requirement-side source of truth.

Observed properties from investigation:

- Bulletin page supports `과거 학사요람 조회`
- Historical year selection is navigable
- `전공별 교과과정` exposes department trees
- Department selections load StreamDocs PDF viewer iframes with stable URLs like:
  - `https://pdfviewer.kaist.ac.kr/streamdocs/view/sd;streamdocsId=<id>`
- The viewer is machine-navigable with `agent-browser`
- StreamDocs API metadata is directly reachable using:
  - `https://pdfviewer.kaist.ac.kr/streamdocs/v4/documents/<streamdocsId>/document`
- Distinct departments/years yield distinct `streamdocsId` values

Documents of interest include:

- department graduation requirement documents
- department curriculum tables / course lists
- department course overview docs where they materially help with mapping or substitutions

### Source C: Curated Overrides

Add a hand-maintained override layer for cases where the upstream sources are incomplete, ambiguous, inconsistent, or require interpretation.

Examples:

- renamed courses
- substitutions/equivalencies
- cross-listed courses
- department aliases
- courses counted conditionally
- explicit exclusions / non-double-count rules
- known document extraction fixes

## Supported Analysis Model

The planner should become a `common + selected target program` analyzer.

The user selects:

- transcript file
- admission year
- department
- program type

The planner returns:

- common graduation progress
- selected department/program progress
- required-course checklist
- elective/advanced-major progress where supported by rules
- manual-review warnings for ambiguous cases

The planner must not imply that it can certify unsupported departments or unresolved multi-program overlap scenarios.

## Architecture

### Principle

All KAIST catalog and requirement data is collected offline and transformed into versioned local data artifacts committed to the repository. The deployed app reads only local generated data and curated overrides. The browser never scrapes KAIST at runtime.

### Proposed Layers

#### 1. Raw Source Manifests

Store crawler outputs and document identifiers in a versioned raw-data area.

Suggested contents:

- bulletin year/department/doc manifests
- `streamdocsId` inventory
- ERP query manifests and exported datasets
- metadata snapshots for reproducibility

#### 2. Normalized Generated Data

Generate typed, app-consumable artifacts from raw sources and curated overrides.

Suggested categories:

- normalized course catalog
- normalized department requirement sets
- support manifest describing which department/year/program combinations are supported

#### 3. Domain Configuration Layer

Replace or extend current common-only requirement configs with richer program-aware configurations.

This layer should separate:

- common university requirements
- department/program-specific major requirements
- explicit support status / limitation metadata

#### 4. Analyzer Layer

Extend the analyzer to reason about:

- required courses by explicit code/equivalency
- elective eligibility by department/program rules
- track/program-specific advanced major or bucket requirements
- warnings for ambiguous/conditional counting

#### 5. UI Layer

Reintroduce department-aware selection and show supported/unsupported status clearly.

## Data Model Requirements

### Course Catalog Model

The normalized course catalog should support, at minimum:

- canonical course identifier
- legacy/current code aliases where relevant
- Korean and English names if available
- observed offering departments
- observed semesters/years offered
- observed ERP raw category labels
- level signals if derivable from code
- cross-list/equivalent metadata if known
- source provenance

This catalog is the searchable master list of KAIST lectures. It is not by itself the graduation-truth model.

### Department Requirement Model

The normalized requirement model should support, at minimum:

- department identifier
- admission year range
- program type
- required course groups
- elective rules
- advanced-major / track-specific bucket rules
- substitutions and equivalents
- exclusions / double-count restrictions
- minimum credits by bucket
- support status / confidence markers
- source references

### Support Manifest Model

The support manifest should explicitly answer:

- which departments are supported
- which admission year ranges are supported
- which program types are supported
- whether support is full or partial
- what known limitations remain
- when the dataset was last generated

## Analyzer Changes

### Functional Requirements

The analyzer must evolve from simple category counting to structured program evaluation.

For supported department/year/program combinations, it must:

- evaluate common requirements
- evaluate department/program major requirements
- mark required courses complete or incomplete using explicit mapping/equivalency rules
- count elective credits only when the course is eligible by the selected program rules
- avoid silent over-counting of major credits from unrelated courses
- emit warnings for ambiguous or conditional cases

### Fallback Behavior

For unsupported department/year/program combinations, the system must:

- preserve current common analysis behavior
- avoid presenting fake major precision
- clearly communicate that department-specific analysis is unavailable

### Multi-Program Boundary

For this phase, the analyzer should operate on one selected target program at a time.

Examples:

- `AE 2022 심화전공`
- `CS 2021 복수전공`
- `EE 2023 부전공`

The analyzer should not attempt to solve the global optimization problem of all simultaneous programs in one pass during this phase.

## UI Changes

### Upload/Selection Flow

The upload flow should gain:

- department selector for supported departments
- program/track selector aligned to supported program types
- clear support messaging for supported vs unsupported selections

### Results View

For supported selections, the dashboard should include:

- common requirement cards
- major requirement section with:
  - required-course checklist
  - elective/advanced-major bucket progress where applicable
  - manual-review warnings
- explicit indication of unsupported rules that still require user verification

For unsupported selections, the dashboard should fall back to:

- current common-only analysis
- a clear message explaining that department-specific analysis is not yet supported

### UX Honesty Requirement

The UI must never present unsupported department logic as if it were verified.

## Ingestion Pipeline Requirements

### Pipeline Scope

Build scripts/tooling that can:

- crawl or enumerate bulletin department/year documents
- collect `streamdocsId` values and relevant metadata
- retrieve or otherwise persist source documents/metadata needed for normalization
- export or query ERP course-offering data by year/semester and category/department filters as needed
- normalize raw inputs into typed generated outputs
- validate internal consistency of generated data

### Reproducibility

The pipeline must produce deterministic outputs from:

- raw source inputs
- curated overrides
- documented generation logic

### Validation

Add validation checks for at least:

- duplicate canonical course identifiers
- conflicting aliases/equivalencies
- missing referenced courses in requirement configs
- overlapping required-course slots that cannot be disambiguated
- unsupported year/program combinations accidentally marked as supported
- malformed source manifests

## Approaches Considered

### Option 1: Runtime Scraping From the App

Pros:

- no repository data corpus to maintain

Cons:

- violates current architecture principles
- brittle in production
- incompatible with strong ZDR/privacy posture if the app needs remote fetching during analysis
- creates availability and performance risk

Decision: reject.

### Option 2: Requirement Docs Only

Pros:

- close to graduation source of truth
- simpler than combining multiple sources

Cons:

- weak for building a reusable all-course catalog
- harder to normalize offerings and aliases broadly
- less useful for future planner/search features

Decision: insufficient alone.

### Option 3: ERP Catalog Only

Pros:

- excellent course inventory coverage
- structured category labels and course metadata

Cons:

- not enough to determine exact graduation eligibility
- offering-time labels do not guarantee requirement-time truth
- cannot encode many substitutions or department-specific rules by itself

Decision: insufficient alone.

### Option 4: Hybrid Corpus (Recommended)

Combine ERP course catalog + bulletin/department requirement docs + curated overrides.

Pros:

- strongest practical coverage
- supports both searchable catalog and graduation rule engine
- keeps runtime app fully local/static
- allows progressive department support

Cons:

- highest implementation complexity
- requires a curated override layer and validation tooling

Decision: recommend.

## Recommendation

Implement the work in two major implementation tracks under one product initiative.

### Track A: Data Platform

- source discovery/crawling
- raw manifests
- normalized generation
- validation tooling

### Track B: Department-Aware Planner

- domain model expansion
- analyzer upgrade
- UI support restoration for supported departments
- supported/unsupported fallback UX

Within this initiative, the first supported launch target is:

- departments: `AE`, `ME`, `CS`, `EE`
- admission years: `2019-2025`
- program types: `심화전공`, `복수전공`, `부전공`

## Risks

- Upstream documents may be inconsistent across years or departments.
- ERP labels may not equal graduation truth.
- Some department rules may be prose-heavy and require interpretation.
- Cross-listed/renamed courses may create duplicate or ambiguous mappings.
- Double-count restrictions may be subtle and program-specific.
- StreamDocs raw-file extraction may require additional reverse engineering even though metadata and viewer access are confirmed.

## Mitigations

- Keep source provenance in generated data.
- Keep curated overrides as a first-class layer rather than ad hoc patches.
- Fail validation loudly when mappings are inconsistent.
- Ship progressive support instead of claiming universal correctness.
- Use warnings and manual-review notices instead of silent assumptions.
- Preserve common-only fallback when department confidence is insufficient.

## Acceptance Criteria

1. The repository contains an offline ingestion pipeline that can produce versioned local data artifacts for KAIST course catalog data and supported-department requirement data.
2. The generated data includes enough normalized structure to represent supported department/year/program requirement sets, substitutions/equivalencies, and support metadata.
3. The application allows selection of department and program type for supported combinations without introducing any runtime dependency on external KAIST services.
4. For supported combinations, the analyzer checks required major courses explicitly rather than only counting `전공합계`.
5. For supported combinations, elective/major credits are counted only when eligible under the selected program rules or explicit equivalency/override rules.
6. For unsupported or partially supported combinations, the UI falls back to common-only analysis and clearly communicates the limitation.
7. The analyzer emits warnings for ambiguous/manual-review cases instead of silently over-counting or misclassifying courses.
8. Existing transcript parsing robustness, GPA calculations, AU handling, HSS distribution handling, security headers, and ZDR behavior continue to work.
9. The supported-department feature set is covered by automated tests for domain logic, data validation, and UI behavior where practical.
10. The resulting app materially improves the user-visible usefulness of supported `심화전공` and department-specific program analysis.

## Test Cases

### Data Pipeline

- Given supported department/year documents are crawled, when normalization runs, then deterministic requirement artifacts are generated.
- Given a requirement references a course alias/equivalent, when validation runs, then the canonical or equivalent mapping resolves successfully.
- Given duplicated or conflicting requirement mappings, when validation runs, then generation fails with a clear integrity error.
- Given updated source manifests, when regeneration runs, then generated outputs change deterministically and are diffable in git.

### Analyzer

- Given an `AE 2022 심화전공` transcript, when analyzed, then AE required courses are checked explicitly and not reduced to `전공합계` only.
- Given a `CS` supported transcript with a documented substitution, when the alternate course is present, then the required slot is marked satisfied.
- Given a transcript with unrelated department major courses, when analyzing a supported target department, then unrelated courses do not silently count unless allowed by rules.
- Given a supported `복수전공` target, when analyzed, then the selected target program rules and relevant common dual-major relaxations are applied.
- Given a supported `부전공` target, when analyzed, then the app uses the configured minor rules instead of the current major-total shortcut.
- Given an ambiguous course mapping or unresolved equivalency, when analyzed, then the result includes an explicit manual-review warning.

### UI / Fallback

- Given a supported department/year/program selection, when analysis completes, then the dashboard shows course-level major fulfillment details.
- Given an unsupported selection, when analysis completes, then the dashboard clearly states that only common analysis is available.
- Given the currently validated real transcript, when reanalyzed under a supported department mode, then the result is more specific than the current common-only major summary.

## Verification Commands

- `npm test -- --runInBand` or `npx vitest run`
- `npx next build`

If new generation scripts or validation commands are added, they must also be included in the final verification and documented in the implementation summary.

## Completion Standard

This initiative is complete for the first supported release when:

- the offline data pipeline exists and is reproducible,
- AE/ME/CS/EE support is implemented for the agreed year/program scope,
- the planner can perform department-aware major analysis for supported combinations,
- unsupported combinations degrade honestly,
- automated tests pass,
- and the build succeeds.
