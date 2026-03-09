import { writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import Database from "better-sqlite3";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "references", "kaist-data", "courses.db");
const OUTPUT_PATH = path.join(ROOT, "src", "domain", "generated", "course-catalog.generated.json");
const PREFIXES = ["AE", "ME", "CS", "EE"];

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function hasSupportedPrefix(code) {
  if (!code) {
    return false;
  }

  return PREFIXES.some((prefix) => String(code).startsWith(prefix));
}

function main() {
  const db = new Database(DB_PATH, { readonly: true });

  try {
    const rows = db
      .prepare(`
        SELECT canonical_code, old_code, new_code, title_ko, credits, dept_name_ko, course_type_code, course_type_name
        FROM unique_courses
        ORDER BY canonical_code, title_ko
      `)
      .all()
      .filter((row) => hasSupportedPrefix(row.old_code) || hasSupportedPrefix(row.new_code) || hasSupportedPrefix(row.canonical_code))
      .map((row) => ({
        oldCode: row.old_code,
        newCode: row.new_code,
        titleKo: row.title_ko,
        credits: row.credits,
        deptNameKo: row.dept_name_ko,
        courseTypeCode: row.course_type_code,
        courseTypeName: row.course_type_name,
      }));

    writeFileSync(
      OUTPUT_PATH,
      `${JSON.stringify(
        {
          generatedAt: localDateString(),
          source: "CAIS scrape 2019-2026",
          courses: rows,
        },
        null,
        2,
      )}\n`,
    );

    console.log(`Generated ${rows.length} catalog rows at ${OUTPUT_PATH}`);
  } finally {
    db.close();
  }
}

main();
