const SHARED_AUTHORITY_OWNERS = Object.freeze([
  "@proofrail/contracts",
  "@proofrail/trusted-config",
]);

export function findWorkspaceCycles(edges, edgeSites) {
  const state = new Map([...edges.keys()].map((name) => [name, 0]));
  const stack = [];
  const seen = new Set();
  const findings = [];

  function visit(source) {
    state.set(source, 1);
    stack.push(source);
    for (const target of [...(edges.get(source) ?? [])].sort(compareStrings)) {
      if (state.get(target) === 0) {
        visit(target);
        continue;
      }
      if (state.get(target) !== 1) {
        continue;
      }
      const cycleStart = stack.indexOf(target);
      const cycle = [...stack.slice(cycleStart), target];
      const key = canonicalCycleKey(cycle);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const site = edgeSites.get(`${source}\u0000${target}`);
      findings.push({
        id: "ARCHCHK_WORKSPACE_CYCLE",
        path: site?.path ?? "packages",
        line: site?.line ?? 1,
        column: site?.column ?? 1,
        target: cycle.join(" -> "),
      });
    }
    stack.pop();
    state.set(source, 2);
  }

  for (const source of [...edges.keys()].sort(compareStrings)) {
    if (state.get(source) === 0) {
      visit(source);
    }
  }
  return findings;
}

export function findSharedAuthorityCouplings(edges, edgeSites) {
  const findings = [];
  for (const [source, targets] of edges) {
    if (!SHARED_AUTHORITY_OWNERS.every((owner) => targets.has(owner))) {
      continue;
    }
    const site = edgeSites.get(`${source}\u0000${SHARED_AUTHORITY_OWNERS[0]}`);
    findings.push({
      id: "ARCHCHK_SHARED_AUTHORITY_COUPLING",
      path: site?.path ?? "packages",
      line: site?.line ?? 1,
      column: site?.column ?? 1,
      target: `${source}: ${SHARED_AUTHORITY_OWNERS.join(" + ")}`,
    });
  }
  return findings;
}

function canonicalCycleKey(cycle) {
  const nodes = cycle.slice(0, -1);
  const rotations = nodes.map((_, index) => [
    ...nodes.slice(index),
    ...nodes.slice(0, index),
  ]);
  return rotations.map((rotation) => rotation.join(" -> ")).sort(compareStrings)[0];
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
