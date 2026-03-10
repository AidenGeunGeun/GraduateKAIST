import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "references", "kaist-data", "requirements", "registry.json");
const OUTPUT_DIR = path.join(ROOT, "src", "domain", "generated");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "departments.generated.ts");

function main() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const departments = registry.departments;

  if (!Array.isArray(departments) || departments.length === 0) {
    throw new Error("registry.json must contain a non-empty departments array");
  }

  const supportedDepartments = departments.map((department) => department.code);
  const departmentLabels = Object.fromEntries(
    departments.map((department) => [
      department.code,
      {
        labelKo: department.labelKo,
        labelShort: department.labelShort,
      },
    ]),
  );

  const output = `export const SUPPORTED_DEPARTMENTS = ${JSON.stringify(supportedDepartments)} as const;\n\nexport type SupportedDepartment = (typeof SUPPORTED_DEPARTMENTS)[number];\n\nexport const DEPARTMENT_LABELS: Record<string, { labelKo: string; labelShort: string }> = ${JSON.stringify(
    departmentLabels,
    null,
    2,
  )};\n`;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, output);
  console.log(`Generated ${departments.length} departments at ${OUTPUT_PATH}`);
}

main();
