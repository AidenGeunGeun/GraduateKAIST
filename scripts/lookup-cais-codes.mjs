import path from "node:path";
import process from "node:process";

import Database from "better-sqlite3";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "references", "kaist-data", "courses.db");

const ME_REQUIRED_NAMES = ["기계기초실습", "기계공학실험", "창의적시스템구현", "공학설계"];
const ME_BASIS_NAMES = [
  "고체역학",
  "동역학",
  "시스템모델링및제어",
  "열역학",
  "열전달",
  "유체역학",
  "응용전자공학",
  "재료와가공의이해",
  "진동공학",
];
const AE_ADVANCED_OLD_CODES = [
  "AE321",
  "AE331",
  "AE401",
  "AE405",
  "AE409",
  "AE410",
  "AE420",
  "AE435",
  "AE450",
  "AE455",
  "AE480",
  "AE492",
  "AE493",
];

function printSection(title, rows) {
  console.log(`\n[${title}]`);
  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
}

function main() {
  const db = new Database(DB_PATH, { readonly: true });

  try {
    const lookupByName = db.prepare(`
      SELECT DISTINCT old_code AS oldCode, new_code AS newCode, title_ko AS titleKo, credits, dept_name_ko AS deptNameKo
      FROM courses
      WHERE dept_name_ko LIKE @deptName
        AND title_ko LIKE @title
      ORDER BY year DESC, term DESC, new_code, old_code
    `);

    printSection(
      "ME required candidates",
      ME_REQUIRED_NAMES.flatMap((name) => lookupByName.all({ deptName: "%기계%", title: `%${name}%` })),
    );

    printSection(
      "ME basis candidates",
      ME_BASIS_NAMES.flatMap((name) => lookupByName.all({ deptName: "%기계%", title: `%${name}%` })),
    );

    const aeAdvanced = db
      .prepare(`
        SELECT DISTINCT old_code AS oldCode, new_code AS newCode, title_ko AS titleKo, credits
        FROM courses
        WHERE old_code IN (${AE_ADVANCED_OLD_CODES.map(() => "?").join(", ")})
           OR new_code IN (${AE_ADVANCED_OLD_CODES.map(() => "?").join(", ")})
        ORDER BY old_code, new_code
      `)
      .all(...AE_ADVANCED_OLD_CODES, ...AE_ADVANCED_OLD_CODES);

    printSection("AE advanced-major codes", aeAdvanced);
  } finally {
    db.close();
  }
}

main();
