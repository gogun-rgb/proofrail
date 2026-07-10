import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildEvidencePacket } from "../../packages/evidence-gate/src/index.js";
import { renderHumanReport } from "../../packages/evidence-gate/src/report.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INPUT = path.join(ROOT, "examples/evidence-gate/input.json");
const EXPECTED = path.join(ROOT, "examples/evidence-gate/expected-report.txt");

function exampleInput() {
  return JSON.parse(readFileSync(INPUT, "utf8"));
}

test("human report matches the deterministic golden fixture", () => {
  const packet = buildEvidencePacket(exampleInput());
  const expected = readFileSync(EXPECTED, "utf8").replace(/\r\n/g, "\n");
  assert.equal(renderHumanReport(packet), expected);
});

test("human report is stable for reordered equivalent input", () => {
  const first = exampleInput();
  const second = exampleInput();
  second.claims.reverse();
  second.observedEvidence.reverse();
  second.requiredEvidence.reverse();
  second.scope.changedPaths.reverse();
  second.reviewNeeds.reverse();
  assert.equal(
    renderHumanReport(buildEvidencePacket(first)),
    renderHumanReport(buildEvidencePacket(second))
  );
});

test("human report escapes control, ANSI, and newline characters", () => {
  const input = exampleInput();
  input.pullRequest.title = "unsafe\n\u001b[31mred";
  input.observedEvidence[0].summary = "line one\nline two";
  const report = renderHumanReport(buildEvidencePacket(input));
  assert.ok(report.includes("unsafe\\u000A\\u001B[31mred"));
  assert.ok(report.includes("line one\\u000Aline two"));
  assert.doesNotMatch(report, /\u001b/);
});

test("human report renders empty collections explicitly", () => {
  const packet = buildEvidencePacket({
    pullRequest: { id: "empty", title: "empty", sourceRef: null },
    claims: [],
    observedEvidence: [],
    requiredEvidence: [],
    scope: { declaredWriteScope: [], changedPaths: [] },
    reviewNeeds: []
  });
  const report = renderHumanReport(packet);
  assert.match(report, /- Missing evidence: 0/);
  assert.match(report, /- Review needs: 0/);
  assert.match(report, /- \(none\)/);
  assert.match(report, /Product Verdict: not produced/);
});
