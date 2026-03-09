# Phase 0-1 Domain Interpretation Skeleton

## Supported Scope Matrix

| Department | Years | Program Types | Current Status | Why |
| --- | --- | --- | --- | --- |
| `AE` | 2019-2025 | 심화전공 / 복수전공 / 부전공 | `common-only` | Wave 1.5 confirmed that the verified 2019 UI does not expose AE major-document slots, and rule interpretation is still not normalized. |
| `ME` | 2019-2025 | 심화전공 / 복수전공 / 부전공 | `common-only` | Wave 1.5 confirmed that the verified 2019 UI does not expose ME major-document slots, and rule interpretation is still not normalized. |
| `CS` | 2019-2025 | 심화전공 / 복수전공 / 부전공 | `common-only` | Bulletin inventory and StreamDocs metadata are collected, including refreshed 2019 CS tabs, but required-slot/equivalency interpretation is not encoded yet. |
| `EE` | 2019-2025 | 심화전공 / 복수전공 / 부전공 | `common-only` | Bulletin inventory and StreamDocs metadata are collected, including refreshed 2019 EE tabs, but required-slot/equivalency interpretation is not encoded yet. |

## Coverage Table

| Corpus Slice | AE | ME | CS | EE |
| --- | --- | --- | --- | --- |
| 2019 `교과목이수요건` | missing | missing | captured | captured |
| 2019 `교과목일람표` | missing | missing | captured | captured |
| 2019 `교과목개요` | missing | missing | captured | captured |
| 2022 `교과목이수요건` | captured | captured | captured | captured |
| 2023 `교과목이수요건` | captured | captured | captured | captured |
| 2024 `교과목이수요건` | captured | captured | captured | captured |
| 2024 `교과목일람표` | captured | captured | captured | captured |
| 2024 `교과목개요` | captured | captured | captured | captured |
| 2025 `교과목이수요건` | captured | captured | captured | captured |
| 2025 `교과목일람표` | captured | captured | captured | captured |
| 2025 `교과목개요` | captured | captured | captured | captured |
| ERP 2025 봄 prefix snapshots | captured | captured | captured | captured |
| ERP 2025 가을 prefix snapshots | needs-manual-recheck | needs-manual-recheck | needs-manual-recheck | needs-manual-recheck |

## Ubiquitous Language

- `common requirements`: KAIST-wide rules that can be judged without department-specific interpretation.
- `department program requirements`: Department/program rules sourced from official bulletin documents and only safe to auto-judge after provenance-backed interpretation.
- `required course slot`: A named required course position that may accept explicit equivalent course codes.
- `eligible credit bucket`: A credit-counting rule with clearly defined inclusion and exclusion boundaries.
- `equivalency`: An explicit substitution or cross-recognition stated in official documents.
- `manual review`: A result the planner must not auto-judge from transcript data alone.
- `source provenance`: The year/department/document/URL/streamdocs metadata needed to trace a rule claim back to official material.

## Known Unknowns

- Whether the current verified 2019 UI reflects true historical absence for `AE`/`ME` major-document slots or only the currently reachable branch of the bulletin application.
- Which admission-year boundaries after the refreshed 2019 captures materially change `AE`, `ME`, `CS`, and `EE` required slots, credit buckets, or substitution rules.
- Which rules can only be judged with advisor approval, track approval, or graduate-course cross-recognition.
- Whether `자유융합전공` has any machine-actionable official rule corpus in the intended undergraduate scope.

## Safe Next Step

Choose one department with the cleanest Wave 1.5 evidence boundary, anchor interpretation work on the trusted bulletin slots plus provenance notes, and hand-encode one admission-year slice directly from the official requirement document with provenance-linked acceptance examples before re-enabling any department-aware analyzer precision.
