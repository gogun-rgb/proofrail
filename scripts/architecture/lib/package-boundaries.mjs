import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

const PACKAGE_RULES = Object.freeze({
  "@proofrail/contracts": Object.freeze({
    directory: "contracts",
    layer: "contracts",
    workspaceImports: Object.freeze([]),
    dependencies: Object.freeze({}),
    nodeImports: Object.freeze([]),
  }),
  "@proofrail/evidence-gate": Object.freeze({
    directory: "evidence-gate",
    layer: "delivery",
    workspaceImports: Object.freeze([]),
    dependencies: Object.freeze({}),
    nodeImports: Object.freeze([
      "node:child_process",
      "node:crypto",
      "node:fs/promises",
      "node:path",
      "node:url",
      "node:util",
    ]),
  }),
  "@proofrail/kernel": Object.freeze({
    directory: "kernel",
    layer: "kernel",
    workspaceImports: Object.freeze(["@proofrail/contracts"]),
    dependencies: Object.freeze({
      "@proofrail/contracts": "workspace:*",
    }),
    nodeImports: Object.freeze(["node:crypto", "node:util"]),
  }),
  "@proofrail/static-evaluator": Object.freeze({
    directory: "static-evaluator",
    layer: "delivery",
    workspaceImports: Object.freeze(["@proofrail/kernel"]),
    dependencies: Object.freeze({
      "@proofrail/kernel": "workspace:*",
    }),
    nodeImports: Object.freeze(["node:fs/promises", "node:util"]),
  }),
});

const PACKAGE_NAMES = Object.freeze(Object.keys(PACKAGE_RULES).sort(compareStrings));
const PACKAGE_NAME_BY_DIRECTORY = Object.freeze(
  Object.fromEntries(
    PACKAGE_NAMES.map((packageName) => [PACKAGE_RULES[packageName].directory, packageName]),
  ),
);
const OBJECT_DEPENDENCY_SECTIONS = Object.freeze([
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
]);
const BUNDLE_DEPENDENCY_SECTIONS = Object.freeze([
  "bundleDependencies",
  "bundledDependencies",
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
const EXCLUDED_SOURCE_DIRECTORIES = Object.freeze([
  "build",
  "docs",
  "examples",
  "fixtures",
  "generated",
  "node_modules",
  "target",
  "test",
  "tests",
]);

export async function checkPackageBoundaries(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const findings = [];

  try {
    await inspectRepository(root, findings);
  } catch {
    addFinding(findings, {
      id: "ARCHCHK_TOOL_FAILURE",
      path: "packages",
      target: "<repository>",
    });
  }

  return findings.sort(compareFindings);
}

export function formatArchitectureFinding(finding) {
  return JSON.stringify(finding);
}

async function inspectRepository(root, findings) {
  const packagesRoot = path.join(root, "packages");
  let packagesStatus;
  let entries;

  try {
    packagesStatus = await lstat(packagesRoot);
  } catch {
    addFinding(findings, {
      id: "ARCHCHK_PACKAGES_UNINSPECTABLE",
      path: "packages",
      target: "<packages>",
    });
    return;
  }
  if (packagesStatus.isSymbolicLink() || !packagesStatus.isDirectory()) {
    addFinding(findings, {
      id: "ARCHCHK_PACKAGES_UNINSPECTABLE",
      path: "packages",
      target: "<packages>",
    });
    return;
  }

  try {
    entries = await readdir(packagesRoot, { withFileTypes: true });
  } catch {
    addFinding(findings, {
      id: "ARCHCHK_PACKAGES_UNINSPECTABLE",
      path: "packages",
      target: "<packages>",
    });
    return;
  }

  const packages = [];
  for (const entry of entries.sort((left, right) => compareStrings(left.name, right.name))) {
    const packageRoot = path.join(packagesRoot, entry.name);
    const packagePath = toPosixPath(path.relative(root, packageRoot));
    let packageStatus;

    try {
      packageStatus = await lstat(packageRoot);
    } catch {
      addFinding(findings, {
        id: "ARCHCHK_PACKAGE_UNINSPECTABLE",
        path: packagePath,
        target: "<package>",
      });
      continue;
    }

    if (packageStatus.isSymbolicLink()) {
      addFinding(findings, {
        id: "ARCHCHK_PACKAGE_SYMLINK",
        path: packagePath,
        target: "<package>",
      });
      continue;
    }
    if (!packageStatus.isDirectory()) {
      continue;
    }

    const manifestPath = path.join(packageRoot, "package.json");
    let manifestStatus;
    try {
      manifestStatus = await lstat(manifestPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      addFinding(findings, {
        id: "ARCHCHK_MANIFEST_UNINSPECTABLE",
        path: `${packagePath}/package.json`,
        target: "<manifest>",
      });
      continue;
    }

    if (manifestStatus.isSymbolicLink() || !manifestStatus.isFile()) {
      addFinding(findings, {
        id: "ARCHCHK_MANIFEST_UNINSPECTABLE",
        path: `${packagePath}/package.json`,
        target: "<manifest>",
      });
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch {
      addFinding(findings, {
        id: "ARCHCHK_MANIFEST_INVALID",
        path: `${packagePath}/package.json`,
        target: "<manifest>",
      });
      continue;
    }

    if (!isRecord(manifest) || typeof manifest.name !== "string") {
      addFinding(findings, {
        id: "ARCHCHK_PACKAGE_UNCLASSIFIED",
        path: `${packagePath}/package.json`,
        target: "<package>",
      });
      continue;
    }

    packages.push({
      directory: entry.name,
      manifest,
      manifestPath,
      packagePath,
      packageRoot,
      name: manifest.name,
    });
  }

  const packagesByName = new Map();
  const seenKnownNames = new Set();
  for (const packageRecord of packages) {
    const rule = Object.hasOwn(PACKAGE_RULES, packageRecord.name)
      ? PACKAGE_RULES[packageRecord.name]
      : undefined;
    const expectedName = Object.hasOwn(PACKAGE_NAME_BY_DIRECTORY, packageRecord.directory)
      ? PACKAGE_NAME_BY_DIRECTORY[packageRecord.directory]
      : undefined;
    if (!rule) {
      addFinding(findings, {
        id: expectedName
          ? "ARCHCHK_PACKAGE_PATH_MISMATCH"
          : "ARCHCHK_PACKAGE_UNCLASSIFIED",
        path: toPosixPath(path.relative(root, packageRecord.manifestPath)),
        target: expectedName ?? "<package>",
      });
      continue;
    }

    if (seenKnownNames.has(packageRecord.name)) {
      addFinding(findings, {
        id: "ARCHCHK_PACKAGE_DUPLICATE",
        path: toPosixPath(path.relative(root, packageRecord.manifestPath)),
        target: packageRecord.name,
      });
    } else {
      seenKnownNames.add(packageRecord.name);
    }

    if (rule.directory !== packageRecord.directory) {
      addFinding(findings, {
        id: "ARCHCHK_PACKAGE_PATH_MISMATCH",
        path: toPosixPath(path.relative(root, packageRecord.manifestPath)),
        target: expectedName ?? packageRecord.name,
      });
      continue;
    }

    const existing = packagesByName.get(packageRecord.name);
    if (existing) {
      continue;
    }
    packagesByName.set(packageRecord.name, packageRecord);
  }

  for (const packageName of PACKAGE_NAMES) {
    if (!packagesByName.has(packageName)) {
      addFinding(findings, {
        id: "ARCHCHK_PACKAGE_MISSING",
        path: "packages",
        target: packageName,
      });
    }
  }

  for (const packageName of PACKAGE_NAMES) {
    const packageRecord = packagesByName.get(packageName);
    if (!packageRecord) {
      continue;
    }
    const rule = PACKAGE_RULES[packageName];
    const declaredDependencies = inspectManifest(packageRecord, rule, root, findings);
    await inspectSource(packageRecord, rule, declaredDependencies, root, findings);
  }
}

function inspectManifest(packageRecord, rule, root, findings) {
  const declaredDependencies = new Set();
  const manifestPath = toPosixPath(path.relative(root, packageRecord.manifestPath));

  for (const section of OBJECT_DEPENDENCY_SECTIONS) {
    const expected = section === "dependencies" ? rule.dependencies : {};
    const actual = packageRecord.manifest[section];

    if (actual !== undefined && !isRecord(actual)) {
      addFinding(findings, {
        id: "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT",
        path: manifestPath,
        target: section,
      });
      continue;
    }

    const actualRecord = actual ?? {};
    for (const dependencyName of Object.keys(actualRecord)) {
      declaredDependencies.add(dependencyName);
    }

    const dependencyNames = new Set([
      ...Object.keys(expected),
      ...Object.keys(actualRecord),
    ]);
    for (const dependencyName of [...dependencyNames].sort(compareStrings)) {
      if (
        !Object.hasOwn(expected, dependencyName) ||
        !Object.hasOwn(actualRecord, dependencyName) ||
        actualRecord[dependencyName] !== expected[dependencyName]
      ) {
        addFinding(findings, {
          id: "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT",
          path: manifestPath,
          target: `${section}:${diagnosticTarget(
            dependencyName,
            normalizeSpecifierSeparators(dependencyName),
          )}`,
        });
      }
    }
  }

  for (const section of BUNDLE_DEPENDENCY_SECTIONS) {
    const actual = packageRecord.manifest[section];
    if (actual === undefined) {
      continue;
    }
    if (!Array.isArray(actual)) {
      addFinding(findings, {
        id: "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT",
        path: manifestPath,
        target: section,
      });
      continue;
    }
    for (let index = 0; index < actual.length; index += 1) {
      const entryTarget = typeof actual[index] === "string"
        ? diagnosticTarget(actual[index], normalizeSpecifierSeparators(actual[index]))
        : `<entry-${index}>`;
      addFinding(findings, {
        id: "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT",
        path: manifestPath,
        target: `${section}:${entryTarget}`,
      });
    }
  }

  return declaredDependencies;
}

async function inspectSource(packageRecord, rule, declaredDependencies, root, findings) {
  const sourceRoot = path.join(packageRecord.packageRoot, "src");
  const sourcePath = toPosixPath(path.relative(root, sourceRoot));
  let sourceStatus;

  try {
    sourceStatus = await lstat(sourceRoot);
  } catch {
    addFinding(findings, {
      id: "ARCHCHK_SOURCE_UNINSPECTABLE",
      path: sourcePath,
      target: "<src>",
    });
    return;
  }

  if (sourceStatus.isSymbolicLink()) {
    addFinding(findings, {
      id: "ARCHCHK_SOURCE_SYMLINK",
      path: sourcePath,
      target: "<src>",
    });
    return;
  }
  if (!sourceStatus.isDirectory()) {
    addFinding(findings, {
      id: "ARCHCHK_SOURCE_UNINSPECTABLE",
      path: sourcePath,
      target: "<src>",
    });
    return;
  }

  await walkSourceDirectory(
    sourceRoot,
    packageRecord,
    rule,
    declaredDependencies,
    root,
    findings,
  );
}

async function walkSourceDirectory(
  directory,
  packageRecord,
  rule,
  declaredDependencies,
  root,
  findings,
) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    addFinding(findings, {
      id: "ARCHCHK_SOURCE_UNINSPECTABLE",
      path: toPosixPath(path.relative(root, directory)),
      target: "<directory>",
    });
    return;
  }

  for (const entry of entries.sort((left, right) => compareStrings(left.name, right.name))) {
    const entryPath = path.join(directory, entry.name);
    const relativePath = toPosixPath(path.relative(root, entryPath));
    let entryStatus;

    try {
      entryStatus = await lstat(entryPath);
    } catch {
      addFinding(findings, {
        id: "ARCHCHK_SOURCE_UNINSPECTABLE",
        path: relativePath,
        target: "<source>",
      });
      continue;
    }

    if (entryStatus.isSymbolicLink()) {
      addFinding(findings, {
        id: "ARCHCHK_SOURCE_SYMLINK",
        path: relativePath,
        target: "<source>",
      });
      continue;
    }
    if (entryStatus.isDirectory()) {
      if (EXCLUDED_SOURCE_DIRECTORIES.includes(entry.name)) {
        continue;
      }
      await walkSourceDirectory(
        entryPath,
        packageRecord,
        rule,
        declaredDependencies,
        root,
        findings,
      );
      continue;
    }
    if (!entryStatus.isFile()) {
      addFinding(findings, {
        id: "ARCHCHK_SOURCE_UNINSPECTABLE",
        path: relativePath,
        target: "<source>",
      });
      continue;
    }
    if (!hasSourceExtension(entry.name)) {
      continue;
    }

    await inspectSourceFile(
      entryPath,
      relativePath,
      packageRecord,
      rule,
      declaredDependencies,
      findings,
    );
  }
}

async function inspectSourceFile(
  sourcePath,
  relativePath,
  packageRecord,
  rule,
  declaredDependencies,
  findings,
) {
  let sourceText;
  try {
    sourceText = await readFile(sourcePath, "utf8");
  } catch {
    addFinding(findings, {
      id: "ARCHCHK_SOURCE_UNINSPECTABLE",
      path: relativePath,
      target: "<source>",
    });
    return;
  }

  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const parseDiagnostics = sourceFile.parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    for (const diagnostic of parseDiagnostics) {
      const location = lineAndColumn(sourceFile, diagnostic.start ?? 0);
      addFinding(findings, {
        id: "ARCHCHK_SOURCE_PARSE_FAILED",
        path: relativePath,
        line: location.line,
        column: location.column,
        target: "<parse>",
      });
    }
    return;
  }

  collectModuleReferences(sourceFile, ({ node, specifier }) => {
    const location = lineAndColumn(sourceFile, node.getStart(sourceFile, false));
    if (specifier === null) {
      addFinding(findings, {
        id: "ARCHCHK_IMPORT_UNINSPECTABLE",
        path: relativePath,
        line: location.line,
        column: location.column,
        target: "<computed>",
      });
      return;
    }

    inspectSpecifier(
      specifier,
      sourcePath,
      relativePath,
      location,
      packageRecord,
      rule,
      declaredDependencies,
      findings,
    );
  });
}

function collectModuleReferences(sourceFile, onReference) {
  const seen = new Set();

  function visit(node) {
    if (seen.has(node)) {
      return;
    }
    seen.add(node);

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        onReference({ node: node.moduleSpecifier, specifier: literalText(node.moduleSpecifier) });
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) {
        const expression = node.moduleReference.expression;
        onReference({
          node: expression ?? node.moduleReference,
          specifier: literalText(expression),
        });
      }
    } else if (ts.isImportTypeNode(node)) {
      const literal = ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined;
      onReference({ node: literal ?? node, specifier: literalText(literal) });
    } else if (ts.isJSDocImportTag(node)) {
      onReference({
        node: node.moduleSpecifier,
        specifier: literalText(node.moduleSpecifier),
      });
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isRequireResolve =
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "require" &&
        node.expression.name.text === "resolve";

      if (isDynamicImport || isRequire || isRequireResolve) {
        const target = node.arguments[0];
        onReference({ node: target ?? node, specifier: literalText(target) });
      }
    }

    const jsDoc = node.jsDoc;
    if (Array.isArray(jsDoc)) {
      for (const doc of jsDoc) {
        visit(doc);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function inspectSpecifier(
  specifier,
  sourcePath,
  relativePath,
  location,
  packageRecord,
  rule,
  declaredDependencies,
  findings,
) {
  const portableSpecifier = normalizeSpecifierSeparators(specifier);
  if (isRelativeSpecifier(portableSpecifier)) {
    const resolved = path.resolve(path.dirname(sourcePath), portableSpecifier);
    if (!isWithin(packageRecord.packageRoot, resolved)) {
      addFinding(findings, {
        id: "ARCHCHK_RELATIVE_ESCAPE",
        path: relativePath,
        line: location.line,
        column: location.column,
        target: specifier,
      });
    }
    return;
  }

  const workspacePackage = workspacePackageForSpecifier(specifier);
  if (workspacePackage) {
    if (!rule.workspaceImports.includes(workspacePackage)) {
      addFinding(findings, {
        id: "ARCHCHK_EDGE_FORBIDDEN",
        path: relativePath,
        line: location.line,
        column: location.column,
        target: specifier,
      });
      return;
    }
    if (!declaredDependencies.has(workspacePackage)) {
      addFinding(findings, {
        id: "ARCHCHK_IMPORT_UNDECLARED",
        path: relativePath,
        line: location.line,
        column: location.column,
        target: specifier,
      });
    }
    return;
  }

  if (specifier.startsWith("node:")) {
    if (!rule.nodeImports.includes(specifier)) {
      addFinding(findings, {
        id: "ARCHCHK_IMPORT_UNAPPROVED",
        path: relativePath,
        line: location.line,
        column: location.column,
        target: specifier,
      });
    }
    return;
  }

  addFinding(findings, {
    id: "ARCHCHK_IMPORT_UNAPPROVED",
    path: relativePath,
    line: location.line,
    column: location.column,
    target: diagnosticTarget(specifier, portableSpecifier),
  });
}

function workspacePackageForSpecifier(specifier) {
  for (const packageName of PACKAGE_NAMES) {
    if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
      return packageName;
    }
  }
  return null;
}

function literalText(node) {
  if (
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  ) {
    return node.text;
  }
  return null;
}

function lineAndColumn(sourceFile, position) {
  const location = sourceFile.getLineAndCharacterOfPosition(position);
  return { line: location.line + 1, column: location.character + 1 };
}

function addFinding(findings, { id, path: findingPath, line = 1, column = 1, target }) {
  findings.push({
    id,
    path: findingPath || ".",
    line,
    column,
    target,
  });
}

function compareFindings(left, right) {
  return (
    compareStrings(left.path, right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    compareStrings(left.id, right.id) ||
    compareStrings(left.target, right.target)
  );
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRelativeSpecifier(specifier) {
  return (
    specifier === "." ||
    specifier === ".." ||
    specifier.startsWith("./") ||
    specifier.startsWith("../")
  );
}

function diagnosticTarget(specifier, portableSpecifier) {
  if (
    path.posix.isAbsolute(portableSpecifier) ||
    path.win32.isAbsolute(specifier)
  ) {
    return "<absolute>";
  }
  if (hasUrlScheme(specifier)) {
    return "<url>";
  }
  if (specifier.startsWith("#")) {
    return "<package-import>";
  }
  return specifier;
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function hasSourceExtension(fileName) {
  return SOURCE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

function hasUrlScheme(specifier) {
  const colon = specifier.indexOf(":");
  if (colon <= 0 || !isAsciiLetter(specifier.codePointAt(0))) {
    return false;
  }
  for (let index = 1; index < colon; index += 1) {
    const codePoint = specifier.codePointAt(index);
    if (
      !isAsciiLetter(codePoint) &&
      !(codePoint >= 48 && codePoint <= 57) &&
      codePoint !== 43 &&
      codePoint !== 45 &&
      codePoint !== 46
    ) {
      return false;
    }
  }
  return true;
}

function isAsciiLetter(codePoint) {
  return (
    (codePoint >= 65 && codePoint <= 90) ||
    (codePoint >= 97 && codePoint <= 122)
  );
}

function normalizeSpecifierSeparators(specifier) {
  return specifier.split("\\").join("/");
}

function toPosixPath(value) {
  return value.split("\\").join("/").split(path.sep).join("/");
}
