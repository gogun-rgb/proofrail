// @ts-check

import { createHash } from "node:crypto";

/**
 * @typedef {import("@proofrail/contracts").JsonPrimitive} JsonPrimitive
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalJson(value) {
  return JSON.stringify(canonicalizeJson(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
export function canonicalizeJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("canonical JSON accepts finite numbers only");
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }

  if (isPlainObject(value)) {
    /** @type {Record<string, unknown>} */
    const normalized = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      Object.defineProperty(normalized, key, {
        value: canonicalizeJson(value[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return normalized;
  }

  throw new TypeError("canonical JSON accepts JSON-compatible values only");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function sha256Digest(value) {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/**
 * @param {string} prefix
 * @param {unknown} value
 * @returns {string}
 */
export function derivedIdentity(prefix, value) {
  return `${prefix}:${sha256Digest(value).slice(0, 32)}`;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
