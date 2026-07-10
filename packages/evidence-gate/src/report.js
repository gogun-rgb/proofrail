const NONE = "(none)";

export function renderHumanReport(packet) {
  const lines = [
    "Proofrail AI PR Evidence Report",
    "",
    "Pull request",
    "- ID: " + field(packet.pullRequest?.id),
    "- Title: " + field(packet.pullRequest?.title),
    "- Source ref: " + field(packet.pullRequest?.sourceRef),
    "",
    "Packet identity",
    "- Version: " + field(packet.packetVersion),
    "- Input digest: " + field(packet.inputDigest),
    "",
    "Attention counts",
    "- Missing evidence: " + list(packet.missingEvidence).length,
    "- Review needs: " + list(packet.reviewNeeds).length,
    "- Outside declared scope paths: " + list(packet.scope?.outsideDeclaredScope).length,
    "",
    "Claims",
    ...renderClaims(packet.claims),
    "",
    "Observed evidence",
    ...renderObservedEvidence(packet.observedEvidence),
    "",
    "Missing evidence",
    ...renderMissingEvidence(packet.missingEvidence),
    "",
    "Scope",
    "- Declared write scope: " + renderList(packet.scope?.declaredWriteScope),
    "- Changed paths: " + renderList(packet.scope?.changedPaths),
    "- Outside declared scope: " + renderList(packet.scope?.outsideDeclaredScope),
    "",
    "Review needs",
    ...renderBullets(packet.reviewNeeds),
    "",
    "Boundaries",
    "- Static-input evaluator: yes",
    "- Product Verdict: not produced",
    "- Product readiness: " + (packet.boundaries?.productReadiness === false ? "no" : "not asserted"),
    "- Trusted release: " + (packet.boundaries?.trustedRelease === false ? "no" : "not asserted"),
    "- Changed-path reporting is not an authorization decision"
  ];

  return lines.join("\n") + "\n";
}

function renderClaims(claims) {
  const values = list(claims);
  if (values.length === 0) return ["- " + NONE];
  return values.flatMap((claim) => [
    "- [" + field(claim.id) + "] " + field(claim.text),
    "  Source: " + field(claim.source),
    "  Observed evidence: " + renderList(claim.observedEvidenceIds),
    "  Missing evidence: " + renderList(claim.missingEvidenceIds)
  ]);
}

function renderObservedEvidence(evidence) {
  const values = list(evidence);
  if (values.length === 0) return ["- " + NONE];
  return values.flatMap((item) => [
    "- [" + field(item.id) + "] " + field(item.kind) + ": " + field(item.summary),
    "  Source: " + field(item.source),
    "  Satisfies: " + renderList(item.satisfies)
  ]);
}

function renderMissingEvidence(evidence) {
  const values = list(evidence);
  if (values.length === 0) return ["- " + NONE];
  return values.flatMap((item) => [
    "- [" + field(item.id) + "] " + field(item.description),
    "  Needed for claims: " + renderList(item.neededForClaimIds)
  ]);
}

function renderBullets(values) {
  const items = list(values);
  return items.length === 0 ? ["- " + NONE] : items.map((item) => "- " + field(item));
}

function renderList(values) {
  const items = list(values);
  return items.length === 0 ? NONE : items.map(field).join(", ");
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function field(value) {
  if (value === null || value === undefined || value === "") return NONE;
  return escapeText(String(value));
}

function escapeText(value) {
  return value
    .replace(/\u001b/g, "\\u001B")
    .replace(/[\u0000-\u001f\u007f]/g, (character) => (
      "\\u" + character.codePointAt(0).toString(16).padStart(4, "0").toUpperCase()
    ));
}
