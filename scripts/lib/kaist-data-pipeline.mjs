import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

const DATASET_VERSION = "2026.03.09-wave3-code-equivalence";
const GENERATED_AT = "2026-03-09T00:00:00.000Z";
const SUPPORTED_DEPARTMENTS = ["AE", "ME", "CS", "EE"];
const SUPPORTED_PROGRAM_TYPES = ["심화전공", "복수전공", "부전공"];
const RULE_STATUSES = new Set(["explicit", "inferred", "manual-review-only"]);
const REVIEWED_SOURCE_IDS = {
  AE: "reviewed-interpretation-wave2-ae",
  ME: "reviewed-interpretation-wave2-me",
  CS: "reviewed-interpretation-wave2-cs",
  EE: "reviewed-interpretation-wave2-ee",
};

const INPUT_PATHS = {
  sourceManifest: path.join(ROOT, "references/kaist-data/raw/source-manifest.json"),
  courseCatalog: path.join(ROOT, "references/kaist-data/raw/course-catalog.raw.json"),
  codeEquivalenceMap: path.join(ROOT, "references/kaist-data/reviewed/code-equivalence-map.json"),
  reviewedDir: path.join(ROOT, "references/kaist-data/reviewed"),
};

const OUTPUT_PATHS = {
  courseCatalog: path.join(ROOT, "src/domain/generated/course-catalog.generated.json"),
  programRequirements: path.join(ROOT, "src/domain/generated/program-requirements.generated.json"),
  supportManifest: path.join(ROOT, "src/domain/generated/support-manifest.generated.json"),
};

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function stableSortObjects(items, keyFn) {
  return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b), "en"));
}

function upper(code) {
  return String(code).trim().toUpperCase();
}

export function deriveLevel(code) {
  const match = upper(code).match(/(\d+)/);
  if (!match) {
    return 0;
  }

  const num = Number(match[1]);
  if (num >= 10000) {
    return Math.floor(num / 10000) * 100;
  }

  return Math.floor(num / 100) * 100;
}

function expandFiveDigitCourseCodeVariants(code) {
  const normalized = upper(code);
  const match = normalized.match(/^([A-Z]+)\.?(\d{5})$/);
  if (!match) {
    return [normalized];
  }

  return uniqueSorted([`${match[1]}.${match[2]}`, `${match[1]}${match[2]}`]);
}

export function buildCodeEquivalenceLookup(codeEquivalenceMap) {
  const lookup = new Map();

  const addLookupEntry = (code, equivalents) => {
    const key = upper(code);
    const merged = uniqueSorted([
      ...(lookup.get(key) ?? []),
      ...equivalents.map(upper).filter((equivalent) => equivalent && equivalent !== key),
    ]);

    if (merged.length > 0) {
      lookup.set(key, merged);
    }
  };

  for (const pair of codeEquivalenceMap.pairs ?? []) {
    const oldCode = upper(pair.old);
    const newVariants = expandFiveDigitCourseCodeVariants(pair.new);

    addLookupEntry(oldCode, newVariants);

    for (const newVariant of newVariants) {
      addLookupEntry(newVariant, [oldCode, ...newVariants.filter((code) => code !== newVariant)]);
    }
  }

  return lookup;
}

function enrichCourseCodes(codes, codeEquivalenceLookup) {
  return uniqueSorted(
    (codes ?? []).map(upper).flatMap((code) => [code, ...(codeEquivalenceLookup.get(code) ?? [])]),
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadReviewedInterpretations(reviewedDir) {
  const files = (await readdir(reviewedDir))
    .filter((fileName) => fileName.endsWith(".reviewed.json"))
    .sort();

  const reviewed = await Promise.all(files.map((fileName) => readJson(path.join(reviewedDir, fileName))));
  return stableSortObjects(reviewed, (entry) => entry.department);
}

function normalizeCourse(course) {
  return {
    canonicalCode: upper(course.canonicalCode),
    aliases: uniqueSorted((course.aliases ?? []).map(upper)),
    nameKo: course.nameKo,
    nameEn: course.nameEn,
    offeringDepartments: uniqueSorted((course.offeringDepartments ?? []).map(upper)),
    observedYears: [...new Set(course.observedYears ?? [])].sort((a, b) => a - b),
    observedSemesters: [...new Set(course.observedSemesters ?? [])],
    rawCategoryLabels: uniqueSorted(course.rawCategoryLabels ?? []),
    level: deriveLevel(course.canonicalCode),
    crossListings: uniqueSorted((course.crossListings ?? []).map(upper)),
    sourceRefs: uniqueSorted(course.sourceRefs ?? []),
  };
}

function buildSupportEntries(reviewedInterpretations) {
  return stableSortObjects(
    reviewedInterpretations.flatMap((departmentEntry) =>
      departmentEntry.slices.map((slice) => ({
        department: departmentEntry.department,
        admissionYearRange: slice.admissionYearRange,
        supportedProgramTypes: [...slice.programTypes],
        supportStatus: slice.runtimeSupportStatus,
        knownLimitations: [...new Set(slice.supportLimitations ?? [])],
        sourceRefs: uniqueSorted([
          REVIEWED_SOURCE_IDS[departmentEntry.department],
          "reviewed-interpretation-wave2-notes",
        ]),
      })),
    ),
    (entry) => `${entry.department}-${entry.admissionYearRange.join("-")}`,
  );
}

function buildProgramSourceRefs(department, includeNotes = false) {
  return uniqueSorted([
    REVIEWED_SOURCE_IDS[department],
    ...(includeNotes ? ["reviewed-interpretation-wave2-notes"] : []),
  ]);
}

function deriveAllowedCategories(bucket) {
  if (bucket.id === "major-elective" || String(bucket.label).includes("전공선택")) {
    return ["전공선택"];
  }

  if (bucket.id === "advanced-major") {
    return (bucket.eligibleCourseCodes ?? []).length > 0 ? [] : ["전공선택"];
  }

  if (
    bucket.id === "major-total" ||
    bucket.id === "double-major-total" ||
    String(bucket.label).startsWith("전공 ") ||
    String(bucket.label).startsWith("복수전공 ") ||
    String(bucket.label).startsWith("부전공 ")
  ) {
    return ["전공필수", "전공선택"];
  }

  return [];
}

function deriveBucketManualReviewReason(program, bucket) {
  if (bucket.id === "advanced-major") {
    const advancedMajorSubtractionCase = (program.manualReviewOnlyCases ?? []).find(
      (manualReviewCase) => manualReviewCase.id === "advanced-major-subtraction",
    );

    if (advancedMajorSubtractionCase) {
      return advancedMajorSubtractionCase.reason;
    }
  }

  return undefined;
}

function extractCourseCodesFromText(value) {
  return uniqueSorted(
    String(value ?? "")
      .toUpperCase()
      .match(/[A-Z]+(?:\.\d+|\d+)/g) ?? [],
  );
}

function deriveManualReviewOnlyCourseCodes(program, bucket) {
  return uniqueSorted(
    (program.manualReviewOnlyCases ?? []).flatMap((manualReviewCase) => {
      const extractedCodes = uniqueSorted([
        ...extractCourseCodesFromText(manualReviewCase.label),
        ...extractCourseCodesFromText(manualReviewCase.reason),
      ]);

      if (extractedCodes.length === 0) {
        return [];
      }

      const caseText = `${manualReviewCase.id} ${manualReviewCase.label} ${manualReviewCase.reason}`.toLowerCase();
      const matchesEligibleCodes = extractedCodes.some((code) => (bucket.eligibleCourseCodes ?? []).map(upper).includes(code));
      const targetsMajorElective = bucket.id === "major-elective" && (caseText.includes("elective") || caseText.includes("전공선택"));
      const targetsResearch = bucket.id === "research" && (caseText.includes("research") || caseText.includes("연구"));

      return matchesEligibleCodes || targetsMajorElective || targetsResearch ? extractedCodes : [];
    }),
  );
}

function buildRuntimePrograms(reviewedInterpretations, codeEquivalenceLookup) {
  const programs = reviewedInterpretations.flatMap((departmentEntry) => {
    const ruleSetMap = new Map((departmentEntry.ruleSets ?? []).map((ruleSet) => [ruleSet.id, ruleSet]));

    return (departmentEntry.slices ?? []).flatMap((slice) => {
      if (slice.reviewedInterpretationStatus !== "reviewed") {
        return [];
      }

      const ruleSet = ruleSetMap.get(slice.ruleSetId);
      if (!ruleSet) {
        throw new Error(
          `Reviewed runtime slice is missing ruleSetId mapping: ${departmentEntry.department} ${slice.admissionYearRange.join("-")}`,
        );
      }

      const itemSourceRefs = buildProgramSourceRefs(departmentEntry.department);

      return (ruleSet.programs ?? []).map((program) => {
        const slotEquivalencies = (program.explicitEquivalencies ?? []).filter(
          (equivalency) => equivalency.appliesTo === "required-course-slot",
        );

        const requiredCourseSlots = (program.requiredCourseSlots ?? []).map((slot) => {
          const canonicalCode = upper(slot.acceptedCourseCodes?.[0] ?? "");
          const equivalentCodes = slotEquivalencies
            .filter((equivalency) => upper(equivalency.canonicalCourseCode) === canonicalCode)
            .flatMap((equivalency) => equivalency.acceptedCourseCodes ?? []);

          return {
            id: slot.id,
            label: slot.label,
            canonicalCode,
            acceptedCourseCodes: enrichCourseCodes(
              [...(slot.acceptedCourseCodes ?? []).map(upper), ...equivalentCodes.map(upper)],
              codeEquivalenceLookup,
            ),
            sourceRefs: itemSourceRefs,
          };
        });

        const slotIdByCanonicalCode = new Map(
          requiredCourseSlots.map((slot) => [slot.canonicalCode, slot.id]),
        );

        return {
          department: departmentEntry.department,
          admissionYearRange: slice.admissionYearRange,
          programType: program.programType,
          displayName: `${departmentEntry.displayName} ${program.programType}`,
          supportStatus: "supported",
          requiredCourseSlots,
          creditBuckets: (program.eligibleCreditBuckets ?? []).map((bucket) => ({
            id: bucket.id,
            label: bucket.label,
            requiredCredits: bucket.requiredCredits ?? 0,
            requiredCourseCount: bucket.requiredCourseCount,
            eligiblePrefixes: uniqueSorted((bucket.eligiblePrefixes ?? []).map(upper)),
            minimumLevel: bucket.minimumLevel ?? 0,
            allowedCategories: deriveAllowedCategories(bucket),
            eligibleCourseCodes: enrichCourseCodes(bucket.eligibleCourseCodes ?? [], codeEquivalenceLookup),
            excludedCourseCodes: [],
            manualReviewOnlyCourseCodes: deriveManualReviewOnlyCourseCodes(program, bucket),
            manualReviewOnlyReason: deriveBucketManualReviewReason(program, bucket),
            sourceRefs: itemSourceRefs,
          })),
          equivalencies: (program.explicitEquivalencies ?? []).map((equivalency) => ({
            slotId:
              equivalency.appliesTo === "required-course-slot"
                ? (slotIdByCanonicalCode.get(upper(equivalency.canonicalCourseCode)) ?? equivalency.appliesTo)
                : equivalency.appliesTo,
            canonicalCode: upper(equivalency.canonicalCourseCode),
            equivalentCodes: uniqueSorted((equivalency.acceptedCourseCodes ?? []).map(upper)),
            note: equivalency.label,
            sourceRefs: itemSourceRefs,
          })),
          knownLimitations: uniqueSorted(
            (program.manualReviewOnlyCases ?? []).map((manualReviewCase) => manualReviewCase.reason).filter(Boolean),
          ),
          sourceRefs: buildProgramSourceRefs(departmentEntry.department, true),
        };
      });
    });
  });

  return stableSortObjects(
    programs,
    (program) => `${program.department}-${program.admissionYearRange.join("-")}-${program.programType}`,
  );
}

function validateReviewedInterpretations(reviewedInterpretations, sourceManifest) {
  const issues = [];
  const sourceIds = new Set(sourceManifest.sources.map((source) => source.sourceId));
  const seenDepartments = new Set();

  for (const departmentEntry of reviewedInterpretations) {
    if (!SUPPORTED_DEPARTMENTS.includes(departmentEntry.department)) {
      issues.push(`Unsupported reviewed department: ${departmentEntry.department}`);
      continue;
    }
    if (seenDepartments.has(departmentEntry.department)) {
      issues.push(`Duplicate reviewed department entry: ${departmentEntry.department}`);
    }
    seenDepartments.add(departmentEntry.department);

    const ruleSetMap = new Map((departmentEntry.ruleSets ?? []).map((ruleSet) => [ruleSet.id, ruleSet]));
    const coveredYears = new Set();

    for (const slice of departmentEntry.slices ?? []) {
      const [startYear, endYear] = slice.admissionYearRange ?? [];
      if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear > endYear) {
        issues.push(`Invalid reviewed slice year range: ${departmentEntry.department} ${JSON.stringify(slice.admissionYearRange)}`);
        continue;
      }

      for (let year = startYear; year <= endYear; year += 1) {
        if (year < 2019 || year > 2025) {
          issues.push(`Reviewed slice year out of scope: ${departmentEntry.department} ${startYear}-${endYear}`);
          continue;
        }
        if (coveredYears.has(year)) {
          issues.push(`Overlapping reviewed slice year: ${departmentEntry.department} ${year}`);
        }
        coveredYears.add(year);
      }

      const programTypes = uniqueSorted(slice.programTypes ?? []);
      if (JSON.stringify(programTypes) !== JSON.stringify([...SUPPORTED_PROGRAM_TYPES].sort())) {
        issues.push(`Reviewed slice must cover all supported program types: ${departmentEntry.department} ${startYear}-${endYear}`);
      }

      if (!["limited", "reviewed"].includes(slice.reviewedInterpretationStatus)) {
        issues.push(`Unsupported reviewedInterpretationStatus: ${departmentEntry.department} ${startYear}-${endYear}`);
      }

      if (!["supported", "partial", "common-only"].includes(slice.runtimeSupportStatus)) {
        issues.push(`Unsupported runtimeSupportStatus: ${departmentEntry.department} ${startYear}-${endYear} -> ${slice.runtimeSupportStatus}`);
      }

      if (slice.runtimeSupportStatus === "supported" && slice.reviewedInterpretationStatus !== "reviewed") {
        issues.push(`Supported runtime slice must have reviewed interpretation status: ${departmentEntry.department} ${startYear}-${endYear}`);
      }

      if (slice.reviewedInterpretationStatus === "reviewed") {
        const ruleSet = ruleSetMap.get(slice.ruleSetId);
        if (!ruleSet) {
          issues.push(`Reviewed slice missing ruleSetId mapping: ${departmentEntry.department} ${startYear}-${endYear}`);
          continue;
        }

        for (const evidence of ruleSet.sourceEvidence ?? []) {
          if (evidence.year < startYear || evidence.year > endYear) {
            issues.push(
              `Reviewed rule set uses off-slice evidence: ${departmentEntry.department} ${startYear}-${endYear} -> ${ruleSet.id} uses ${evidence.slotKey}`,
            );
          }
        }

        const evidenceIds = new Set((ruleSet.sourceEvidence ?? []).map((evidence) => evidence.id));
        const programMap = new Map((ruleSet.programs ?? []).map((program) => [program.programType, program]));

        for (const programType of SUPPORTED_PROGRAM_TYPES) {
          const program = programMap.get(programType);
          if (!program) {
            issues.push(`Reviewed rule set missing program type: ${ruleSet.id} ${programType}`);
            continue;
          }

          for (const requiredSlot of program.requiredCourseSlots ?? []) {
            if (!RULE_STATUSES.has(requiredSlot.status)) {
              issues.push(`Unsupported rule status on required slot: ${ruleSet.id} ${programType} ${requiredSlot.id}`);
            }
            for (const evidenceId of requiredSlot.sourceEvidenceIds ?? []) {
              if (!evidenceIds.has(evidenceId)) {
                issues.push(`Unknown sourceEvidenceId on required slot: ${ruleSet.id} ${programType} ${requiredSlot.id} -> ${evidenceId}`);
              }
            }
          }

          for (const bucket of program.eligibleCreditBuckets ?? []) {
            if (!RULE_STATUSES.has(bucket.status)) {
              issues.push(`Unsupported rule status on bucket: ${ruleSet.id} ${programType} ${bucket.id}`);
            }
            for (const evidenceId of bucket.sourceEvidenceIds ?? []) {
              if (!evidenceIds.has(evidenceId)) {
                issues.push(`Unknown sourceEvidenceId on bucket: ${ruleSet.id} ${programType} ${bucket.id} -> ${evidenceId}`);
              }
            }
          }

          for (const equivalency of program.explicitEquivalencies ?? []) {
            if (!RULE_STATUSES.has(equivalency.status)) {
              issues.push(`Unsupported rule status on equivalency: ${ruleSet.id} ${programType} ${equivalency.id}`);
            }
            for (const evidenceId of equivalency.sourceEvidenceIds ?? []) {
              if (!evidenceIds.has(evidenceId)) {
                issues.push(`Unknown sourceEvidenceId on equivalency: ${ruleSet.id} ${programType} ${equivalency.id} -> ${evidenceId}`);
              }
            }
          }

          for (const manualReviewCase of program.manualReviewOnlyCases ?? []) {
            if (manualReviewCase.status !== "manual-review-only") {
              issues.push(`Manual review case must use manual-review-only status: ${ruleSet.id} ${programType} ${manualReviewCase.id}`);
            }
            for (const evidenceId of manualReviewCase.sourceEvidenceIds ?? []) {
              if (!evidenceIds.has(evidenceId)) {
                issues.push(`Unknown sourceEvidenceId on manual review case: ${ruleSet.id} ${programType} ${manualReviewCase.id} -> ${evidenceId}`);
              }
            }
          }
        }
      }
    }

    for (let year = 2019; year <= 2025; year += 1) {
      if (!coveredYears.has(year)) {
        issues.push(`Reviewed interpretation coverage gap: ${departmentEntry.department} ${year}`);
      }
    }

    const reviewedSourceId = REVIEWED_SOURCE_IDS[departmentEntry.department];
    if (!sourceIds.has(reviewedSourceId)) {
      issues.push(`Missing source manifest entry for reviewed interpretation: ${reviewedSourceId}`);
    }
  }

  for (const department of SUPPORTED_DEPARTMENTS) {
    if (!seenDepartments.has(department)) {
      issues.push(`Missing reviewed department entry: ${department}`);
    }
  }

  if (!sourceIds.has("reviewed-interpretation-wave2-notes")) {
    issues.push("Missing source manifest entry for reviewed-interpretation-wave2-notes");
  }

  return issues;
}

function validateDataset({ sources, courses, supportEntries, reviewedInterpretations }) {
  const issues = [];
  const sourceIds = new Set();
  const courseMap = new Map();
  const aliasMap = new Map();

  for (const source of sources) {
    if (!source.sourceId || sourceIds.has(source.sourceId)) {
      issues.push(`Duplicate or missing sourceId: ${source.sourceId ?? "<missing>"}`);
    }
    sourceIds.add(source.sourceId);
  }

  for (const course of courses) {
    if (courseMap.has(course.canonicalCode)) {
      issues.push(`Duplicate canonical course identifier: ${course.canonicalCode}`);
    }
    courseMap.set(course.canonicalCode, course);

    for (const alias of course.aliases) {
      const existing = aliasMap.get(alias);
      if (existing && existing !== course.canonicalCode) {
        issues.push(`Conflicting alias/equivalency mapping: ${alias} -> ${existing}, ${course.canonicalCode}`);
      }
      aliasMap.set(alias, course.canonicalCode);
    }

    for (const sourceRef of course.sourceRefs) {
      if (!sourceIds.has(sourceRef)) {
        issues.push(`Malformed source manifest reference on course ${course.canonicalCode}: ${sourceRef}`);
      }
    }
  }

  issues.push(...validateReviewedInterpretations(reviewedInterpretations, { sources }));

  for (const entry of supportEntries) {
    if (!SUPPORTED_DEPARTMENTS.includes(entry.department)) {
      issues.push(`Unsupported department in support manifest: ${entry.department}`);
    }
    if (!["supported", "partial", "common-only"].includes(entry.supportStatus)) {
      issues.push(`Unsupported support manifest status: ${entry.department} ${entry.admissionYearRange.join("-")} -> ${entry.supportStatus}`);
    }
    const supportedProgramTypes = uniqueSorted(entry.supportedProgramTypes ?? []);
    if (JSON.stringify(supportedProgramTypes) !== JSON.stringify([...SUPPORTED_PROGRAM_TYPES].sort())) {
      issues.push(`Support manifest missing supported track coverage: ${entry.department} ${entry.admissionYearRange.join("-")}`);
    }
    for (const sourceRef of entry.sourceRefs) {
      if (!sourceIds.has(sourceRef)) {
        issues.push(`Malformed source manifest reference on support entry ${entry.department}: ${sourceRef}`);
      }
    }
  }

  return issues;
}

export async function buildPlannerDataset() {
  const [sourceManifest, courseCatalogRaw, codeEquivalenceMap, reviewedInterpretations] = await Promise.all([
    readJson(INPUT_PATHS.sourceManifest),
    readJson(INPUT_PATHS.courseCatalog),
    readJson(INPUT_PATHS.codeEquivalenceMap),
    loadReviewedInterpretations(INPUT_PATHS.reviewedDir),
  ]);

  const sources = stableSortObjects(sourceManifest.sources, (source) => source.sourceId);
  const courses = stableSortObjects(courseCatalogRaw.courses.map(normalizeCourse), (course) => course.canonicalCode);
  const supportEntries = buildSupportEntries(reviewedInterpretations);
  const codeEquivalenceLookup = buildCodeEquivalenceLookup(codeEquivalenceMap);
  const programs = buildRuntimePrograms(reviewedInterpretations, codeEquivalenceLookup);
  const issues = validateDataset({ sources, courses, supportEntries, reviewedInterpretations });

  return {
    datasetVersion: DATASET_VERSION,
    generatedAt: GENERATED_AT,
    sources,
    courses,
    programs,
    supportEntries,
    issues,
  };
}

export async function writePlannerDataset(dataset) {
  await mkdir(path.dirname(OUTPUT_PATHS.courseCatalog), { recursive: true });
  await Promise.all([
    writeFile(
      OUTPUT_PATHS.courseCatalog,
      `${JSON.stringify({ datasetVersion: dataset.datasetVersion, generatedAt: dataset.generatedAt, courses: dataset.courses }, null, 2)}\n`,
    ),
    writeFile(
      OUTPUT_PATHS.programRequirements,
      `${JSON.stringify({ datasetVersion: dataset.datasetVersion, generatedAt: dataset.generatedAt, programs: dataset.programs }, null, 2)}\n`,
    ),
    writeFile(
      OUTPUT_PATHS.supportManifest,
      `${JSON.stringify({ datasetVersion: dataset.datasetVersion, generatedAt: dataset.generatedAt, entries: dataset.supportEntries }, null, 2)}\n`,
    ),
  ]);
}

export function formatValidationIssues(issues) {
  if (issues.length === 0) {
    return "Planner dataset validation passed.";
  }

  return `Planner dataset validation failed:\n- ${issues.join("\n- ")}`;
}

export { DATASET_VERSION, GENERATED_AT, INPUT_PATHS, OUTPUT_PATHS, ROOT, SUPPORTED_DEPARTMENTS, SUPPORTED_PROGRAM_TYPES };
