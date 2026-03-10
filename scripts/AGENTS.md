# Scripts Guide

These scripts maintain the data pipeline between the KAIST source systems and the graduation planner's generated artifacts. All scripts are Node.js ESM (`.mjs`). None of them run at app runtime — they are offline data tools only.

## Scripts

### `scrape-cais.mjs`

Scrapes KAIST CAIS (`https://cais.kaist.ac.kr/totalOpeningCourse`) and populates `references/kaist-data/courses.db`.

- Uses a direct POST request first; falls back to the ERP endpoint if that fails.
- Run when the CAIS data needs refreshing (e.g., a new academic year starts or a new term opens).
- Output:
  - `references/kaist-data/courses.db` — SQLite database (gitignored)
  - `references/kaist-data/cais-raw/` — raw export files (gitignored)

```bash
npm run db:scrape
```

### `generate-course-catalog.mjs`

Reads `courses.db` and writes `src/domain/generated/course-catalog.generated.json`.

- Output contains AE/ME/CS/EE courses only, with both old and new codes per row.
- Run after scraping or whenever the supported-department course list changes.
- The generated file is committed to the repo — do not hand-edit it.

```bash
node scripts/generate-course-catalog.mjs
```

### `generate-departments.mjs`

Reads `references/kaist-data/requirements/registry.json` and writes `src/domain/generated/departments.generated.ts`.

- Updates the `SupportedDepartment` union type and `DEPARTMENT_LABELS` map automatically.
- Run whenever `registry.json` is modified (i.e., after adding or removing a department).
- The generated file is committed to the repo — do not hand-edit it.

```bash
npm run generate:depts
```

### `lookup-cais-codes.mjs`

Interactive lookup tool. Given a Korean course name (full or partial), returns matching rows from `courses.db` with both old and new codes and offering history.

Use this when authoring `*.requirements.json` to find the correct course codes before adding them to an `eligibleOldCodes` / `eligibleNewCodes` list.

```bash
node scripts/lookup-cais-codes.mjs "공기역학"
# example output: AE220 <-> AE22000  (2019봄, 2020봄, 2021봄, ...)
```

Requires `courses.db` to be present (run `npm run db:scrape` first if missing).

## Package.json Scripts Reference

| npm script | What it runs |
|------------|--------------|
| `npm run db:scrape` | `scrape-cais.mjs` |
| `npm run db:generate` | `generate-course-catalog.mjs` then `generate-departments.mjs` |
| `npm run generate:depts` | `generate-departments.mjs` only |
| `npm run test:run` | `vitest run` (all domain tests) |
| `npm run build` | `next build` (production build check) |

## Typical Workflow When Adding a Department

1. `npm run db:scrape` — ensure `courses.db` is current.
2. `node scripts/lookup-cais-codes.mjs "<course name>"` — look up codes for required/eligible courses.
3. Author `references/kaist-data/requirements/[DEPT].requirements.json`.
4. Edit `references/kaist-data/requirements/registry.json` to register the department.
5. `npm run generate:depts` — regenerate `departments.generated.ts`.
6. `npm run db:generate` — regenerate `course-catalog.generated.json` if the new department needs catalog entries.
7. `npx vitest run && npx next build` — both must pass before the department is considered integrated.
