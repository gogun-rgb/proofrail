import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEvidencePacket, canonicalJson } from "../../packages/evidence-gate/src/index.js";

function sampleInput(overrides = {}) {
  return {
    pullRequest: {
      id: "PR-1",
      title: "AI generated change",
      sourceRef: "feature/example"
    },
    claims: [
      {
        id: "claim-tests-pass",
        text: "Builder claims the relevant tests pass.",
        source: "builder-summary",
        observedEvidenceIds: ["ev-test-output"],
        requiredEvidenceIds: ["req-test-output", "req-independent-review"]
      },
      {
        id: "claim-scope-contained",
        text: "Builder claims the change stays inside allowed scope.",
        source: "builder-summary",
        observedEvidenceIds: ["ev-diff-summary"],
        requiredEvidenceIds: ["req-diff-summary"]
      }
    ],
    observedEvidence: [
      {
        id: "ev-test-output",
        kind: "test-output",
        summary: "Static input includes a successful local test transcript.",
        source: "provided-static-input",
        satisfies: ["req-test-output"]
      },
      {
        id: "ev-diff-summary",
        kind: "diff-summary",
        summary: "Static input lists the changed files.",
        source: "provided-static-input",
        satisfies: ["req-diff-summary"]
      }
    ],
    requiredEvidence: [
      {
        id: "req-test-output",
        description: "A concrete test output must be present."
      },
      {
        id: "req-diff-summary",
        description: "A concrete changed-file summary must be present."
      },
      {
        id: "req-independent-review",
        description: "Independent review must inspect the exact head."
      }
    ],
    scope: {
      declaredWriteScope: ["packages/evidence-gate/**", "tests/evidence-gate/**"],
      changedPaths: ["packages/evidence-gate/src/index.js", "tests/evidence-gate/evidence-packet.test.mjs"]
    },
    reviewNeeds: ["Confirm the packet input came from an authorized collector."],
    ...overrides
  };
}

test("buildEvidencePacket keeps claims separate from observed evidence and missing evidence", () => {
  const packet = buildEvidencePacket(sampleInput());

  assert.equal(packet.packetVersion, "ai-pr-evidence-gate.v0");
  assert.equal(packet.claims.length, 2);
  assert.equal(packet.observedEvidence.length, 2);
  assert.equal(packet.missingEvidence.length, 1);

  const claim = packet.claims.find((item) => item.id === "claim-tests-pass");
  assert.ok(claim);
  assert.deepEqual(claim.observedEvidenceIds, ["ev-test-output"]);
  assert.deepEqual(claim.missingEvidenceIds, ["req-independent-review"]);

  assert.deepEqual(packet.missingEvidence, [
    {
      id: "req-independent-review",
      description: "Independent review must inspect the exact head.",
      neededForClaimIds: ["claim-tests-pass"]
    }
  ]);
});

test("buildEvidencePacket preserves changed paths outside declared scope", () => {
  const packet = buildEvidencePacket(sampleInput({
    scope: {
      declaredWriteScope: ["packages/evidence-gate/**"],
      changedPaths: ["packages/evidence-gate/src/index.js", "README.md"]
    }
  }));

  assert.deepEqual(packet.scope.outsideDeclaredScope, ["README.md"]);
  assert.ok(packet.reviewNeeds.includes("Review path outside declared scope: README.md"));
});

test("buildEvidencePacket produces deterministic packets for reordered input", () => {
  const first = buildEvidencePacket(sampleInput());
  const second = buildEvidencePacket(sampleInput({
    claims: [...sampleInput().claims].reverse(),
    observedEvidence: [...sampleInput().observedEvidence].reverse(),
    requiredEvidence: [...sampleInput().requiredEvidence].reverse(),
    scope: {
      declaredWriteScope: ["tests/evidence-gate/**", "packages/evidence-gate/**"],
      changedPaths: ["tests/evidence-gate/evidence-packet.test.mjs", "packages/evidence-gate/src/index.js"]
    }
  }));

  assert.equal(first.inputDigest, second.inputDigest);
  assert.equal(canonicalJson(first), canonicalJson(second));
});

test("buildEvidencePacket does not overclaim readiness or release state", () => {
  const packet = buildEvidencePacket(sampleInput());

  assert.equal(packet.boundaries.staticInputOnly, true);
  assert.equal(packet.boundaries.productVerdict, null);
  assert.equal(packet.boundaries.productReadiness, false);
  assert.equal(packet.boundaries.trustedRelease, false);
});

test("buildEvidencePacket rejects malformed static input", () => {
  assert.throws(() => buildEvidencePacket({}), /pullRequest must be an object/);
  assert.throws(() => buildEvidencePacket(sampleInput({ claims: "not-array" })), /claims must be an array/);
});
