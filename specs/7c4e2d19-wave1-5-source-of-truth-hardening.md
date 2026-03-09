# Spec: Wave 1.5 Source Of Truth Hardening

## Intent

Harden the official-source corpus for `AE`, `ME`, `CS`, and `EE` by revisiting unresolved acquisition slots, improving provenance structure, and tightening the repository's source-of-truth artifacts before any department-rule interpretation begins.

## Domain Goal

Before the project encodes department graduation logic, the repository must hold a disciplined source-of-truth corpus that is as complete, reviewable, and reproducible as practical for the current scope. This wave exists to improve corpus trust, not to derive or implement rules.

## Context

- Wave 1 closed the bulletin matrix as an explicit status matrix for `AE`, `ME`, `CS`, and `EE` across `2019-2025` and `교과목이수요건`, `교과목일람표`, `교과목개요`.
- Wave 1 ended with `67 captured`, `8 missing`, and `9 needs-manual-recheck` bulletin slots.
- The repo already stores raw inventories, StreamDocs metadata, ERP snapshots, ERP row-evidence mappings, unresolved notes, and honest `common-only` support semantics.
- Major unresolved blockers still remain in the source-of-truth layer:
  - `2019 AE` / `2019 ME` discovery ambiguity in the live bulletin tree
  - duplicate or suspicious `streamdocsId` reuse in some `2020`, `2021`, `2023`, and `2024` slots
  - ERP fall `2025` instability caused by multi-select control behavior
- The user explicitly wants source collection, organization, review, and storage prioritized over any implementation or analyzer expansion.

## Root Cause

The repo now has broad coverage, but some artifacts are still not reliable enough to serve as clean source-of-truth inputs for later interpretation. The remaining problem is not missing product logic; it is unresolved acquisition ambiguity, inconsistent provenance quality, and insufficient normalization of what is truly trusted versus still questionable.

## Goals

1. Revisit every `needs-manual-recheck` bulletin slot and push each one to one of three durable outcomes: confirmed `captured`, durable `missing`, or well-justified `needs-manual-recheck` with stronger notes.
2. Revisit all `2019` gaps and explicitly determine whether each missing slot is truly absent in the official UI, hidden under a different structure, or still blocked by capture workflow limitations.
3. Improve corpus documentation so a future interpretation wave can identify trusted vs untrusted evidence without rereading the entire acquisition history.
4. Strengthen ERP provenance only as source evidence, especially around unresolved fall `2025` behavior and row-level evidence coverage.
5. Preserve current honest support semantics; this wave must not produce more permissive runtime or data claims.

## Recommendation

Treat this as a corpus-reconciliation and source-of-truth curation wave. Prefer durable evidence classification over aggressive closure. If a slot still cannot be proven, keep it unresolved, but explain it better and normalize its status cleanly.

## Ubiquitous Language

- `trusted source slot`: a bulletin slot whose capture and provenance are stable enough for later interpretation input
- `untrusted source slot`: a slot that exists in inventory but still requires manual caution
- `reconciliation note`: a structured explanation of why a slot is trusted, missing, or still unresolved
- `source-of-truth artifact`: a checked-in raw or generated file that future interpretation work will rely on directly
- `evidence grade`: an internal corpus-quality distinction such as trusted, unresolved, or absent; not a runtime support label

## Domain Rules And Invariants

- No department-rule interpretation is allowed in this wave.
- No support-status upgrade is allowed in this wave.
- Every unresolved acquisition issue must be represented in machine-readable or clearly linked documentation.
- The repo must distinguish between absence of evidence and evidence of absence whenever the bulletin/ERP UI makes that distinction observable.
- If a suspicious duplicate cannot be disproven or confirmed, it must remain unresolved rather than being normalized away.
- ERP remains supporting catalog evidence only.

## Use Cases

### UC1: Reconcile a suspicious bulletin slot

- Re-run the verified bulletin workflow for the exact year, department, and document type.
- Compare viewer URL, `streamdocsId`, visible labels, and surrounding page cues against the current inventory.
- Record whether the prior ambiguity resolves, persists, or changes form.

### UC2: Classify a 2019 missing slot more rigorously

- Re-examine the 2019 year tree and document-tab behavior.
- Determine whether the slot appears absent from the UI, hidden under another label, or blocked by workflow instability.
- Preserve the reasoning in notes rather than just keeping a bare `missing` entry.

### UC3: Strengthen ERP source provenance

- Revisit unresolved fall `2025` behavior and row-evidence coverage only to improve provenance quality.
- If instability persists, encode it more clearly in manifests/notes rather than forcing a misleading closed state.

## Acceptance Criteria

1. Every currently unresolved bulletin slot from Wave 1 is revisited and its artifact notes become more precise, even if the status does not change.
2. `references/kaist-data/raw/bulletin-document-inventory.json` remains the complete slot matrix and reflects any status changes or stronger notes from this wave.
3. `references/kaist-data/raw/unresolved-notes.md` clearly separates:
   - still unresolved bulletin slots
   - confirmed missing bulletin slots
   - resolved duplicate suspicions
   - ERP provenance limitations that still block interpretation use
4. Corpus docs make it easier to identify which artifacts are trusted inputs for the next interpretation wave and which are caution-only.
5. ERP provenance artifacts are updated if and only if the updates improve evidence clarity without inventing certainty.
6. Active support/runtime behavior remains no more permissive than `common-only`.
7. Validation/tests/build all pass after the hardening updates.

## Changes Required

### `references/kaist-data/raw/`

- Refine bulletin slot entries, notes, and reconciliation history.
- Update StreamDocs metadata only where new verified captures exist.
- Tighten ERP provenance artifacts and gap notes.
- Consider adding a machine-readable corpus-quality artifact if helpful for later interpretation gating.

### `references/kaist-data/README.md`

- Explain Wave 1.5 hardening outcomes and how to read trusted vs unresolved artifacts.

### `scripts/` and generated artifacts

- Update validation/generation only if needed to enforce source-of-truth integrity more clearly.
- Do not add feature behavior; only corpus and support honesty guardrails.

### Runtime/app surfaces

- Change only if required to preserve honesty with newly clarified corpus limitations.

## Test Cases

- Given a previously unresolved slot, when the updated corpus is reviewed, then its notes explain what was retried and why the current status is trusted, missing, or unresolved.
- Given a 2019 missing slot, when the inventory is reviewed, then the artifact distinguishes observed absence from unresolved workflow failure where possible.
- Given ERP fall `2025`, when provenance artifacts are reviewed, then they still show the instability explicitly and do not imply trusted fall-semester evidence if that cannot be proven.
- Given the repo after Wave 1.5, when validation/tests/build run, then corpus integrity checks pass and support/runtime claims remain unchanged or stricter.

## Out Of Scope

- Department graduation-rule interpretation
- Any analyzer or UI feature expansion beyond honesty maintenance
- Support-status upgrades to `partial` or `supported`
- Expansion beyond `AE`, `ME`, `CS`, and `EE`
- Full automation redesign of the acquisition workflow unless strictly necessary to preserve current corpus integrity

## Risks

- Some slots may remain unresolved despite another pass because the external bulletin UI is genuinely inconsistent.
- Overfitting the corpus to current UI behavior could still misclassify historically available documents.
- Additional rechecks may surface new ambiguities instead of eliminating old ones; the corpus must absorb that honestly.

## Open Questions

- Should the next wave introduce a formal machine-readable trust grade for each source slot?
- After hardening, which department has the cleanest evidence boundary for interpretation first?
- Is there a better reproducible strategy for 2019 historical capture that stays consistent with the verified workflow policy?
