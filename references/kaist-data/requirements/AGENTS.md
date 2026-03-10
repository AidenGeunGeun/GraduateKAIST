# Requirements Data Guide

## Files in This Directory

| File | Purpose |
|------|---------|
| `registry.json` | Authoritative list of supported departments. Edit this to add a department. |
| `schema.json` | JSON Schema for `*.requirements.json` files. VS Code uses this for in-editor validation. |
| `source-provenance.json` | Provenance metadata for every source used to build the requirement rules. |
| `ae.requirements.json` | AE 항공우주공학과 graduation rules. |
| `cs.requirements.json` | CS 전산학부 graduation rules. |
| `me.requirements.json` | ME 기계공학과 graduation rules. |
| `ee.requirements.json` | EE 전기및전자공학부 graduation rules. |

## requirements.json Structure

Every `*.requirements.json` file MUST include `"$schema": "./schema.json"` as the first field so editors can validate it.

Top-level fields:

- `department` — uppercase department code (e.g., `"AE"`)
- `departmentNameKo` — official Korean name
- `source` — short description of the primary official source
- `yearGroups` — array of year-group objects (one per distinct rule set)

Each year group:

- `id` — stable unique string (e.g., `"ae-2016-2022"`) — referenced by `SAME_AS` shorthands
- `admissionYears` — explicit array of admission years covered (never use ranges implicitly)
- `totalCredits` — total credits required to graduate for this year group (may differ from common 138)
- `tracks` — object with keys `심화전공`, `복수전공`, `부전공`, `자유융합전공`

Minimal example:

```json
{
  "$schema": "./schema.json",
  "department": "AE",
  "departmentNameKo": "항공우주공학과",
  "source": "학과 공식 배포 PDF",
  "yearGroups": [
    {
      "id": "ae-2016-2022",
      "admissionYears": [2016, 2017, 2018, 2019, 2020, 2021, 2022],
      "totalCredits": 136,
      "tracks": {
        "심화전공": {
          "전공": { "전필": { "minCredits": 21, "courses": [] }, "전선": { "minCredits": 30 } },
          "심화전공": { "type": "subset_of_전선", "minCredits": 9, "eligibleOldCodes": [] },
          "연구": { "minCredits": 3 }
        },
        "복수전공": {
          "primaryMajor": {},
          "secondaryMajor": {}
        },
        "부전공": {
          "primaryMajor": {},
          "secondaryMajor": {}
        },
        "자유융합전공": {
          "primaryMajor": {}
        }
      }
    }
  ]
}
```

See existing files (`ae.requirements.json`, `cs.requirements.json`, etc.) for complete working examples.

## 심화전공 Types

Two models are used across the supported departments:

### `"type": "subset_of_전선"` — AE, CS

The 심화전공 bucket is satisfied by earning credits from a curated subset of 전선 courses.

- Requires `eligibleOldCodes` and/or `eligibleNewCodes` listing the allowed courses.
- AE: explicit list of 13 curated courses.
- CS: uses `"minimumCourseCredits": 3` filter instead of an explicit list — any 전선 course worth 3+ credits qualifies.

### `"type": "additional"` — ME, EE

The 심화전공 bucket is satisfied by 전선 credits earned beyond the required 전선 minimum.

- No course list needed; the analyzer computes: total 전선 earned − required 전선 minimum = 심화전공 candidate credits.
- Any 전선 course counts; there is no curated eligibility list.

## SAME_AS Shorthand

When a year group has identical track rules to another group, use the shorthand instead of duplicating:

```json
{
  "id": "ae-2023-plus",
  "admissionYears": [2023, 2024, 2025],
  "totalCredits": 138,
  "tracks": "SAME_AS_ae-2016-2022"
}
```

`"tracks"` must be the string `"SAME_AS_<id>"` where `<id>` is the `id` of a year group defined earlier in the same file. Credit thresholds (`totalCredits`) may still differ between groups that share the same track structure.

## Course Code Conventions

- Always include BOTH the old code (e.g., `"AE210"`) and the new code (e.g., `"AE21000"`) in pairs within arrays. Do not list only one form.
- `expandCodeVariants()` in `src/domain/configs/planner.ts` automatically generates dotted variants (`AE.21000`) at runtime. Do not add dotted codes manually to the JSON.
- To look up the new code for a Korean course name, use the lookup script (requires `courses.db` to be present):

```bash
node scripts/lookup-cais-codes.mjs "공기역학"
# example output: AE220 ↔ AE22000, with year/term offering history
```

## Provenance Rule

Every rule encoded in a `*.requirements.json` file MUST have a corresponding entry in `source-provenance.json`. Fields to include per entry:

- `sourceId` — stable unique identifier for the source document
- `department` — department code
- `admissionYearRange` — which years the rule applies to
- `ruleText` — the original rule text or a direct quote
- `inferred` — `true` if the rule is not stated explicitly but derived from context; `false` if explicit

If `"inferred": true`, the support status for that department MUST NOT be upgraded to `supported` based on that rule alone.
