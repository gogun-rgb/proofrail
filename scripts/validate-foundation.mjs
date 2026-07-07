import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const configPath = path.join(root, "governance", "foundation.config.json");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Unable to read JSON ${path.relative(root, filePath)}: ${error.message}`);
    return null;
  }
}

function assertArrayOfStrings(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.length === 0)) {
    errors.push(`${label} must be a non-empty array of strings`);
  }
}

function allFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules"].includes(entry.name)) return [];
      return allFiles(fullPath);
    }
    return entry.isFile() ? [fullPath] : [];
  });
}

function markdownFiles() {
  return allFiles(root).filter((file) => file.endsWith(".md"));
}

function slugifyHeading(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function anchorsFor(content) {
  const anchors = new Set();
  for (const line of content.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) anchors.add(slugifyHeading(match[2]));
  }
  return anchors;
}

function validateMarkdownLinks() {
  const anchorCache = new Map();
  for (const file of markdownFiles()) {
    const content = fs.readFileSync(file, "utf8");
    const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
    for (const match of content.matchAll(linkPattern)) {
      const rawTarget = match[1].trim();
      if (rawTarget.startsWith("http://") || rawTarget.startsWith("https://") || rawTarget.startsWith("mailto:") || rawTarget.startsWith("#")) {
        continue;
      }
      const withoutTitle = rawTarget.split(/\s+/)[0].replace(/^<|>$/g, "");
      const [targetPath, anchor] = withoutTitle.split("#");
      const resolvedPath = path.resolve(path.dirname(file), targetPath);
      if (!fs.existsSync(resolvedPath)) {
        errors.push(`Broken Markdown link in ${path.relative(root, file)}: ${rawTarget}`);
        continue;
      }
      if (anchor && resolvedPath.endsWith(".md")) {
        if (!anchorCache.has(resolvedPath)) anchorCache.set(resolvedPath, anchorsFor(fs.readFileSync(resolvedPath, "utf8")));
        if (!anchorCache.get(resolvedPath).has(anchor.toLowerCase())) {
          errors.push(`Missing Markdown anchor in ${path.relative(root, file)}: ${rawTarget}`);
        }
      }
    }
  }
}

function validateSchema(schemaPath) {
  const schema = readJson(path.join(root, schemaPath));
  if (!schema) return;
  const required = ["task", "scope", "authority", "acceptance", "verification", "requiredArtifacts", "stopConditions", "review"];
  for (const field of required) {
    if (!schema.required?.includes(field)) errors.push(`Machine Task Contract schema is missing required field: ${field}`);
  }
}

function validateIdentityHygiene() {
  const identityPatterns = [
    /C[o]deAtlas/,
    /c[o]deatlas/,
    /files-mentioned-by-the-user-c[o]deatlas/,
  ];
  for (const file of allFiles(root)) {
    if (file.includes(`${path.sep}.git${path.sep}`)) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of identityPatterns) {
      if (pattern.test(content)) {
        errors.push(`Unexpected inherited identity text in ${path.relative(root, file)}`);
      }
    }
  }
}

const config = readJson(configPath);
if (config) {
  assertArrayOfStrings(config.requiredDocuments, "requiredDocuments");
  assertArrayOfStrings(config.canonicalTerms, "canonicalTerms");
  assertArrayOfStrings(config.canonicalVerdicts, "canonicalVerdicts");

  for (const documentPath of config.requiredDocuments ?? []) {
    if (!fs.existsSync(path.join(root, documentPath))) errors.push(`Required document missing: ${documentPath}`);
  }

  const terminologyPath = path.join(root, "docs", "constitution", "terminology.md");
  const terminology = fs.existsSync(terminologyPath) ? fs.readFileSync(terminologyPath, "utf8") : "";
  for (const term of config.canonicalTerms ?? []) {
    if (!terminology.includes(`### ${term}`)) errors.push(`Canonical term missing from terminology headings: ${term}`);
  }

  const activePlanPath = path.join(root, "docs", "plans", "active", "foundation-gate-mechanization.md");
  const activePlan = fs.existsSync(activePlanPath) ? fs.readFileSync(activePlanPath, "utf8") : "";
  if (!activePlan.includes(config.activeNextFoundationTask)) {
    errors.push(`Active plan does not include next foundation task: ${config.activeNextFoundationTask}`);
  }

  validateSchema(config.machineTaskContractSchema);
}

validateMarkdownLinks();
validateIdentityHygiene();

if (errors.length > 0) {
  console.error("Proofrail foundation validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Proofrail foundation validation passed.");