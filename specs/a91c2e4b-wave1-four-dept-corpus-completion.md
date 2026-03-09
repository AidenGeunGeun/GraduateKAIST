# Spec: Wave 1 Four-Department Corpus Completion

## Intent

Complete the official-source acquisition matrix for `AE`, `ME`, `CS`, and `EE` across `2019-2025`, store reproducible provenance-backed raw artifacts in the repo, and close the known collection/reconciliation gaps before any department-rule interpretation resumes.

## Domain Goal

The planner cannot honestly interpret department graduation rules until the repository contains a trustworthy corpus of official KAIST source references for each in-scope department, year, and document type. This wave exists to finish the source corpus, not to expand analyzer precision.

## Context

- The repo already completed an honesty-lockdown pass and downgraded runtime support to `common-only` for the target departments.
- Phase 0-1 established the verified collection workflow and created initial raw manifests under `references/kaist-data/raw/`.
- Current gaps remain explicitly documented:
  - `2019 AE` and `2019 ME` `교과목이수요건` viewer capture failure
  - missing bulletin collection for `2020-2021`
  - duplicated `streamdocsId` captures in some `2024-2025` department documents that require re-check
  - ERP year/semester filter instability, especially fall `2025`
- Existing generated department rule data is not trustworthy support backing and must remain non-authoritative until a reviewed interpretation wave is completed.

## Root Cause

Previous work proved collection feasibility but did not close the full acquisition matrix. Partial captures were good enough for inventory seeding but not good enough for rigorous department-rule interpretation. The missing step is corpus completion plus reconciliation of ambiguous captures.

## Goals

1. Close the bulletin document matrix for `AE`, `ME`, `CS`, `EE` across `2019-2025` and document the status of every slot.
2. Reconcile ambiguous bulletin captures so duplicated or stale `streamdocsId` entries are either confirmed or kept explicitly unresolved.
3. Strengthen ERP provenance so term/department/course snapshots needed for later interpretation are reproducible and clearly labeled.
4. Leave the repo with a source-backed acquisition database that is ready for a separate interpretation wave.
5. Preserve honest support semantics; no department-aware precision upgrade is allowed in this wave.

## Options And Tradeoffs

### Option A: Interpret one department now and backfill the rest later

- Faster path to one visible department result.
- Rejected for this wave because it repeats the earlier failure mode: vertical implementation before full corpus closure.

### Option B: Close the four-department corpus first, then interpret

- Slower to first visible department-specific feature.
- Stronger domain foundation, cleaner provenance, fewer support-status reversals later.
- Recommended.

## Recommendation

Execute `Wave 1` as corpus completion only. Treat `AE`, `ME`, `CS`, and `EE` as one acquisition program with explicit per-slot status tracking. Do not start rule interpretation for any department inside this wave unless the work is purely structural note-taking that does not claim final rule meaning.

## Ubiquitous Language

- `source slot`: one `department x year x documentType` bulletin capture target
- `captured`: viewer/source provenance successfully recorded and usable
- `missing`: expected source slot not obtained
- `needs-manual-recheck`: capture exists but remains ambiguous or suspicious
- `ERP snapshot`: a provenance-backed record of course catalog results for specific filters
- `reconciliation`: the process of validating whether suspicious captures are real, stale, shared, or broken
- `official-source corpus`: the checked-in raw manifests, metadata, inventories, and notes used as domain evidence

## Domain Rules And Invariants

- A source slot MUST NOT be treated as complete unless its status is explicitly recorded.
- `captured`, `missing`, and `needs-manual-recheck` are all acceptable end states for this wave; silent omission is not.
- ERP labels remain catalog metadata only and MUST NOT be promoted into graduation-rule truth in this wave.
- Runtime app behavior MUST remain browser-local and MUST NOT fetch KAIST data at runtime.
- Any unresolved ambiguity MUST remain visible in the corpus and MUST block rule-level support upgrades.
- This wave MUST NOT upgrade any department/program support claim beyond what the active support manifest already allows.

## Use Cases

### UC1: Complete bulletin inventory for a department/year/document slot

- Navigate from the verified bulletin entry URL.
- Select historical year when needed.
- Switch to `전공별 교과과정`.
- Select target department and document tab.
- Record page URL, viewer URL, `streamdocsId`, official metadata, and status.
- If the viewer does not appear, preserve the failed state as `missing` or `needs-manual-recheck` with notes.

### UC2: Re-check suspicious duplicate viewer captures

- Re-run the collection flow for suspicious `2024-2025` entries.
- Confirm whether the same `streamdocsId` truly belongs to multiple departments, or whether the previous capture was stale.
- Preserve the outcome as either corrected metadata or an unresolved recheck record.

### UC3: Preserve reproducible ERP evidence

- Collect department/year/semester snapshots with exact filters and visible rows.
- Preserve raw filter values, including multi-select quirks.
- Store enough row-level evidence to validate that courses exist and how ERP labels them.
- Keep unstable queries explicit instead of normalizing them into trusted facts.

## Acceptance Criteria

1. The repo contains a machine-readable bulletin slot matrix covering `AE`, `ME`, `CS`, `EE` for every year `2019-2025` and document type `교과목이수요건`, `교과목일람표`, `교과목개요`.
2. Every bulletin source slot is labeled `captured`, `missing`, or `needs-manual-recheck`, with provenance notes where relevant.
3. Previously known gaps are revisited explicitly: `2019 AE`, `2019 ME`, `2020-2021`, and the suspicious duplicated `2024-2025` captures.
4. StreamDocs metadata records are updated to reflect any newly captured or reconciled bulletin viewer entries.
5. ERP raw artifacts are expanded or corrected so later interpretation has provenance-backed course evidence for the four in-scope departments, with explicit treatment of unstable fall `2025` behavior.
6. `references/kaist-data/raw/` includes updated manifests and unresolved notes that explain what was collected, what remains ambiguous, and why.
7. Active support/runtime messaging does not become more permissive in this wave.
8. The repo remains buildable and tests continue to pass after any data/doc/runtime adjustments.

## Changes Required

### `references/kaist-data/raw/`

- Update bulletin inventory/manifests to cover all `2019-2025` source slots for the four departments.
- Update StreamDocs metadata records for newly collected documents.
- Add or refresh ERP provenance artifacts needed for the four-department corpus.
- Expand unresolved notes with reconciliation outcomes and remaining blockers.

### `references/kaist-data/README.md`

- Document the completed wave scope, artifact meanings, and any remaining unresolved slots.

### `scripts/` and generated data

- Adjust validation/generation logic only if needed to support richer acquisition status tracking.
- Preserve honest support semantics in generated artifacts.

### App/runtime surfaces

- Only change runtime messaging if needed to keep support claims aligned with the corpus after this wave.

## Test Cases

- Given a newly collected bulletin slot, when the inventory is inspected, then the department, year, document type, page URL, viewer URL, `streamdocsId`, and status are present.
- Given a bulletin slot with no viewer or suspicious stale capture, when the inventory is inspected, then it is marked `missing` or `needs-manual-recheck` with notes instead of being silently dropped.
- Given a duplicated `streamdocsId` suspicion, when reconciliation completes, then the artifact records either a corrected mapping or an unresolved recheck state.
- Given an ERP snapshot, when reviewed later, then the artifact shows the exact year/semester/filter provenance used to produce it.
- Given the repo after Wave 1, when validation/tests/build run, then data generation remains consistent and the app still does not overclaim department support.

## Out Of Scope

- Rule-level interpretation of department graduation requirements
- Upgrading any department/program to `partial` or `supported` without a separate interpretation/review wave
- Analyzer logic expansion based on newly collected artifacts
- Coverage beyond `AE`, `ME`, `CS`, and `EE`
- Full KAIST-wide department acquisition in this wave

## Risks

- Bulletin viewer behavior may differ across older years and require manual retry logic.
- Some duplicated `streamdocsId` values may represent true shared docs rather than bad capture; reconciliation must avoid guessing.
- ERP filter controls may remain unstable for some semester combinations, which means provenance may improve without fully eliminating ambiguity.
- A fully closed acquisition matrix may still reveal that some departments need narrower year-group support later.

## Open Questions

- After Wave 1 closes, which department has the cleanest evidence to interpret first?
- Does `교과목개요` materially affect rule interpretation for all departments, or is it mainly supporting context?
- Which remaining ERP slices are actually necessary for rule interpretation versus merely useful to have?
