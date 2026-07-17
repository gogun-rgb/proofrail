#!/usr/bin/env node

import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import ts from "typescript";

import { renderReasonCodeReference } from "./reason-code-reference.mjs";

const REGISTRY_PATH = "config/reason-codes/product-reason-codes.json";
const SCHEMA_PATH = "schemas/product/reason-code-registry.schema.json";
const REFERENCE_PATH = "docs/reference/reason-codes.md";
const PACKAGE_DIRECTORIES = Object.freeze([
  "contracts",
  "evidence-gate",
  "kernel",
  "release-orchestrator",
  "static-evaluator",
  "trusted-config",
]);
const SOURCE_EXTENSIONS = Object.freeze([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
]);
const MACHINE_CALLS = new Set(["fail", "throwBoundaryError"]);
const SUPPORTED_ERROR_CONSTRUCTORS = new Set([
  "FileIoError",
  "ReleaseOrchestratorError",
  "TrustedConfigurationError",
]);
const FIXED_CODE_ERROR_CONSTRUCTORS = new Set([
  "PrototypeDeliveryError",
  "ReleaseDeliveryError",
  "WorkflowEventError",
]);
const GUARDED_EMITTER_IDENTIFIERS = new Set([
  ...MACHINE_CALLS,
  ...SUPPORTED_ERROR_CONSTRUCTORS,
]);
const VERIFIED_WRAPPER_CONSTRUCTORS = new Map([
  ["fail", new Set(["ReleaseOrchestratorError", "TrustedConfigurationError"])],
]);
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export async function validateReasonCodeRepository(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const findings = [];
  const schema = await readJsonDocument(root, SCHEMA_PATH, findings);
  const registry = await readJsonDocument(root, REGISTRY_PATH, findings);
  const reference = await readTextDocument(root, REFERENCE_PATH, findings);
  const scan = await collectProductSourceCodes(root);
  findings.push(...scan.findings);

  if (schema !== null && registry !== null && reference !== null) {
    findings.push(...validateRegistryData({
      schema,
      registry,
      emissions: scan.emissions,
      reference,
    }));
  }

  return sortFindings(findings);
}

export function validateRegistryData({ schema, registry, emissions, reference }) {
  const findings = [];
  let validate;

  try {
    validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  } catch {
    addFinding(findings, "RCHECK_SCHEMA_INVALID", SCHEMA_PATH, 1, 1, "<schema>");
    return sortFindings(findings);
  }

  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      const suffix = error.keyword === "required" && error.params?.missingProperty
        ? "/" + error.params.missingProperty
        : "";
      addFinding(
        findings,
        "RCHECK_REGISTRY_SCHEMA_INVALID",
        REGISTRY_PATH + (error.instancePath || "") + suffix,
        1,
        1,
        error.keyword,
      );
    }
  }

  if (!registry || typeof registry !== "object" || !Array.isArray(registry.codes)) {
    return sortFindings(findings);
  }

  const entriesById = new Map();
  const ids = [];
  for (let index = 0; index < registry.codes.length; index += 1) {
    const entry = registry.codes[index];
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      continue;
    }
    ids.push(entry.id);
    if (entriesById.has(entry.id)) {
      addFinding(findings, "RCHECK_REGISTRY_DUPLICATE_ID", REGISTRY_PATH, 1, 1, entry.id);
    } else {
      entriesById.set(entry.id, entry);
    }
    if (entry.id.startsWith("HARN_")) {
      addFinding(findings, "RCHECK_HARN_CODE_FORBIDDEN", REGISTRY_PATH, 1, 1, entry.id);
    }
    if (Array.isArray(entry.surfaces) && !isSortedUnique(entry.surfaces)) {
      addFinding(findings, "RCHECK_SURFACE_ORDER_INVALID", REGISTRY_PATH, 1, 1, entry.id);
    }
  }

  if (!isSortedUnique(ids)) {
    addFinding(findings, "RCHECK_REGISTRY_ORDER_INVALID", REGISTRY_PATH, 1, 1, "<codes>");
  }

  const emittedById = new Map();
  for (const emission of emissions) {
    if (!emittedById.has(emission.id)) {
      emittedById.set(emission.id, new Set());
    }
    emittedById.get(emission.id).add(emission.surface);
  }

  for (const [id, surfaces] of emittedById) {
    const entry = entriesById.get(id);
    if (!entry) {
      const first = emissions.find((emission) => emission.id === id);
      addFinding(
        findings,
        "RCHECK_EMITTED_CODE_UNREGISTERED",
        first?.path ?? "packages",
        first?.line ?? 1,
        first?.column ?? 1,
        id,
      );
      continue;
    }
    if (Array.isArray(entry.surfaces)) {
      const actual = [...surfaces].sort(compareStrings);
      if (!sameStrings(actual, entry.surfaces)) {
        addFinding(findings, "RCHECK_SURFACE_MISMATCH", REGISTRY_PATH, 1, 1, id);
      }
    }
  }

  for (const entry of entriesById.values()) {
    if (entry.status === "ACTIVE" && !emittedById.has(entry.id)) {
      addFinding(findings, "RCHECK_ACTIVE_CODE_NOT_EMITTED", REGISTRY_PATH, 1, 1, entry.id);
    }
  }

  validateDeprecations(entriesById, findings);

  try {
    if (renderReasonCodeReference(registry) !== reference) {
      addFinding(findings, "RCHECK_REFERENCE_DRIFT", REFERENCE_PATH, 1, 1, "<reference>");
    }
  } catch {
    addFinding(findings, "RCHECK_REFERENCE_RENDER_FAILED", REFERENCE_PATH, 1, 1, "<reference>");
  }

  return sortFindings(findings);
}

function validateDeprecations(entriesById, findings) {
  for (const entry of entriesById.values()) {
    if (entry.status !== "DEPRECATED") {
      continue;
    }
    if (typeof entry.replacement !== "string" || !entriesById.has(entry.replacement)) {
      addFinding(findings, "RCHECK_DEPRECATION_REPLACEMENT_INVALID", REGISTRY_PATH, 1, 1, entry.id);
      continue;
    }

    const seen = new Set([entry.id]);
    let current = entry;
    while (current.status === "DEPRECATED") {
      const replacement = entriesById.get(current.replacement);
      if (!replacement) {
        break;
      }
      if (seen.has(replacement.id)) {
        addFinding(findings, "RCHECK_DEPRECATION_CYCLE", REGISTRY_PATH, 1, 1, entry.id);
        break;
      }
      seen.add(replacement.id);
      current = replacement;
    }
  }
}

export async function collectProductSourceCodes(repositoryRoot) {
  const emissions = [];
  const findings = [];

  for (const packageDirectory of PACKAGE_DIRECTORIES) {
    const sourceRoot = path.join(repositoryRoot, "packages", packageDirectory, "src");
    await walkSourceDirectory(sourceRoot, repositoryRoot, packageDirectory, emissions, findings);
  }

  emissions.sort(compareEmissions);
  return { emissions, findings: sortFindings(findings) };
}

async function walkSourceDirectory(directory, repositoryRoot, surface, emissions, findings) {
  let details;
  let entries;
  const relativeDirectory = relativePath(repositoryRoot, directory);

  try {
    details = await lstat(directory);
    if (details.isSymbolicLink() || !details.isDirectory()) {
      addFinding(findings, "RCHECK_SOURCE_UNINSPECTABLE", relativeDirectory, 1, 1, "<directory>");
      return;
    }
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    addFinding(findings, "RCHECK_SOURCE_UNINSPECTABLE", relativeDirectory, 1, 1, "<directory>");
    return;
  }

  for (const entry of entries.sort((left, right) => compareStrings(left.name, right.name))) {
    const absolute = path.join(directory, entry.name);
    const relative = relativePath(repositoryRoot, absolute);
    let status;
    try {
      status = await lstat(absolute);
    } catch {
      addFinding(findings, "RCHECK_SOURCE_UNINSPECTABLE", relative, 1, 1, "<source>");
      continue;
    }

    if (status.isSymbolicLink()) {
      addFinding(findings, "RCHECK_SOURCE_UNINSPECTABLE", relative, 1, 1, "<symlink>");
      continue;
    }
    if (status.isDirectory()) {
      await walkSourceDirectory(absolute, repositoryRoot, surface, emissions, findings);
      continue;
    }
    if (!status.isFile() || !SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      continue;
    }

    let source;
    try {
      source = await readFile(absolute, "utf8");
    } catch {
      addFinding(findings, "RCHECK_SOURCE_UNINSPECTABLE", relative, 1, 1, "<source>");
      continue;
    }
    const inspected = inspectSourceText({ source, sourcePath: relative, surface });
    emissions.push(...inspected.emissions);
    findings.push(...inspected.findings);
  }
}

export function inspectSourceText({ source, sourcePath, surface }) {
  const emissions = [];
  const findings = [];
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true);
  const parseDiagnostics = sourceFile.parseDiagnostics ?? [];

  if (parseDiagnostics.length > 0) {
    for (const diagnostic of parseDiagnostics) {
      const location = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      addFinding(
        findings,
        "RCHECK_SOURCE_PARSE_FAILED",
        sourcePath,
        location.line + 1,
        location.character + 1,
        "<parse>",
      );
    }
    return { emissions, findings: sortFindings(findings) };
  }

  function record(node, value, form) {
    const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, false));
    if (!value || (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value))) {
      addFinding(
        findings,
        "RCHECK_EMITTER_UNINSPECTABLE",
        sourcePath,
        location.line + 1,
        location.character + 1,
        form,
      );
      return;
    }
    if (!CODE_PATTERN.test(value.text) || value.text.startsWith("HARN_")) {
      addFinding(
        findings,
        "RCHECK_EMITTER_CODE_INVALID",
        sourcePath,
        location.line + 1,
        location.character + 1,
        form,
      );
      return;
    }
    emissions.push({
      id: value.text,
      surface,
      path: sourcePath,
      line: location.line + 1,
      column: location.character + 1,
    });
  }

  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text.endsWith("_REASON_CODE")
    ) {
      record(node, node.initializer, "reason-code-constant");
    }

    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && MACHINE_CALLS.has(node.expression.text)
    ) {
      record(node, node.arguments[0], node.expression.text);
    }

    if (
      ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && SUPPORTED_ERROR_CONSTRUCTORS.has(node.expression.text)
    ) {
      if (!isVerifiedWrapperConstruction(node)) {
        record(node, node.arguments?.[0], node.expression.text);
      }
    }

    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && isThisCodeProperty(node.left)
    ) {
      if (!isRelevantCodeAssignment(node)) {
        ts.forEachChild(node, visit);
        return;
      }
      if (ts.isStringLiteral(node.right) || ts.isNoSubstitutionTemplateLiteral(node.right)) {
        record(node, node.right, "this.code");
      } else if (!isAllowedForwardingAssignment(node)) {
        record(node, undefined, "this.code");
      }
    }

    if (
      ts.isIdentifier(node)
      && GUARDED_EMITTER_IDENTIFIERS.has(node.text)
      && !isAllowedEmitterIdentifierUse(node)
    ) {
      record(node, undefined, `emitter-reference:${node.text}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  emissions.sort(compareEmissions);
  return { emissions, findings: sortFindings(findings) };
}

function isThisCodeProperty(node) {
  return ts.isPropertyAccessExpression(node)
    && node.expression.kind === ts.SyntaxKind.ThisKeyword
    && node.name.text === "code";
}

function isRelevantCodeAssignment(node) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isClassDeclaration(current)) {
      return Boolean(current.name)
        && (SUPPORTED_ERROR_CONSTRUCTORS.has(current.name.text)
          || FIXED_CODE_ERROR_CONSTRUCTORS.has(current.name.text));
    }
    current = current.parent;
  }
  return false;
}

function isAllowedForwardingAssignment(node) {
  if (!ts.isIdentifier(node.right) || node.right.text !== "code") {
    return false;
  }

  const statement = node.parent;
  const body = statement?.parent;
  const constructor = body?.parent;
  const errorClass = constructor?.parent;
  return ts.isExpressionStatement(statement)
    && ts.isBlock(body)
    && ts.isConstructorDeclaration(constructor)
    && constructor.body === body
    && ts.isClassDeclaration(errorClass)
    && Boolean(errorClass.name && SUPPORTED_ERROR_CONSTRUCTORS.has(errorClass.name.text))
    && constructor.parameters.length === 1
    && ts.isIdentifier(constructor.parameters[0].name)
    && constructor.parameters[0].name.text === "code"
    && !constructor.parameters[0].dotDotDotToken
    && !constructor.parameters[0].initializer;
}

function isVerifiedWrapperConstruction(node) {
  if (
    !ts.isIdentifier(node.expression)
    || node.arguments?.length !== 1
    || !ts.isIdentifier(node.arguments[0])
  ) {
    return false;
  }

  const statement = node.parent;
  const body = statement?.parent;
  const wrapper = body?.parent;
  if (
    !ts.isThrowStatement(statement)
    || !ts.isBlock(body)
    || body.statements.length !== 1
    || body.statements[0] !== statement
    || !ts.isFunctionDeclaration(wrapper)
    || wrapper.body !== body
    || !wrapper.name
    || wrapper.parameters.length !== 1
    || !ts.isIdentifier(wrapper.parameters[0].name)
    || wrapper.parameters[0].dotDotDotToken
    || wrapper.parameters[0].initializer
    || wrapper.parameters[0].name.text !== node.arguments[0].text
  ) {
    return false;
  }

  return VERIFIED_WRAPPER_CONSTRUCTORS.get(wrapper.name.text)?.has(node.expression.text) === true;
}

function isAllowedEmitterIdentifierUse(node) {
  const parent = node.parent;
  if (
    ts.isImportSpecifier(parent)
    || ts.isExportSpecifier(parent)
    || ts.isImportClause(parent)
    || ts.isNamespaceImport(parent)
    || ts.isNamedImports(parent)
  ) {
    return true;
  }
  if (MACHINE_CALLS.has(node.text)) {
    return (ts.isCallExpression(parent) && parent.expression === node)
      || (ts.isFunctionDeclaration(parent) && parent.name === node);
  }

  if (SUPPORTED_ERROR_CONSTRUCTORS.has(node.text)) {
    return (ts.isNewExpression(parent) && parent.expression === node)
      || (ts.isClassDeclaration(parent) && parent.name === node)
      || (
        ts.isBinaryExpression(parent)
        && parent.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword
        && parent.right === node
      );
  }

  return false;
}

async function readJsonDocument(root, relative, findings) {
  const text = await readTextDocument(root, relative, findings);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    addFinding(findings, "RCHECK_DOCUMENT_INVALID", relative, 1, 1, "<json>");
    return null;
  }
}

async function readTextDocument(root, relative, findings) {
  try {
    return await readFile(path.join(root, relative), "utf8");
  } catch {
    addFinding(findings, "RCHECK_DOCUMENT_UNREADABLE", relative, 1, 1, "<document>");
    return null;
  }
}

function isSortedUnique(values) {
  return values.every((value, index) => index === 0 || compareStrings(values[index - 1], value) < 0);
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareEmissions(left, right) {
  return compareStrings(left.path, right.path)
    || left.line - right.line
    || left.column - right.column
    || compareStrings(left.id, right.id);
}

function sortFindings(findings) {
  return findings.sort((left, right) =>
    compareStrings(left.path, right.path)
    || left.line - right.line
    || left.column - right.column
    || compareStrings(left.id, right.id)
    || compareStrings(left.target, right.target)
  );
}

function addFinding(findings, id, findingPath, line, column, target) {
  findings.push({
    id,
    path: String(findingPath).split("\\").join("/"),
    line,
    column,
    target: String(target).slice(0, 128),
  });
}

function relativePath(root, candidate) {
  return path.relative(root, candidate).split(path.sep).join("/");
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    process.stderr.write(JSON.stringify({
      id: "RCHECK_ARGUMENT_UNSUPPORTED",
      path: "scripts/product/validate-reason-codes.mjs",
      line: 1,
      column: 1,
      target: "<argument>",
    }) + "\n");
    return 1;
  }

  const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
  const findings = await validateReasonCodeRepository(repositoryRoot);
  if (findings.length > 0) {
    process.stderr.write(findings.map((finding) => JSON.stringify(finding)).join("\n") + "\n");
    return 1;
  }

  process.stdout.write("Product reason-code registry checks passed.\n");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
