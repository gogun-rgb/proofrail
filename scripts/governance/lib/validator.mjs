import fs from "node:fs";

import { FindingCollector, normalizeRegisteredFindings, resultFromFindings } from "./findings.mjs";
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
import { isSafeRelativeRepoPath, relativeRepoPath, resolveRepoPath } from "./path-utils.mjs";

const CONFIG_PATH = "governance/foundation.config.json";
const DEFAULT_REASON_CODE_REGISTRY_PATH = "governance/harness-reason-codes.json";
const REASON_CODE_REGISTRY_SCHEMA_PATH = "governance/harness-reason-codes.schema.json";

function configPathLocation(selector) {
  return `${CONFIG_PATH}#${selector}`;
}

function validateConfigRepositoryPaths(config, collector) {
  const invalid = new Set();

  const inspect = (selector, repoPath) => {
    if (typeof repoPath !== "string") return;
    if (isSafeRelativeRepoPath(repoPath)) return;

    invalid.add(selector);
    collector.add(
      "HARN_CONFIG_PATH_INVALID",
      configPathLocation(selector),
      "Configured repository path cannot be safely resolved inside the repository.",
      "Use a non-empty relative repository path without absolute roots, traversal, or null bytes.",
    );
  };

  if (Array.isArray(config?.requiredDocuments)) {
    config.requiredDocuments.forEach((documentPath, index) => inspect(`requiredDocuments[${index}]`, documentPath));
  }

  inspect("machineTaskContractSchema", config?.machineTaskContractSchema);
  inspect("harnessReasonCodeRegistry", config?.harnessReasonCodeRegistry);
  inspect("cleanAgentTestSpecification", config?.cleanAgentTestSpecification);
  inspect("architectureCheckPreparation", config?.architectureCheckPreparation);

  if (config?.generatedProjections && typeof config.generatedProjections === "object" && !Array.isArray(config.generatedProjections)) {
    for (const key of Object.keys(config.generatedProjections).sort()) {
      inspect(`generatedProjections.${key}`, config.generatedProjections[key]);
    }
  }

  return invalid;
}

function validateRequiredDocuments(root, config, collector, invalidConfigPaths) {
  for (const [index, documentPath] of (config.requiredDocuments ?? []).entries()) {
    if (invalidConfigPaths.has(`requiredDocuments[${index}]`)) continue;
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

  const configPath = CONFIG_PATH;
  const configSchemaPath = "governance/foundation.config.schema.json";
  const config = readJsonFile(root, configPath, collector);
  const configSchema = readJsonFile(root, configSchemaPath, collector);
  const invalidConfigPaths = validateConfigRepositoryPaths(config, collector);
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

  const registryPath =
    config?.harnessReasonCodeRegistry && !invalidConfigPaths.has("harnessReasonCodeRegistry")
      ? config.harnessReasonCodeRegistry
      : DEFAULT_REASON_CODE_REGISTRY_PATH;
  const registry = readJsonFile(root, registryPath, collector);
  const registrySchema = readJsonFile(root, REASON_CODE_REGISTRY_SCHEMA_PATH, collector);
  const registryState = validateReasonCodeRegistry({
    registry,
    registryPath,
    registrySchema,
    collector,
  });

  if (config && configValid) {
    validateRequiredDocuments(root, config, collector, invalidConfigPaths);
    validateActivePlan(root, config, collector);

    if (!invalidConfigPaths.has("machineTaskContractSchema")) {
      const mtcSchema = readJsonFile(root, config.machineTaskContractSchema, collector);
      if (mtcSchema) {
        validateMachineTaskContractSchemaConstants(mtcSchema, config.machineTaskContractSchema, collector);
        validateTaskContractInstances(root, mtcSchema, collector);
      }
    }

    validateCanonicalSets(root, config, collector);
    const authorityProjection = validateDocumentationAuthorityIndex(root, collector);
    validateAgentsAuthorityRoutes(root, authorityProjection, collector);
    if (![...invalidConfigPaths].some((selector) => selector.startsWith("generatedProjections."))) {
      validateProjectionFreshness(root, config, collector);
    }
  }

  validateMarkdownLinks(root, collector);
  validateIdentityHygiene(root, collector);
  collector.addMany(additionalFindings);

  return resultFromFindings(normalizeRegisteredFindings(collector.list(), registryState));
}
