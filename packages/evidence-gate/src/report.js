const NONE = "(none)";
const ESCAPED_CODE_POINT_RANGES = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x00ad, 0x00ad],
  [0x0600, 0x0605],
  [0x061c, 0x061c],
  [0x06dd, 0x06dd],
  [0x070f, 0x070f],
  [0x0890, 0x0891],
  [0x08e2, 0x08e2],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x2028, 0x2029],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x206f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0x110bd, 0x110bd],
  [0x110cd, 0x110cd],
  [0x13430, 0x1343f],
  [0x1bca0, 0x1bca3],
  [0x1d173, 0x1d17a],
  [0xe0001, 0xe0001],
  [0xe0020, 0xe007f]
];

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
  let escaped = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    escaped += mustEscape(codePoint)
      ? escapeCodePoint(codePoint)
      : character;
  }
  return escaped;
}

function mustEscape(codePoint) {
  return ESCAPED_CODE_POINT_RANGES.some(
    ([start, end]) => codePoint >= start && codePoint <= end
  );
}

function escapeCodePoint(codePoint) {
  const hex = codePoint.toString(16).toUpperCase();
  return codePoint <= 0xffff
    ? "\\u" + hex.padStart(4, "0")
    : "\\u{" + hex + "}";
}
