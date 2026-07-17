export const VERIFICATION_RUNNER_ERROR_CODES = Object.freeze([
  "INVALID_OPTIONS",
  "LOCKFILE_READ_FAILED",
  "BLOCKED_EXECUTION_BOUNDARY",
  "PROCESS_TERMINATION_FAILED",
]);

export class VerificationRunnerError extends Error {
  name = "VerificationRunnerError";

  constructor(code, message, options) {
    super(message, options);
    this.code = code;
  }
}

export function invalid(message) {
  throw new VerificationRunnerError("INVALID_OPTIONS", message);
}

export function blocked(message) {
  throw new VerificationRunnerError("BLOCKED_EXECUTION_BOUNDARY", message);
}
