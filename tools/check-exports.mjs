// check-exports.mjs — does the derived layer still export every PUBLIC name the
// capture exported?
//
// A chunk's export table is its public API. A binding a chunk re-exports under
// its OWN name — a shorthand export, `export { i }` — has no alias side, so
// renaming the binding moves the public name too, and every importer of it
// stops resolving. lagoon-tree-village proved it: `i` became LAGOON_LOBES and
// `a f n p t` became angleToDir/polylinePath/RAD_TO_DEG/resampleCatmullRom/
// DEG_TO_RAD, with twelve chunks importing those names.
//
// The chunk-level gate (tools/check-chunk.mjs) compares a chunk's export names
// before and after it REBUILDS the chunk. This tool asks the same question of
// the layer directly, without a reconstruction: it reads the pristine pretty,
// finds its export tables, and checks that the layer's own text — the slice
// that carries the table, or the index-only tail rebuilt with the mirror's
// renameBindings — still exports the same public names.
//
// It is SELF-CONTAINED (its own tokenizer, no dependency on the mirror's
// engine) so that a mirror with no chunk gate can still carry it.
//
// Usage: node tools/check-exports.mjs          # check every source
//        node tools/check-exports.mjs --quiet  # only the verdict line
//
// Exits 1 if any public export name was lost.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, "..");
const QUIET = process.argv.includes("--quiet");

const ID_START = /[A-Za-z_$]/;
const ID_PART = /[\w$]/;

/** Tokenize a whole source text. Every token carries its span (`s`..`e`). */
function tokens(text) {
  const st = { i: 0, text, out: [] };
  scan(st, undefined);
  return st.out;
}

function emit(st, t, v, s, e) {
  st.out.push({ t, v, s, e: e === undefined ? s + v.length : e });
}

function scan(st, stop) {
  const { text } = st;
  const n = text.length;
  // Template-substitution scans (stop === "}") must close on the MATCHING
  // brace: an object literal inside ${…} used to end the substitution early,
  // which pushed the rest of the expression into the outer template's literal
  // run and broke recovery alignment (madrid-rush / wanju-bara fix, carried).
  let braceDepth = 0;
  while (st.i < n) {
    const c = text[st.i];
    const start = st.i;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      st.i++;
      continue;
    }
    if (c === "/" && text[st.i + 1] === "/") {
      while (st.i < n && text[st.i] !== "\n") st.i++;
      continue;
    }
    if (c === "/" && text[st.i + 1] === "*") {
      st.i += 2;
      while (st.i < n && !(text[st.i] === "*" && text[st.i + 1] === "/")) st.i++;
      st.i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = st.i + 1;
      while (j < n) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === c) {
          j++;
          break;
        }
        j++;
      }
      emit(st, "lit", text.slice(st.i, j), start);
      st.i = j;
      continue;
    }
    if (c === "`") {
      scanTemplate(st);
      continue;
    }
    // Regex literal: a `/` is a regex start when the previous significant token
    // cannot end an expression — otherwise it is division. Scanning it as one
    // token keeps flag letters (`/gm`) and body text out of the identifier
    // stream, where a map key like `gm` would otherwise rewrite regex flags.
    if (c === "/" && isRegexStart(st)) {
      let j = st.i + 1,
        inClass = !1;
      while (j < n) {
        const d = text[j];
        if (d === "\\") {
          j += 2;
          continue;
        }
        if (d === "[") inClass = !0;
        else if (d === "]") inClass = !1;
        else if (d === "/" && !inClass) break;
        else if (d === "\n") break; // unterminated: not a regex after all
        j++;
      }
      if (j < n && text[j] === "/") {
        j++;
        while (j < n && /[a-z]/.test(text[j])) j++; // flags
        emit(st, "re", text.slice(st.i, j), start);
        st.i = j;
        continue;
      }
    }
    if (stop === "}" && (c === "{" || c === "}")) {
      if (c === "}") {
        if (braceDepth === 0) {
          st.i++;
          return;
        }
        braceDepth--;
      } else braceDepth++;
      // fall through: the brace is a real token of the substitution
    }
    if (ID_START.test(c)) {
      let j = st.i + 1;
      while (j < n && ID_PART.test(text[j])) j++;
      emit(st, "id", text.slice(st.i, j), start);
      st.i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = st.i + 1;
      while (j < n && /[\w.]/.test(text[j])) j++;
      emit(st, "num", text.slice(st.i, j), start);
      st.i = j;
      continue;
    }
    emit(st, "pun", c, start);
    st.i++;
  }
}

function isRegexStart(st) {
  const prev = st.out[st.out.length - 1];
  if (!prev) return !0;
  if (prev.t === "pun") return !(")]}".includes(prev.v) || prev.v === "++" || prev.v === "--");
  if (prev.t === "id")
    return /^(?:return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await|throw)$/.test(prev.v);
  return !1; // after id/num/str/template/regex, `/` is division
}

function scanTemplate(st) {
  const { text } = st;
  const n = text.length;
  emit(st, "pun", "`", st.i);
  st.i++;
  let run = "";
  let runStart = st.i;
  const flush = () => {
    if (run) emit(st, "lit", run, runStart);
    run = "";
  };
  while (st.i < n) {
    const c = text[st.i];
    if (c === "\\") {
      if (!run) runStart = st.i;
      run += text.slice(st.i, st.i + 2);
      st.i += 2;
      continue;
    }
    if (c === "`") {
      flush();
      emit(st, "pun", "`", st.i);
      st.i++;
      return;
    }
    if (c === "$" && text[st.i + 1] === "{") {
      flush();
      emit(st, "pun", "${", st.i);
      st.i += 2;
      scan(st, "}");
      emit(st, "pun", "}", st.i - 1);
      runStart = st.i;
      continue;
    }
    if (!run) runStart = st.i;
    run += c;
    st.i++;
  }
  flush();
}

// ---- slice headers ---------------------------------------------------------
// The derive writer prepends a 2-line provenance header
//   // <chunk tag> NN — <markers>
//   // Lines A-B of <sourceFile> (statement-aligned).
// It is not part of the source range, so verification and recovery both strip
// it — EXACTLY those two lines. Stripping a run of leading `//` lines would eat
// real comments a source range may begin with (the madrid-rush fix).


/**
 * The PUBLIC names of an export table: `export { a, b as c }` -> a and c.
 *
 * The alias KEYWORD is found BY POSITION, not by value: a chunk can have a
 * local literally named `as`, and then the group is `export { as as o }` —
 * ids = [as, as, o] — where a value-based lookup finds the LOCAL, not the
 * keyword. The engine's own foreignNameIndices is position-based; this must
 * agree with it.
 */
/**
 * A TEXTUAL fallback for the tokenizer, which is a heuristic: a backtick
 * or a `/` it cannot classify can make it swallow the rest of a file. When
 * the tokenizer finds no export names in a text, this scans it textually.
 * It is cruder than the tokenizer (it can see an `export` inside a string),
 * so it is a fallback only — but it makes the verdict robust against the
 * tokenizer's blindness without weakening the check.
 */
function publicExportNamesText(text) {
  const names = new Set();
  for (const m of text.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const as = seg.split(/\s+as\s+/);
      if (as.length === 2) names.add(as[1].trim());
      else if (as.length === 1) names.add(seg);
    }
  }
  for (const m of text.matchAll(/export\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/g))
    names.add(m[1]);
  if (/\bexport\s+default\b/.test(text)) names.add("default");
  return names;
}

function publicExportNames(text) {
  const ts = tokens(text);
  const names = new Set();
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (t.t !== "id" || t.v !== "export") continue;
    const n1 = ts[i + 1];
    if (!n1) continue;
    if (n1.t === "pun" && n1.v === "{") {
      let end = i + 2;
      while (end < ts.length && !(ts[end].t === "pun" && ts[end].v === "}")) end++;
      let group = [];
      const flush = () => {
        if (!group.length) return;
        const ids = group.filter((k) => ts[k].t === "id");
        if (ids.length === 1) names.add(ts[ids[0]].v);
        else if (ids.length >= 3 && ts[ids[1]].v === "as") names.add(ts[ids[2]].v);
        else if (ids.length >= 2) names.add(ts[ids.length - 1].v);
        group = [];
      };
      for (let k = i + 2; k < end; k++) {
        if (ts[k].t === "pun" && ts[k].v === ",") flush();
        else group.push(k);
      }
      flush();
      i = end;
    } else if (n1.t === "id" && n1.v === "default") {
      names.add("default");
    } else if (n1.t === "id" && n1.v === "async" && ts[i + 2]?.t === "id" && ts[i + 2].v === "function") {
      const name = ts[i + 3];
      if (name && name.t === "id") names.add(name.v);
    } else if (n1.t === "id" && n1.v === "*" && ts[i + 2]?.t === "id" && ts[i + 2].v === "as") {
      const name = ts[i + 3];
      if (name && name.t === "id") names.add(name.v);
    } else if (n1.t === "id" && (n1.v === "class" || n1.v === "function")) {
      const name = ts[i + 2];
      if (name && name.t === "id") names.add(name.v);
    } else if (n1.t === "id" && (n1.v === "const" || n1.v === "let" || n1.v === "var")) {
      // Only the declarator NAMES of the declaration count. The
      // initializer's own object-literal properties are NOT exports:
      // `export const _debug = () => ({ ctx, master, ... })` exports
      // `_debug`, not `ctx` or `master`. So the scan tracks brace depth
      // and stops at the end of the DECLARATION.
      let depth = 0;
      for (let k = i + 2; k < ts.length && k < i + 400; k++) {
        const tk = ts[k];
        if (tk.t === "pun" && (tk.v === "{" || tk.v === "(" || tk.v === "[")) depth++;
        else if (tk.t === "pun" && (tk.v === "}" || tk.v === ")" || tk.v === "]")) depth--;
        if (tk.t === "id" && depth === 0) {
          const nx = ts[k + 1];
          const isDeclarator =
            nx &&
            ((nx.t === "pun" && (nx.v === "=" || nx.v === "," || nx.v === ";" || nx.v === ")" || nx.v === "}")) ||
              nx.t === "id");
          if (isDeclarator && tk.v !== "of" && tk.v !== "in") names.add(tk.v);
        }
        if (tk.t === "pun" && tk.v === ";" && depth === 0) break;
        if (tk.t === "pun" && tk.v === "}" && depth === 0 && ts[k - 1]?.t === "pun" && ts[k - 1].v === "{") break;
      }
    }
  }
  return names;
}

/** Every export TABLE in a source, with its line range. */
function exportTables(text) {
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (off) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const ts = tokens(text);
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (t.t !== "id" || t.v !== "export") continue;
    const n1 = ts[i + 1];
    if (!n1 || n1.t !== "pun" || n1.v !== "{") continue;
    let end = i + 2;
    while (end < ts.length && !(ts[end].t === "pun" && ts[end].v === "}")) end++;
    if (end >= ts.length) continue;
    out.push({ from: lineOf(t.s), to: lineOf(ts[end].e) });
    i = end;
  }
  return out;
}

const read = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
};

const specPath = path.join(PROJ, "split-spec.json");
if (!fs.existsSync(specPath)) {
  console.error("check-exports: no split-spec.json — this mirror has no derived layer to check");
  process.exit(0);
}
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

// The src files, by their path relative to src/ and by basename — a spec's
// `file` field sometimes omits the path prefix the file actually carries
// (`12-part.js` on disk as `src/\12-part.js`), so a lookup needs both.
const srcDir = path.join(PROJ, "src");
const srcByRel = new Map();
const srcByBase = new Map();
if (fs.existsSync(srcDir)) {
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith(".js")) out.push(p);
    }
    return out;
  };
  for (const f of walk(srcDir)) {
    const rel = path.relative(srcDir, f).replace(/\\/g, "/");
    srcByRel.set(rel, f);
    const base = rel.split("/").pop();
    if (!srcByBase.has(base)) srcByBase.set(base, f);
  }
}
/** every src file that could be this section's file */
const resolveSrcAll = (name) => {
  if (!name) return [];
  const rel = String(name).replace(/\\/g, "/").replace(/^\.?\//, "");
  const base = rel.split("/").pop();
  const out = [];
  const exact = srcByRel.get(rel);
  if (exact) out.push(exact);
  // a file whose name carries a leading backslash (a Windows path artefact)
  // is the same file to the spec; and a mirror may hold several candidates
  for (const [key, p] of srcByBase) {
    if (key.replace(/^\\/, "") === base && !out.includes(p)) out.push(p);
  }
  return out;
};

// The src slices, grouped by the source file they belong to. The SPEC's
// sections are the authority — they carry the file, the source and the line
// range — and the slice's own `Lines X-Y of Z` header is the fallback for
// mirrors whose spec omits the ranges. The header alone was not enough: the
// older generation's whole-file slices carry a title ("Sequential whole-file
// section") instead of a range header, so a header-only discovery missed them.
const slicesBySource = new Map();
const addSlice = (key, entry) => {
  if (!key) return;
  if (!slicesBySource.has(key)) slicesBySource.set(key, []);
  slicesBySource.get(key).push(entry);
};
for (const sec of spec.sections || []) {
  if (!sec.file || !sec.sourceFile || sec.skipped) continue;
  const onDisk = resolveSrcAll(sec.file);
  if (!onDisk.length) continue;
  if (!Number.isInteger(sec.startLine) || !Number.isInteger(sec.endLine)) continue;
  addSlice(sec.sourceFile, { file: onDisk.join("\n"), from: sec.startLine, to: sec.endLine });
}
if (fs.existsSync(srcDir)) {
  for (const f of srcByRel.values()) {
    const head = read(f).split(/\r?\n/).slice(0, 4).join("\n");
    const m = head.match(/Lines\s+(\d+)-(\d+)\s+of\s+(\S+)/);
    if (!m) continue;
    addSlice(m[3], { file: f, from: +m[1], to: +m[2] });
  }
}

// the index-only skipped tails
const tailsBySource = new Map();
for (const sec of spec.sections || []) {
  if (!sec.skipped) continue;
  if (!tailsBySource.has(sec.sourceFile)) tailsBySource.set(sec.sourceFile, []);
  tailsBySource.get(sec.sourceFile).push(sec);
}

/** the mirror's own engine, for rebuilding an index-only tail */
let applyBindingMap = null;
{
  const enginePath = path.join(PROJ, "tools", "engine", "rename-layer.mjs");
  if (fs.existsSync(enginePath)) {
    try {
      const mod = await import(pathToFileURL(enginePath).href);
      if (typeof mod.applyBindingMap === "function") applyBindingMap = mod.applyBindingMap;
    } catch {
      /* the tail is then checked as recorded text */
    }
  }
}

// The source list: `spec.sources[]` when the mirror has one, else DERIVED
// from the sections' `sourceFile` — the older generation records only
// `spec.sections[]`, and walking `sources` alone left those layers unchecked.
let sources = spec.sources || [];
if (!sources.length) {
  const seen = new Map();
  for (const sec of spec.sections || []) {
    if (!sec.sourceFile) continue;
    if (!seen.has(sec.sourceFile)) seen.set(sec.sourceFile, { sourceFile: sec.sourceFile, capture: null });
    const e = seen.get(sec.sourceFile);
    if (!e.capture && sec.capture) e.capture = sec.capture;
  }
  sources = [...seen.values()];
}

let checked = 0;
let lost = 0;
for (const src of sources) {
  if (!src.sourceFile) continue;
  const pristineText = read(path.join(PROJ, src.sourceFile)) ?? (src.capture ? read(path.join(PROJ, src.capture)) : null);
  if (pristineText == null) continue;
  const slices = slicesBySource.get(src.sourceFile) || [];
  const tails = tailsBySource.get(src.sourceFile) || [];
  const bindings = src.renameBindings || {};

  for (const table of exportTables(pristineText)) {
    const before = publicExportNames(pristineText.slice(0, 0) + "") ; // placeholder, replaced below
    const tableText = pristineText
      .split(/\r?\n/)
      .slice(table.from - 1, table.to)
      .join("\n");
    const tokNames = publicExportNames(tableText);
    const names = tokNames.size ? tokNames : publicExportNamesText(tableText);
    if (!names.size) continue;

    // the layer's text for this table: a slice that carries it, or the tail
    let derivedText = null;
    for (const s of slices) {
      if (s.from <= table.from && s.to >= table.to) {
        derivedText = read(s.file);
        break;
      }
    }
    if (derivedText == null) {
      for (const t of tails) {
        if (t.startLine <= table.from && t.endLine >= table.to) {
          const raw = t.text ?? pristineText.split(/\r?\n/).slice(t.startLine - 1, t.endLine).join("\n");
          derivedText = applyBindingMap && Object.keys(bindings).length ? applyBindingMap(raw, bindings) : raw;
          break;
        }
      }
    }
    if (derivedText == null) continue; // the table is not part of the derived layer
    checked++;
    const afterTok = publicExportNames(derivedText);
    const after = afterTok.size ? afterTok : publicExportNamesText(derivedText);
    const missing = [...names].filter((n) => !after.has(n));
    if (missing.length) {
      lost += missing.length;
      console.log(`${src.sourceFile}: a public export name was LOST: ${missing.join(", ")}`);
      console.log(`  the capture exported: ${[...names].sort().join(" ")}`);
      console.log(`  the layer exports:   ${[...after].sort().join(" ")}`);
    }
  }
}

if (!QUIET) console.log(`check-exports: ${checked} export table(s) checked`);
if (lost) {
  console.log(`check-exports: FAILED — ${lost} public export name(s) lost`);
  process.exit(1);
}
console.log("check-exports: no public export name lost");
