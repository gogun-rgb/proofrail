#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TRACKED_PATHSPECS = Object.freeze([
  ":(glob)config/evidence-contracts/*.json",
  ":(glob)config/policies/*.json",
  ":(glob)config/reason-codes/*.json",
  ":(glob)config/trusted/*.json",
  "docs/reference/product-fixtures.md",
  "docs/reference/reason-codes.md",
  ":(glob)examples/**/*.json",
  ":(glob)examples/**/*expected*.txt",
  ":(glob)fixtures/product/**/*.json",
  ":(glob)fixtures/product/**/*expected*.txt",
  ":(glob)governance/*.json",
  ":(glob)governance/clean-agent-runs/**/*.json",
  ":(glob)governance/tasks/*.json",
  ":(glob)schemas/product/*.json",
]);

export function checkLfAttributes(repositoryRoot) {
  const selected = selectTrackedPaths(repositoryRoot);
  if (selected.findings.length > 0) {
    return selected.findings;
  }
  return checkLfAttributesForPaths(repositoryRoot, selected.paths);
}

function checkLfAttributesForPaths(repositoryRoot, tracked) {
  let output;
  try {
    output = runGit(
      repositoryRoot,
      ["check-attr", "-z", "text", "eol", "--", ...tracked],
      "utf8",
    );
  } catch {
    return [finding("LFCHK_GIT_FAILURE", ".gitattributes", "<check-attr>")];
  }

  const fields = output.split("\0");
  if (fields.pop() !== "" || fields.length % 3 !== 0) {
    return [finding("LFCHK_ATTRIBUTE_OUTPUT_INVALID", ".gitattributes", "<check-attr>")];
  }

  const attributes = new Map();
  for (let index = 0; index < fields.length; index += 3) {
    const [file, attribute, value] = fields.slice(index, index + 3);
    attributes.set(`${file}\0${attribute}`, value);
  }

  const findings = [];
  for (const file of tracked) {
    if (attributes.get(`${file}\0text`) !== "set") {
      findings.push(finding("LFCHK_ATTRIBUTE_INVALID", file, "text"));
    }
    if (attributes.get(`${file}\0eol`) !== "lf") {
      findings.push(finding("LFCHK_ATTRIBUTE_INVALID", file, "eol"));
    }
  }
  if (attributes.size !== tracked.length * 2) {
    findings.push(finding("LFCHK_ATTRIBUTE_OUTPUT_INVALID", ".gitattributes", "<attribute-set>"));
  }
  return findings.sort(compareFindings);
}

export async function checkAutocrlfCheckout(repositoryRoot) {
  const selected = selectTrackedPaths(repositoryRoot);
  if (selected.findings.length > 0) {
    return selected.findings;
  }
  return checkAutocrlfCheckoutForPaths(repositoryRoot, selected.paths);
}

async function checkAutocrlfCheckoutForPaths(repositoryRoot, tracked) {
  const checkoutRoot = await mkdtemp(path.join(tmpdir(), "proofrail-lf-checkout-"));
  const findings = [];
  try {
    try {
      runGit(
        repositoryRoot,
        [
          "-c",
          "core.autocrlf=true",
          "checkout-index",
          "--force",
          `--prefix=${toGitPath(checkoutRoot)}/`,
          "--",
          ...tracked,
        ],
        "utf8",
      );
    } catch {
      return [finding("LFCHK_GIT_FAILURE", ".gitattributes", "<checkout-index>")];
    }

    for (const file of tracked) {
      let indexBytes;
      let checkoutBytes;
      try {
        indexBytes = runGit(repositoryRoot, ["show", `:${file}`], null);
        checkoutBytes = await readFile(path.join(checkoutRoot, ...file.split("/")));
      } catch {
        findings.push(finding("LFCHK_CHECKOUT_UNREADABLE", file, "<bytes>"));
        continue;
      }
      if (indexBytes.includes(13)) {
        findings.push(finding("LFCHK_INDEX_NON_LF", file, "<cr>"));
      }
      if (!indexBytes.equals(checkoutBytes)) {
        findings.push(finding("LFCHK_AUTOCRLF_MISMATCH", file, "<bytes>"));
      }
    }
  } finally {
    await rm(checkoutRoot, { force: true, recursive: true });
  }

  return findings.sort(compareFindings);
}

export async function verifyLfCheckout(repositoryRoot) {
  const selected = selectTrackedPaths(repositoryRoot);
  if (selected.findings.length > 0) {
    return selected.findings;
  }
  return [
    ...checkLfAttributesForPaths(repositoryRoot, selected.paths),
    ...await checkAutocrlfCheckoutForPaths(repositoryRoot, selected.paths),
  ].sort(compareFindings);
}

function selectTrackedPaths(repositoryRoot) {
  let output;
  try {
    output = runGit(
      repositoryRoot,
      ["ls-files", "-z", "--", ...TRACKED_PATHSPECS],
      "utf8",
    );
  } catch {
    return {
      findings: [finding("LFCHK_GIT_FAILURE", ".gitattributes", "<ls-files>")],
      paths: [],
    };
  }

  const paths = output.split("\0").filter(Boolean).sort(compareStrings);
  if (paths.length === 0) {
    return {
      findings: [finding("LFCHK_TRACKED_SET_EMPTY", ".gitattributes", "<tracked>")],
      paths,
    };
  }
  return { findings: [], paths };
}

function runGit(repositoryRoot, args, encoding) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error("git command failed");
  }
  return result.stdout;
}

function finding(id, file, target) {
  return { id, path: file, target };
}

function compareFindings(left, right) {
  return compareStrings(left.path, right.path)
    || compareStrings(left.id, right.id)
    || compareStrings(left.target, right.target);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toGitPath(value) {
  return value.split(path.sep).join("/");
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    process.stderr.write(`${JSON.stringify(
      finding("LFCHK_ARGUMENT_UNSUPPORTED", "scripts/governance/verify-lf-checkout.mjs", "<argument>"),
    )}\n`);
    return 1;
  }

  const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
  const findings = await verifyLfCheckout(repositoryRoot);
  if (findings.length > 0) {
    process.stderr.write(`${findings.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
    return 1;
  }
  process.stdout.write("LF checkout verification passed.\n");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
