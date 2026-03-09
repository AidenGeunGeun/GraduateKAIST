# Spec: Wave 2 Four-Department Interpretation Database

## Intent

Build the reviewed department-rule source-of-truth database for `AE`, `ME`, `CS`, and `EE` from the official-source corpus already collected in the repository. The goal of this wave is to convert trusted source material into structured, provenance-linked domain knowledge. This wave is about rule interpretation and storage, not UI expansion and not analyzer feature work.

## Domain Goal

The planner needs a durable department-rule knowledge base that answers, for each supported department/program/year slice:

- which official documents govern the rules
- which admission-year boundaries actually matter
- which courses are required course slots
- which requirements are generic eligible credit buckets
- which substitutions/equivalencies are explicit
- which cases require manual review
- which claims are explicit versus inferred

That knowledge must be stored in the repo as the authoritative interpretation layer with traceable provenance.

## Context

- The raw acquisition and source-of-truth hardening waves are complete for the current four-department scope.
- The repository now has:
  - a full bulletin slot matrix for `AE`, `ME`, `CS`, and `EE` across `2019-2025`
  - StreamDocs metadata for captured bulletin viewers
  - reconciliation artifacts distinguishing trusted captures, confirmed missing slots, and supporting-only ERP evidence
  - honest `common-only` support semantics still active in runtime/generated support metadata
- Key corpus boundary facts already established:
  - `AE` and `ME` `2019` major-document slots are confirmed missing in the currently verified bulletin workflow
  - `CS` and `EE` have refreshed `2019` requirement/list/overview captures
  - ERP is supporting catalog evidence only, especially with unresolved `2025 fall` instability
- Existing generated program-rule artifacts still contain legacy prototype content and are not authoritative. This wave must replace that situation with reviewed interpretation data tied to official provenance.

## Root Cause

The project previously had code and prototype rule objects without an official-source-backed interpretation database. That created false precision. The missing layer is not UI or analysis mechanics; it is the reviewed domain interpretation layer between raw source corpus and future analyzer logic.

## Goals

1. Create a structured, reviewed interpretation database for `AE`, `ME`, `CS`, and `EE`.
2. Determine real admission-year boundaries from official sources rather than assuming a broad `2019-2025` block.
3. Encode department program requirements as explicit domain objects with provenance.
4. Mark each interpreted rule as `explicit`, `inferred`, or `manual-review-only`.
5. Distinguish trusted interpretation inputs from supporting-only evidence.
6. Leave the runtime honest: no UI/analyzer precision upgrade unless the reviewed data and support boundary justify it.

## Recommendation

Execute this as a repository knowledge-base wave. For each department, interpret the official documents into reviewed rule datasets and acceptance examples before touching analyzer behavior. If a department or year slice cannot be interpreted confidently from the corpus, store that fact explicitly and keep its support boundary limited.

## Ubiquitous Language

- `reviewed interpretation`: a human-readable and machine-readable rule encoding derived from official source artifacts
- `required course slot`: a named required position that may accept one or more explicitly allowed codes
- `eligible credit bucket`: a credit rule with bounded inclusion/exclusion criteria
- `equivalency`: an explicitly documented substitution or cross-recognition rule
- `manual-review-only`: a rule or case that cannot be auto-judged safely from transcript data alone
- `source provenance`: year, department, document type, viewer metadata, and exact text/table reference supporting a rule
- `support boundary`: the exact department/program/year range that the reviewed data honestly supports

## Domain Rules And Invariants

- Every interpreted rule MUST reference one or more official source artifacts.
- If a rule is inferred instead of explicit, the dataset MUST say so.
- If a rule cannot be safely auto-judged, it MUST be marked `manual-review-only` instead of forced into a deterministic rule.
- Year ranges MUST be evidence-backed; no silent generalization across years.
- ERP MAY support course existence/category context but MUST NOT override bulletin-backed graduation truth.
- Legacy prototype rule data MUST NOT remain the effective source of truth after this wave.
- Interpretation MUST be text-first. Rendered-page images/OCR are fallback-only for isolated unreadable passages and MUST NOT become the default path or a reason to stall execution.

## Use Cases

### UC1: Interpret a department requirement document into required slots

- Read the official requirement document for a department/year slice.
- Extract named required courses and any explicit alternatives.
- Store each slot with canonical code, accepted codes, source references, and confidence (`explicit` or `inferred`).

### UC2: Interpret major credit rules into eligible buckets

- Identify major total-credit rules, major elective rules, research requirements, and similar buckets.
- Encode inclusion rules, exclusions, cross-department allowances, and minimum-level constraints.
- Mark any approval-based or ambiguous bucket edges as `manual-review-only`.

### UC3: Determine real year boundaries

- Compare department rules across years.
- Group years only when the official documents support the grouping.
- Record why a year range is shared or why it must split.

### UC4: Preserve uncertainty honestly

- If `AE` or `ME` `2019` lacks the required official documents in the verified corpus, record that the support boundary may start later or remain partial.
- Do not fill missing years with convenience assumptions.

## Acceptance Criteria

1. The repo contains a reviewed interpretation database for `AE`, `ME`, `CS`, and `EE`, stored in a clear authoritative location and format.
2. For each department/program/year slice encoded, the dataset includes:
   - support boundary
   - governing source refs
   - required course slots
   - eligible credit buckets
   - equivalencies/substitutions
   - manual-review-only cases
   - explicit vs inferred status where relevant
3. The wave produces a machine-readable support-boundary view that reflects the reviewed interpretation data rather than legacy prototype assumptions.
4. The wave produces human-readable interpretation notes/examples showing how official documents were read for each department.
5. Any department/year/program combination that still lacks trustworthy interpretation remains limited honestly rather than silently generalized.
6. Legacy prototype program data is either replaced as authoritative input or clearly fenced off so it cannot be mistaken for reviewed truth.
7. Validation/tests/build pass after the new interpretation artifacts are introduced.

## Changes Required

### `references/kaist-data/`

- Add a reviewed interpretation layer for department-rule knowledge.
- Recommended contents include:
  - per-department rule datasets
  - year-boundary analysis
  - acceptance examples / interpretation notes
  - support-boundary summaries

### `references/kaist-data/raw/`

- Keep raw source artifacts as-is except for any provenance cross-links needed by the reviewed layer.

### `scripts/` and generated artifacts

- Add or update generation/validation logic so reviewed interpretation data can be validated for provenance completeness and consistency.
- Regenerate any downstream support/program artifacts only from reviewed sources, not from legacy prototype summaries.

### `src/domain/generated/`

- If generated runtime-facing datasets remain, they must now derive from the reviewed interpretation layer or be explicitly marked non-authoritative.

### Runtime/app surfaces

- Only change runtime support messaging or data gating if required to keep the app aligned with the new reviewed support boundaries.
- Do not implement new analyzer behavior in this wave.

## Test Cases

- Given a reviewed rule entry, when inspected, then it includes source refs and an explicit/inferred/manual-review marker.
- Given a department with differing official documents across years, when the reviewed dataset is generated, then year ranges split only where source evidence requires it.
- Given a missing or weakly sourced slice such as `AE`/`ME` `2019`, when support boundaries are generated, then the slice is not silently treated as fully supported.
- Given the repo after Wave 2, when validators/tests/build run, then the reviewed interpretation database is internally consistent and legacy prototype data no longer acts as authoritative truth.

## Out Of Scope

- Transcript analyzer implementation using the new rules
- UI feature expansion for department-aware results
- Support-status marketing upgrades without verified reviewed data
- Expansion beyond `AE`, `ME`, `CS`, and `EE`

## Risks

- Some official documents may still leave genuine ambiguity that requires `manual-review-only` outcomes.
- `AE` and `ME` may need narrower support boundaries because `2019` official-source coverage is missing in the verified workflow.
- Replacing legacy prototype authority may surface more gaps than expected before any support upgrade is safe.

## Open Questions

- Which department/year slices can honestly reach `partial` or `supported` immediately after interpretation, if any?
- Which rules depend on prose or footnotes rather than tables and therefore need heavier manual review notes?
- What minimum reviewed-example set should be required before analyzer implementation begins?
