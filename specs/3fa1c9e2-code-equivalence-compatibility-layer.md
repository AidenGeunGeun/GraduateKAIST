# Spec: Course Code Equivalence Compatibility Layer

## Intent

KAIST changed course codes from old 3-digit format (e.g., `AE350`, `ME303`) to new 5-digit format (dotted: `ME.20005` or non-dotted: `AE21000`) starting ~2025. A student admitted in 2022 taking courses in 2025+ semesters will have new-format codes on their transcript. The analyzer currently holds pre-2025 requirements in old codes → no match → false negatives.

Build a compatibility layer so both code formats match correctly, without requiring runtime lookups.

## Domain Goal

Every required course slot and credit bucket must accept both old and new code formats so no legitimate course match is missed due to the format transition.

## Context

### How codes flow through the system today
1. **Parser** (`ExcelTranscriptParser.ts`): reads "과목번호" column into `CourseCode.from(oldCode, newCode)`. Whatever the transcript shows goes into `oldCode`.
2. **CourseCode model**: `departmentPrefix` extracts `^[A-Z]+` (works for both formats). `numericPart` extracts first `(\d+)` match — returns `20005` for `ME.20005` (breaks level detection).
3. **Analyzer** (`RequirementAnalyzer.ts`): matches `record.courseCode.oldCode` against `slot.acceptedCourseCodes` (required course slots) and uses `departmentPrefix` + `numericPart` for prefix/level bucket matching.
4. **Pipeline** (`kaist-data-pipeline.mjs`): generates `program-requirements.generated.json` from reviewed DB. Each slot's `acceptedCourseCodes` currently contains only the codes from that year-group's slice.

### The mapping is NOT mechanical
`ME303 → ME.20005` (complete renumber), `ME340 → ME.30040`. Cannot derive new from old with a formula. The reviewed DB has same slot IDs across year groups, which gives us explicit pairs.

### Format variants in reviewed DB
- AE 2025: non-dotted 5-digit (`AE21000`)
- ME/CS/EE 2025: dotted (`ME.20000`, `CS.20004`, `EE.30005`)
- Actual transcript format is unknown — could be either. Must accept both.

## Changes Required

### 1. `references/kaist-data/reviewed/code-equivalence-map.json` (NEW)

19 explicit old↔new pairs extracted from reviewed DB slot matching:

```json
{
  "description": "Course code equivalence map: old 3-digit codes ↔ new 5-digit codes. Extracted from reviewed interpretation DB by matching slot IDs across year groups.",
  "generatedFrom": "Reviewed interpretation slot-ID matching across pre-2025 and 2025 year-group slices",
  "pairs": [
    { "old": "AE208", "new": "AE20008" },
    { "old": "AE210", "new": "AE21000" },
    { "old": "AE220", "new": "AE22000" },
    { "old": "AE300", "new": "AE30000" },
    { "old": "AE307", "new": "AE30007" },
    { "old": "AE330", "new": "AE33000" },
    { "old": "AE400", "new": "AE40000" },
    { "old": "CS204", "new": "CS.20004" },
    { "old": "CS206", "new": "CS.20006" },
    { "old": "CS300", "new": "CS.30000" },
    { "old": "CS311", "new": "CS.30101" },
    { "old": "CS320", "new": "CS.30200" },
    { "old": "CS330", "new": "CS.30300" },
    { "old": "EE305", "new": "EE.30005" },
    { "old": "EE405", "new": "EE.40005" },
    { "old": "ME200", "new": "ME.20000" },
    { "old": "ME303", "new": "ME.20005" },
    { "old": "ME340", "new": "ME.30040" },
    { "old": "ME400", "new": "ME.40000" }
  ]
}
```

For each pair, both the dotted variant (`AE.21000`) and non-dotted variant (`AE21000`) of the new code should be treated as valid. The pipeline must handle this.

### 2. `scripts/lib/kaist-data-pipeline.mjs` — Pipeline enrichment

In `buildRuntimePrograms()`, after loading reviewed interpretations:

1. Load `code-equivalence-map.json`.
2. Build a bidirectional lookup: for each pair, create entries for old → [new variants] and new → [old]. For new codes, generate both dotted and non-dotted forms (e.g., `AE21000` → also `AE.21000`, and `ME.20005` → also `ME20005`).
3. When building `requiredCourseSlots[].acceptedCourseCodes`: for every code in the array, check the lookup and add all equivalent codes. Deduplicate and sort.
4. When building `creditBuckets[].eligibleCourseCodes`: same enrichment.
5. Do NOT touch `eligiblePrefixes` — prefix extraction already works for both formats.

Also update `INPUT_PATHS` to include the map file path. Update `DATASET_VERSION`.

### 3. `src/domain/models/CourseCode.ts` — Fix `numericPart` for 5-digit codes

Current behavior:
- `ME.20005` → `numericPart` = 20005 (first `\d+` match in oldCode `ME.20005` captures `20005`)
- This breaks level detection: 20005 >= any `minimumLevel` check always passes

Fix: detect whether the numeric portion is a 5-digit new-format number. If so, derive the approximate old-style level. Heuristic: `Math.floor(fiveDigitNum / 10000) * 100` gives the hundred-level (21000 → 200, 30040 → 300, 40005 → 400).

Note: This heuristic is imperfect (ME303 maps to ME.20005 which would yield level 200, not 300). But `minimumLevel` is used for prefix-based bucket matching where precision isn't critical — the primary matching is by explicit `eligibleCourseCodes` and `acceptedCourseCodes` (which are now enriched). The level heuristic is a reasonable fallback for general prefix+level bucket rules.

```ts
get numericPart(): number {
  const code = this.oldCode || this.newCode;
  const match = code.match(/(\d+)/);
  if (!match) return 0;
  const num = Number(match[1]);
  // 5-digit new-format: derive approximate hundred-level
  if (num >= 10000) {
    return Math.floor(num / 10000) * 100;
  }
  return num;
}
```

### 4. `scripts/lib/kaist-data-pipeline.mjs` — Fix `deriveLevel()` for 5-digit codes

Same logic as CourseCode fix:

```js
function deriveLevel(code) {
  const match = upper(code).match(/(\d+)/);
  if (!match) return 0;
  const num = Number(match[1]);
  if (num >= 10000) {
    return Math.floor(num / 10000) * 100;
  }
  return Math.floor(num / 100) * 100;
}
```

### 5. Tests

Add tests for:
- Code equivalence map loading and bidirectional lookup
- Pipeline enrichment: a slot with `["ME303"]` in pre-2025 slice gains `["ME.20005", "ME20005"]` in generated output
- Pipeline enrichment: a slot with `["ME.20005"]` in 2025 slice gains `["ME303"]` in generated output
- `CourseCode.numericPart` returns 200 for `ME.20005` (not 20005)
- `CourseCode.numericPart` returns 300 for `AE30000` (non-dotted 5-digit)
- `CourseCode.numericPart` returns 350 for `AE350` (old format unchanged)
- `CourseCode.departmentPrefix` returns `ME` for `ME.20005`
- `deriveLevel` returns 300 for `ME.30040`, 200 for `CS.20004`, 400 for `EE.40005`
- End-to-end: analyzer matches a transcript record with code `ME.20005` against a pre-2025 requirement slot for `ME303`

## Acceptance Criteria

1. `references/kaist-data/reviewed/code-equivalence-map.json` exists with 19 pairs.
2. `node scripts/generate-kaist-data.mjs` succeeds and produces enriched `program-requirements.generated.json`.
3. In the generated output, every required course slot for a pre-2025 year group that has a 2025 equivalent includes the new code (dotted and non-dotted). Vice versa for 2025 slots.
4. `node scripts/validate-kaist-data.mjs` passes.
5. `npx vitest run` passes with new tests.
6. `npx next build` succeeds.
7. `CourseCode.from("ME.20005", "").numericPart` returns a value in the 200 range, not 20005.
8. No runtime behavior change for transcripts with only old-format codes.

## Out of Scope

- Adding new course code pairs beyond what the reviewed DB provides (those 19 are sufficient for the 4 supported departments)
- Changing the parser's column detection (it already handles both formats fine)
- Modifying the analyzer's matching logic beyond what already exists (the enriched `acceptedCourseCodes` makes the existing `includes()` check work)
- Verifying actual transcript format (dotted vs non-dotted) — the approach handles both

## Risks

- The `numericPart` heuristic (`Math.floor(num/10000)*100`) is approximate. ME303→ME.20005 would yield level 200, not 300. This only matters if a bucket has `minimumLevel: 300` — unlikely for the courses in question, and explicit code matching (via enrichment) is the primary match path.
- If KAIST introduces more code changes beyond the 19 pairs, the map needs manual extension. But it's a simple JSON file.

## Open Questions

None — all data is available from the reviewed DB.
