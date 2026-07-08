import fs from "node:fs";
import path from "node:path";

import { resolveRepoPath } from "./path-utils.mjs";

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

export function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function readJsonFile(root, repoPath, collector, code = "HARN_JSON_READ_FAILED") {
  try {
    return JSON.parse(fs.readFileSync(resolveRepoPath(root, repoPath), "utf8"));
  } catch (error) {
    const detail = error instanceof SyntaxError ? "invalid JSON syntax" : "file is missing or unreadable";
    collector.add(code, repoPath, `Unable to read JSON: ${detail}.`, "Restore valid JSON at this path.");
    return null;
  }
}

export function readTextFile(root, repoPath) {
  return fs.readFileSync(resolveRepoPath(root, repoPath), "utf8");
}

export function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stableStringify(value), "utf8");
}
