import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { stableStringify } from "./json-utils.mjs";
import { extractSection, markdownLinks, readIfExists, slugifyHeading, splitMarkdownTarget } from "./markdown.mjs";
import { isExternalTarget, repoPathFromMarkdownTarget, resolveRepoPath } from "./path-utils.mjs";

export const CANONICAL_VERDICT_VALUES = ["ADMISSIBLE", "REVISION_REQUIRED", "REJECTED", "BLOCKED"];

const TERMINOLOGY_PATH = "docs/constitution/terminology.md";
const VERDICT_PATH = "docs/product/verdict-semantics.md";
const PRODUCT_CONSTITUTION_PATH = "docs/constitution/product-constitution.md";
const GENERATED_PROJECTION_PATHS = new Set([
  "governance/generated/canonical-terminology.json",
  "governance/generated/canonical-verdicts.json",
  "governance/generated/documentation-authority-index.json",
]);

function normalizedSectionDigest(section) {
  const normalized = `${section.replace(/\r\n/g, "\n").trimEnd()}\n`;
  return `sha256:${crypto.createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}

function headingsInSection(section, level) {
  const prefix = "#".repeat(level);
  return section
    .split(/\n/)
    .map((line) => {
      const match = new RegExp(`^${prefix}\\s+(.+?)\\s*$`).exec(line);
      return match ? match[1].trim().replace(/\s+#+$/, "") : null;
    })
    .filter(Boolean);
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function sameStringSet(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function setDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item)).sort();
}

export function extractCanonicalTerminology(root) {
  const content = readIfExists(root, TERMINOLOGY_PATH);
  const section = extractSection(content, "Canonical Terms");
  const terms = headingsInSection(section, 3);
  return {
    authority: TERMINOLOGY_PATH,
    section,
    terms,
    duplicates: duplicateValues(terms),
  };
}

export function extractCanonicalVerdicts(root) {
  const content = readIfExists(root, VERDICT_PATH);
  const section = extractSection(content, "Canonical Verdicts");
  const verdicts = headingsInSection(section, 3);
  return {
    authority: VERDICT_PATH,
    section,
    verdicts,
    duplicates: duplicateValues(verdicts),
  };
}

function markdownTableRows(section) {
  const tableLines = section.split(/\n/).filter((line) => /^\s*\|.*\|\s*$/.test(line));
  return tableLines
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length >= 3 && !cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}

function parseAuthorityTargets(cell) {
  if (cell === "This document") {
    return {
      targets: [{ label: "This document", path: PRODUCT_CONSTITUTION_PATH }],
      malformed: false,
    };
  }

  const links = markdownLinks(cell);
  if (links.length === 0) return { targets: [], malformed: true };

  const targets = [];
  let malformed = false;
  for (const link of links) {
    if (isExternalTarget(link.rawTarget)) {
      malformed = true;
      continue;
    }
    const { targetPath, anchor } = splitMarkdownTarget(link.rawTarget);
    if (!targetPath && !anchor) {
      malformed = true;
      continue;
    }
    targets.push({
      label: link.label,
      path: repoPathFromMarkdownTarget(PRODUCT_CONSTITUTION_PATH, targetPath),
      ...(anchor ? { anchor } : {}),
    });
  }

  return { targets, malformed };
}

export function extractDocumentationAuthorityIndex(root) {
  const content = readIfExists(root, PRODUCT_CONSTITUTION_PATH);
  const section = extractSection(content, "Documentation Authority Index");
  const rows = markdownTableRows(section);
  const dataRows = rows.filter((cells) => cells[0] !== "Topic");

  const topics = dataRows.map(([topic, authoritativeLocation, notes]) => {
    const { targets, malformed } = parseAuthorityTargets(authoritativeLocation);
    return {
      topic,
      authoritativeLocation,
      targets,
      notes,
      malformed,
    };
  });

  return {
    authority: PRODUCT_CONSTITUTION_PATH,
    section,
    topics,
    duplicates: duplicateValues(topics.map((row) => row.topic)),
  };
}

export function canonicalTerminologyProjection(root) {
  const extracted = extractCanonicalTerminology(root);
  return {
    schemaVersion: "1",
    projection: "canonical-terminology",
    authorityNotice: "Generated projection for mechanical governance checks only. Authoritative Markdown remains the source of authority.",
    sourceDocument: extracted.authority,
    sourceSection: "Canonical Terms",
    sourceDigest: normalizedSectionDigest(extracted.section),
    terms: extracted.terms.map((term) => ({ term, anchor: slugifyHeading(term) })),
  };
}

export function canonicalVerdictsProjection(root) {
  const extracted = extractCanonicalVerdicts(root);
  return {
    schemaVersion: "1",
    projection: "canonical-verdicts",
    authorityNotice: "Generated projection for mechanical governance checks only. Authoritative Markdown remains the source of authority.",
    sourceDocument: extracted.authority,
    sourceSection: "Canonical Verdicts",
    sourceDigest: normalizedSectionDigest(extracted.section),
    verdicts: extracted.verdicts.map((verdict) => ({ verdict, anchor: slugifyHeading(verdict) })),
  };
}

export function documentationAuthorityIndexProjection(root) {
  const extracted = extractDocumentationAuthorityIndex(root);
  return {
    schemaVersion: "1",
    projection: "documentation-authority-index",
    authorityNotice: "Generated projection for mechanical governance checks only. Authoritative Markdown remains the source of authority.",
    sourceDocument: extracted.authority,
    sourceSection: "Documentation Authority Index",
    sourceDigest: normalizedSectionDigest(extracted.section),
    topics: extracted.topics.map((row) => ({
      topic: row.topic,
      authoritativeLocation: row.authoritativeLocation,
      targets: row.targets,
      notes: row.notes,
    })),
  };
}

export function expectedProjections(root, config) {
  return [
    [config.generatedProjections.canonicalTerminology, canonicalTerminologyProjection(root)],
    [config.generatedProjections.canonicalVerdicts, canonicalVerdictsProjection(root)],
    [config.generatedProjections.documentationAuthorityIndex, documentationAuthorityIndexProjection(root)],
  ];
}

export function assertSafeProjectionOutputPaths(config) {
  const paths = Object.values(config.generatedProjections ?? {});
  const unsafe = paths.filter((repoPath) => !GENERATED_PROJECTION_PATHS.has(repoPath));
  if (unsafe.length > 0) {
    throw new Error(`Unsafe generated projection output path: ${unsafe.sort().join(", ")}`);
  }
  if (new Set(paths).size !== paths.length) {
    throw new Error("Generated projection output paths must be unique.");
  }
}

export function validateCanonicalSets(root, config, collector) {
  const terminology = extractCanonicalTerminology(root);
  for (const term of terminology.duplicates) {
    collector.add(
      "HARN_CANONICAL_TERM_DUPLICATE",
      TERMINOLOGY_PATH,
      `Canonical term heading ${term} is duplicated.`,
      "Keep exactly one heading for each canonical term.",
    );
  }

  for (const term of setDifference(config.canonicalTerms ?? [], terminology.terms)) {
    collector.add(
      "HARN_CANONICAL_TERM_CONFIG_MISSING_AUTHORITY",
      "governance/foundation.config.json",
      `Configured canonical term ${term} is missing from terminology authority.`,
      "Update the terminology authority or remove the stale configured term.",
    );
  }

  for (const term of setDifference(terminology.terms, config.canonicalTerms ?? [])) {
    collector.add(
      "HARN_CANONICAL_TERM_AUTHORITY_MISSING_CONFIG",
      TERMINOLOGY_PATH,
      `Authoritative canonical term ${term} is missing from governance config.`,
      "Update governance/foundation.config.json so the mechanical projection matches terminology authority.",
    );
  }

  const verdicts = extractCanonicalVerdicts(root);
  for (const verdict of verdicts.duplicates) {
    collector.add(
      "HARN_CANONICAL_VERDICT_DUPLICATE",
      VERDICT_PATH,
      `Canonical Verdict heading ${verdict} is duplicated.`,
      "Keep exactly one heading for each canonical Verdict value.",
    );
  }

  if (!sameStringSet(verdicts.verdicts, CANONICAL_VERDICT_VALUES)) {
    collector.add(
      "HARN_CANONICAL_VERDICT_AUTHORITY_MISMATCH",
      VERDICT_PATH,
      `Authoritative Verdict headings are [${verdicts.verdicts.join(", ")}], expected [${CANONICAL_VERDICT_VALUES.join(", ")}].`,
      "Restore the canonical Verdict section or stop for external authority review.",
    );
  }

  if (!sameStringSet(config.canonicalVerdicts ?? [], CANONICAL_VERDICT_VALUES)) {
    collector.add(
      "HARN_CANONICAL_VERDICT_CONFIG_MISMATCH",
      "governance/foundation.config.json",
      `Configured Verdict values are [${(config.canonicalVerdicts ?? []).join(", ")}], expected [${CANONICAL_VERDICT_VALUES.join(", ")}].`,
      "Restore governance/foundation.config.json to the canonical Verdict vocabulary.",
    );
  }
}

export function validateDocumentationAuthorityIndex(root, collector) {
  const authorityIndex = extractDocumentationAuthorityIndex(root);

  for (const topic of authorityIndex.duplicates) {
    collector.add(
      "HARN_AUTHORITY_TOPIC_DUPLICATE",
      PRODUCT_CONSTITUTION_PATH,
      `Documentation Authority Index topic ${topic} is duplicated.`,
      "Keep one authority index row per topic.",
    );
  }

  for (const row of authorityIndex.topics) {
    if (row.malformed) {
      collector.add(
        "HARN_AUTHORITY_REFERENCE_MALFORMED",
        PRODUCT_CONSTITUTION_PATH,
        `Documentation Authority Index topic ${row.topic} has a malformed authoritative location.`,
        "Use This document or local Markdown links in the authoritative location column.",
      );
    }

    for (const target of row.targets) {
      let targetExists = false;
      try {
        targetExists = fs.existsSync(resolveRepoPath(root, target.path));
      } catch {
        targetExists = false;
      }
      if (!targetExists) {
        collector.add(
          "HARN_AUTHORITY_TARGET_MISSING",
          PRODUCT_CONSTITUTION_PATH,
          `Documentation Authority Index topic ${row.topic} targets missing path ${target.path}.`,
          "Fix the authority target or restore the referenced document.",
        );
      }
    }
  }

  return documentationAuthorityIndexProjection(root);
}

export function validateAgentsAuthorityRoutes(root, authorityProjection, collector) {
  const agentsPath = "AGENTS.md";
  const agentsContent = readIfExists(root, agentsPath);
  const section = extractSection(agentsContent, "Authority Map");
  const indexedTargets = new Set();
  for (const topic of authorityProjection.topics) {
    for (const target of topic.targets) indexedTargets.add(target.path);
  }

  for (const link of markdownLinks(section)) {
    if (isExternalTarget(link.rawTarget)) continue;
    const { targetPath } = splitMarkdownTarget(link.rawTarget);
    const routePath = repoPathFromMarkdownTarget(agentsPath, targetPath);
    if (!indexedTargets.has(routePath)) {
      collector.add(
        "HARN_AGENTS_AUTHORITY_ROUTE_INVALID",
        agentsPath,
        `AGENTS.md routes to ${routePath}, which is not declared by the Documentation Authority Index.`,
        "Route AGENTS.md to a declared authoritative document or update the Product Constitution authority index.",
      );
    }
  }
}

export function validateProjectionFreshness(root, config, collector) {
  for (const [repoPath, expected] of expectedProjections(root, config)) {
    const filePath = resolveRepoPath(root, repoPath);
    let actual = null;
    try {
      actual = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      collector.add(
        "HARN_PROJECTION_STALE",
        repoPath,
        "Generated governance projection is missing or invalid JSON.",
        "Run pnpm governance:generate and commit the generated projection.",
      );
      continue;
    }

    if (stableStringify(actual) !== stableStringify(expected)) {
      collector.add(
        "HARN_PROJECTION_STALE",
        repoPath,
        "Generated governance projection is stale.",
        "Run pnpm governance:generate and review the generated projection.",
      );
    }
  }
}

export function writeExpectedProjections(root, config) {
  assertSafeProjectionOutputPaths(config);
  for (const [repoPath, projection] of expectedProjections(root, config)) {
    const filePath = resolveRepoPath(root, repoPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, stableStringify(projection), "utf8");
  }
}
