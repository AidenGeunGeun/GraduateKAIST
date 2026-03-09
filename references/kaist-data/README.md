# KAIST Data Corpus

- `raw/` stores official-source acquisition artifacts, provenance manifests, reconciliation artifacts, and support-boundary scaffolding.
- `reviewed/` stores the Wave 2 authoritative interpretation layer derived from the trusted official corpus. Runtime-facing support/program artifacts MUST derive from this layer rather than from legacy prototype summaries.
- `overrides/` is for interpretation-only layers after raw official sources exist. Overrides do not replace acquisition.
- The verified bulletin workflow starts from `https://bulletin.kaist.ac.kr/com/lgin/SsoCtr/initPageWork.do?requestTimeStr=<timestamp>` and MUST NOT use the dead `main.do` shell path.
- The verified ERP course-catalog entry is `https://erp.kaist.ac.kr/com/lgin/SsoCtr/initExtPageWork.do?link=estblSubjt`.
- Wave 1.5 keeps the four-department bulletin matrix in `references/kaist-data/raw/bulletin-document-inventory.json` for `AE`, `ME`, `CS`, `EE` across `2019-2025` and `교과목이수요건` / `교과목일람표` / `교과목개요`.
- Bulletin slot statuses are now read as follows:
  - `captured`: slot has stable viewer provenance and is a trusted source slot for later interpretation work
  - `missing`: repeated verified workflow re-checks did not expose the slot in the current official UI
  - `needs-manual-recheck`: unresolved acquisition state; treat as caution-only until reconciled
- `references/kaist-data/raw/source-truth-reconciliation.json` is the Wave 1.5 machine-readable guide for trusted vs unresolved evidence. It records which bulletin slots were resolved duplicates, which 2019 slots are confirmed missing, which 2019 CS/EE slots were newly captured, and which ERP artifacts remain supporting-only.
- `references/kaist-data/raw/unresolved-notes.md` is the human-readable companion to the reconciliation artifact. Read it first when deciding whether a corpus slice is safe interpretation input or still caution-only.
- `references/kaist-data/raw/streamdocs-metadata.json` stores refreshed metadata for the current bulletin inventory's referenced viewer IDs.
- `references/kaist-data/raw/erp-query-inventory.json`, `references/kaist-data/raw/erp-course-code-snapshots-2025-spring.json`, and `references/kaist-data/raw/erp-row-evidence-map.json` together describe broad ERP queries, exact row-level evidence, and the still-unresolved fall-2025 instability.
- ERP evidence grades remain provenance-only: spring prefix snapshots are broad supporting evidence, exact course-code snapshots are row-level supporting evidence, and fall 2025 attempts are unresolved supporting evidence that MUST NOT be treated as trusted fall-semester truth.
- Store year, department, document type, page URL, viewer URL, `streamdocsId`, filter metadata, and reconciliation notes whenever provenance is incomplete or previously ambiguous.
