import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { VerificationRunnerError } from "./errors.js";

function outputCollector(previewLimit, outputLimit, onLimit) {
  const hash = createHash("sha256");
  const preview = [];
  let previewBytes = 0;
  let bytes = 0;
  let exceeded = false;
  return {
    write(chunk) {
      const bytesChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      hash.update(bytesChunk);
      bytes += bytesChunk.length;
      if (previewBytes < previewLimit) {
        const part = bytesChunk.subarray(0, previewLimit - previewBytes);
        preview.push(part);
        previewBytes += part.length;
      }
      if (!exceeded && bytes > outputLimit) {
        exceeded = true;
        onLimit();
      }
    },
    finish() {
      return {
        digest: `sha256:${hash.digest("hex").toUpperCase()}`,
        bytes,
        preview: Buffer.concat(preview).toString("utf8"),
        truncated: bytes > previewLimit,
        exceeded,
      };
    },
  };
}

function waitForPromise(promise, milliseconds) {
  return Promise.race([
    promise.then((value) => ({ timedOut: false, value })),
    new Promise((resolve) => setTimeout(() => resolve({ timedOut: true, value: null }), milliseconds)),
  ]);
}

function processGroupAlive(pid) {
  if (pid === undefined) return false;
  try {
    process.kill(process.platform === "win32" ? pid : -pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw new VerificationRunnerError("PROCESS_TERMINATION_FAILED", "process existence probe failed", { cause: error });
  }
}

function taskkill(pid, force) {
  return new Promise((resolve, reject) => {
    const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", ...(force ? ["/F"] : [])], { shell: false, windowsHide: true, stdio: "ignore" });
    const timer = setTimeout(() => {
      killer.kill();
      reject(new VerificationRunnerError("PROCESS_TERMINATION_FAILED", "taskkill exceeded the termination watchdog"));
    }, 1000);
    killer.once("error", (error) => { clearTimeout(timer); reject(error); });
    killer.once("close", (code) => { clearTimeout(timer); resolve(code ?? -1); });
  });
}

function observeStreamClose(stream) {
  if (stream === undefined || stream.destroyed) return Promise.resolve(true);
  return new Promise((resolve) => {
    stream.once("close", () => resolve(true));
  });
}

async function sendTreeSignal(child, force) {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    return { code: await taskkill(child.pid, force) };
  }
  try { process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM"); } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
  return { code: 0 };
}

async function terminateTree({ child, exitPromise, stdoutClosed, stderrClosed, graceMs, killMs, monitorMs }) {
  if (child.pid === undefined) throw new VerificationRunnerError("PROCESS_TERMINATION_FAILED", "child process has no PID");
  const phases = ["TERM_REQUESTED"];
  const term = await sendTreeSignal(child, false);
  phases.push(`TERM_SENT:${term?.code ?? 0}`);
  let exited = await waitForPromise(exitPromise, graceMs);
  const termPipes = await waitForPromise(Promise.all([stdoutClosed, stderrClosed]), monitorMs);
  if (!exited.timedOut && !processGroupAlive(child.pid) && !termPipes.timedOut) return { exitObserved: true, phases };
  phases.push("GRACE_EXPIRED");
  const kill = await sendTreeSignal(child, true);
  phases.push(`KILL_SENT:${kill?.code ?? 0}`);
  if (process.platform === "win32") {
    try { child.kill(); } catch (error) { if (error?.code !== "ESRCH") throw error; }
    const observed = await waitForPromise(Promise.all([waitForPromise(exitPromise, killMs), stdoutClosed, stderrClosed]), killMs);
    const rootGone = !processGroupAlive(child.pid);
    if (!observed.timedOut && rootGone && !observed.value?.[0]?.timedOut) return { exitObserved: true, phases };
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.unref();
    phases.push("CLEANUP_FAILED");
    throw new VerificationRunnerError("PROCESS_TERMINATION_FAILED", "Windows process tree did not close within the termination watchdog");
  }
  exited = await waitForPromise(exitPromise, killMs);
  if (exited.timedOut || processGroupAlive(child.pid)) {
    try {
      if (process.platform === "win32") await taskkill(child.pid, true);
      else process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
    exited = await waitForPromise(exitPromise, killMs);
  }
  if (exited.timedOut || processGroupAlive(child.pid)) throw new VerificationRunnerError("PROCESS_TERMINATION_FAILED", "process tree did not exit within the termination watchdog");
  phases.push("CLEANUP_CONFIRMED");
  return { exitObserved: true, phases };
}

function observeExit(child) {
  return new Promise((resolve) => {
    let spawnError = null;
    child.once("error", (error) => { spawnError = error; });
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal, spawnError }));
  });
}

export async function executeCommand(input) {
  const startedAt = input.clock.now();
  let timedOut = false;
  let outputExceeded = false;
  let boundaryError = null;
  let terminationError = null;
  let terminating;
  let resolveStopSignal;
  const stopSignal = new Promise((resolve) => { resolveStopSignal = resolve; });
  let child;
  try {
    child = spawn(input.shellPath, ["-eo", "pipefail", "-c", input.command.run], {
      cwd: input.workingDirectory,
      env: input.environment,
      detached: process.platform !== "win32",
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return { startedAt, endedAt: input.clock.now(), exitCode: null, timedOut: false, outputExceeded: false, spawnError: error, stdout: emptyOutput(), stderr: emptyOutput() };
  }
  const exitPromise = observeExit(child);
  const stdoutClosed = observeStreamClose(child.stdout);
  const stderrClosed = observeStreamClose(child.stderr);
  const stop = () => {
    if (terminating === undefined) {
      terminating = terminateTree({ child, exitPromise, stdoutClosed, stderrClosed, graceMs: input.graceMs, killMs: input.killMs, monitorMs: input.monitorMs });
      resolveStopSignal(terminating);
      void terminating.catch((error) => { terminationError = error; });
    }
    return terminating;
  };
  const stdout = outputCollector(input.previewLimit, input.outputLimit, () => { outputExceeded = true; void stop(); });
  const stderr = outputCollector(input.previewLimit, input.outputLimit, () => { outputExceeded = true; void stop(); });
  child.stdout.on("data", (chunk) => stdout.write(chunk));
  child.stderr.on("data", (chunk) => stderr.write(chunk));
  const timer = setTimeout(() => { timedOut = true; void stop(); }, Math.max(1, input.timeoutMs));
  const monitor = setInterval(() => {
    input.assertCurrent().catch((error) => { if (boundaryError === null) boundaryError = error; void stop(); });
  }, input.monitorMs);
  const completion = await Promise.race([
    exitPromise.then((value) => ({ kind: "exit", value })),
    stopSignal.then(async (promise) => {
      try { return { kind: "terminated", value: await promise }; } catch (error) { return { kind: "termination-error", value: error }; }
    }),
  ]);
  let outcome;
  if (completion.kind === "termination-error") {
    terminationError = completion.value;
    outcome = { exitCode: null, signal: "SIGKILL", spawnError: null };
  } else if (completion.kind === "terminated") {
    const terminationReport = completion.value;
    if (terminationReport?.exitObserved === true) {
      const observed = await waitForPromise(exitPromise, input.killMs);
      if (observed.timedOut) throw new VerificationRunnerError("PROCESS_TERMINATION_FAILED", "child process exit was not observable");
      outcome = observed.value;
    } else {
      outcome = { exitCode: null, signal: "SIGKILL", spawnError: null };
    }
  } else {
    outcome = completion.value;
    const streamsClosed = await waitForPromise(Promise.all([stdoutClosed, stderrClosed]), input.monitorMs);
    if ((processGroupAlive(child.pid) || streamsClosed.timedOut) && terminating === undefined) {
      terminating = terminateTree({ child, exitPromise, stdoutClosed, stderrClosed, graceMs: input.graceMs, killMs: input.killMs, monitorMs: input.monitorMs });
    }
    if (terminating !== undefined) {
      try { await terminating; } catch (error) { terminationError = error; }
    }
  }
  clearTimeout(timer);
  clearInterval(monitor);
  if (terminationError !== null) throw terminationError;
  if (boundaryError !== null) throw boundaryError;
  await input.assertCurrent();
  const endedAt = input.clock.now();
  await input.assertCurrent();
  return { startedAt, endedAt, exitCode: outcome.exitCode, timedOut, outputExceeded, spawnError: outcome.spawnError, stdout: stdout.finish(), stderr: stderr.finish() };
}

function emptyOutput() {
  return { digest: `sha256:${createHash("sha256").digest("hex").toUpperCase()}`, bytes: 0, preview: "", truncated: false, exceeded: false };
}
