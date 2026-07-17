import { createHash } from "node:crypto";

export const DEFAULT_MAX_PREVIEW_BYTES = 8192;
export const DEFAULT_MAX_TEXT_BYTES = 16384;
export const DEFAULT_MAX_BUNDLE_BYTES = 1024 * 1024;
export const MAX_TELEMETRY_EVENTS = 64;

const SECRET_PATTERNS = Object.freeze([
  /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}={0,2}/gi,
]);
const ASSIGNMENT_LABEL_PATTERN = /[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*/g;

/** @param {string} label */
function isSecretLabel(label) {
  const parts = label.toLowerCase().split(/[_-]+/);
  const last = parts.at(-1);
  return last === "token"
    || last === "password"
    || last === "authorization"
    || parts.includes("secret")
    || (last === "key" && (parts.includes("api") || parts.includes("private") || parts.includes("access")));
}

/** @param {unknown} value */
export function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** @param {string} key */
function isSecretKey(key) {
  return /(?:token|password|secret|api[_-]?key|authorization|private[_-]?key)/i.test(key);
}

/** @param {unknown} value @param {string} [field] */
export function canonicalizeJson(value, field = "value", depth = 0) {
  if (depth > 64) throw new TypeError(`${field} is too deeply nested`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${field} must contain finite numbers`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => canonicalizeJson(entry, `${field}[${index}]`, depth + 1));
  if (isPlainRecord(value)) {
    const result = Object.create(null);
    for (const key of Object.keys(value).sort(compareStrings)) {
      Object.defineProperty(result, key, {
        value: canonicalizeJson(value[key], `${field}.${key}`, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return result;
  }
  throw new TypeError(`${field} must be JSON-compatible`);
}

/** @param {unknown} value */
export function canonicalJson(value) {
  return JSON.stringify(canonicalizeJson(value));
}

/** @param {string} value */
export function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex").toUpperCase()}`;
}

/** @param {Uint8Array} value */
export function sha256Bytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex").toUpperCase()}`;
}

/** @param {unknown} value */
export function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

/** @param {unknown} value @param {number} maxBytes */
export function boundedUtf8(value, maxBytes) {
  const text = String(value);
  const bytes = Buffer.from(text, "utf8");
  if (bytes.byteLength <= maxBytes) return text;
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString("utf8");
}

/** @param {unknown} value @param {number} [maxBytes] */
export function redactText(value, maxBytes = DEFAULT_MAX_TEXT_BYTES) {
  let text = String(value);
  let matchCount = 0;
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, () => {
      matchCount += 1;
      return "[REDACTED]";
    });
  }
  const assignments = redactAssignments(text);
  if (assignments.matchCount > 0) {
    matchCount += assignments.matchCount;
    text = assignments.text;
  }
  return { text: boundedUtf8(text, maxBytes), matchCount };
}

/** @param {string} text */
function redactAssignments(text) {
  const replacements = [];
  for (const labelMatch of text.matchAll(ASSIGNMENT_LABEL_PATTERN)) {
    const label = labelMatch[0];
    const labelStart = labelMatch.index;
    if (!isSecretLabel(label) || (labelStart > 0 && /[A-Za-z0-9]/.test(text[labelStart - 1]))) continue;

    let cursor = labelStart + label.length;
    const keyQuote = text[cursor];
    if (keyQuote === "'" || keyQuote === '"' || keyQuote === "`") {
      let afterQuote = cursor + 1;
      while (/\s/.test(text[afterQuote] ?? "")) afterQuote += 1;
      if (text[afterQuote] !== ":" && text[afterQuote] !== "=") continue;
      cursor = afterQuote;
    } else {
      while (/\s/.test(text[cursor] ?? "")) cursor += 1;
      if (text[cursor] !== ":" && text[cursor] !== "=") continue;
    }

    let valueStart = cursor + 1;
    while (/\s/.test(text[valueStart] ?? "")) valueStart += 1;
    if (text.startsWith("[REDACTED]", valueStart)) continue;
    const valueQuote = text[valueStart];
    if (valueQuote === "'" || valueQuote === '"' || valueQuote === "`") {
      let valueEnd = valueStart + 1;
      let escaped = false;
      for (; valueEnd < text.length; valueEnd += 1) {
        const character = text[valueEnd];
        if (escaped) { escaped = false; continue; }
        if (character === "\\") { escaped = true; continue; }
        if (character === valueQuote) break;
        if (character === "\r" || character === "\n") break;
      }
      const closingQuote = text[valueEnd] === valueQuote ? valueEnd : valueEnd;
      if (text.slice(valueStart + 1, closingQuote) === "[REDACTED]") continue;
      replacements.push({ start: valueStart + 1, end: closingQuote, value: "[REDACTED]" });
      continue;
    }

    let valueEnd = valueStart;
    while (valueEnd < text.length && !/[\s,}\]]/.test(text[valueEnd])) valueEnd += 1;
    if (valueEnd === valueStart || text.slice(valueStart, valueEnd) === "[REDACTED]") continue;
    replacements.push({ start: valueStart, end: valueEnd, value: "[REDACTED]" });
  }

  for (const replacement of replacements.reverse()) text = `${text.slice(0, replacement.start)}${replacement.value}${text.slice(replacement.end)}`;
  return { text, matchCount: replacements.length };
}

/** @param {unknown} value @param {string} field */
export function streamBytes(value, field) {
  if (typeof value === "string") return Buffer.from(value, "utf8");
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new TypeError(`${field} must be a string or byte array`);
}

/** @param {unknown} value @param {string} field */
export function normalizeDigest(value, field) {
  if (typeof value !== "string") throw new TypeError(`${field} must be a SHA-256 digest`);
  const match = value.match(/^(?:sha256:)?([0-9a-f]{64})$/i);
  if (match === null) throw new TypeError(`${field} must be a SHA-256 digest`);
  return `sha256:${match[1].toUpperCase()}`;
}

/** @param {unknown} value @param {number} [maxBytes] */
export function redactJson(value, maxBytes = DEFAULT_MAX_TEXT_BYTES, depth = 0) {
  if (depth > 64) throw new TypeError("value is too deeply nested");
  if (typeof value === "string") {
    const redacted = redactText(value, maxBytes);
    return { value: redacted.text, matchCount: redacted.matchCount };
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") return { value, matchCount: 0 };
  if (Array.isArray(value)) {
    let matchCount = 0;
    const result = value.map((entry) => {
      const redacted = redactJson(entry, maxBytes, depth + 1);
      matchCount += redacted.matchCount;
      return redacted.value;
    });
    return { value: result, matchCount };
  }
  if (!isPlainRecord(value)) throw new TypeError("value must be JSON-compatible");
  let matchCount = 0;
  const result = Object.create(null);
  for (const key of Object.keys(value).sort(compareStrings)) {
    if (/^(?:raw|stdout|stderr|rawstdout|rawstderr|stdoutraw|stderrraw)$/i.test(key)) continue;
    if (isSecretKey(key) && typeof value[key] === "string") {
      Object.defineProperty(result, key, { value: "[REDACTED]", enumerable: true, configurable: true, writable: true });
      matchCount += 1;
      continue;
    }
    const redacted = redactJson(value[key], maxBytes, depth + 1);
    matchCount += redacted.matchCount;
    Object.defineProperty(result, key, { value: redacted.value, enumerable: true, configurable: true, writable: true });
  }
  return { value: result, matchCount };
}

/** @param {unknown} value @param {string} field */
export function clockIso(value, field = "clock") {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError(`${field} must return a valid Date`);
  return value.toISOString();
}

/** @param {string} left @param {string} right */
export function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
