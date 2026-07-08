// @ts-check

/**
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function deepFreeze(value) {
  if (value === null || typeof value !== "object") {
    return /** @type {Readonly<T>} */ (value);
  }

  if (Object.isFrozen(value)) {
    return /** @type {Readonly<T>} */ (value);
  }

  Object.freeze(value);

  for (const propertyName of Object.getOwnPropertyNames(value)) {
    const record = /** @type {Record<string, unknown>} */ (value);
    const propertyValue = record[propertyName];
    if (propertyValue !== null && typeof propertyValue === "object") {
      deepFreeze(propertyValue);
    }
  }

  return /** @type {Readonly<T>} */ (value);
}
