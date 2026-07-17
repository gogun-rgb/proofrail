import {
  canonicalJson,
  clockIso,
  deepFreeze,
  isPlainRecord,
  MAX_TELEMETRY_EVENTS,
  redactJson,
  boundedUtf8,
} from "./market-common.mjs";

const SCHEMA_VERSION = "proofrail.telemetry.local.v1";

export class LocalTelemetryError extends Error {
  /** @param {string} code */
  constructor(code) {
    super(code);
    this.name = "LocalTelemetryError";
    this.code = code;
  }
}
/** @param {{ bundle?: unknown, clock?: { now: () => Date }, enabled?: boolean, events?: readonly unknown[] }} options */
export function createLocalTelemetry(options = {}) {
  if (!isPlainRecord(options)) throw new LocalTelemetryError("OPTIONS_INVALID");
  const enabled = options.enabled !== false;
  if (!enabled) return deepFreeze({ schemaVersion: SCHEMA_VERSION, enabled: false, networkTransmission: false, events: [] });
  const customEvents = options.events ?? [];
  if (!Array.isArray(customEvents)) throw new LocalTelemetryError("EVENTS_INVALID");
  const bundle = isPlainRecord(options.bundle) ? options.bundle : {};
  const at = clockIso((options.clock ?? { now: () => new Date() }).now(), "clock.now");
  const events = [];
  add(events, { kind: "INSTALLATION", at, localOnly: true });
  add(events, { kind: "CONFIGURATION_PARSED", at, accepted: true });
  add(events, { kind: "VERIFICATION_STARTED", at, commandCount: count(bundle.verificationReceipts) });
  const receipts = Array.isArray(bundle.verificationReceipts) ? bundle.verificationReceipts : [];
  if (receipts.length === 0) add(events, { kind: "COMMAND_DURATION", at, commandName: null, durationMs: 0, status: "NOT_STARTED" });
  for (const receipt of receipts) {
    const command = isPlainRecord(receipt?.command) ? receipt.command : {};
    const result = isPlainRecord(receipt?.result) ? receipt.result : {};
    add(events, {
      kind: "COMMAND_DURATION",
      at,
      commandName: boundedOptional(command.name),
      durationMs: finiteNonNegative(result.durationMs ?? receipt?.timing?.durationMs),
      status: boundedOptional(result.status),
    });
  }
  add(events, { kind: "VERDICT", at, verdict: boundedOptional(bundle.verdict), targetHeadSha: boundedOptional(bundle.target?.headSha) });
  const reasonCodes = strings(bundle.reasonCodes);
  add(events, { kind: "REASON_CODES", at, reasonCodes });
  for (const reasonCode of reasonCodes) {
    if (/STALE_TARGET|STALE/i.test(reasonCode)) add(events, { kind: "STALE_TARGET", at, reasonCode });
    if (/ARTIFACT/i.test(reasonCode)) add(events, { kind: "ARTIFACT_FAILURE", at, reasonCode });
  }
  if (bundle.verdict !== "ADMISSIBLE") add(events, { kind: "RERUN_INTENT", at, reasonCodes });
  for (const event of customEvents) add(events, normalizeEvent(event, at));
  const boundedEvents = events.slice(0, MAX_TELEMETRY_EVENTS);
  return deepFreeze({ schemaVersion: SCHEMA_VERSION, enabled: true, networkTransmission: false, events: boundedEvents });
}

/** @param {{ failure: { stage: string, reason: string }, clock?: { now: () => Date }, configurationParsed?: boolean, enabled?: boolean, evaluationCompleted?: boolean, receipts?: readonly unknown[], verificationStarted?: boolean }} options */
export function createLocalDeliveryFailureTelemetry(options = {}) {
  if (!isPlainRecord(options)) throw new LocalTelemetryError("OPTIONS_INVALID");
  const enabled = enabledOption(options.enabled);
  if (!enabled) return deepFreeze({ schemaVersion: SCHEMA_VERSION, enabled: false, networkTransmission: false, events: [] });
  const failure = deliveryFailure(options.failure);
  const configurationParsed = optionalBoolean(options.configurationParsed, "CONFIGURATION_PARSED_INVALID");
  const verificationStarted = optionalBoolean(options.verificationStarted, "VERIFICATION_STARTED_INVALID");
  const evaluationCompleted = optionalBoolean(options.evaluationCompleted, "EVALUATION_COMPLETED_INVALID");
  const receipts = deliveryReceipts(options.receipts);
  if ((!configurationParsed && verificationStarted) || (!verificationStarted && (receipts.length > 0 || evaluationCompleted))) {
    throw new LocalTelemetryError("MILESTONES_INVALID");
  }
  const at = deliveryTime(options.clock);
  const staleTarget = failure.reason === "PRF_STALE_TARGET";
  const artifactFailure = failure.stage === "OUTPUT";
  const fixedEventCount = 3 + Number(configurationParsed) + Number(verificationStarted) + Number(evaluationCompleted) + Number(staleTarget) + Number(artifactFailure);
  const events = [];
  add(events, { kind: "INSTALLATION", at, localOnly: true });
  if (configurationParsed) add(events, { kind: "CONFIGURATION_PARSED", at, accepted: true });
  if (verificationStarted) {
    add(events, { kind: "VERIFICATION_STARTED", at, commandCount: receipts.length });
    for (const receipt of receipts.slice(0, Math.max(0, MAX_TELEMETRY_EVENTS - fixedEventCount))) {
      add(events, { kind: "COMMAND_DURATION", at, commandName: receipt.commandName, durationMs: receipt.durationMs, status: receipt.status });
    }
  }
  if (evaluationCompleted) add(events, { kind: "EVALUATION_COMPLETED", at, completed: true });
  add(events, { kind: "DELIVERY_FAILURE", at, stage: failure.stage, reason: failure.reason });
  if (staleTarget) add(events, { kind: "STALE_TARGET", at, reason: failure.reason });
  if (artifactFailure) add(events, { kind: "ARTIFACT_FAILURE", at, stage: failure.stage });
  add(events, { kind: "RERUN_INTENT", at, deliveryStage: failure.stage, deliveryReason: failure.reason });
  return deepFreeze({ schemaVersion: SCHEMA_VERSION, enabled: true, networkTransmission: false, events });
}

/** @param {unknown} telemetry */
export function canonicalLocalTelemetryText(telemetry) {
  return `${canonicalJson(telemetry)}\n`;
}

/** @param {unknown} telemetry */
export function canonicalTelemetryJsonl(telemetry) {
  if (!isPlainRecord(telemetry) || !Array.isArray(telemetry.events)) throw new LocalTelemetryError("TELEMETRY_INVALID");
  return telemetry.events.map((event) => `${canonicalJson(event)}\n`).join("");
}

function add(events, event) {
  events.push(normalizeEvent(event, event.at));
}

function normalizeEvent(value, at) {
  if (!isPlainRecord(value) || typeof value.kind !== "string" || value.kind.length === 0) throw new LocalTelemetryError("EVENT_INVALID");
  let redacted;
  try {
    redacted = redactJson({ ...value, at });
  } catch {
    throw new LocalTelemetryError("EVENT_INVALID");
  }
  return { ...redacted.value, kind: boundedUtf8(String(redacted.value.kind), 128), at };
}

function count(value) { return Array.isArray(value) ? value.length : 0; }

function strings(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string").map((entry) => boundedUtf8(entry, 256)).sort() : [];
}

function boundedOptional(value) {
  return typeof value === "string" ? boundedUtf8(value, 512) : null;
}

function finiteNonNegative(value) {
  return Number.isFinite(value) && Number(value) >= 0 ? Number(value) : 0;
}

function enabledOption(value) {
  if (value === undefined) return true;
  if (typeof value !== "boolean") throw new LocalTelemetryError("ENABLED_INVALID");
  return value;
}

function optionalBoolean(value, code) {
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new LocalTelemetryError(code);
  return value;
}

function deliveryFailure(value) {
  if (!isPlainRecord(value) || typeof value.stage !== "string" || value.stage.length === 0 || typeof value.reason !== "string" || value.reason.length === 0) {
    throw new LocalTelemetryError("FAILURE_INVALID");
  }
  return { stage: redactedBoundedOptional(value.stage, 128), reason: redactedBoundedOptional(value.reason, 256) };
}

function deliveryReceipts(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new LocalTelemetryError("RECEIPTS_INVALID");
  return value.map((receipt) => {
    if (!isPlainRecord(receipt)) throw new LocalTelemetryError("RECEIPTS_INVALID");
    if (receipt.command !== undefined && !isPlainRecord(receipt.command)) throw new LocalTelemetryError("RECEIPTS_INVALID");
    if (receipt.result !== undefined && !isPlainRecord(receipt.result)) throw new LocalTelemetryError("RECEIPTS_INVALID");
    if (receipt.timing !== undefined && !isPlainRecord(receipt.timing)) throw new LocalTelemetryError("RECEIPTS_INVALID");
    const command = receipt.command ?? {};
    const result = receipt.result ?? {};
    return {
      commandName: redactedBoundedOptional(command.name, 512),
      durationMs: finiteNonNegative(result.durationMs ?? receipt.timing?.durationMs),
      status: redactedBoundedOptional(result.status, 512),
    };
  });
}

function redactedBoundedOptional(value, maxBytes) {
  if (typeof value !== "string") return null;
  return boundedUtf8(redactJson(value).value, maxBytes);
}

function deliveryTime(clock) {
  const source = clock ?? { now: () => new Date() };
  if (!isPlainRecord(source) || typeof source.now !== "function") throw new LocalTelemetryError("CLOCK_INVALID");
  try {
    return clockIso(source.now(), "clock.now");
  } catch {
    throw new LocalTelemetryError("CLOCK_INVALID");
  }
}
