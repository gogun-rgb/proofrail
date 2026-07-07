import fs from "node:fs";
import path from "node:path";

import { isExternalTarget, relativeRepoPath, repoPathFromMarkdownTarget, resolveRepoPath, toPosixPath } from "./path-utils.mjs";

const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "dist", "coverage", ".tmp"]);

export function listFiles(root, current = root) {
  const entries = fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => {
    if (left.name < right.name) return -1;
    if (left.name > right.name) return 1;
    return 0;
  });

  return entries.flatMap((entry) => {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) return [];
      return listFiles(root, fullPath);
    }
    return entry.isFile() ? [fullPath] : [];
  });
}

export function markdownFiles(root) {
  return listFiles(root).filter((file) => file.endsWith(".md"));
}

export function slugifyHeading(heading) {
  return heading
    .trim()
    .replace(/\s+#+$/, "")
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function anchorsFor(content) {
  const anchors = new Set();
  const counts = new Map();
  for (const line of stripFencedCode(content).split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (!match) continue;

    const base = slugifyHeading(match[2]);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

export function extractSection(content, headingText, level = 2) {
  const lines = stripFencedCode(content).split(/\r?\n/);
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[index]);
    if (match && match[1].length === level && match[2].trim() === headingText) {
      start = index;
      break;
    }
  }
  if (start === -1) return "";

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[index]);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return `${lines.slice(start, end).join("\n").trimEnd()}\n`;
}

export function markdownLinks(content) {
  const links = [];
  const scanContent = stripFencedCode(content);
  const linkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
  for (const match of scanContent.matchAll(linkPattern)) {
    links.push({ kind: "inline", label: match[1].trim(), rawTarget: match[2].trim() });
  }

  const referenceDefinitionPattern = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(\S+)/gm;
  for (const match of scanContent.matchAll(referenceDefinitionPattern)) {
    links.push({ kind: "reference-definition", label: match[1].trim(), rawTarget: match[2].trim() });
  }

  const htmlLinkPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  for (const match of scanContent.matchAll(htmlLinkPattern)) {
    links.push({ kind: "html", label: "href", rawTarget: match[1].trim() });
  }
  return links;
}

export function splitMarkdownTarget(rawTarget) {
  const closingBracket = rawTarget.indexOf(">");
  const target = rawTarget.startsWith("<") && closingBracket !== -1 ? rawTarget.slice(1, closingBracket) : rawTarget.split(/\s+/)[0];
  const stripped = target.replace(/^<|>$/g, "");
  const hashIndex = stripped.indexOf("#");
  if (hashIndex === -1) return { targetPath: stripped, anchor: "" };
  return {
    targetPath: stripped.slice(0, hashIndex),
    anchor: stripped.slice(hashIndex + 1),
  };
}

export function validateMarkdownLinks(root, collector) {
  const anchorCache = new Map();
  for (const file of markdownFiles(root)) {
    const content = fs.readFileSync(file, "utf8");
    const sourceRel = relativeRepoPath(root, file);
    for (const link of markdownLinks(content)) {
      if (isExternalTarget(link.rawTarget)) continue;

      const { targetPath, anchor } = splitMarkdownTarget(link.rawTarget);
      const targetRepoPath = repoPathFromMarkdownTarget(sourceRel, targetPath);

      if (!targetRepoPath) {
        collector.add(
          "HARN_MARKDOWN_LINK_BROKEN",
          sourceRel,
          `Markdown link target ${link.rawTarget} cannot be resolved inside the repository.`,
          "Use a local repository-relative Markdown link target.",
        );
        continue;
      }

      let resolvedPath;
      try {
        resolvedPath = resolveRepoPath(root, targetRepoPath);
      } catch {
        collector.add(
          "HARN_MARKDOWN_LINK_BROKEN",
          sourceRel,
          `Markdown link target ${link.rawTarget} cannot be resolved inside the repository.`,
          "Use a local repository-relative Markdown link target.",
        );
        continue;
      }

      if (!fs.existsSync(resolvedPath)) {
        collector.add(
          "HARN_MARKDOWN_LINK_BROKEN",
          sourceRel,
          `Broken Markdown link target ${link.rawTarget}.`,
          "Fix the local Markdown link or restore the referenced file.",
        );
        continue;
      }

      if (anchor && resolvedPath.endsWith(".md")) {
        const anchorKey = toPosixPath(resolvedPath);
        if (!anchorCache.has(anchorKey)) anchorCache.set(anchorKey, anchorsFor(fs.readFileSync(resolvedPath, "utf8")));
        if (!anchorCache.get(anchorKey).has(anchor.toLowerCase())) {
          collector.add(
            "HARN_MARKDOWN_ANCHOR_MISSING",
            sourceRel,
            `Missing Markdown anchor ${link.rawTarget}.`,
            "Fix the local Markdown anchor or restore the referenced heading.",
          );
        }
      }
    }
  }
}

export function readIfExists(root, repoPath) {
  try {
    const filePath = resolveRepoPath(root, repoPath);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function stripFencedCode(content) {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = "";

  return lines
    .map((line) => {
      const fence = /^[ \t]{0,3}(```+|~~~+)/.exec(line);
      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceMarker = fence[1].startsWith("`") ? "```" : "~~~";
        } else if (fence[1].startsWith(fenceMarker[0])) {
          inFence = false;
          fenceMarker = "";
        }
        return "";
      }
      return inFence ? "" : line;
    })
    .join("\n");
}
