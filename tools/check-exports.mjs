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
  for (const m of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const as = seg.split(/\s+as\s+/);
      if (as.length === 2) names.add(as[1].trim());
      else if (as.length === 1) names.add(seg);
    }
  }
  for (const m of text.matchAll(/\bexport\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/g))
    names.add(m[1]);
  if (/\bexport\s+default\b/.test(text)) names.add("default");
  return names;
}

/**
 * The names a `const`/`let`/`var` declaration BINDS — the only names the
 * declaration form exports.
 *
 *   export const a = 1, b = 2;      -> a, b
 *   export const { p, q } = obj;    -> p, q      (destructuring)
 *   export const { a: b } = obj;    -> b         (the KEY `a` is not bound)
 *
 * Two things must NOT be counted:
 *
 * 1. The INITIALIZER binds nothing. `export const h = (id) => typeof id`
 *    exports `h`, not `id`. The scanner therefore tracks whether it is still
 *    in the BINDING part of the declarator list: the binding ends at the
 *    first `=` (the initializer begins) and resumes at the next `,` (the
 *    next declarator begins). Without that, an initializer's own
 *    identifiers were counted as exported names — and since the capture and
 *    the layer format the same initializer differently (prettier wraps it),
 *    that produced a FALSE "public export name was LOST".
 *
 * 2. A destructuring KEY is not a binding. `{ a: b }` binds `b`.
 *
 * The rule is deliberately conservative: an identifier is counted only when
 * it is unambiguously a binding. Over-counting would report a false LOST;
 * under-counting merely misses a check, and the missing check is reported
 * honestly by the uncovered-table counter.
 */
function declaredNames(ts, start) {
  const out = new Set();
  const t0 = ts[start];
  if (!t0) return out;

  // the DESTRUCTURING shape: the declaration starts with a pattern
  if (t0.t === "pun" && (t0.v === "{" || t0.v === "[")) {
    const open = t0.v;
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    for (let k = start; k < ts.length; k++) {
      const tk = ts[k];
      depth = depthOf(tk, depth);
      if (depth === 0 && tk.t === "pun" && tk.v === close) break;
      // one level inside the pattern: a binding unless it is a KEY
      if (tk.t === "id" && depth === 1) {
        const nx = ts[k + 1];
        const isKey = nx && nx.t === "pun" && nx.v === ":";
        if (!isKey) out.add(tk.v);
      }
    }
    return out;
  }

  // the SIMPLE shape: names separated by `,` at depth 0
  let depth = 0;
  let inBinding = true;
  for (let k = start; k < ts.length && k < start + 400; k++) {
    const tk = ts[k];
    depth = depthOf(tk, depth);
    if (depth === 0) {
      if (tk.t === "pun" && tk.v === "=") inBinding = false;
      else if (tk.t === "pun" && tk.v === ",") inBinding = true;
      else if (tk.t === "id" && inBinding && tk.v !== "of" && tk.v !== "in") out.add(tk.v);
    }
    if (tk.t === "pun" && tk.v === ";" && depth === 0) break;
    if (tk.t === "pun" && tk.v === "}" && depth === 0 && ts[k - 1]?.t === "pun" && ts[k - 1].v === "{") break;
  }
  return out;
}

/**
 * The bracket depth of a token, for the scanner that has to know where a
 * construct ENDS.
 *
 * The tokenizer emits a template literal's interpolation as a `${` token
 * followed by the inner tokens and a `}` token — the two are separate. So a
 * scanner that counts only `{` and `}` sees the interpolation's `}` with no
 * matching `{`, and its depth goes NEGATIVE. From there every later
 * `;` looks like it is at the wrong depth, the declaration scan never stops,
 * and a comma inside a template puts the scanner back into "binding" mode —
 * which counted the template's own identifiers as exported names.
 *
 * So `${` opens a bracket and `}` closes it: the pair balances.
 */
function depthOf(tk, depth) {
  if (tk.t !== "pun") return depth;
  if (tk.v === "{" || tk.v === "(" || tk.v === "[" || tk.v === "${") return depth + 1;
  if (tk.v === "}" || tk.v === ")" || tk.v === "]") return depth - 1;
  return depth;
}

/**
 * The index of the `}` that closes the `{` at `start`, or -1.
 */
function closingBrace(ts, start) {
  let depth = 0;
  for (let k = start; k < ts.length; k++) {
    const tk = ts[k];
    if (tk.t === "pun" && (tk.v === "{" || tk.v === "(" || tk.v === "[" || tk.v === "${")) depth++;
    else if (tk.t === "pun" && (tk.v === "}" || tk.v === ")" || tk.v === "]")) {
      depth--;
      if (depth === 0 && tk.v === "}") return k;
      if (depth < 0) return -1;
    }
  }
  return -1;
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
      const end = closingBrace(ts, i + 1);
      if (end < 0) continue;
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
      // `export default function X` / `export default X` — the public name
      // is `default`, and `publicExportNames` counts it, so it must be a
      // SURFACE too (see `exportTables`) or the chunk reports a vacuous green
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
      for (const nm of declaredNames(ts, i + 2)) names.add(nm);
    }
  }
  return names;
}

/**
 * Every export SURFACE in a source, with its line range: the brace form
 * (`export { a, b as c }`) AND the declaration form (`export const X`,
 * `export function X`, `export class X`). The declaration form matters:
 * renaming one of those moves the chunk's public name exactly as a
 * shorthand export does, and a chunk that uses ONLY that form used to be
 * reported as "0 export table(s) checked" — a vacuous green.
 */
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
    const end = closingBrace(ts, i + 1);
    if (end < 0) continue;
    out.push({ from: lineOf(t.s), to: lineOf(ts[end].e) });
    i = end;
  }
  // the `export default` form: `export default function X` / `export default X`.
  // The public name is `default`; `publicExportNames` counts it, so it must be
  // a SURFACE here too — otherwise a chunk whose only export is a default
  // export reports "0 export table(s) checked" and a vacuous green.
  for (let i = 0; i < ts.length - 2; i++) {
    if (ts[i].t !== "id" || ts[i].v !== "export") continue;
    const k1 = ts[i + 1];
    if (!k1 || k1.t !== "id" || k1.v !== "default") continue;
    out.push({ from: lineOf(ts[i].s), to: lineOf(ts[i + 1].e) });
  }
  // the DECLARATION form: `export const X`, `export function X`,
  // `export class X`, `export async function X`
  for (let i = 0; i < ts.length - 2; i++) {
    if (ts[i].t !== "id" || ts[i].v !== "export") continue;
    const k1 = ts[i + 1];
    if (!k1 || k1.t !== "id") continue;
    if (k1.v === "async") {
      const k2 = ts[i + 2];
      if (!k2 || k2.t !== "id" || k2.v !== "function") continue;
    } else if (k1.v !== "const" && k1.v !== "let" && k1.v !== "var" && k1.v !== "function" && k1.v !== "class") {
      continue;
    }
    out.push({ from: lineOf(ts[i].s), to: lineOf(ts[i + 1].e) });
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
// WHERE the derived layer and the capture live, per the mirror's own spec.
// A mirror may record `derivedRoot` (the derived layer is not always at the
// mirror root's `src/`) and `captureRoot` (the pristine is not always at the
// mirror root). Absent either, the historical location is used.
// a root is used only when it is a STRING: some mirrors store `captures`
// as an ARRAY of records, not a directory path
const str = (v) => (typeof v === "string" ? v : "");
const DERIVED_ROOT = str(spec.derivedRoot) || str(spec.derived) || "src";
const CAPTURE_ROOT = str(spec.captureRoot) || str(spec.captures);

// a spec's `captures` ARRAY is a map from a capture to the pretty twin that
// mirrors it — the pristine the gate needs
const capturePretty = new Map();
if (Array.isArray(spec.captures)) {
  for (const c of spec.captures) {
    if (c && typeof c.capture === "string" && typeof c.pretty === "string")
      capturePretty.set(c.capture, c.pretty);
  }
}
const srcDir = path.isAbsolute(DERIVED_ROOT) ? DERIVED_ROOT : path.join(PROJ, DERIVED_ROOT);
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
  // A section's file can match SEVERAL src files — the spec names a
  // basename, and two directories may hold a file of that name
  // (`play/src/stream/pets-01.js` and `play/src/ui/pets-01.js`).
  // Joining the candidates into ONE path made a path that no read can
  // open, so the table silently fell through to the uncovered counter.
  // Each candidate is its own slice entry instead.
  for (const p of onDisk) addSlice(sec.sourceFile, { file: p, from: sec.startLine, to: sec.endLine });
}
if (fs.existsSync(srcDir)) {
  for (const f of srcByRel.values()) {
    const head = read(f).split(/\r?\n/).slice(0, 4).join("\n");
    const m = head.match(/Lines\s+(\d+)-(\d+)\s+of\s+(\S+)/);
    if (!m) continue;
    addSlice(m[3], { file: f, from: +m[1], to: +m[2] });
  }
}

// the WHOLE-FILE sections: no line range, but the file is the derived text
const wholeFiles = new Map();
for (const sec of spec.sections || []) {
  if (!sec.wholeFile || !sec.sourceFile || !sec.file) continue;
  if (!wholeFiles.has(sec.sourceFile)) wholeFiles.set(sec.sourceFile, []);
  wholeFiles.get(sec.sourceFile).push(sec);
}

// find a file by its basename anywhere under the mirror — the spec may
// store a bare basename where the file lives under captureRoot
function findByBase(base) {
  if (!base) return null;
  const stack = [PROJ];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === ".git" || e.name === "node_modules") continue;
        stack.push(p);
      } else if (e.name === base) {
        return fs.readFileSync(p, "utf8");
      }
    }
  }
  return null;
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
// The source list: `spec.sources[]` when the mirror has one, else DERIVED
// from the sections' `sourceFile` — the older generation records only
// `spec.sections[]`, and walking `sources` alone left those layers unchecked.
//
// Two shapes need care. A spec's `sources[]` may name its pristine under
// `path` rather than `sourceFile` (the pristine is a FILE there — a `path`
// ending in `/` is the derived layer's root, not a pristine), and a source
// may be named ONLY by its sections. So: accept `sourceFile`, fall back to a
// file-shaped `path`, and union in every section's `sourceFile`.
const isFilePath = (v) => typeof v === "string" && v.length > 0 && !v.endsWith("/") && /[.\\]/.test(v.slice(-12));
let sources = (spec.sources || []).map((s) => ({
  ...s,
  sourceFile: s.sourceFile || (isFilePath(s.path) ? s.path : null),
}));
{
  const known = new Set(sources.map((s) => s.sourceFile).filter(Boolean));
  for (const sec of spec.sections || []) {
    if (!sec.sourceFile || known.has(sec.sourceFile)) continue;
    known.add(sec.sourceFile);
    sources.push({ sourceFile: sec.sourceFile, capture: sec.capture || null });
  }
  // A whole-FILE section may name NO sourceFile but still name the CAPTURE
  // it came from — and the capture is what a SOURCE already lists. So the
  // section's `capture` links it to that source: the source's pristine is
  // the capture, and the section's own `file` is the derived text.
  //
  // Without this link the source is walked but its derived counterpart is
  // never found, and every table in it is reported as uncovered. 73 of
  // spiderman-spiderverse's sections are shaped this way, holding 216
  // export tables.
  for (const src of sources) {
    if (!src.capture) continue;
    const sec = (spec.sections || []).find(
      (s) => s.capture === src.capture && s.wholeFile && s.file && (!s.sourceFile || path.resolve(path.join(PROJ, s.sourceFile)) !== path.resolve(path.join(PROJ, src.capture)))
    );
    if (!sec) continue;
    src.wholeFileSection = sec;
  }
  // A whole-FILE section that names NO sourceFile still records WHICH
  // capture it came from, in a sibling field: `title` is the fleet's usual
  // one ("assets/AboutPage-CAsd8rwd.js"), and `note` names the same path in
  // prose. The section's own `file` is the DERIVED text. Resolving the
  // capture this way makes the table VISIBLE: without it, a whole-file
  // vendor chunk's export table produced no line at all — neither checked
  // nor reported as uncovered — and 994 tables across 37 mirrors were
  // invisible to this gate.
  //
  // The capture must EXIST on disk: a `title` naming a file that is not
  // there stays prose, and is not treated as a mapping.
  //
  // The candidates, in the order they are tried:
  //   - the section's own `wholeFile` field, when it is a path: the section's
  //     `file` is the DERIVED text (under the derived root) and `wholeFile`
  //     is the pristine it was cut from (at the mirror root). 244 sections
  //     across 31 mirrors are shaped this way, and their export tables were
  //     invisible to this gate.
  //   - a `capture`/`source`/`origin`/`from` field.
  //   - a .js path named in `title`/`note`/`desc`/`description`.
  //
  // EVERY candidate must resolve to a file DIFFERENT from the section's
  // derived text. A mirror whose spec says "src = capture" (the derived
  // layer IS the capture) would otherwise be compared with ITSELF: a
  // comparison that can only ever pass, and that proves nothing about the
  // layer. 63 mirrors are shaped that way, and every one of their tables
  // was a self-compare.
  const derivedCandidates = (sec) => [
    path.join(srcDir, sec.file),
    path.join(PROJ, sec.file),
    path.join(srcDir, path.basename(sec.file || "")),
  ];
  const captureOf = (sec) => {
    const derived = derivedCandidates(sec).map((d) => path.resolve(d));
    const usable = (v) => {
      if (typeof v !== "string" || !/\.(?:js|mjs|cjs|jsx)$/i.test(v)) return false;
      const p = path.resolve(path.join(PROJ, v));
      if (!fs.existsSync(p)) return false;
      // the pristine must be a DIFFERENT file from the derived text
      return !derived.includes(p);
    };
    if (typeof sec.wholeFile === "string" && usable(sec.wholeFile)) return sec.wholeFile;
    for (const f of ["capture", "source", "origin", "from"]) {
      if (usable(sec[f])) return sec[f];
    }
    for (const f of ["title", "note", "desc", "description"]) {
      const v = sec[f];
      if (typeof v !== "string") continue;
      const m = v.match(/([\w./@-]+\.(?:js|mjs|cjs|jsx))/);
      if (m && usable(m[1])) return m[1];
    }
    return null;
  };
  for (const sec of spec.sections || []) {
    if (!sec.wholeFile || !sec.file) continue;
    const cap = captureOf(sec);
    if (!cap) continue;
    // A section that carries BOTH a sourceFile and a capture names TWO
    // different files: the sourceFile is the reading copy, the capture is the
    // served chunk. The gate walks the sourceFile as the pristine and never
    // finds the capture's counterpart, so the capture's table is invisible.
    // A section whose sourceFile IS its capture is already walked - skip it.
    if (sec.sourceFile && path.resolve(path.join(PROJ, sec.sourceFile)) === path.resolve(path.join(PROJ, cap))) continue;
    const key = `wholefile:${cap}`;
    if (known.has(key)) continue;
    known.add(key);
    sources.push({ sourceFile: key, capture: cap, wholeFileSection: sec });
  }
}

let checked = 0;
let lost = 0;
let skipped = 0;
const skippedBy = new Map();
for (const src of sources) {
  if (!src.sourceFile) continue;
  // A source that is not JAVASCRIPT has no export table. A CSS file's
  // `.export { … }` rule is not an export table, and reading one as a table
  // reported a public name lost. A stylesheet is part of the layer, but it
  // carries no ES module surface.
  if (!/\.(?:js|mjs|cjs|jsx)$/i.test(src.sourceFile)) continue;
  // a whole-file section resolved through its CAPTURE: the source key is
  // `wholefile:<capture>`, the PRISTINE is the capture, and the DERIVED text
  // is the section's own `file` (the whole chunk, carried verbatim)
  const isWholeFileSrc = src.sourceFile.startsWith("wholefile:");
  // the pristine: the spec's recorded path, else the capture under
  // `captureRoot`, else a file of that name anywhere in the mirror's tree
  const pristineCandidates = [];
  if (isWholeFileSrc) {
    pristineCandidates.push(path.join(PROJ, src.capture));
    if (CAPTURE_ROOT) pristineCandidates.push(path.join(PROJ, CAPTURE_ROOT, src.capture));
  } else {
    if (src.sourceFile) pristineCandidates.push(path.join(PROJ, src.sourceFile));
    if (src.capture && capturePretty.has(src.capture))
      pristineCandidates.push(path.join(PROJ, capturePretty.get(src.capture)));
    if (src.capture) {
      pristineCandidates.push(path.join(PROJ, src.capture));
      if (CAPTURE_ROOT) pristineCandidates.push(path.join(PROJ, CAPTURE_ROOT, src.capture));
    }
    if (src.sourceFile && CAPTURE_ROOT) pristineCandidates.push(path.join(PROJ, CAPTURE_ROOT, src.sourceFile));
  }
  const pristineText =
    pristineCandidates.map(read).find((t) => t != null) ??
    (isWholeFileSrc ? null : src.sourceFile ? findByBase(src.sourceFile.split("/").pop()) : null);
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
    // a WHOLE-FILE section has no line range, so no slice can cover a table —
    // but the whole file IS the derived text, and its public names can be
    // compared with the pristine's
    if (derivedText == null) {
      for (const w of wholeFiles.get(src.sourceFile) || []) {
        const onDisk = resolveSrcAll(w.file)[0];
        if (onDisk) {
          derivedText = read(onDisk);
          break;
        }
      }
    }
    // a whole-file section resolved through its CAPTURE: the section's own
    // `file` is the derived text, and it may sit under the derived root
    // (`readable/`) rather than under `src/`
    if (derivedText == null && (isWholeFileSrc || src.wholeFileSection)) {
      const w = src.wholeFileSection;
      for (const c of [
        path.join(srcDir, w.file),
        path.join(PROJ, w.file),
        path.join(srcDir, path.basename(w.file)),
      ]) {
        if (fs.existsSync(c)) {
          derivedText = read(c);
          break;
        }
      }
    }
    if (derivedText == null) {
      for (const t of tails) {
        if (t.startLine <= table.from && t.endLine >= table.to) {
          const raw = t.text ?? pristineText.split(/\r?\n/).slice(t.startLine - 1, t.endLine).join("\n");
          // A tail with no recorded TEXT and no binding map rebuilds itself
          // from the PRISTINE's own lines: the file compared with itself.
          // That is a tautology, not a check - it can never fail - and a gate
          // that counts a tautology as a check is worse than one that says
          // nothing. It is counted as UNCOVERED, which is the truth.
          const selfCompare = !t.text && !(applyBindingMap && Object.keys(bindings).length);
          derivedText = selfCompare ? null : (applyBindingMap && Object.keys(bindings).length ? applyBindingMap(raw, bindings) : raw);
          break;
        }
      }
    }
    if (derivedText == null) {
      // the table has no counterpart in the derived layer — a whole-file
      // vendor chunk the layer does not carry, or a table outside every
      // slice. It is NOT a pass and NOT a failure: it is uncovered. Count
      // it, so the denominator of the report is honest.
      skipped++;
      skippedBy.set(src.sourceFile, (skippedBy.get(src.sourceFile) || 0) + 1);
      continue;
    }
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
if (skipped && !QUIET) {
  // An uncovered table is neither a pass nor a failure. It must be VISIBLE:
  // a mirror whose tables are all uncovered would otherwise print "0 export
  // table(s) checked" and "no public export name lost" — a vacuous green.
  console.log(`check-exports: ${skipped} export table(s) NOT covered (no derived text) — these are unchecked, not proven intact`);
  for (const [f, n] of [...skippedBy.entries()].sort()) console.log(`  ${f}: ${n}`);
}
if (lost) {
  console.log(`check-exports: FAILED — ${lost} public export name(s) lost`);
  process.exit(1);
}
console.log("check-exports: no public export name lost");
