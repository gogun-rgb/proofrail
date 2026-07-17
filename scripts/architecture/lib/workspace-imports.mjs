import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

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
const EXCLUDED_SOURCE_DIRECTORIES = new Set([
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

export async function inspectWorkspaceImports(
  packageRecord,
  graph,
) {
  const sourceRoot = path.join(packageRecord.packageRoot, "src");
  let sourceStatus;
  try {
    sourceStatus = await lstat(sourceRoot);
  } catch {
    return;
  }
  if (sourceStatus.isSymbolicLink() || !sourceStatus.isDirectory()) {
    return;
  }

  const sourceFiles = [];
  await collectSourceFiles(sourceRoot, sourceFiles);
  for (const sourcePath of sourceFiles.sort(compareStrings)) {
    let sourceText;
    try {
      sourceText = await readFile(sourcePath, "utf8");
    } catch {
      continue;
    }
    const sourceFile = ts.createSourceFile(
      toPosixPath(path.relative(graph.root, sourcePath)),
      sourceText,
      ts.ScriptTarget.Latest,
      true,
    );
    const relativePath = toPosixPath(path.relative(graph.root, sourcePath));
    collectModuleReferences(sourceFile, (node, specifier) => {
      const target = workspacePackageForSpecifier(specifier, graph.packageNames);
      if (!target) {
        return;
      }
      const sourcePackage = packageRecord.packageName;
      graph.edges.get(sourcePackage)?.add(target);
      const key = `${sourcePackage}\u0000${target}`;
      if (graph.edgeSites.has(key)) {
        return;
      }
      const location = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile, false),
      );
      graph.edgeSites.set(key, {
        column: location.character + 1,
        line: location.line + 1,
        path: relativePath,
      });
    });
  }
}

async function collectSourceFiles(directory, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries.sort((left, right) => compareStrings(left.name, right.name))) {
    const entryPath = path.join(directory, entry.name);
    let status;
    try {
      status = await lstat(entryPath);
    } catch {
      continue;
    }
    if (status.isSymbolicLink()) {
      continue;
    }
    if (status.isDirectory()) {
      if (!EXCLUDED_SOURCE_DIRECTORIES.has(entry.name)) {
        await collectSourceFiles(entryPath, files);
      }
      continue;
    }
    if (status.isFile() && hasSourceExtension(entry.name)) {
      files.push(entryPath);
    }
  }
}

function collectModuleReferences(sourceFile, onReference) {
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        onLiteralReference(node.moduleSpecifier, onReference);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference)) {
        onLiteralReference(node.moduleReference.expression, onReference);
      }
    } else if (ts.isImportTypeNode(node)) {
      const literal = ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined;
      onLiteralReference(literal, onReference);
    } else if (ts.isJSDocImportTag(node)) {
      onLiteralReference(node.moduleSpecifier, onReference);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isRequireResolve = ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === "require"
        && node.expression.name.text === "resolve";
      if (isDynamicImport || isRequire || isRequireResolve) {
        onLiteralReference(node.arguments[0], onReference);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function onLiteralReference(node, onReference) {
  const specifier = literalText(node);
  if (specifier !== null) {
    onReference(node, specifier);
  }
}

function workspacePackageForSpecifier(specifier, packageNames) {
  return packageNames.find(
    (packageName) => specifier === packageName || specifier.startsWith(`${packageName}/`),
  ) ?? null;
}

function literalText(node) {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : null;
}

function hasSourceExtension(fileName) {
  return SOURCE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return value.split("\\").join("/").split(path.sep).join("/");
}
