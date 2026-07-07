import fs from "node:fs";

import { FindingCollector, resultFromFindings, validateEmittedReasonCodes } from "./findings.mjs";
import { readJsonFile, readTextFile } from "./json-utils.mjs";
import { listFiles, validateMarkdownLinks } from "./markdown.mjs";
import {
  validateAgentsAuthorityRoutes,
  validateCanonicalSets,
  validateDocumentationAuthorityIndex,
  validateProjectionFreshness,
} from "./projections.mjs";
import { validateReasonCodeRegistry } from "./registry.mjs";
import {
  validateJsonAgainstSchema,
  validateMachineTaskContractSchemaConstants,
  validateTaskContractInstances,
} from "./schema-validation.mjs";
import { relativeRepoPath, resolveRepoPath } from "./path-utils.mjs";

function validateRequiredDocuments(root, config, collector) {
  for (const documentPath of config.requiredDocuments ?? []) {
    if (!fs.existsSync(resolveRepoPath(root, documentPath))) {
      collector.add(
        "HARN_REQUIRED_DOCUMENT_MISSING",
        documentPath,
        `Required document or governance artifact ${documentPath} is missing.`,
        "Restore the required path or update governance config through authorized Foundation work.",
      );
    }
  }
}

function validateActivePlan(root, config, collector) {
  const activePlanPath = "docs/plans/active/foundation-gate-mechanization.md";
  const activePlan = fs.existsSync(resolveRepoPath(root, activePlanPath)) ? readTextFile(root, activePlanPath) : "";
  if (!activePlan.includes(config.activeNextFoundationTask)) {
    collector.add(
      "HARN_ACTIVE_PLAN_MISSING_TASK",
      activePlanPath,
      `Active plan does not include next foundation task ${config.activeNextFoundationTask}.`,
      "Update the active plan or governance config so the next task is explicit.",
    );
  }
}

function validateIdentityHygiene(root, collector) {
  const identityPatterns = [/C[o]deAtlas/, /c[o]deatlas/, /files-mentioned-by-the-user-c[o]deatlas/];
  for (const file of listFiles(root)) {
    if (!isTextFile(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of identityPatterns) {
      if (pattern.test(content)) {
        collector.add(
          "HARN_IDENTITY_CONTAMINATION",
          relativeRepoPath(root, file),
          "Unexpected inherited identity text was found.",
          "Replace inherited identity text with Proofrail identity.",
        );
      }
    }
  }
}

function isTextFile(file) {
  return /\.(?:cjs|css|example|html|js|json|md|mjs|txt|yaml|yml)$/i.test(file) || /(?:^|[\\/])(?:package\.json|pnpm-lock\.yaml|\.gitignore)$/.test(file);
}

export function validateFoundation({ root = process.cwd(), additionalFindings = [] } = {}) {
  const collector = new FindingCollector();

  const configPath = "governance/foundation.config.json";
  const configSchemaPath = "governance/foundation.config.schema.json";
  const config = readJsonFile(root, configPath, collector);
  const configSchema = readJsonFile(root, configSchemaPath, collector);
  let configValid = false;

  if (config && configSchema) {
    configValid = validateJsonAgainstSchema({
      schema: configSchema,
      data: config,
      dataPath: configPath,
      collector,
      code: "HARN_CONFIG_SCHEMA_INVALID",
    });
  }

  const registryPath = config?.harnessReasonCodeRegistry ?? "governance/harness-reason-codes.json";
  const registry = readJsonFile(root, registryPath, collector);
  const registeredCodes = registry ? validateReasonCodeRegistry(registry, registryPath, collector) : new Set();

  if (config && configValid) {
    validateRequiredDocuments(root, config, collector);
    validateActivePlan(root, config, collector);

    const mtcSchema = readJsonFile(root, config.machineTaskContractSchema, collector);
    if (mtcSchema) {
      validateMachineTaskContractSchemaConstants(mtcSchema, config.machineTaskContractSchema, collector);
      validateTaskContractInstances(root, mtcSchema, collector);
    }

    validateCanonicalSets(root, config, collector);
    const authorityProjection = validateDocumentationAuthorityIndex(root, collector);
    validateAgentsAuthorityRoutes(root, authorityProjection, collector);
    validateProjectionFreshness(root, config, collector);
  }

  validateMarkdownLinks(root, collector);
  validateIdentityHygiene(root, collector);
  collector.addMany(additionalFindings);
  collector.addMany(validateEmittedReasonCodes(collector.list(), registeredCodes));

  return resultFromFindings(collector.list());
}
