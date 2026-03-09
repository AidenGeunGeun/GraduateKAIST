# Wave 1.5 Reconciliation Notes

## Still Unresolved Bulletin Slots

- None from the Wave 1.5 target set.
- The former `needs-manual-recheck` bulletin slots were either resolved to `captured` after explicit tab-switch re-checks or downgraded to durable `missing` when the verified 2019 UI never exposed the department node.

## Confirmed Missing Bulletin Slots (Bulletin-Tree Level Only)

- `2019 AE` and `2019 ME` department nodes do not appear in the 2019 bulletin-year tree. This means the 2019 bulletin-year specific capture path is unavailable.
- However, this does NOT mean the 2019 admission-year rules are unknown. Official requirement documents from other captured bulletin years (e.g. 2020, 2025) contain the `2016학년도 이후 입학 학사과정용` section, which governs 2019 admissions.
- Therefore, these slots are `missing` at the bulletin-tree level but the corresponding admission-year rules are fully covered by the reviewed interpretation layer.

## Resolved Duplicate And Provenance Cases

- `2020 AE 교과목일람표`
  - resolved to `captured`
  - the list-tab click appended a new viewer iframe with a distinct `streamdocsId`; the first iframe stayed on the requirement viewer and caused the Wave 1 duplicate suspicion
- `2021 CS 교과목개요`
  - resolved to `captured`
  - the overview-tab click appended a distinct viewer iframe instead of replacing the default viewer
- `2021 ME 교과목개요`
  - resolved to `captured`
  - the overview-tab click appended a distinct viewer iframe instead of replacing the default viewer
- `2023 AE / CS / ME 교과목일람표`
  - all three resolved to `captured`
  - each list-tab click appended a distinct viewer iframe; the first iframe remained on the default viewer and created the earlier false-duplicate reading
- `2024 AE 교과목일람표`
  - resolved to `captured`
  - the list-tab click appended a distinct viewer iframe while the first iframe stayed on the requirement viewer
- `2019 CS 교과목일람표` and `2019 CS 교과목개요`
  - both resolved from `missing` to `captured`
  - after selecting `전산학부`, explicit 2019 list/overview tabs became reachable and each appended a new viewer iframe
- `2019 EE 교과목일람표` and `2019 EE 교과목개요`
  - both resolved from `missing` to `captured`
  - after selecting `전기및전자공학부`, explicit 2019 list/overview tabs became reachable and each appended a new viewer iframe

## ERP Provenance Limitations

- Spring 2025 prefix queries for `AE`, `ME`, `CS`, and `EE` remain broad supporting provenance only.
- Exact 2025 spring course-code snapshots remain the row-level supporting evidence layer, including zero-result attempts and the `2026,2025,` year multi-select quirk.
- `erp-row-evidence-map.json` now marks spring evidence as supporting provenance and fall evidence as unresolved supporting provenance.
- Fall 2025 attempts still preserve the requested filters but the visible rows continue to show `봄학기`.
- ERP year/semester controls still behave like multi-select widgets in the captured UI (`2026,2025,`, `봄학기,가을학기,`). The raw `uiFormValues` remain part of the provenance.
- ERP labels remain catalog metadata only. They MUST NOT be promoted to graduation truth without matching bulletin-backed requirement interpretation.

## Modeling Gaps

- No department has an official-source-backed, rule-level interpretation yet for required course slots, eligible credit buckets, explicit equivalencies, or manual-review-only edge cases.
- Existing generated department rules still trace to legacy summaries and prototype overrides. They remain in the repo for auditability, but they are no longer honest support backing.
- `자유융합전공` still lacks a trustworthy department/program rule corpus and remains common-only.

## Safe Next Questions

- Which single department now has the cleanest bulletin + ERP evidence to interpret first?
- For that department, which admission-year boundaries truly change the requirement tables or substitution prose?
- Which parts of the remaining corpus are trusted interpretation inputs versus supporting-only ERP provenance?
