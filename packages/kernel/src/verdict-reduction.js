// @ts-check

/** @typedef {import("@proofrail/contracts").Verdict} Verdict */
/** @typedef {import("@proofrail/contracts").VerdictCandidate} VerdictCandidate */
/** @typedef {import("@proofrail/contracts").VerdictReduction} VerdictReduction */

/** @type {readonly Verdict[]} */
export const VERDICT_PRECEDENCE = Object.freeze([
  "ADMISSIBLE",
  "REVISION_REQUIRED",
  "REJECTED",
  "BLOCKED"
]);

const VERDICT_RANK = new Map(VERDICT_PRECEDENCE.map((verdict, index) => [verdict, index]));

/**
 * @param {readonly VerdictCandidate[]} candidates
 * @returns {VerdictReduction}
 */
export function reduceVerdictCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new TypeError("Verdict reduction requires at least one classified candidate Verdict state");
  }
  for (const candidate of candidates) {
    if (!VERDICT_RANK.has(candidate.verdict)) {
      throw new TypeError(`Unknown Verdict candidate: ${String(candidate.verdict)}`);
    }
  }

  const sortedCandidates = [...candidates].sort(compareCandidates);
  /** @type {Verdict} */
  let winningVerdict = "ADMISSIBLE";

  for (const candidate of sortedCandidates) {
    if (rank(candidate.verdict) > rank(winningVerdict)) {
      winningVerdict = candidate.verdict;
    }
  }

  return {
    verdict: winningVerdict,
    reasonCodes: uniqueSorted(sortedCandidates.flatMap((candidate) => candidate.reasonCodes)),
    candidateIds: sortedCandidates.map((candidate) => candidate.id),
    lineageIds: uniqueSorted(sortedCandidates.flatMap((candidate) => candidate.lineageIds)),
    precedence: [...VERDICT_PRECEDENCE].reverse()
  };
}

/**
 * @param {Verdict} verdict
 * @returns {number}
 */
function rank(verdict) {
  const value = VERDICT_RANK.get(verdict);
  return value === undefined ? -1 : value;
}

/**
 * @param {VerdictCandidate} left
 * @param {VerdictCandidate} right
 * @returns {number}
 */
function compareCandidates(left, right) {
  return (
    rank(left.verdict) - rank(right.verdict) ||
    compareStrings(left.id, right.id)
  );
}

/**
 * @param {readonly string[]} values
 * @returns {string[]}
 */
function uniqueSorted(values) {
  return [...new Set(values)].sort(compareStrings);
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
