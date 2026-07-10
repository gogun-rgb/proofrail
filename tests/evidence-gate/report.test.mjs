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

test("human report escapes every fixed structure-control code point exactly", () => {
  const ranges = [
    [0x0000, 0x001f],
    [0x007f, 0x009f],
    [0x00ad, 0x00ad],
    [0x0600, 0x0605],
    [0x061c, 0x061c],
    [0x06dd, 0x06dd],
    [0x070f, 0x070f],
    [0x0890, 0x0891],
    [0x08e2, 0x08e2],
    [0x180e, 0x180e],
    [0x200b, 0x200f],
    [0x2028, 0x202e],
    [0x2060, 0x2064],
    [0x2066, 0x206f],
    [0xfeff, 0xfeff],
    [0xfff9, 0xfffb],
    [0x110bd, 0x110bd],
    [0x110cd, 0x110cd],
    [0x13430, 0x1343f],
    [0x1bca0, 0x1bca3],
    [0x1d173, 0x1d17a],
    [0xe0001, 0xe0001],
    [0xe0020, 0xe007f]
  ];

  let testedCodePoints = 0;
  for (const [start, end] of ranges) {
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      testedCodePoints += 1;
      const escaped = codePoint <= 0xffff
        ? "\\u" + codePoint.toString(16).padStart(4, "0").toUpperCase()
        : "\\u{" + codePoint.toString(16).toUpperCase() + "}";
      const report = renderHumanReport({
        pullRequest: {
          id: "range",
          title: String.fromCodePoint(codePoint),
          sourceRef: "head"
        }
      });
      assert.ok(
        report.includes("- Title: " + escaped + "\n"),
        "expected U+" + codePoint.toString(16).toUpperCase() + " to render as " + escaped
      );
    }
  }
  assert.equal(testedCodePoints, 237);
});

test("human report preserves printable non-format Unicode without normalization", () => {
  const safeBoundaries = [
    0x00ac, 0x00ae, 0x0606, 0x0892, 0x200a, 0x2010,
    0x2065, 0xfff8, 0xfffc, 0x110be, 0x13440, 0xe0002
  ].map((codePoint) => String.fromCodePoint(codePoint)).join("");
  const safeText = "한글 café e\u0301 😀 " + safeBoundaries;
  const report = renderHumanReport({
    pullRequest: { id: "safe", title: safeText, sourceRef: "head" }
  });
  assert.ok(report.includes("- Title: " + safeText + "\n"));
  assert.ok(report.includes("e\u0301"));
  assert.doesNotMatch(report, /\\u\{1F600\}/);
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
