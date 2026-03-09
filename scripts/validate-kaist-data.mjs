import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { ROOT, buildPlannerDataset, formatValidationIssues } from "./lib/kaist-data-pipeline.mjs";

const BULLETIN_INVENTORY_PATH = path.join(ROOT, "references/kaist-data/raw/bulletin-document-inventory.json");
const ERP_ROW_EVIDENCE_MAP_PATH = path.join(ROOT, "references/kaist-data/raw/erp-row-evidence-map.json");
const STREAMDOCS_METADATA_PATH = path.join(ROOT, "references/kaist-data/raw/streamdocs-metadata.json");
const RECONCILIATION_PATH = path.join(ROOT, "references/kaist-data/raw/source-truth-reconciliation.json");
const REVIEWED_DIR_PATH = path.join(ROOT, "references/kaist-data/reviewed");

const EXPECTED_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const EXPECTED_DEPARTMENTS = ["AE", "ME", "CS", "EE"];
const EXPECTED_DOCUMENT_TYPES = ["교과목이수요건", "교과목일람표", "교과목개요"];
const ALLOWED_SLOT_STATUSES = new Set(["captured", "missing", "needs-manual-recheck"]);
const WAVE_1_5_RECONCILIATION_SLOT_KEYS = [
  "2019:AE:교과목이수요건",
  "2019:AE:교과목일람표",
  "2019:AE:교과목개요",
  "2019:CS:교과목일람표",
  "2019:CS:교과목개요",
  "2019:EE:교과목일람표",
  "2019:EE:교과목개요",
  "2019:ME:교과목이수요건",
  "2019:ME:교과목일람표",
  "2019:ME:교과목개요",
  "2020:AE:교과목일람표",
  "2021:CS:교과목개요",
  "2021:ME:교과목개요",
  "2023:AE:교과목일람표",
  "2023:CS:교과목일람표",
  "2023:ME:교과목일람표",
  "2024:AE:교과목일람표",
];
const WAVE_1_5_ERP_SOURCE_IDS = [
  "erp-snapshot-2025-fall-AE-attempt",
  "erp-snapshot-2025-fall-ME-attempt",
  "erp-snapshot-2025-fall-CS-attempt",
  "erp-snapshot-2025-fall-EE-attempt",
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadReviewedInterpretations() {
  const files = (await readdir(REVIEWED_DIR_PATH)).filter((fileName) => fileName.endsWith(".reviewed.json")).sort();
  return Promise.all(files.map((fileName) => readJson(path.join(REVIEWED_DIR_PATH, fileName))));
}

function validateBulletinInventory(inventory) {
  const issues = [];
  const slotKeys = new Map();

  for (const entry of inventory.entries ?? []) {
    const key = `${entry.year}:${entry.department}:${entry.documentType}`;
    slotKeys.set(key, (slotKeys.get(key) ?? 0) + 1);

    if (!ALLOWED_SLOT_STATUSES.has(entry.collectionStatus)) {
      issues.push(`Unsupported bulletin slot status: ${key} -> ${entry.collectionStatus}`);
    }
    if (!entry.pageUrl) {
      issues.push(`Missing bulletin pageUrl: ${key}`);
    }
    if (entry.collectionStatus === "captured" && (!entry.viewerUrl || !entry.streamdocsId)) {
      issues.push(`Captured bulletin slot missing viewer provenance: ${key}`);
    }
    if (entry.collectionStatus === "missing" && (entry.viewerUrl || entry.streamdocsId)) {
      issues.push(`Missing bulletin slot still carries viewer provenance: ${key}`);
    }
    if (entry.viewerUrl && !entry.streamdocsId) {
      issues.push(`Bulletin slot has viewerUrl without streamdocsId: ${key}`);
    }
  }

  for (const year of EXPECTED_YEARS) {
    for (const department of EXPECTED_DEPARTMENTS) {
      for (const documentType of EXPECTED_DOCUMENT_TYPES) {
        const key = `${year}:${department}:${documentType}`;
        const count = slotKeys.get(key) ?? 0;
        if (count !== 1) {
          issues.push(`Bulletin slot matrix must contain exactly one entry for ${key}; found ${count}`);
        }
      }
    }
  }

  return issues;
}

function validateErpRowEvidenceMap(rowEvidenceMap) {
  const issues = [];
  const entries = rowEvidenceMap.entries ?? [];
  if (entries.length !== EXPECTED_DEPARTMENTS.length) {
    issues.push(`ERP row-evidence map must contain ${EXPECTED_DEPARTMENTS.length} department entries; found ${entries.length}`);
  }

  for (const department of EXPECTED_DEPARTMENTS) {
    const entry = entries.find((item) => item.department === department);
    if (!entry) {
      issues.push(`ERP row-evidence map missing department entry: ${department}`);
      continue;
    }
    if (!entry.springPrefixSourceId || !entry.fallAttemptSourceId) {
      issues.push(`ERP row-evidence map missing provenance refs for ${department}`);
    }
  }

  return issues;
}

function validateStreamdocsMetadata(inventory, streamdocsMetadata) {
  const issues = [];
  const metadataEntries = streamdocsMetadata.entries ?? {};

  for (const entry of inventory.entries ?? []) {
    const key = `${entry.year}:${entry.department}:${entry.documentType}`;
    if (entry.streamdocsId && !metadataEntries[entry.streamdocsId]) {
      issues.push(`Bulletin slot missing StreamDocs metadata entry: ${key} -> ${entry.streamdocsId}`);
    }
  }

  return issues;
}

function validateReconciliation(reconciliation, inventory) {
  const issues = [];
  const bulletinSlots = reconciliation.bulletinSlots ?? [];
  const inventoryMap = new Map((inventory.entries ?? []).map((entry) => [`${entry.year}:${entry.department}:${entry.documentType}`, entry]));
  const reconciliationMap = new Map();

  for (const entry of bulletinSlots) {
    const key = `${entry.year}:${entry.department}:${entry.documentType}`;
    if (reconciliationMap.has(key)) {
      issues.push(`Duplicate reconciliation bulletin slot: ${key}`);
      continue;
    }
    reconciliationMap.set(key, entry);

    const inventoryEntry = inventoryMap.get(key);
    if (!inventoryEntry) {
      issues.push(`Reconciliation bulletin slot missing from inventory: ${key}`);
      continue;
    }
    if (inventoryEntry.collectionStatus !== entry.currentStatus) {
      issues.push(`Reconciliation status mismatch for ${key}: reconciliation=${entry.currentStatus}, inventory=${inventoryEntry.collectionStatus}`);
    }
  }

  for (const key of WAVE_1_5_RECONCILIATION_SLOT_KEYS) {
    if (!reconciliationMap.has(key)) {
      issues.push(`Wave 1.5 reconciliation artifact missing bulletin slot: ${key}`);
    }
  }

  const erpSourceIds = new Set((reconciliation.erpProvenance ?? []).map((entry) => entry.sourceId));
  for (const sourceId of WAVE_1_5_ERP_SOURCE_IDS) {
    if (!erpSourceIds.has(sourceId)) {
      issues.push(`Wave 1.5 reconciliation artifact missing ERP provenance note: ${sourceId}`);
    }
  }

  return issues;
}

function validateReviewedInterpretationsAgainstCorpus(reviewedInterpretations, inventory, reconciliation) {
  const issues = [];
  const inventoryMap = new Map((inventory.entries ?? []).map((entry) => [`${entry.year}:${entry.department}:${entry.documentType}`, entry]));
  const reconciliationMap = new Map(
    (reconciliation.bulletinSlots ?? []).map((entry) => [`${entry.year}:${entry.department}:${entry.documentType}`, entry]),
  );

  const validateEvidence = (context, evidence, allowMissing) => {
    const inventoryEntry = inventoryMap.get(evidence.slotKey);
    if (!inventoryEntry) {
      issues.push(`Reviewed interpretation references unknown bulletin slot: ${context} -> ${evidence.slotKey}`);
      return;
    }

    const reconciliationEntry = reconciliationMap.get(evidence.slotKey);
    if (inventoryEntry.collectionStatus === "captured") {
      if (reconciliationEntry && reconciliationEntry.trustedForInterpretation === false) {
        issues.push(`Reviewed interpretation uses untrusted captured slot: ${context} -> ${evidence.slotKey}`);
      }
      if (typeof evidence.page !== "number" || evidence.page < 1) {
        issues.push(`Reviewed interpretation captured evidence must use 1-based page numbers: ${context} -> ${evidence.slotKey}:${evidence.page}`);
      }
      if (!evidence.excerpt || !String(evidence.excerpt).trim()) {
        issues.push(`Reviewed interpretation captured evidence missing excerpt text: ${context} -> ${evidence.slotKey}`);
      }
      return;
    }

    if (!allowMissing) {
      issues.push(`Reviewed interpretation rule evidence cannot point at non-captured slot: ${context} -> ${evidence.slotKey}`);
      return;
    }

    if (inventoryEntry.collectionStatus !== "missing") {
      issues.push(`Reviewed limited evidence must reference confirmed missing slots only: ${context} -> ${evidence.slotKey}`);
    }
  };

  for (const departmentEntry of reviewedInterpretations) {
    for (const boundary of departmentEntry.yearBoundaryAnalysis ?? []) {
      const allowMissing = boundary.status === "limited";
      for (const evidence of boundary.sourceEvidence ?? []) {
        validateEvidence(`${departmentEntry.department} year-boundary ${boundary.admissionYearRange.join("-")}`, evidence, allowMissing);
      }
    }

    for (const ruleSet of departmentEntry.ruleSets ?? []) {
      for (const evidence of ruleSet.sourceEvidence ?? []) {
        validateEvidence(`${departmentEntry.department} ruleSet ${ruleSet.id}`, evidence, false);
      }
    }
  }

  return issues;
}

const dataset = await buildPlannerDataset();
const [bulletinInventory, erpRowEvidenceMap, streamdocsMetadata, reconciliation, reviewedInterpretations] = await Promise.all([
  readJson(BULLETIN_INVENTORY_PATH),
  readJson(ERP_ROW_EVIDENCE_MAP_PATH),
  readJson(STREAMDOCS_METADATA_PATH),
  readJson(RECONCILIATION_PATH),
  loadReviewedInterpretations(),
]);

const rawIssues = [
  ...validateBulletinInventory(bulletinInventory),
  ...validateErpRowEvidenceMap(erpRowEvidenceMap),
  ...validateStreamdocsMetadata(bulletinInventory, streamdocsMetadata),
  ...validateReconciliation(reconciliation, bulletinInventory),
  ...validateReviewedInterpretationsAgainstCorpus(reviewedInterpretations, bulletinInventory, reconciliation),
];

if (dataset.issues.length > 0 || rawIssues.length > 0) {
  const parts = [];
  if (dataset.issues.length > 0) {
    parts.push(formatValidationIssues(dataset.issues));
  }
  if (rawIssues.length > 0) {
    parts.push(`Raw KAIST corpus validation failed:\n- ${rawIssues.join("\n- ")}`);
  }
  console.error(parts.join("\n\n"));
  process.exit(1);
}

console.log(`Validated planner dataset ${dataset.datasetVersion}`);
console.log(`- Courses: ${dataset.courses.length}`);
console.log(`- Programs: ${dataset.programs.length}`);
console.log(`- Support entries: ${dataset.supportEntries.length}`);
console.log(`- Bulletin slots: ${bulletinInventory.entries.length}`);
console.log(`- ERP row-evidence entries: ${erpRowEvidenceMap.entries.length}`);
