// @ts-check

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateKernel } from "../src/index.js";
import { makeInput, clone } from "./helpers.js";

test("finalized bundle and nested records are deeply frozen", () => {
  const bundle = evaluateKernel(makeInput());
  const before = clone(bundle);

  assert.equal(Object.isFrozen(bundle), true);
  assert.equal(Object.isFrozen(bundle.claims), true);
  assert.equal(Object.isFrozen(bundle.claims[0]), true);
  assert.equal(Object.isFrozen(bundle.evidenceLineage), true);
  assert.equal(Object.isFrozen(bundle.evidenceLineage[0]), true);

  assert.throws(() => {
    /** @type {any[]} */ (/** @type {any} */ (bundle.claims)).push({
      id: "claim.mutation",
      targetScopeId: "scope.repo",
      statement: "attempted mutation"
    });
  }, TypeError);

  assert.throws(() => {
    /** @type {any} */ (bundle.claims[0]).statement = "mutated";
  }, TypeError);

  assert.deepEqual(bundle, before);
});
