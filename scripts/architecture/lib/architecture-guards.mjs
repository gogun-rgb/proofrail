import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import { inspectWorkspaceImports } from "./workspace-imports.mjs";
import {
  findSharedAuthorityCouplings,
  findWorkspaceCycles,
} from "./workspace-graph.mjs";

export async function checkArchitectureGuards(
  repositoryRoot,
  architecture,
) {
  const root = path.resolve(repositoryRoot);
  const sortedNames = [...architecture.packageNames].sort(compareStrings);
  const edges = new Map(sortedNames.map((name) => [name, new Set()]));
  const edgeSites = new Map();
  const graph = { edgeSites, edges, packageNames: sortedNames, root };
  const findings = [];

  for (const packageName of sortedNames) {
    const packageRecord = await readPackageRecord(
      root,
      packageName,
      architecture.packageRules,
    );
    if (!packageRecord) {
      continue;
    }

    await inspectEntrypoints(
      packageRecord,
      architecture.packageLoadingSurfaces[packageName],
      root,
      findings,
    );
    inspectManifestWorkspaceImports(packageRecord, graph);
    await inspectWorkspaceImports(packageRecord, graph);
  }

  findings.push(...findWorkspaceCycles(edges, edgeSites));
  findings.push(...findSharedAuthorityCouplings(edges, edgeSites));
  return findings;
}

function inspectManifestWorkspaceImports(
  packageRecord,
  graph,
) {
  if (
    !packageRecord.manifest
    || typeof packageRecord.manifest !== "object"
    || Array.isArray(packageRecord.manifest)
  ) {
    return;
  }
  const sections = ["dependencies", "optionalDependencies", "peerDependencies"];
  for (const section of sections) {
    const declarations = packageRecord.manifest[section];
    if (!declarations || typeof declarations !== "object" || Array.isArray(declarations)) {
      continue;
    }
    for (const dependencyName of Object.keys(declarations).sort(compareStrings)) {
      const target = graph.packageNames.find(
        (packageName) => dependencyName === packageName || dependencyName.startsWith(`${packageName}/`),
      );
      if (!target) {
        continue;
      }
      const source = packageRecord.packageName;
      graph.edges.get(source)?.add(target);
      const key = `${source}\u0000${target}`;
      if (graph.edgeSites.has(key)) {
        continue;
      }
      graph.edgeSites.set(key, {
        path: toPosixPath(path.relative(graph.root, packageRecord.manifestPath)),
        line: 1,
        column: 1,
      });
    }
  }
}

async function readPackageRecord(root, packageName, packageRules) {
  const rule = packageRules[packageName];
  if (!rule) {
    return null;
  }
  const packageRoot = path.join(root, "packages", rule.directory);
  let packageStatus;
  try {
    packageStatus = await lstat(packageRoot);
  } catch {
    return null;
  }
  if (packageStatus.isSymbolicLink() || !packageStatus.isDirectory()) {
    return null;
  }

  const manifestPath = path.join(packageRoot, "package.json");
  let manifestStatus;
  try {
    manifestStatus = await lstat(manifestPath);
  } catch {
    return null;
  }
  if (manifestStatus.isSymbolicLink() || !manifestStatus.isFile()) {
    return null;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
  return { manifest, manifestPath, packageName, packageRoot };
}

async function inspectEntrypoints(packageRecord, expectedSurface, root, findings) {
  if (!expectedSurface) {
    return;
  }
  const targets = [...collectRelativeTargets(expectedSurface)].sort(compareStrings);
  for (const target of targets) {
    const targetPath = path.resolve(packageRecord.packageRoot, target);
    const manifestPath = toPosixPath(path.relative(root, packageRecord.manifestPath));
    if (!isWithin(packageRecord.packageRoot, targetPath)) {
      findings.push({
        id: "ARCHCHK_ENTRYPOINT_ESCAPE",
        path: manifestPath,
        line: 1,
        column: 1,
        target,
      });
      continue;
    }

    let status;
    try {
      status = await lstat(targetPath);
    } catch (error) {
      findings.push({
        id: error?.code === "ENOENT"
          ? "ARCHCHK_ENTRYPOINT_MISSING"
          : "ARCHCHK_ENTRYPOINT_UNINSPECTABLE",
        path: manifestPath,
        line: 1,
        column: 1,
        target,
      });
      continue;
    }
    if (status.isSymbolicLink() || !status.isFile()) {
      findings.push({
        id: "ARCHCHK_ENTRYPOINT_UNINSPECTABLE",
        path: manifestPath,
        line: 1,
        column: 1,
        target,
      });
    }
  }
}


function collectRelativeTargets(value, targets = new Set()) {
  if (typeof value === "string") {
    if (value.startsWith("./")) {
      targets.add(value);
    }
    return targets;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRelativeTargets(item, targets);
    }
    return targets;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectRelativeTargets(nested, targets);
    }
  }
  return targets;
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === ""
    || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return value.split("\\").join("/").split(path.sep).join("/");
}
