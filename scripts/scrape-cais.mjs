import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import Database from "better-sqlite3";
import XLSX from "xlsx";

const ROOT = process.cwd();
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const TERMS = [1, 2, 3, 4];
const CAIS_URL = "https://cais.kaist.ac.kr/totalOpeningCourse";
const ERP_URL = "https://erp.kaist.ac.kr/com/lgin/SsoCtr/initExtPageWork.do?link=estblSubjt";
const RAW_DIR = path.join(ROOT, "references", "kaist-data", "cais-raw");
const DB_PATH = path.join(ROOT, "references", "kaist-data", "courses.db");
const MANIFEST_PATH = path.join(ROOT, "references", "kaist-data", "SCRAPE-MANIFEST.json");
const SESSION_PREFIX = `erp-course-scrape-${Date.now()}`;
const MAX_BUFFER = 1024 * 1024 * 256;

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function browser(args, session) {
  return run("agent-browser", [...args, "--session", session]);
}

function trimOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toEnglishFlag(value) {
  return trimOrNull(value) === "1" ? 1 : 0;
}

function parseCodeshareInfo(row) {
  const parts = [];
  const codeshare = trimOrNull(row.cnrsSubjtYn);
  const mutual = trimOrNull(row.mtltyRcognSubjcYn);

  if (codeshare) {
    parts.push(codeshare);
  }

  if (mutual === "1") {
    parts.push("상호인정");
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

function parseCourseRows(stdout) {
  const serialized = JSON.parse(stdout);
  return JSON.parse(serialized);
}

async function probeDirectCais() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(CAIS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        processType: "excel",
        strYear: "2025",
        strTerm: "1",
        strCourseTitle: "%",
      }),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("excel") || contentType.includes("spreadsheet");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function firstValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }

  return null;
}

function parseDirectWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });

  return rows.map((row) => ({
    syy: firstValue(row, ["개설년도", "Year"]) ?? "",
    smtDivCd: firstValue(row, ["개설학기코드", "SemesterCode"]) ?? "",
    smtDivNm: firstValue(row, ["개설학기", "Semester"]) ?? "",
    deprtCd: firstValue(row, ["개설학과코드", "Department Code"]) ?? "",
    deprtNm: firstValue(row, ["개설학과", "Department"]) ?? "",
    subjcDivCd: firstValue(row, ["과목구분코드", "Course Type Code"]) ?? "",
    subjcDivNm: firstValue(row, ["과목구분", "Course Type"]) ?? "",
    subjtCd: firstValue(row, ["Course Code", "교과목코드"]) ?? "",
    subjtNo: firstValue(row, ["Course no.", "과목번호"]) ?? "",
    corseDvclsNo: firstValue(row, ["Section", "분반"]) ?? "",
    subjtNm: firstValue(row, ["교과목명", "Course Name"]) ?? "",
    cdt: firstValue(row, ["학점", "Credits"]) ?? "",
    actvtUnitHrs: firstValue(row, ["AU"]) ?? "",
    englSubjtYn: firstValue(row, ["영어강의", "English"]) ?? "0",
    altntSubjtYn: firstValue(row, ["대체과목", "Substitute"]) ?? "",
    cnrsSubjtYn: firstValue(row, ["공유과목", "Codeshare"]) ?? "",
    mtltyRcognSubjcYn: firstValue(row, ["상호인정", "Mutual Recognition"]) ?? "",
    chrgInstrNmLisup: firstValue(row, ["담당교수", "Instructor"]) ?? "",
  }));
}

async function fetchDirectCaisRows(year, term) {
  const response = await fetch(CAIS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      processType: "excel",
      strYear: String(year),
      strTerm: String(term),
      strCourseTitle: "%",
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("excel") && !contentType.includes("spreadsheet")) {
    throw new Error(`CAIS direct response was not an Excel file for ${year}-${term}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { rows: parseDirectWorkbook(buffer), buffer };
}

function openBrowserSession(session) {
  browser(["open", ERP_URL], session);
  browser(["wait", "3000"], session);
}

function closeBrowserSession(session) {
  try {
    browser(["close"], session);
  } catch {
    // ignore cleanup errors
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isFutureUnavailableTerm(year, term) {
  return year === 2026 && term > 1;
}

function getSearchDefaults() {
  const session = `${SESSION_PREFIX}-defaults`;
  const script = [
    "(() => {",
    "  const app = cpr.core.Platform.INSTANCE.getAllRunningAppInstances().find((instance) => instance.app && instance.app.id === 'contents/sch/sles/slesse/slesse1400');",
    "  const dm = app.lookup('dmCond');",
    "  return {",
    "    deptCd: dm.getValue('deptCd'),",
    "    lwprtInclsYn: dm.getValue('lwprtInclsYn'),",
    "    subjtCrseDivCd: dm.getValue('subjtCrseDivCd'),",
    "    subjcDivCd: dm.getValue('subjcDivCd'),",
    "  };",
    "})()",
  ].join("\n");

  openBrowserSession(session);

  try {
    return JSON.parse(browser(["eval", script], session));
  } finally {
    closeBrowserSession(session);
  }
}

function fetchTermRows(year, term, defaults, session) {
  const script = [
    "(async () => {",
    "  const app = cpr.core.Platform.INSTANCE.getAllRunningAppInstances().find((instance) => instance.app && instance.app.id === 'contents/sch/sles/slesse/slesse1400');",
    "  const dm = app.lookup('dmCond');",
    "  const ds = app.lookup('dsSles205');",
    `  dm.setValue('syy', '${year}');`,
    `  dm.setValue('smtDivCd', '${term}');`,
    `  dm.setValue('deptCd', ${JSON.stringify(defaults.deptCd ?? "")});`,
    `  dm.setValue('lwprtInclsYn', ${JSON.stringify(defaults.lwprtInclsYn ?? "")});`,
    `  dm.setValue('subjtCrseDivCd', ${JSON.stringify(defaults.subjtCrseDivCd ?? "")});`,
    `  dm.setValue('subjcDivCd', ${JSON.stringify(defaults.subjcDivCd ?? "")});`,
    "  dm.setValue('subjtNm', '');",
    "  dm.setValue('fromCdt', '');",
    "  dm.setValue('toCdt', '');",
    "  dm.setValue('englSubjtYn', '');",
    "  dm.setValue('subjtCd', '');",
    "  dm.setValue('chrgNm', '');",
    "  dm.setValue('fromAtnlcPercpCnt', '');",
    "  dm.setValue('toAtnlcPercpCnt', '');",
    "  ds.clear();",
    "  app.lookup('btn_search').click();",
    "  await new Promise((resolve) => {",
    "    const started = Date.now();",
    "    const timer = setInterval(() => {",
    "      if (ds.getRowCount() > 0 || Date.now() - started > 60000) {",
    "        clearInterval(timer);",
    "        resolve();",
    "      }",
    "    }, 250);",
    "  });",
    "  const rows = Array.from({ length: ds.getRowCount() }, (_, index) => ds.getRow(index).getRowData());",
    "  return JSON.stringify({ count: ds.getRowCount(), rows });",
    "})()",
  ].join("\n");

  return parseCourseRows(browser(["eval", script], session));
}

function createWorkbook(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "courses");
  return workbook;
}

function ensurePaths() {
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

function initializeDatabase() {
  const db = new Database(DB_PATH);
  db.exec(`
    DROP VIEW IF EXISTS unique_courses;
    DROP TABLE IF EXISTS courses;

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      term INTEGER NOT NULL,
      dept_code TEXT,
      dept_name_ko TEXT,
      course_type_code TEXT,
      course_type_name TEXT,
      old_code TEXT,
      new_code TEXT,
      section TEXT,
      title_ko TEXT,
      title_en TEXT,
      credits REAL,
      au REAL,
      is_english INTEGER DEFAULT 0,
      substitute_info TEXT,
      codeshare_info TEXT,
      instructor TEXT,
      scraped_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_old_code ON courses(old_code);
    CREATE INDEX IF NOT EXISTS idx_new_code ON courses(new_code);
    CREATE INDEX IF NOT EXISTS idx_dept ON courses(dept_code, dept_name_ko);
    CREATE INDEX IF NOT EXISTS idx_year_term ON courses(year, term);
    CREATE INDEX IF NOT EXISTS idx_title ON courses(title_ko);

    CREATE VIEW IF NOT EXISTS unique_courses AS
    SELECT
      COALESCE(new_code, old_code) AS canonical_code,
      old_code,
      new_code,
      title_ko,
      credits,
      dept_name_ko,
      course_type_code,
      course_type_name,
      MIN(year) AS first_offered,
      MAX(year) AS last_offered
    FROM courses
    WHERE old_code IS NOT NULL OR new_code IS NOT NULL
    GROUP BY COALESCE(new_code, old_code), title_ko;
  `);

  return db;
}

function insertRows(db, rows) {
  const insert = db.prepare(`
    INSERT INTO courses (
      year,
      term,
      dept_code,
      dept_name_ko,
      course_type_code,
      course_type_name,
      old_code,
      new_code,
      section,
      title_ko,
      title_en,
      credits,
      au,
      is_english,
      substitute_info,
      codeshare_info,
      instructor
    ) VALUES (
      @year,
      @term,
      @dept_code,
      @dept_name_ko,
      @course_type_code,
      @course_type_name,
      @old_code,
      @new_code,
      @section,
      @title_ko,
      @title_en,
      @credits,
      @au,
      @is_english,
      @substitute_info,
      @codeshare_info,
      @instructor
    )
  `);
  const transaction = db.transaction((records) => {
    for (const record of records) {
      insert.run(record);
    }
  });

  transaction(
    rows.map((row) => ({
      year: Number(row.syy),
      term: Number(row.smtDivCd),
      dept_code: trimOrNull(row.deprtCd),
      dept_name_ko: trimOrNull(row.deprtNm),
      course_type_code: trimOrNull(row.subjcDivCd),
      course_type_name: trimOrNull(row.subjcDivNm),
      old_code: trimOrNull(row.subjtNo),
      new_code: trimOrNull(row.subjtCd),
      section: trimOrNull(row.corseDvclsNo),
      title_ko: trimOrNull(row.subjtNm),
      title_en: null,
      credits: toNumber(row.cdt),
      au: toNumber(row.actvtUnitHrs),
      is_english: toEnglishFlag(row.englSubjtYn),
      substitute_info: trimOrNull(row.altntSubjtYn),
      codeshare_info: parseCodeshareInfo(row),
      instructor: trimOrNull(row.chrgInstrNmLisup),
    })),
  );
}

function collectStats(db) {
  const totalRows = db.prepare("SELECT COUNT(*) AS count FROM courses").get().count;
  const uniqueOldCodes = db.prepare("SELECT COUNT(DISTINCT old_code) AS count FROM courses WHERE old_code IS NOT NULL").get().count;
  const uniqueNewCodes = db.prepare("SELECT COUNT(DISTINCT new_code) AS count FROM courses WHERE new_code IS NOT NULL").get().count;
  const bothCodes = db.prepare(
    "SELECT COUNT(*) AS count FROM unique_courses WHERE old_code IS NOT NULL AND new_code IS NOT NULL",
  ).get().count;

  return {
    totalRows,
    uniqueOldCodes,
    uniqueNewCodes,
    bothCodes,
  };
}

function writeManifest(totalRows, usedDirectCais) {
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        scraped_at: localDateString(),
        years: YEARS,
        terms: TERMS,
        total_rows: totalRows,
        source: CAIS_URL,
        actualSource: usedDirectCais ? CAIS_URL : ERP_URL,
        skippedQueries: [
          { year: 2026, term: 2, reason: "future term not yet published" },
          { year: 2026, term: 3, reason: "future term not yet published" },
          { year: 2026, term: 4, reason: "future term not yet published" },
        ],
        note: usedDirectCais
          ? "Direct CAIS POST succeeded."
          : "Direct CAIS POST timed out from the local environment; used the official ERP offered-course page via browser automation.",
      },
      null,
      2,
    )}\n`,
  );
}

async function main() {
  ensurePaths();

  const directCaisWorked = await probeDirectCais();
  if (directCaisWorked) {
    console.log("Direct CAIS POST is reachable; direct fetch will be tried before ERP fallback.");
  } else {
    console.log("Direct CAIS POST timed out; using official ERP offered-course fallback.");
  }

  const db = initializeDatabase();
  let usedDirectCais = false;

  try {
    let defaults = null;
    let queryCount = 0;

    for (const year of YEARS) {
      for (const term of TERMS) {
        queryCount += 1;
        console.log(`Query ${queryCount}/32: ${year} term ${term}`);

        if (isFutureUnavailableTerm(year, term)) {
          console.log("  skipped: future term not yet published");
          continue;
        }

        let result = null;

        if (directCaisWorked) {
          try {
            const { rows, buffer } = await fetchDirectCaisRows(year, term);
            const rawPath = path.join(RAW_DIR, `${year}-${term}.xlsx`);
            writeFileSync(rawPath, buffer);
            insertRows(db, rows);
            usedDirectCais = true;
            console.log(`  rows: ${rows.length} (direct CAIS)`);
            continue;
          } catch (error) {
            console.warn(`  direct CAIS fetch failed, falling back to ERP: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (defaults === null) {
          defaults = getSearchDefaults();
        }

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const session = `${SESSION_PREFIX}-${year}-${term}-${attempt}`;

          try {
            openBrowserSession(session);
            result = fetchTermRows(year, term, defaults, session);
            closeBrowserSession(session);
            break;
          } catch (error) {
            closeBrowserSession(session);

            if (attempt === 3) {
              throw error;
            }

            console.warn(`  retry ${attempt}/3 failed, reopening browser session...`);
            await sleep(2000);
          }
        }

        const { count, rows } = result;
        const rawPath = path.join(RAW_DIR, `${year}-${term}.xlsx`);
        XLSX.writeFile(createWorkbook(rows), rawPath);
        insertRows(db, rows);
        console.log(`  rows: ${count}`);
      }
    }
  } finally {
    db.close();
  }

  const readDb = new Database(DB_PATH, { readonly: true });
  try {
    const stats = collectStats(readDb);
    writeManifest(stats.totalRows, usedDirectCais);
    console.log(`Scraped 2019-2026 (32 term queries)`);
    console.log(`Total rows inserted: ${stats.totalRows}`);
    console.log(`Unique old codes: ${stats.uniqueOldCodes}`);
    console.log(`Unique new codes: ${stats.uniqueNewCodes}`);
    console.log(`Courses with both old and new codes: ${stats.bothCodes}`);
  } finally {
    readDb.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
