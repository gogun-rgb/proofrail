// @ts-check

import { MARKET_KERNEL_INPUT_SCHEMA_VERSION } from "@proofrail/contracts";
import { sha256Digest } from "./canonical-json.js";
import { evaluateMarketKernel } from "./market-kernel.js";

/** @typedef {import("@proofrail/contracts").MarketKernelInput} MarketKernelInput */
/** @typedef {import("@proofrail/contracts").MarketObservation} MarketObservation */
/** @typedef {import("@proofrail/contracts").VerificationReceipt} VerificationReceipt */
/** @typedef {import("@proofrail/contracts").MarketEvidenceBundle} MarketEvidenceBundle */
/** @typedef {import("@proofrail/contracts").MarketLifecycleEvent} MarketLifecycleEvent */
/** @typedef {import("@proofrail/contracts").MarketLifecycleState} MarketLifecycleState */
/** @typedef {import("@proofrail/contracts").MarketLifecycleNextAction} MarketLifecycleNextAction */
/** @typedef {import("@proofrail/contracts").MarketLifecyclePhase} MarketLifecyclePhase */
/** @typedef {Omit<MarketKernelInput, "observations" | "verificationReceipts"> & { observations: MarketObservation[]; verificationReceipts: VerificationReceipt[] }} MutableMarketKernelInput */

export const MARKET_LIFECYCLE_PHASES = Object.freeze([
  "COLLECTING_EVIDENCE",
  "READY_FOR_REEVALUATION",
  "TERMINAL",
  "BLOCKED",
]);

export class MarketLifecycleTransitionError extends Error {
  /** @param {string} code @param {string} [detail] */
  constructor(code, detail = "") {
    super(`MARKET_LIFECYCLE_${code}${detail === "" ? "" : `: ${detail}`}`);
    this.name = "MarketLifecycleTransitionError";
    this.code = code;
  }
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

/** @param {unknown} event @returns {MarketLifecycleEvent} */
function parseEvent(event) {
  if (!isRecord(event) || typeof event.id !== "string" || typeof event.kind !== "string") {
    throw new MarketLifecycleTransitionError("INVALID_EVENT");
  }
  if (!["OBSERVATION_COLLECTED", "VERIFICATION_RECEIPT_COLLECTED", "RE_EVALUATE"].includes(event.kind)) {
    throw new MarketLifecycleTransitionError("INVALID_EVENT", event.kind);
  }
  return /** @type {MarketLifecycleEvent} */ (event);
}

/** @param {unknown} input @returns {MarketLifecycleState} */
export function beginMarketEvaluation(input) {
  if (!isRecord(input) || input.schemaVersion !== MARKET_KERNEL_INPUT_SCHEMA_VERSION) {
    throw new MarketLifecycleTransitionError("INVALID_INPUT", "input schema version is not the market kernel v2 contract");
  }
  const snapshot = /** @type {MarketKernelInput} */ (/** @type {unknown} */ (structuredClone(input)));
  const bundle = evaluateMarketKernel(snapshot);
  const missingRequirementIds = missingRequirements(bundle);
  const phase = initialPhase(bundle, missingRequirementIds);
  const nextAction = actionFor(phase, bundle, missingRequirementIds);
  return freezeState({
    schemaVersion: "proofrail.market-lifecycle.v1",
    evaluationId: snapshot.evaluation.id,
    phase,
    input: snapshot,
    bundle,
    nextAction,
    processedEventIds: [],
    eventDigests: {},
  });
}

/** @param {unknown} stateInput @param {unknown} eventInput @returns {MarketLifecycleState} */
export function transitionMarketEvaluation(stateInput, eventInput) {
  assertState(stateInput);
  const state = /** @type {MarketLifecycleState} */ (stateInput);
  const event = parseEvent(eventInput);
  const digest = eventDigest(event);
  const hasKnownDigest = Object.prototype.hasOwnProperty.call(state.eventDigests, event.id);
  const knownDigest = hasKnownDigest ? state.eventDigests[event.id] : undefined;
  if (hasKnownDigest) {
    if (knownDigest !== digest) {
      throw new MarketLifecycleTransitionError("DUPLICATE_EVENT_CONFLICT", event.id);
    }
    return state;
  }
  if (state.phase === "TERMINAL" || state.phase === "BLOCKED") {
    throw new MarketLifecycleTransitionError("INVALID_TRANSITION", `cannot apply ${event.kind} after ${state.phase}`);
  }

  const nextInput = /** @type {MutableMarketKernelInput} */ (structuredClone(state.input));
  let phase = /** @type {MarketLifecyclePhase} */ (state.phase);
  let bundle = state.bundle;
  switch (event.kind) {
    case "OBSERVATION_COLLECTED":
      appendObservation(nextInput, event.observation);
      break;
    case "VERIFICATION_RECEIPT_COLLECTED":
      appendReceipt(nextInput, event.receipt);
      break;
    case "RE_EVALUATE": {
      bundle = evaluateMarketKernel(nextInput);
      const missingRequirementIds = missingRequirements(bundle);
      phase = phaseAfterEvaluation(bundle, missingRequirementIds);
      const nextAction = actionFor(phase, bundle, missingRequirementIds);
      return freezeState(nextState(state, event, digest, nextInput, bundle, phase, nextAction));
    }
    default:
      return assertNever(event);
  }

  bundle = evaluateMarketKernel(nextInput);
  const missingRequirementIds = missingRequirements(bundle);
  phase = phaseAfterCollection(bundle, missingRequirementIds);
  const nextAction = actionFor(phase, bundle, missingRequirementIds);
  return freezeState(nextState(state, event, digest, nextInput, bundle, phase, nextAction));
}

/** @param {MarketLifecycleState} state @returns {MarketLifecycleState} */
export function reevaluateMarketEvaluation(state) {
  const eventId = `event.reevaluate.${state.processedEventIds.length + 1}`;
  return transitionMarketEvaluation(state, { id: eventId, kind: "RE_EVALUATE" });
}

export const startMarketEvaluation = beginMarketEvaluation;
export const applyMarketEvaluationEvent = transitionMarketEvaluation;

/** @param {unknown} state @returns {asserts state is MarketLifecycleState} */
function assertState(state) {
  if (!isRecord(state) || state.schemaVersion !== "proofrail.market-lifecycle.v1"
      || typeof state.evaluationId !== "string"
      || typeof state.phase !== "string" || !MARKET_LIFECYCLE_PHASES.includes(state.phase)
      || !Array.isArray(state.processedEventIds) || !isRecord(state.eventDigests) || !state.input) {
    throw new MarketLifecycleTransitionError("INVALID_STATE");
  }
}

/** @param {unknown} event @returns {import("@proofrail/contracts").Sha256Digest} */
function eventDigest(event) {
  if (!isRecord(event) || typeof event.id !== "string" || event.id.length === 0) {
    throw new MarketLifecycleTransitionError("INVALID_EVENT", "event id is required");
  }
  try {
    return /** @type {import("@proofrail/contracts").Sha256Digest} */ (`sha256:${sha256Digest(event).toUpperCase()}`);
  } catch {
    throw new MarketLifecycleTransitionError("INVALID_EVENT", "event must be canonical JSON");
  }
}

/** @param {MutableMarketKernelInput} input @param {MarketObservation} observation */
function appendObservation(input, observation) {
  if (!observation || typeof observation !== "object" || typeof observation.id !== "string") {
    throw new MarketLifecycleTransitionError("INVALID_EVENT", "observation is required");
  }
  if (input.observations.some((item) => item.id === observation.id)) {
    throw new MarketLifecycleTransitionError("DUPLICATE_EVIDENCE", observation.id);
  }
  input.observations = [...input.observations, structuredClone(observation)];
}

/** @param {MutableMarketKernelInput} input @param {VerificationReceipt} receipt */
function appendReceipt(input, receipt) {
  if (!receipt || typeof receipt !== "object" || typeof receipt.id !== "string") {
    throw new MarketLifecycleTransitionError("INVALID_EVENT", "verification receipt is required");
  }
  if (input.verificationReceipts.some((item) => item.id === receipt.id)) {
    throw new MarketLifecycleTransitionError("DUPLICATE_EVIDENCE", receipt.id);
  }
  input.verificationReceipts = [...input.verificationReceipts, structuredClone(receipt)];
}

/** @param {MarketLifecycleState} state @param {MarketLifecycleEvent} event @param {import("@proofrail/contracts").Sha256Digest} digest @param {MutableMarketKernelInput} input @param {MarketEvidenceBundle} bundle @param {MarketLifecyclePhase} phase @param {MarketLifecycleNextAction} nextAction */
function nextState(state, event, digest, input, bundle, phase, nextAction) {
  return {
    ...state,
    phase,
    input,
    bundle,
    nextAction,
    processedEventIds: [...state.processedEventIds, event.id],
    eventDigests: { ...state.eventDigests, [event.id]: digest },
    verdict: phase === "COLLECTING_EVIDENCE" || phase === "READY_FOR_REEVALUATION" ? undefined : bundle.verdict,
  };
}

/** @param {MarketEvidenceBundle} bundle @returns {string[]} */
function missingRequirements(bundle) {
  const satisfied = new Set(bundle.evidence.map(({ requirementId }) => requirementId));
  return bundle.evidenceRequirements.map(({ id }) => id).filter((id) => !satisfied.has(id)).sort(compare);
}

/** @param {MarketEvidenceBundle} bundle @param {readonly string[]} missing @returns {MarketLifecyclePhase} */
function initialPhase(bundle, missing) {
  if (bundle.verdict === "BLOCKED") return "BLOCKED";
  return missing.length === 0 ? "READY_FOR_REEVALUATION" : "COLLECTING_EVIDENCE";
}

/** @param {MarketEvidenceBundle} bundle @param {readonly string[]} missing @returns {MarketLifecyclePhase} */
function phaseAfterCollection(bundle, missing) {
  if (bundle.verdict === "BLOCKED") return "READY_FOR_REEVALUATION";
  return missing.length === 0 ? "READY_FOR_REEVALUATION" : "COLLECTING_EVIDENCE";
}

/** @param {MarketEvidenceBundle} bundle @param {readonly string[]} missing @returns {MarketLifecyclePhase} */
function phaseAfterEvaluation(bundle, missing) {
  if (bundle.verdict === "BLOCKED") return "BLOCKED";
  if (bundle.verdict === "REVISION_REQUIRED" && missing.length > 0) return "COLLECTING_EVIDENCE";
  return "TERMINAL";
}

/** @param {MarketLifecyclePhase} phase @param {MarketEvidenceBundle} bundle @param {readonly string[]} missing @returns {MarketLifecycleNextAction} */
function actionFor(phase, bundle, missing) {
  switch (phase) {
    case "COLLECTING_EVIDENCE": return { kind: "COLLECT_EVIDENCE", requirementIds: [...missing] };
    case "READY_FOR_REEVALUATION": return { kind: "RE_EVALUATE" };
    case "BLOCKED": return { kind: "REMOVE_BLOCKER", reasonCodes: [...bundle.reasonCodes] };
    case "TERMINAL": return { kind: "START_NEW_EVALUATION", previousVerdict: bundle.verdict };
    default: return assertNeverPhase(phase);
  }
}

/** @param {MarketLifecycleEvent} value @returns {never} */
function assertNever(value) { throw new MarketLifecycleTransitionError("INVALID_EVENT", value.kind); }

/** @param {MarketLifecyclePhase} value @returns {never} */
function assertNeverPhase(value) { throw new MarketLifecycleTransitionError("INVALID_STATE", value); }

/** @param {MarketLifecycleState} state @returns {MarketLifecycleState} */
function freezeState(state) {
  return /** @type {MarketLifecycleState} */ (/** @type {unknown} */ (deepFreeze(state)));
}

/** @param {unknown} value @returns {unknown} */
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

/** @param {string} left @param {string} right */
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
