import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_SITE_ROOT = join(ROOT, 'site');
const INSTALL_GUIDE = join(ROOT, 'docs/getting-started/installation.md');
const REVIEWED_WORKFLOW_SHA = '332969ce635a0a818072a6c45ecaf8288c76f0f0';
const SITE_ROOT = process.env.PUBLIC_SITE_ROOT
  ? resolve(process.env.PUBLIC_SITE_ROOT)
  : DEFAULT_SITE_ROOT;

const REQUIRED_IDS = [
  'install',
  'how-it-works',
  'verdicts',
  'pricing',
  'early-access',
  'feedback',
  'non-guarantees',
];

function readSite(siteRoot = SITE_ROOT) {
  const indexPath = join(siteRoot, 'index.html');
  const stylesPath = join(siteRoot, 'styles.css');
  assert.ok(readFileSync(indexPath, 'utf8'), `missing or empty ${indexPath}`);
  assert.ok(readFileSync(stylesPath, 'utf8'), `missing or empty ${stylesPath}`);
  return {
    html: readFileSync(indexPath, 'utf8'),
    css: readFileSync(stylesPath, 'utf8'),
    indexPath,
    stylesPath,
  };
}

function attributeValues(html, tag, attribute) {
  const values = [];
  const tagPattern = new RegExp(`<${tag}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`, 'gi');
  for (const match of html.matchAll(tagPattern)) values.push(match[1]);
  return values;
}

function assertNoUnsupportedClaims(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const forbidden = [
    /\bmarketplace\s+(?:listing|availability|installation)\b/gi,
    /\btrusted[- ]release\b/gi,
    /\bcomplete\s+sandbox(?:ing)?\b/gi,
    /\benterprise\s+certification\b/gi,
    /\bcloud\s+retention\b/gi,
    /\bpayment\s+automation\b/gi,
  ];

  for (const pattern of forbidden) {
    for (const match of text.matchAll(pattern)) {
      const context = text.slice(Math.max(0, match.index - 28), match.index);
      assert.match(
        context,
        /(?:\bnot\b|\bno\b|\bwithout\b|\bdoes not\b|\bdo not\b|\bnever\b)\s*$/i,
        `unsupported positive product claim: ${match[0]}`,
      );
    }
  }
}

export function validateSite(siteRoot = SITE_ROOT) {
  const { html, css } = readSite(siteRoot);
  assert.match(html, /^<!doctype html>/i, 'site must declare HTML5 doctype');
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i, 'site must declare an English document language');
  assert.match(html, /<meta\b[^>]*\bname=["']viewport["'][^>]*>/i, 'site needs a responsive viewport');
  assert.match(html, /<meta\b[^>]*\bname=["']description["'][^>]*>/i, 'site needs a useful description');
  assert.match(html, /<meta\b[^>]*\bname=["']referrer["'][^>]*\bcontent=["']no-referrer["']/i, 'site must opt out of referrer leakage');
  assert.match(html, /<meta\b[^>]*\bhttp-equiv=["']content-security-policy["'][^>]*>/i, 'site needs a restrictive security meta policy');
  assert.match(html, /<a\b[^>]*\bhref=["']#main-content["'][^>]*>.*?skip/i, 'site needs a keyboard skip link');
  assert.match(html, /<header\b/i, 'site needs a semantic header');
  assert.match(html, /<nav\b/i, 'site needs a semantic navigation');
  assert.match(html, /<main\b[^>]*\bid=["']main-content["']/i, 'site needs a labelled main landmark');
  assert.match(html, /<footer\b/i, 'site needs a semantic footer');

  const idList = attributeValues(html, '[a-z][a-z0-9-]*', 'id');
  assert.equal(new Set(idList).size, idList.length, 'site must not duplicate element ids');
  const ids = new Set(idList);
  for (const id of REQUIRED_IDS) assert.ok(ids.has(id), `missing required #${id} landmark`);

  const anchors = attributeValues(html, 'a', 'href');
  for (const href of anchors.filter((value) => value.startsWith('#'))) {
    assert.ok(ids.has(href.slice(1)), `broken internal anchor ${href}`);
  }
  for (const href of anchors) {
    assert.ok(!/^https?:\/\//i.test(href), `public prototype must not depend on remote link ${href}`);
    assert.ok(!/^javascript:/i.test(href), `javascript links are not allowed: ${href}`);
  }

  assert.equal(anchors.filter((href) => href === '#install').length, 1, 'install CTA must have one canonical anchor');
  assert.equal(anchors.filter((href) => href === '#early-access').length, 1, 'early-access CTA must have one canonical anchor');
  assert.equal(anchors.filter((href) => href === '#feedback').length, 1, 'feedback CTA must have one canonical anchor');
  const localResources = [
    ...anchors,
    ...attributeValues(html, 'link', 'href'),
    ...attributeValues(html, 'img', 'src'),
  ].filter((value) => !value.startsWith('#') && !/^(?:mailto:|tel:|data:)/i.test(value));
  for (const resource of localResources) {
    const pathPart = resource.split(/[?#]/, 1)[0];
    const absolutePath = resolve(siteRoot, pathPart);
    const siteRootPath = resolve(siteRoot);
    assert.ok(
      absolutePath === siteRootPath || absolutePath.startsWith(siteRootPath + sep),
      `local link or asset escapes the site root ${resource}`,
    );
    assert.ok(existsSync(absolutePath), `broken local link or asset ${resource}`);
  }
  assert.match(html, /<section\b[^>]*\bid=["']install["'][\s\S]*?<pre[^>]*>\s*<code[\s\S]*?<\/code>\s*<\/pre>/i, 'install section needs a copyable code snippet');
  assert.match(
    html,
    new RegExp(`gogun-rgb\\/proofrail\\/\\.github\\/workflows\\/proofrail\\.yml@${REVIEWED_WORKFLOW_SHA}`, 'i'),
    'install snippet must show the reviewed reusable workflow commit',
  );
  assert.match(html, /pull_request:/i, 'install snippet must show the pull-request trigger');
  assert.match(html, /(?:config\.ya?ml|config-path)/i, 'install snippet must show configuration input');
  assert.match(html, /pricing\s+hypothesis/i, 'site must label pricing as a hypothesis');
  assert.match(html, /(?:early access|join the pilot)/i, 'site needs an early-access path');
  assert.match(html, /(?:feedback|tell us what to improve)/i, 'site needs a feedback path');
  assert.match(html, /non-guarantee/i, 'site must make non-guarantees explicit');
  assertNoUnsupportedClaims(html);

  const scripts = html.match(/<script\b[\s\S]*?<\/script>/gi) ?? [];
  assert.equal(scripts.length, 0, 'static prototype must not ship executable scripts');
  assert.doesNotMatch(`${html}\n${css}`, /(?:google-analytics|segment\.io|mixpanel|plausible|gtag\s*\()/i, 'site must not include tracking');
  assert.doesNotMatch(`${html}\n${css}`, /(?:api[_-]?key|access[_-]?token|secret\s*=)/i, 'site must not include credentials');

  for (const src of attributeValues(html, 'img', 'src')) {
    assert.ok(!/^https?:\/\//i.test(src), `image must be local: ${src}`);
    assert.ok(src.startsWith('./') || src.startsWith('../') || src.startsWith('/'), `image path must be local: ${src}`);
  }
  for (const alt of attributeValues(html, 'img', 'alt')) assert.notEqual(alt.trim(), '', 'images need non-empty alternative text');

  assert.match(css, /@media\s*\([^)]*max-width/i, 'styles need a responsive layout rule');
  assert.match(css, /prefers-reduced-motion/i, 'styles need a reduced-motion fallback');
  assert.match(css, /:focus-visible/i, 'styles need a visible keyboard focus state');
  assert.match(css, /\.section\[id\]\s*\{[\s\S]*?scroll-margin-top:/i, 'anchor targets need sticky-header offset');
  assert.match(
    css,
    /@media\s*\(max-width:\s*768px\)[\s\S]*?\.section\[id\]\s*\{[\s\S]*?scroll-margin-top:/i,
    'mobile anchor targets need sticky-header offset',
  );
  assert.match(css, /--[a-z-]+\s*:/i, 'styles should expose design tokens');
  return { html, css };
}

test('public site contains the complete prototype surface', () => {
  validateSite();
});

test('installation guide stays bound to the reviewed reusable workflow contract', () => {
  const guide = readFileSync(INSTALL_GUIDE, 'utf8');
  assert.match(
    guide,
    new RegExp(`uses: gogun-rgb\\/proofrail\\/\\.github\\/workflows\\/proofrail\\.yml@${REVIEWED_WORKFLOW_SHA}`, 'i'),
  );
  assert.match(guide, /config-path: \.proofrail\/config\.yml/);
  assert.match(guide, /automatic job check/);
  assert.match(guide, /BLOCKED_EXECUTION_BOUNDARY/);
  assert.doesNotMatch(guide, /uses: gogun-rgb\/proofrail-action@/i);
});

test('rejects a missing site', () => {
  const missing = join(mkdtempSync(join(tmpdir(), 'proofrail-public-site-missing-')), 'site');
  assert.throws(() => validateSite(missing), /ENOENT|missing|empty/i);
  rmSync(dirname(missing), { recursive: true, force: true });
});

test('rejects broken internal links', () => {
  const copyRoot = mkdtempSync(join(tmpdir(), 'proofrail-public-site-copy-'));
  const copySite = join(copyRoot, 'site');
  cpSync(SITE_ROOT, copySite, { recursive: true });
  const indexPath = join(copySite, 'index.html');
  const html = readFileSync(indexPath, 'utf8').replace('href="#install"', 'href="#missing-install"');
  writeFileSync(indexPath, html);
  assert.throws(() => validateSite(copySite), /broken internal anchor|missing required/i);
  rmSync(copyRoot, { recursive: true, force: true });
});

test('rejects broken local assets', () => {
  const copyRoot = mkdtempSync(join(tmpdir(), 'proofrail-public-site-assets-'));
  const copySite = join(copyRoot, 'site');
  cpSync(SITE_ROOT, copySite, { recursive: true });
  const indexPath = join(copySite, 'index.html');
  const html = readFileSync(indexPath, 'utf8').replace('href="./styles.css"', 'href="./missing.css"');
  writeFileSync(indexPath, html);
  assert.throws(() => validateSite(copySite), /broken local link or asset/i);
  rmSync(copyRoot, { recursive: true, force: true });
});
