const SECRET_PATTERNS = Object.freeze([
  /-----BEGIN (?:[A-Z0-9]{1,32} ){0,4}PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{1,128}\r?\n){1,256}-----END (?:[A-Z0-9]{1,32} ){0,4}PRIVATE KEY-----/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b(?:xox[baprs]-|xapp-)[A-Za-z0-9](?:[A-Za-z0-9-]{8,126}[A-Za-z0-9])\b/g,
  /\bnpm_[A-Za-z0-9]{36}\b/g,
  /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}={0,2}/gi,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
]);
const ASSIGNMENT_LABEL_PATTERN = /[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*/g;

function isSecretLabel(label) {
  const parts = label.toLowerCase().split(/[_-]+/);
  const last = parts.at(-1);
  return last === "token"
    || last === "password"
    || last === "authorization"
    || parts.includes("secret")
    || (last === "key" && (parts.includes("api") || parts.includes("private") || parts.includes("access")));
}

export function redact(value) {
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
  return { text, matchCount };
}

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
      const closingQuote = valueEnd;
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
