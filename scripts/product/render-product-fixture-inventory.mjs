#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderProductFixtureInventory } from "./lib/product-fixtures.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const referencePath = path.join(repositoryRoot, "docs", "reference", "product-fixtures.md");

try {
  const rendered = await renderProductFixtureInventory({ repositoryRoot });
  const committed = await readFile(referencePath, "utf8");
  if (committed !== rendered) {
    throw Object.assign(new Error("generated product fixture inventory is stale"), {
      code: "PRODUCT_FIXTURE_INVENTORY_DRIFT",
    });
  }
  process.stdout.write(`${JSON.stringify({ file: "docs/reference/product-fixtures.md", status: "PASS" })}\n`);
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "PRODUCT_FIXTURE_INVENTORY_UNEXPECTED";
  const message = String(error?.message ?? "unexpected failure").replace(/[\r\n\t]+/g, " ").slice(0, 240);
  process.stderr.write(`product-fixture-inventory: ${code}: ${message}\n`);
  process.exitCode = 1;
}
