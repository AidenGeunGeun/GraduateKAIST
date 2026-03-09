# Spec: Phase 0-1 Domain Acquisition And Honesty Lockdown

## Intent

Stop feature-first department modeling and reset the project to a domain-first workflow. The immediate goal is not to expand planner logic. The immediate goal is to collect, document, and store trustworthy KAIST source material and to lower any product claims that exceed the current source-backed confidence.

## Domain Goal

The planner must only claim department/program analysis when the relevant rules are backed by official KAIST source material stored in the repository with clear provenance. Before any further department-aware analyzer work, the repository must contain a trustworthy source corpus for the first supported scope and explicit documentation of what is known, unknown, and manual-review-only.

## Current Understanding

- The current app and repo already have useful infrastructure:
  - browser-local transcript parsing
  - common graduation analysis
  - robust Excel parsing
  - department-aware prototype code and generated data artifacts
- The current department-aware slice is not sufficiently trustworthy for full support claims.
- `agent-browser` feasibility has been confirmed for the KAIST bulletin / StreamDocs viewer flow:
  - navigate bulletin landing page
  - enter `과거 학사요람 조회`
  - select historical years
  - switch to `전공별 교과과정`
  - select departments
  - extract viewer iframe URLs and `streamdocsId`
- ERP `개설교과과정` feasibility has also been confirmed:
  - the external ERP page is reachable
  - it exposes course-level data and category labels
  - it has identifiable backend endpoints for search/export behavior
- The trust gap is not browser feasibility. The trust gap is missing official-source-backed corpus depth and insufficiently explicit support boundaries.

## Unknowns To Resolve

For `AE`, `ME`, `CS`, and `EE`, and for the intended 2019-2025 scope:

- Which exact official KAIST documents govern each department/program/year range?
- Which year boundaries actually change department rules?
- Which courses are required slots versus generic credit buckets?
- Which substitutions/equivalencies are explicit in the official documents?
- Which courses are conditional, approval-based, or manual-review-only?
- Which track/program variants are actually supported by the documents versus only inferred?
- Whether `자유융합전공` has machine-actionable rules for any in-scope department/program combination.
- What raw ERP exports or stable snapshots can be preserved reproducibly.
- What StreamDocs metadata and/or downloadable artifacts can be stored with provenance.

## Constraints

- Transcript analysis MUST remain browser-local.
- Runtime app behavior MUST NOT scrape KAIST websites.
- Generated data MUST be deterministic and checked into the repo.
- Department/program support MUST NOT be claimed without official-source-backed provenance.
- Curated overrides MAY interpret official documents but MUST NOT replace domain acquisition.
- This phase MUST prioritize corpus quality, provenance, and support honesty over feature breadth.
- This phase MUST NOT continue expanding department-aware analyzer precision beyond what the collected source corpus can justify.

## Investigation Plan

### Phase 0: Honesty Lockdown

Adjust the current repo state so product claims do not exceed the available source-backed confidence.

Work items:

- audit current department-aware support messaging, generated support metadata, and UI labels
- downgrade misleading `supported` claims to `partial`, `common-only`, or `unsupported` where source backing is insufficient
- ensure the app does not present false precision for department/program analysis
- document known gaps explicitly in the corpus or support metadata

Deliverables:

- corrected support semantics in data and/or UI
- documented current limitations

### Phase 1A: Bulletin / Department Requirement Corpus

Use `agent-browser` to build a raw repository of official requirement-source metadata.

Required collection behavior:

- navigate the bulletin site for each in-scope department and relevant year range
- record document inventory for each year/department:
  - department
  - year
  - visible document type (`교과목이수요건`, `교과목일람표`, `교과목개요`, etc.)
  - bulletin page URL
  - viewer iframe URL
  - `streamdocsId`
  - any obtainable official metadata from StreamDocs
- save raw manifests in `references/kaist-data/raw/`
- save notes for ambiguous, missing, or inconsistent documents

Expected artifacts:

- bulletin crawl manifest
- year/department/document inventory
- StreamDocs metadata records
- unresolved-notes document

### Phase 1B: ERP Course Catalog Corpus

Collect trustworthy raw course-catalog material from ERP.

Required collection behavior:

- identify year/semester coverage relevant to the in-scope department/program analysis
- capture raw ERP query parameters and filter combinations used
- preserve raw exports or export-like snapshots when available
- record category labels and offering metadata with provenance
- store enough data to answer:
  - which lectures exist
  - which departments offer them
  - which raw labels ERP assigns them
  - which year/semester snapshot the data came from

Expected artifacts:

- ERP source manifest
- year/semester query inventory
- raw export or snapshot files
- notes about ERP limitations and non-graduation-truth semantics

### Phase 1C: Domain Interpretation Skeleton

Do not build the final analyzer yet. Instead, produce the domain-interpretation scaffolding needed for the next spec.

Required outputs:

- supported-scope matrix for `AE`, `ME`, `CS`, `EE`
- department/program/year coverage table
- known unknowns list
- initial ubiquitous language mapping for:
  - common requirements
  - department program requirements
  - required course slot
  - eligible credit bucket
  - equivalency
  - manual review
  - source provenance
- a recommendation for what is safe to implement next and what is still blocked

## Success Criteria

This phase succeeds when:

- the repo contains official-source-backed raw manifests for the in-scope bulletin and ERP corpus work completed in this phase
- every collected department/program document reference is traceable by year, department, document type, URL/viewer metadata, and source identifier
- current department/program support claims are lowered wherever provenance or rule coverage is insufficient
- the repo explicitly documents what is known, unknown, inferred, and manual-review-only
- the next implementation spec can be written from the collected corpus rather than from product summaries or inferred convenience rules

## Acceptance Criteria

1. A root-level source-backed corpus exists in `references/kaist-data/raw/` for the completed bulletin and ERP acquisition work in this phase.
2. The corpus includes a machine-readable bulletin inventory with year, department, document type, page URL, viewer URL, and `streamdocsId` when present.
3. The corpus includes machine-readable ERP provenance for course-catalog snapshots or exports, including year/semester/filter metadata.
4. The repo includes explicit notes for unresolved or ambiguous source gaps rather than silently flattening them into supported rules.
5. Current misleading support claims are downgraded so the product does not imply department precision beyond the collected corpus.
6. The project documentation clearly explains how agents should collect KAIST bulletin and ERP data with `agent-browser` and how provenance must be stored.
7. This phase does not introduce new department-aware analyzer precision that is not backed by the collected source corpus.
8. Any code/data changes made for honesty lockdown still leave the repo in a passing, buildable state.

## Test Cases

- Given an in-scope department/year bulletin page, when collection runs, then the stored manifest includes the correct year, department, document type, viewer URL, and `streamdocsId` if present.
- Given an ERP course snapshot, when stored, then the artifact records the year/semester/filter provenance used to collect it.
- Given a department/program with insufficient official-source backing, when the app or support metadata is inspected, then it is not labeled `supported`.
- Given an ambiguous or missing rule source, when documentation is reviewed, then the gap is explicitly listed as unresolved or manual-review-only.
- Given the repo after Phase 0, when tests/build are run, then existing functionality still passes and no new runtime scraping is introduced.

## Out of Scope

- Full department-aware analyzer redesign
- Re-expanding supported department precision in the app
- New graduation-rule implementation beyond honesty corrections
- Global multi-program graduation optimization
- Recommendation/planning features

## Risks

- Some StreamDocs documents may expose metadata more easily than downloadable originals.
- ERP may require constrained queries for reproducible snapshots.
- Official documents may differ by year in ways that force narrower support ranges than initially desired.
- Collecting a trustworthy corpus may reveal that some currently modeled program variants are not yet implementable.

## Open Questions

- What is the minimal official-source corpus required before AE can honestly be upgraded back to `supported`?
- Which of `ME`, `CS`, and `EE` can realistically reach `supported` first, and which should remain `partial` longer?
- Should the first post-acquisition implementation slice target only one department to prove the domain workflow end-to-end?
