export class ReleaseOrchestratorError extends Error {
  constructor(code) {
    super(`RELEASE_ORCHESTRATOR_${code}`);
    this.name = "ReleaseOrchestratorError";
    this.code = code;
  }
}

export function fail(code) {
  throw new ReleaseOrchestratorError(code);
}
