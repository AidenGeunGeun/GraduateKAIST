import { buildPlannerDataset, formatValidationIssues, writePlannerDataset } from "./lib/kaist-data-pipeline.mjs";

const dataset = await buildPlannerDataset();

if (dataset.issues.length > 0) {
  console.error(formatValidationIssues(dataset.issues));
  process.exit(1);
}

await writePlannerDataset(dataset);

console.log(`Generated planner dataset ${dataset.datasetVersion} at ${dataset.generatedAt}`);
console.log(`- Courses: ${dataset.courses.length}`);
console.log(`- Programs: ${dataset.programs.length}`);
console.log(`- Support entries: ${dataset.supportEntries.length}`);
