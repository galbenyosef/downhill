// capture.mjs — fetch the runtime closure of the origin into the repo root.
// usage: node tools/capture.mjs
//
// DOWNHILL — Urban FPV (https://downhill-eta.vercel.app/) is capture-class: a
// hand-written ES module tree (no bundler; named modules, comments, JSDoc)
// served at the origin root by Vercel (DISK_PREFIX="", so served path == disk
// rel). This tool is the reproducible capture path: BFS from the entry document,
// resolving static/dynamic/bare imports (through the entry import map),
// new URL(..., import.meta.url) worker URLs, CSS url()/@import and asset-path
// string literals, until a scan round finds no new same-origin file. Bytes are
// written exactly as served (capture layer is byte-exact; nothing edited).
// Off-origin URLs are recorded as external and never fetched into the capture.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const ORIGIN = "https://downhill-eta.vercel.app";
const ENTRY = "index.html";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0" };
const SCAN = process.argv.includes("--scan");

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const extOf = (p) => (path.extname(p).replace(/^\./, "").toLowerCase() || "");
const ASSET_RE = /\.(?:glb|gltf|bin|png|jpe?g|webp|gif|svg|ico|ktx2?|basis|hdr|exr|mp3|ogg|oga|wav|m4a|flac|json|txt|csv|data|wasm|bin|ttf|otf|woff2?|css|js|mjs|html)(?:[?#]|$)/i;

const state = {
  fetched: {}, // diskRel -> { status, bytes, sha256, contentType, etag, lastModified }
  failed: [], // { url, status }
  external: new Map(), // url -> first referer
  unresolved: new Map(), // specifier -> referer (could not resolve to a same-origin path)
  refs: {}, // diskRel -> [resolved disk rels]
};

const normServed = (p) => {
  let s = p.split("?")[0].split("#")[0];
  if (s.startsWith("/")) s = s.slice(1);
  s = s.replace(/^(\.\/)+/, "");
  return s;
};

// specifier (as written) + referer disk rel -> same-origin served path or null
function resolveSpec(spec, refererRel, importMap) {
  if (!spec || /^(data:|blob:|javascript:|mailto:|about:)/i.test(spec)) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(spec)) {
    if (spec.startsWith(ORIGIN + "/")) return normServed(spec.slice(ORIGIN.length));
    state.external.set(spec.split("?")[0], refererRel);
    return null;
  }
  if (spec.startsWith("//")) {
    state.external.set(spec, refererRel);
    return null;
  }
  if (spec.startsWith("/")) return normServed(spec);
  if (spec.startsWith("./") || spec.startsWith("../")) {
    const base = path.posix.dirname(refererRel.split(path.sep).join("/"));
    return normServed(path.posix.normalize(path.posix.join(base, spec)));
  }
  const bare = spec.replace(/^(node:|vite:)/, "");
  if (/^(node:|vite:)/.test(spec)) return null;
  if (importMap && Object.prototype.hasOwnProperty.call(importMap, spec)) {
    const t = importMap[spec];
    return t.startsWith("/") ? normServed(t) : null;
  }
  // longest-prefix import-map match (e.g. "three/addons/")
  if (importMap) {
    const keys = Object.keys(importMap).filter((k) => k.endsWith("/")).sort((a, b) => b.length - a.length);
    for (const k of keys)
      if (bare.startsWith(k)) {
        const t = importMap[k];
        return normServed(path.posix.join(t.replace(/^\//, ""), bare.slice(k.length)));
      }
  }
  state.unresolved.set(spec, refererRel);
  return null;
}

function extractRefs(buf, rel, importMap) {
  const text = buf.toString("utf8");
  const kind = extOf(rel);
  const out = new Set();
  const add = (spec) => {
    if (!spec) return;
    const r = resolveSpec(spec.trim(), rel, importMap);
    if (r) out.add(r);
  };
  if (kind === "html" || kind === "htm") {
    for (const m of text.matchAll(/<(script|link|img|source|audio|video)\b[^>]*>/gi)) {
      const tag = m[0];
      for (const a of ["src", "href"]) {
        const v = new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(tag);
        const val = v && (v[2] ?? v[3] ?? v[4]);
        if (val && (val.startsWith("./") || val.startsWith("../") || val.startsWith("/") || /^https?:/i.test(val))) add(val);
      }
    }
    for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      for (const u of cssRefs(m[1])) add(u);
    }
  } else if (kind === "css") {
    for (const u of cssRefs(text)) add(u);
  } else if (kind === "js" || kind === "mjs") {
    // static: import ... from "X" | import "X" | export ... from "X"
    for (const m of text.matchAll(/\b(?:import|export)\s*(?:[\s\S]*?\bfrom\s*)?["']([^"']+)["']/g)) add(m[1]);
    // dynamic: import("X") or import(`X`)
    for (const m of text.matchAll(/\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) add(m[1]);
    // new URL("X", import.meta.url)
    for (const m of text.matchAll(/new\s+URL\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*import\.meta\.url\s*\)/g)) add(m[1]);
    // asset-path string literals (glb/png/mp3/…) in plain string literals
    for (const m of text.matchAll(/["'`]([^"'`\n]+)["'`]/g)) {
      const s = m[1];
      if (ASSET_RE.test(s) && !/\s/.test(s) && !/\$\{/.test(s)) add(s);
    }
    // fetch("/x") literal
    for (const m of text.matchAll(/\bfetch\s*\(\s*["']([^"']+)["']/g)) add(m[1]);
  }
  return [...out];
}
function cssRefs(text) {
  const out = [];
  for (const m of text.matchAll(/url\(\s*("[^"]*"|'[^']*'|[^)'"]*)\s*\)/gi)) {
    const v = m[1].replace(/^["']|["']$/g, "").trim();
    if (v) out.push(v);
  }
  for (const m of text.matchAll(/@import\s+("[^"]*"|'[^']*')/gi)) out.push(m[1].replace(/^["']|["']$/g, ""));
  return out;
}
function importMapFrom(html) {
  const m = /<script[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]).imports || null;
  } catch {
    return null;
  }
}

async function get(served) {
  const r = await fetch(`${ORIGIN}/${served}`, { headers: UA, redirect: "follow" });
  if (r.status !== 200) return { status: r.status };
  const buf = Buffer.from(await r.arrayBuffer());
  return {
    status: 200,
    buf,
    contentType: r.headers.get("content-type") || "",
    etag: r.headers.get("etag") || "",
    lastModified: r.headers.get("last-modified") || "",
  };
}

// ── BFS closure ─────────────────────────────────────────────────────────
const queue = [ENTRY];
const seen = new Set();
let importMap = null;

// --scan: no network. Re-extract refs from every captured file on disk, resolve
// them and assert every same-origin target exists — the closure fixpoint round
// ("until a scan round finds none missing"). Prints genuine gaps (404s).
if (SCAN) {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // the capture scan covers captured layers only: tools/ is mirror tooling,
      // readable/ + docs/ are derived; .upstream/ + legacy/ are records.
      if (/^(\.git|node_modules|readable|docs|tools|legacy)$/.test(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (/\.(html?|css|m?js)$/i.test(e.name)) files.push(path.relative(proj, abs).split(path.sep).join("/"));
    }
  })(proj);
  for (const rel of files) {
    const buf = fs.readFileSync(path.join(proj, rel));
    if (extOf(rel) === "html" && !importMap) importMap = importMapFrom(buf.toString("utf8"));
  }
  const captured = new Set(files);
  const missing = [];
  const allRefs = {};
  for (const rel of files) {
    const buf = fs.readFileSync(path.join(proj, rel));
    const refs = extractRefs(buf, rel, importMap);
    allRefs[rel] = refs;
    for (const r of refs) if (!captured.has(r) && !fs.existsSync(path.join(proj, r))) missing.push({ ref: r, from: rel });
  }
  console.log(`scan: ${files.length} captured code files re-scanned`);
  for (const [rel, refs] of Object.entries(allRefs))
    if (refs.length) console.log(`  ${rel} -> ${refs.join(", ")}`);
  if (state.external.size) for (const [u, r] of state.external) console.log(`  EXTERNAL ${u} (from ${r})`);
  if (state.unresolved.size) for (const [s, r] of state.unresolved) console.log(`  UNRESOLVED ${s} (from ${r})`);
  console.log(missing.length ? `scan: ${missing.length} MISSING:` : "scan: 0 referenced-but-missing same-origin files");
  for (const m of missing) console.log(`  MISSING ${m.ref} (from ${m.from})`);
  process.exit(missing.length ? 1 : 0);
}

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const res = await get(rel);
  if (res.status !== 200) {
    state.failed.push({ url: `${ORIGIN}/${rel}`, status: res.status });
    console.error(`capture: ${rel} -> HTTP ${res.status} (recorded as gap)`);
    continue;
  }
  const abs = path.join(proj, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, res.buf);
  state.fetched[rel] = {
    status: 200,
    bytes: res.buf.length,
    sha256: sha(res.buf),
    contentType: res.contentType,
    etag: res.etag,
    lastModified: res.lastModified,
  };
  if (extOf(rel) === "html" && !importMap) importMap = importMapFrom(res.buf.toString("utf8"));
  const refs = extractRefs(res.buf, rel, importMap);
  state.refs[rel] = refs;
  for (const r of refs) if (!seen.has(r)) queue.push(r);
  console.log(`capture: ${rel} (${res.buf.length} B) -> ${refs.length} ref(s)`);
}

if (importMap) console.log(`capture: import map -> ${JSON.stringify(importMap)}`);
console.log(`capture: ${Object.keys(state.fetched).length} files, ${state.failed.length} failed`);
if (state.failed.length) for (const f of state.failed) console.log(`  FAILED ${f.status} ${f.url}`);
if (state.external.size) for (const [u, r] of state.external) console.log(`  EXTERNAL ${u} (from ${r})`);
if (state.unresolved.size) for (const [s, r] of state.unresolved) console.log(`  UNRESOLVED ${s} (from ${r})`);
fs.writeFileSync(path.join(proj, ".upstream", "capture-log.json"), JSON.stringify(state, null, 2) + "\n");
