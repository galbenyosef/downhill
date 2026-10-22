// derive.mjs — rebuild the derived layers (readable/ + src/ + split-spec.json)
// from the downhill capture (PLAN §3/§5). DOWNHILL — Urban FPV
// (https://downhill-eta.vercel.app/) is capture-class: a hand-written ES module
// graph served at the origin root by a Vercel static deploy (no bundler, no
// minification in the app layer — the served files carry real names, comments
// and export points; only the two three.js r183 builds are minified vendor
// code). §0.4 fork-over-mirror was checked on 2026-10-13 — the captured
// src/main.js credits its author and links https://github.com/msreekm/downhill
// ("GitHub repo ↗"), but that repository answers 404 (removed or never public):
// no public source exists, so the mirror stands (recorded in README.md §0.4).
// The capture is untouched; every source file is re-hashed against
// .upstream/manifest.json before it is rendered, so a drifted capture fails
// loudly instead of being silently re-derived.
//
// Layout divergence (recorded in README): the origin serves the app under
// /src/ and the vendored libraries under /vendor/, so the byte-exact capture
// lives at src/*.js and vendor/** at the repo root (DISK_PREFIX=""). The
// derived reversed slices therefore share src/ with the captured modules:
// every derived slice is named src/<tag>-NN.js (tag = capture-relative path,
// "/" flattened to "__"), so derived names are distinguishable at a glance and
// are never listed in .upstream/manifest.json.
//
// Pipeline:
//   each capture *.js -> pinned prettier 3.9.6 (module API — the CLI respects
//                        .gitignore and can silently echo its input), single
//                        pass, verified idempotent -> readable/<name>.pretty.js
//                        (capture-relative name, nested dirs flattened with __).
//   the entry document -> inline <script>/<style> scan (byte ranges + sha256):
//                        index.html carries an inline importmap -> readable/
//                        index-inline-1.pretty.json twin + readable/
//                        index-inline-map.json.
//   the capture *.css -> readable/<name>.pretty.css, wholeFile section
//                        (stylesheet rule: stylesheets are never sliced).
//   vendor files       -> readable/ + wholeFile section (vendor rule): the
//                        three.js r183 builds (three.module.min.js, which
//                        imports three.core.min.js) and the BufferGeometryUtils
//                        addon are indexed whole, never sliced.
//   app modules        -> statement-aligned slices src/<name>-NN.js at
//                        top-level declaration boundaries, ~250-350 line
//                        windows (oversized single declarations stay whole),
//                        exact 2-line provenance header; every slice is
//                        parse-checked with `node --input-type=module
//                        --check -` and round-trips byte-exact to its
//                        readable line range.
//
// Non-standalone parts are indexed but never sliced (skipped sections): a pure
// trailing `export {…}` table where one exists — this capture's app layer has
// none. Identifiers in src/ are the app's own names — nothing here is renamed;
// the rename campaign (PLAN §5) does not apply to a source-visible capture and
// is recorded in README.md. usage:
//   node tools/derive.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
// ── --check: the reproducibility gate ───────────────────────────────────
// `node tools/derive.mjs --check` re-derives the derived layers IN MEMORY
// and compares them against the committed ones. It writes NOTHING: every
// derived file is compared against the committed file, and every difference
// (a file that would change, a file that would be created, a file whose
// committed copy would be superseded into legacy/, an orphan left in
// readable/ or src/) is reported and makes the tool exit non-zero. A plain
// run re-cuts exactly as before.
const CHECK = process.argv.includes("--check");
let checkProblems = 0;
// The re-derivation, in memory: resolved path -> the content this run
// produced. The self-check below reads it back instead of the committed
// file, so a stale committed layer is never mistaken for the fresh one.
const derivedText = new Map();
// Files already counted as a problem (one problem per affected file).
const counted = new Set();
const keyOf = (abs) => path.resolve(abs);
const relOf = (abs) => path.relative(proj, abs).split(path.sep).join("/");
// Report a difference: one message and one problem per affected file, so a
// file that would both change and be superseded is reported once.
const noteProblem = (key, message) => {
  if (counted.has(key)) return;
  counted.add(key);
  checkProblems++;
  console.error(message);
};

// Write one derived file. Under --check the content is only COMPARED with
// the committed file and a difference is reported; nothing is written.
function writeDerived(abs, text, encoding) {
  const key = keyOf(abs);
  derivedText.set(key, text);
  if (!CHECK) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, encoding);
    return text;
  }
  const rel = relOf(abs);
  if (!fs.existsSync(abs)) {
    noteProblem(key, `derive --check: would create ${rel}`);
  } else if (fs.readFileSync(abs, "utf8") !== text) {
    noteProblem(key, `derive --check: would change ${rel}`);
  }
  return text;
}

// Read a derived file back: the fresh derivation when there is one, the
// committed file otherwise.
function readDerived(abs) {
  const key = keyOf(abs);
  if (derivedText.has(key)) return derivedText.get(key);
  return fs.readFileSync(abs, "utf8");
}
const PINNED = "3.9.6";
const MIN_WINDOW = 250;
const MAX_WINDOW = 350;
const TODAY = "2026-10-13";
const ROOT = ""; // root-served capture: served path == disk rel

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readLines = (abs) => {
  const t = readDerived(abs);
  const l = t.split("\n");
  if (l.length && l[l.length - 1] === "") l.pop();
  return l;
};
const linesOf = (text) => text.replace(/\n$/, "").split("\n");
const lineOf = (text, offset) => text.slice(0, offset).split("\n").length;

// capture-relative name -> readable twin name (dirs flattened with __)
const tagOf = (capRel) => {
  const rel = capRel.startsWith(ROOT) ? capRel.slice(ROOT.length) : capRel;
  return rel.replace(/\.(js|css)$/i, "").split("/").join("__");
};
const prettyRelFor = (capRel) =>
  "readable/" + tagOf(capRel) + (/\.css$/i.test(capRel) ? ".pretty.css" : ".pretty.js");

// ── pinned prettier (module API, exactly 3.9.6) ─────────────────────────
async function loadPrettier() {
  const candidates = [
    process.env.PRETTIER_MJS,
    path.join(proj, "tools", "vendor", "prettier", "index.mjs"),
    path.join(proj, "node_modules", "prettier", "index.mjs"),
  ].filter(Boolean);
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(c), "package.json"), "utf8"));
      if (pkg.version !== PINNED) continue;
      const mod = (await import(pathToFileURL(c).href)).default;
      if (mod.version === PINNED) return { mod, at: c };
    } catch {
      /* try next */
    }
  }
  throw new Error(
    `pinned prettier ${PINNED} not found.\n` +
      `Looked for, in order: $PRETTIER_MJS, tools/vendor/prettier/index.mjs (this mirror's own ` +
      `vendored copy), node_modules/prettier/index.mjs (a local npm install of prettier@${PINNED}).\n` +
      `Restore the vendored copy with: git checkout -- tools/vendor/prettier\n` +
      `or install it locally with: npm install --no-save prettier@${PINNED}\n` +
      `(or set $PRETTIER_MJS to a prettier ${PINNED} index.mjs).`,
  );
}

// single pass + idempotency proof: prettier output must be a fixed point of
// the same call, so audit's one-pass re-render is byte-exact by construction
async function formatOnce(prettier, text, parser) {
  const out = await prettier.format(text, { parser });
  const again = await prettier.format(out, { parser });
  if (again !== out) throw new Error(`prettier ${parser} is not idempotent on this input`);
  return out;
}

// ── parse check: the exact standalone gate (ESM stdin) ──────────────────
function parses(text) {
  const r = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
    input: text,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: r.status === 0, why: (r.stderr || "").trim().split("\n").slice(-3).join(" | ") };
}

// ── markers for titles (top tokens, lowercase; fleet convention) ────────
const STOP = new Set(
  ("function return typeof undefined object string number boolean prototype length value default " +
    "exports import this that with from then else case break continue delete instanceof constructor " +
    "arguments void null true false call apply name type text target window document globalthis self " +
    "require module async await yield static class const let var new for while switch throw try catch " +
    "finally extends super using debugger of in do if has own hasown get set")
    .split(" ")
    .filter(Boolean),
);
function markers(text, n = 2) {
  // URLs/identifiers living inside string literals (import paths, asset names)
  // are not code tokens — strip quoted strings before counting
  const code = text.replace(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g, " ");
  const counts = new Map();
  for (const m of code.matchAll(/[A-Za-z][A-Za-z0-9_]{2,}/g)) {
    const w = m[0].toLowerCase();
    if (STOP.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
const markerText = (ms) => ms.map(([w, c]) => `${w}(${c})`).join(", ");

// ── windowize: cut only at statement starts; ≤350 lines, a single ───────
// ── oversized declaration is a window of its own ────────────────────────
function windowize(stmts) {
  const out = [];
  let cur = null;
  for (const s of stmts) {
    if (!cur) {
      cur = { first: s, last: s, count: 1, startLine: s.startLine, endLine: s.endLine };
      continue;
    }
    const projected = s.endLine - cur.startLine + 1;
    if (projected > MAX_WINDOW) {
      out.push(cur);
      cur = { first: s, last: s, count: 1, startLine: s.startLine, endLine: s.endLine };
    } else {
      cur.last = s;
      cur.count++;
      cur.endLine = s.endLine;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// ── inline block scan (byte-exact, over the raw entry buffer) ───────────
function scanBlocks(buf) {
  const blocks = [];
  for (const [open, close, kind] of [
    ["<script", "</script", "script"],
    ["<style", "</style", "style"],
  ]) {
    let p = 0;
    let n = 0;
    while (true) {
      const i = buf.indexOf(open, p);
      if (i < 0) break;
      const after = buf[i + open.length];
      const boundary =
        after === 0x3e || after === 0x2f || after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d;
      if (!boundary) {
        p = i + open.length;
        continue;
      }
      const tagEnd = buf.indexOf(">", i);
      if (tagEnd < 0) break;
      const j = buf.indexOf(close, tagEnd + 1);
      if (j < 0) throw new Error(`unterminated <${kind}> opened at byte ${i}`);
      const tag = buf.subarray(i, tagEnd + 1).toString("utf8");
      const external = /\bsrc\s*=\s*["']/i.test(tag);
      if (external) {
        blocks.push({ kind, external: true, tag, openStart: i, contentStart: tagEnd + 1, contentEnd: j });
      } else {
        n++;
        const content = buf.subarray(tagEnd + 1, j);
        blocks.push({
          kind: /\btype\s*=\s*["']importmap["']/i.test(tag) ? "importmap" : kind,
          external: false,
          block: n,
          tag,
          openStart: i,
          contentStart: tagEnd + 1,
          contentEnd: j,
          bytes: content.length,
          sha256: sha256(content),
          text: content.toString("utf8"),
        });
      }
      p = j + close.length;
    }
  }
  return blocks.sort((a, b) => a.openStart - b.openStart);
}

// ── curated content-anchored classification (guards fail loudly) ────────
// Vendor rule (PLAN §1): everything under vendor/ is third-party — indexed
// whole in readable/, never sliced or rewritten.
const VENDOR_GUARDS = {
  "vendor__three.module.min": [/three\.core\.min\.js/, /WebGLRenderer/],
  "vendor__three.core.min": [/"183"/, /BufferGeometry/],
  "vendor__BufferGeometryUtils": [/@three_import/, /mergeGeometries/],
};
function vendorClass(rel, tag) {
  const guards = VENDOR_GUARDS[tag] || null;
  const guardText = rel.split("/").slice(0, 3).join("/");
  let what;
  if (/^vendor\/three\.module\.min\.js$/.test(rel)) what = "three.js r183 build — WebGL renderer module (vendor)";
  else if (/^vendor\/three\.core\.min\.js$/.test(rel)) what = "three.js r183 build — core (vendor)";
  else if (/^vendor\/BufferGeometryUtils\.js$/.test(rel)) what = "three.js addon — utils/BufferGeometryUtils (vendor)";
  else what = `third-party library ${guardText} (vendor)`;
  return {
    title: `${tag} — ${what} (whole-file, never sliced)`,
    desc:
      `Third-party library captured byte-exact from the origin (${what}) — vendor rule: indexed whole-file ` +
      `in readable/, never sliced or rewritten.`,
    guard: guards ? (t) => guards.every((re) => re.test(t)) : null,
    guardWhy: guards ? guards.map(String).join(" + ") : null,
    what,
  };
}

async function main() {
  const { mod: prettier, at } = await loadPrettier();
  console.log(`pinned prettier ${PINNED} (${at})`);

  const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));
  const captured = Object.keys(manifest.files).map((r) => r.split(path.sep).join("/")).sort();
  const captureBytes = (rel) => {
    const abs = path.join(proj, rel);
    if (!fs.existsSync(abs)) throw new Error(`capture file missing: ${rel}`);
    const buf = fs.readFileSync(abs);
    if (sha256(buf) !== manifest.files[rel].sha256)
      throw new Error(`${rel} on disk does not match .upstream/manifest.json — re-verify the capture first`);
    return buf;
  };
  const captureSrcNames = new Set(captured.filter((r) => /^src\/.*\.js$/i.test(r)).map((r) => path.basename(r)));

  const readableDir = path.join(proj, "readable");
  const srcDir = path.join(proj, "src");
  if (!CHECK) {
    fs.mkdirSync(readableDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });
  }
  const written = { readable: new Set(), src: new Set() };

  const sources = [];
  const sections = [];
  const notRendered = [];
  let inlineFiles = [];
  let slicedTotal = 0;
  let skippedTotal = 0;

  const jsRelsAll = captured.filter((r) => /\.js$/i.test(r));
  const cssRels = captured.filter((r) => /\.css$/i.test(r));
  const htmlRels = captured.filter((r) => /\.html$/i.test(r));
  // reading order: the entry integrator first, then the app modules, then the
  // vendored three.js builds and the addon
  const rank = (rel) => (rel === "src/main.js" ? 0 : /^src\//.test(rel) ? 1 : 2);
  const jsRels = jsRelsAll.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const isVendor = (rel) => /^vendor\//.test(rel);

  // non-code payloads ride along in the manifest but are never rendered
  for (const rel of captured) {
    if (/\.(js|css|html)$/i.test(rel)) continue;
    const buf = captureBytes(rel);
    notRendered.push({
      capture: rel,
      kind: "payload",
      bytes: buf.length,
      sha256: sha256(buf),
      rendered: false,
      reason: "non-code payload — recorded with bytes + sha256, no pretty/slice pass",
    });
  }

  // ── 1) JS: vendor -> wholeFile; app -> statement-aligned slices ─────────
  for (const rel of jsRels) {
    const buf = captureBytes(rel);
    const text = buf.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(buf)) throw new Error(`${rel} does not round-trip through utf8`);
    const pretty = await formatOnce(prettier, text, "babel");
    if (pretty === text)
      throw new Error(`${rel}: prettier output is byte-identical to the capture — nothing to derive`);
    const sourceFile = prettyRelFor(rel);
    writeDerived(path.join(proj, sourceFile), pretty);
    written.readable.add(path.basename(sourceFile));
    const lines = linesOf(pretty);
    const tag = tagOf(rel);

    if (isVendor(rel)) {
      const cls = vendorClass(rel, tag);
      if (cls.guard && !cls.guard(pretty))
        throw new Error(`${rel}: whole-file guard failed (${cls.guardWhy}) — readable changed shape`);
      sections.push({
        file: `${tag}-vendor.js`,
        wholeFile: true,
        title: cls.title,
        desc: `Lines 1-${lines.length} of ${sourceFile}: ${cls.desc}`,
        note: "whole-file (vendor rule): indexed in readable/, never sliced",
        startLine: 1,
        endLine: lines.length,
        sourceFile,
      });
      sources.push({
        sourceFile,
        capture: rel,
        captureKind: "file",
        captureSha256: manifest.files[rel].sha256,
        captureBytes: buf.length,
        prettyLines: lines.length,
        prettyBytes: Buffer.byteLength(pretty, "utf8"),
        prettyPasses: 1,
        idempotent: true,
        tag,
        slices: 0,
        derived: "readable only (vendor bundle, wholeFile)",
        what: cls.what,
      });
      console.log(`derive: ${rel} -> ${sourceFile} (${lines.length} lines, wholeFile vendor)`);
      continue;
    }

    // ── app module: statement-aligned slicing ───────────────────────────
    const dbg = await prettier.__debug.parse(pretty, { parser: "babel" });
    const top = (dbg.ast.program || dbg.ast).body;
    const stmts = top.map((n) => ({
      node: n,
      startLine: lineOf(pretty, n.start),
      endLine: lineOf(pretty, n.end),
      text: pretty.slice(n.start, n.end),
    }));
    for (let i = 1; i < stmts.length; i++)
      if (stmts[i].startLine <= stmts[i - 1].endLine)
        throw new Error(`${rel}: statements ${i - 1}/${i} share a line — cannot slice at line boundaries`);

    const specials = [];
    const covered = new Array(stmts.length).fill(false);
    const claim = (a, b, block) => {
      if (a < 0 || b < a || b >= stmts.length) throw new Error(`${rel}: bad ${block.file} range ${a}-${b}`);
      for (let i = a; i <= b; i++) {
        if (covered[i]) throw new Error(`${rel}: ${block.file} overlaps another block at statement ${i}`);
        covered[i] = true;
      }
      specials.push({ ...block, A: stmts[a].startLine, B: stmts[b].endLine });
    };

    let exportSkip = null;
    const lastStmt = stmts[stmts.length - 1];
    if (
      lastStmt &&
      lastStmt.node.type === "ExportNamedDeclaration" &&
      !covered[stmts.length - 1] &&
      /^export\s*\{[\s\S]*\}\s*;?$/.test(lastStmt.text.trim()) &&
      !/\bfrom\b/.test(lastStmt.text)
    ) {
      claim(stmts.length - 1, stmts.length - 1, {
        kind: "skip",
        file: `${tag}-tail-export.js`,
        title: `${tag} — final export table (not sliced)`,
        desc: `Lines ${lastStmt.startLine}-${lastStmt.endLine}. The module's final export {…} table — the exported bindings live in the earlier slices; a standalone tail carries no new statements, so it is indexed only.`,
      });
    }

    // runs of uncovered statements -> windows
    const runs = [];
    for (let i = 0; i < stmts.length; i++) {
      if (covered[i]) continue;
      const run = [stmts[i]];
      while (i + 1 < stmts.length && !covered[i + 1]) run.push(stmts[++i]);
      runs.push(run);
    }
    const slices = [];
    for (const run of runs) for (const w of windowize(run)) slices.push(w);

    // blocks in line order, then re-tile so every line of the pretty is owned
    const blocks = [...specials, ...slices.map((w) => ({ kind: "slice", A: w.startLine, B: w.endLine, count: w.count }))];
    blocks.sort((a, b) => a.A - b.A);
    for (let i = 0; i < blocks.length; i++) {
      if (i === 0) blocks[i].A = 1;
      if (i + 1 < blocks.length) blocks[i].B = blocks[i + 1].A - 1;
      else blocks[i].B = lines.length;
    }

    let nn = 0;
    let perFileSkipped = 0;
    for (const b of blocks) {
      if (b.kind === "slice") {
        nn++;
        const num = String(nn).padStart(2, "0");
        const body = lines.slice(b.A - 1, b.B).join("\n") + "\n";
        const ms = markers(body);
        const topWord = ms.length ? ms[0][0] : /^\s*import\b/.test(body) ? "imports" : tag.toLowerCase();
        const oversized = b.count === 1 && b.B - b.A + 1 > MAX_WINDOW;
        const file = `${tag}-${num}.js`;
        const sliceText =
          `// ${tag} ${num} — ${topWord}\n` +
          `// Lines ${b.A}-${b.B} of ${sourceFile} (statement-aligned).\n` +
          body;
        const chk = parses(sliceText);
        if (!chk.ok) throw new Error(`generated src/${file} does not parse standalone: ${chk.why}`);
        writeDerived(path.join(srcDir, file), sliceText);
        written.src.add(file);
        sections.push({
          file,
          title: `${tag} ${num} — ${topWord}`,
          desc: `${oversized ? "Oversized single declaration (kept whole). " : ""}Lines ${b.A}-${b.B}. Markers: ${markerText(ms)}.`,
          startLine: b.A,
          endLine: b.B,
          sourceFile,
        });
      } else if (b.kind === "whole") {
        sections.push({
          file: b.file,
          wholeFile: true,
          title: b.title,
          desc: `Lines ${b.A}-${b.B} of ${sourceFile}: ${b.body}`,
          note: "whole-file region (vendor rule): indexed in readable/, never sliced",
          startLine: b.A,
          endLine: b.B,
          sourceFile,
        });
      } else {
        perFileSkipped++;
        sections.push({
          file: b.file,
          skipped: true,
          title: b.title,
          desc: b.desc,
          startLine: b.A,
          endLine: b.B,
          sourceFile,
          firstLine: lines[b.A - 1],
          lastLine: lines[b.B - 1],
        });
      }
    }
    slicedTotal += nn;
    skippedTotal += perFileSkipped;
    sources.push({
      sourceFile,
      capture: rel,
      captureKind: "file",
      captureSha256: manifest.files[rel].sha256,
      captureBytes: buf.length,
      prettyLines: lines.length,
      prettyBytes: Buffer.byteLength(pretty, "utf8"),
      prettyPasses: 1,
      idempotent: true,
      tag,
      slices: nn,
      derived:
        `readable + ${nn} statement-aligned slice(s)` +
        (perFileSkipped ? ` + ${perFileSkipped} skipped section(s)` : ""),
    });
    console.log(
      `derive: ${rel} -> ${sourceFile} (${lines.length} lines, ${nn} slices, ${perFileSkipped} skipped)`,
    );
  }

  // ── 2) CSS: readable pretty, wholeFile section (stylesheet rule) ────────
  for (const rel of cssRels) {
    const buf = captureBytes(rel);
    const text = buf.toString("utf8");
    const pretty = await formatOnce(prettier, text, "css");
    if (pretty === text) throw new Error(`${rel}: prettier output is byte-identical to the capture`);
    const sourceFile = prettyRelFor(rel);
    writeDerived(path.join(proj, sourceFile), pretty);
    written.readable.add(path.basename(sourceFile));
    const lines = linesOf(pretty);
    const tag = tagOf(rel);
    sections.push({
      file: `${tag}.css`,
      wholeFile: true,
      title: `${tag} — stylesheet (whole-file, never sliced)`,
      desc: `Lines 1-${lines.length} of ${sourceFile}. Whole-file (stylesheet rule): the capture stylesheet is indexed whole in readable/, never sliced.`,
      note: "whole-file (stylesheet, not sliced): CSS is indexed whole in readable/",
      startLine: 1,
      endLine: lines.length,
      sourceFile,
    });
    sources.push({
      sourceFile,
      capture: rel,
      captureKind: "file",
      captureSha256: manifest.files[rel].sha256,
      captureBytes: buf.length,
      prettyLines: lines.length,
      prettyBytes: Buffer.byteLength(pretty, "utf8"),
      prettyPasses: 1,
      idempotent: true,
      tag,
      slices: 0,
      derived: "readable only (stylesheet, wholeFile)",
    });
    console.log(`derive: ${rel} -> ${sourceFile} (${lines.length} lines, wholeFile stylesheet)`);
  }

  // ── 3) HTML entry document: inline <script>/<style> scan + twins ───────
  const inlineMap = { capture: null, generated: TODAY, note: "", blocks: [] };
  for (const rel of htmlRels) {
    const buf = captureBytes(rel);
    const blocks = scanBlocks(buf);
    const inline = blocks.filter((b) => !b.external);
    const external = blocks.filter((b) => b.external);
    inlineFiles.push(rel);
    for (const b of external)
      console.log(`derive: ${rel}: external ${b.kind} (not derived): ${b.tag.slice(0, 90)}`);
    if (!inline.length) {
      console.log(`derive: ${rel}: no inline <script>/<style> content blocks — no inline twins`);
      continue;
    }
    inlineMap.capture = rel;
    const entryTag = rel.replace(/\.html$/i, "").split("/").join("__");
    for (const b of inline) {
      const isImportmap = b.kind === "importmap";
      const parser = isImportmap ? "json" : b.kind === "style" ? "css" : b.kind;
      const DATA_TYPES = new Set(["application/ld+json", "application/json", "importmap", "speculationrules"]);
      const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(b.tag)?.[1] ?? "").toLowerCase();
      if (parser === "script" && DATA_TYPES.has(type)) {
        notRendered.push({
          capture: rel,
          kind: "inline-data",
          type,
          byteStart: b.contentStart,
          byteEnd: b.contentEnd,
          bytes: b.bytes,
          sha256: b.sha256,
          rendered: false,
          reason: `typed data block (<script type="${type}">) — data, not JS/CSS; recorded with range + sha256, no pretty pass`,
        });
        continue;
      }
      const tag = `${entryTag}-inline-${b.block}`;
      const twinExt = isImportmap ? "json" : b.kind === "style" ? "css" : "js";
      const prettyFile = `${tag}.pretty.${twinExt}`;
      const pretty = await formatOnce(prettier, b.text, parser);
      if (pretty === b.text)
        throw new Error(`readable/${prettyFile} would be byte-identical to its capture source`);
      writeDerived(path.join(readableDir, prettyFile), pretty);
      written.readable.add(prettyFile);
      const lines = linesOf(pretty);
      const prettyBuf = Buffer.from(pretty, "utf8");
      sections.push({
        file: `${tag}.${twinExt}`,
        wholeFile: true,
        title: `${tag} — inline ${b.kind} block (whole-file, never sliced)`,
        desc: `Lines 1-${lines.length} of readable/${prettyFile}. Whole-file: the entry document's inline ${b.kind} block (${b.bytes} B at bytes ${b.contentStart}-${b.contentEnd} of ${rel}) is indexed whole and never sliced.`,
        note: `whole-file (entry inline ${b.kind} block, not sliced)`,
        startLine: 1,
        endLine: lines.length,
        sourceFile: `readable/${prettyFile}`,
      });
      inlineMap.blocks.push({
        file: `readable/${prettyFile}`,
        source: rel,
        section: `${tag}.${twinExt}`,
        kind: b.kind,
        block: b.block,
        byteStart: b.contentStart,
        byteEnd: b.contentEnd,
        bytes: b.bytes,
        sha256: b.sha256,
      });
      sources.push({
        sourceFile: `readable/${prettyFile}`,
        capture: rel,
        captureKind: `inline-${b.kind}`,
        captureByteStart: b.contentStart,
        captureByteEnd: b.contentEnd,
        captureSha256: b.sha256,
        captureBytes: b.bytes,
        prettyLines: lines.length,
        prettyBytes: prettyBuf.length,
        prettySha256: sha256(prettyBuf),
        tag,
        slices: 0,
        derived: "readable only (inline block, wholeFile)",
      });
      console.log(`derive: ${rel}: inline ${b.kind} #${b.block} -> readable/${prettyFile} (${lines.length} lines)`);
    }
  }
  if (inlineMap.blocks.length) {
    inlineMap.note =
      "byte ranges + sha256 of every inline <script>/<style> content block in the captured entry document; " +
      "twins are the prettified (prettier 3.9.6, module API) renderings and are never shipped to a browser.";
    writeDerived(path.join(readableDir, "index-inline-map.json"), JSON.stringify(inlineMap, null, 2) + "\n");
  }

  // ── 4) prune orphan derived files (capture untouched) ──────────────────
  let pruned = 0;
  for (const f of fs.existsSync(readableDir) ? fs.readdirSync(readableDir) : []) {
    if (/\.pretty\.(js|css)$/i.test(f) && !written.readable.has(f)) {
    if (CHECK) {
      noteProblem(keyOf(path.join(readableDir, f)), `derive --check: orphan derived file readable/${f}`);
    } else {
      fs.rmSync(path.join(readableDir, f));
      pruned++;
      console.log(`derive: pruned orphan derived file readable/${f}`);
    }
    }
  }
  for (const f of fs.existsSync(srcDir) ? fs.readdirSync(srcDir) : []) {
    // never touch captured modules — only derived-looking files are pruned
    if (!f.endsWith(".js") || captureSrcNames.has(f)) continue;
    if (!written.src.has(f)) {
    if (CHECK) {
      noteProblem(keyOf(path.join(srcDir, f)), `derive --check: orphan derived file src/${f}`);
    } else {
      fs.rmSync(path.join(srcDir, f));
      pruned++;
      console.log(`derive: pruned orphan derived file src/${f}`);
    }
    }
  }

  // ── 5) split-spec.json (2-space indent + trailing newline) ─────────────
  const appJs = sources.filter((s) => s.derived.startsWith("readable +"));
  const vendorJsS = sources.filter((s) => /wholeFile\)$/.test(s.derived) && s.capture.endsWith(".js"));
  const cssSources = sources.filter((s) => s.sourceFile.endsWith(".pretty.css"));
  const firstSlice = sections.find((s) => !s.wholeFile && !s.skipped);
  const spec = {
    project: "downhill",
    kind: "statement-aligned-slices",
    defaultFile: `src/${firstSlice ? firstSlice.file : ""}`,
    note:
      "DOWNHILL — Urban FPV (https://downhill-eta.vercel.app/) is capture-class: a hand-written ES module " +
      "graph served at the origin root by a Vercel static deploy (no bundler in the app layer; only the two " +
      "three.js r183 builds are minified vendor code). §0.4 fork-over-mirror was checked on 2026-10-13 — " +
      "src/main.js credits the author Sree Menon and links https://github.com/msreekm/downhill as the \"GitHub " +
      "repo\", but that repository answers 404 (removed or never public): no public source exists, so the " +
      "mirror stands (recorded in README.md §0.4). Derived pipeline: capture → pinned prettier 3.9.6 (module " +
      "API, default options, single pass verified idempotent — never the CLI: it respects .gitignore and can " +
      "silently echo its input) → readable/<name>.pretty.js per captured JS file (capture-relative name, " +
      "nested dirs flattened with __; every pretty provably NOT byte-identical to its capture source) → " +
      "statement-aligned slices src/<name>-NN.js of every APP module (top-level declaration boundaries " +
      "only, ~250-350 line windows; oversized single declarations stay whole) with an exact 2-line " +
      "provenance header. Every slice parses standalone under `node --input-type=module --check -` and " +
      "round-trips byte-exact to its recorded readable line range. Layout divergence (README): the origin " +
      "serves the app under /src/ and the vendored libraries under /vendor/, so the byte-exact capture lives " +
      "at src/*.js and vendor/** at the repo root — derived slices share src/ with the captured modules and " +
      "are never listed in .upstream/manifest.json. Vendor rule — wholeFile sections, never sliced: the " +
      "three.js r183 builds (three.module.min.js imports three.core.min.js) and the BufferGeometryUtils " +
      "addon. Stylesheet rule: src/style.css is wholeFile. Inline scan: index.html carries an inline " +
      "importmap — twin readable/index-inline-1.pretty.json + readable/index-inline-map.json with byte " +
      "range + sha256. Non-standalone parts are indexed but never sliced (skipped sections): a pure trailing " +
      "export {…} table where one exists — this capture's app layer has none. Identifiers in src/ are the " +
      "app's own declared names — no rename campaign applies (PLAN §5) since the served code is not " +
      "minified. Capture bytes are untouched by everything above; re-cut with `node tools/derive.mjs` after " +
      "any capture refresh. `node tools/audit.js` is the gate.",
    renderOptions: {
      _default:
        "prettier 3.9.6, module API, default options, single pass (re-format verified idempotent at derive time) — never the CLI: it respects .gitignore and can silently echo its input",
      js: "parser babel, no plugins",
      css: "parser css, no plugins",
      json: "parser json, no plugins (inline importmap blocks)",
    },
    source:
      `readable/: ${sources.filter((s) => s.sourceFile?.endsWith(".pretty.js")).length} JS pretties ` +
      `(${appJs.length} app module(s) sliced, ${vendorJsS.length} vendor wholeFile) + ` +
      `${cssSources.length} CSS pretties; ` +
      `src/: ${appJs.reduce((n, s) => n + s.slices, 0)} statement-aligned slices across ${appJs.length} app module(s); ` +
      `${sections.filter((s) => s.skipped).length} skipped section(s); ` +
      `${sections.filter((s) => s.wholeFile).length} wholeFile section(s); ` +
      `capture: ${captured.length} files under .upstream/manifest.json; inline scan: ${inlineFiles.join(", ")} ` +
      `(${inlineMap.blocks.length} inline content block(s)); notRendered: ${notRendered.length} payload(s).`,
    inline: {
      scanned: inlineFiles,
      contentBlocks: inlineMap.blocks.length,
      notRendered: notRendered.length,
      note: inlineMap.blocks.length
        ? "index.html carries an inline importmap — prettified into readable/index-inline-1.pretty.json " +
          "and recorded in readable/index-inline-map.json."
        : "no inline <script>/<style> content blocks in the captured entry document.",
    },
    sources,
    sections,
    notRendered,
  };
  writeDerived(path.join(proj, "split-spec.json"), JSON.stringify(spec, null, 2) + "\n");

  // ── 6) self-check (tools/audit.js is the authoritative gate) ────────────
  let bad = 0;
  const bySource = new Map();
  for (const s of sections) {
    if (!bySource.has(s.sourceFile)) bySource.set(s.sourceFile, []);
    bySource.get(s.sourceFile).push(s);
  }
  for (const [sourceFile, list] of bySource) {
    const lines = readLines(path.join(proj, sourceFile));
    const sorted = [...list].sort((a, b) => a.startLine - b.startLine);
    if (sorted[0].startLine !== 1) {
      console.error(`TILING FAIL ${sourceFile}: starts at line ${sorted[0].startLine}`);
      bad++;
    }
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i].startLine !== sorted[i - 1].endLine + 1) {
        console.error(`TILING FAIL ${sourceFile}: gap/overlap at ${sorted[i].file}`);
        bad++;
      }
    if (sorted[sorted.length - 1].endLine !== lines.length) {
      console.error(`TILING FAIL ${sourceFile}: does not reach EOF (${lines.length})`);
      bad++;
    }
  }
  let parsed = 0;
  let ranged = 0;
  let roundOK = 0;
  for (const s of sections) {
    if (s.wholeFile || s.skipped) continue;
    ranged++;
    const abs = path.join(srcDir, s.file);
    const text = readDerived(abs);
    const nl2 = text.indexOf("\n", text.indexOf("\n") + 1);
    const body = text.slice(nl2 + 1);
    const expected = readLines(path.join(proj, s.sourceFile)).slice(s.startLine - 1, s.endLine).join("\n") + "\n";
    if (body !== expected) {
      console.error(`ROUND-TRIP FAIL ${s.file}`);
      bad++;
    } else roundOK++;
    if (!parses(text).ok) {
      console.error(`PARSE FAIL src/${s.file}`);
      bad++;
    } else parsed++;
  }
  let prettyParsed = 0;
  for (const s of sources) {
    if (!s.sourceFile?.endsWith(".pretty.js")) continue;
    if (!parses(readDerived(path.join(proj, s.sourceFile))).ok) {
      console.error(`PARSE FAIL ${s.sourceFile}`);
      bad++;
    } else prettyParsed++;
  }
  console.log(
    `derive: ${written.readable.size} readable file(s), ${written.src.size} src slices ` +
      `(${parsed}/${ranged} parse standalone, ${roundOK}/${ranged} round-trip byte-exact), ` +
      `${skippedTotal} skipped, ${sections.filter((s) => s.wholeFile).length} wholeFile, ` +
      `${prettyParsed} pretty js parse clean, ${notRendered.length} notRendered, ${pruned} orphan(s) pruned — ` +
      `self-check ${bad ? bad + " FAILURE(S)" : "clean"}`,
  );
  if (CHECK) {
    if (checkProblems || bad) {
      console.error(
        `derive --check: ${checkProblems} difference(s) between the committed derived layers and a fresh re-derivation` +
          (bad ? ` (self-check: ${bad} failure(s))` : ""),
      );
      process.exit(1);
    }
    console.log("derive --check: the committed derived layers match a fresh re-derivation exactly (nothing written)");
    process.exit(0);
  }
  if (bad) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
