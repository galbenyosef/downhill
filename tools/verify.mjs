// verify.mjs — re-hash every captured file against .upstream/manifest.json.
// usage: node tools/verify.mjs
//
// TEMPLATE — copy into <mirror>/tools/verify.mjs verbatim. Works for any
// Gen-A mirror (manifest shape { generated, origin, files: { rel: {bytes, sha256} } }).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));
let bad = 0, checked = 0;
for (const [rel, want] of Object.entries(manifest.files)) {
  const p = path.join(proj, rel);
  if (!fs.existsSync(p)) { console.error(`MISSING ${rel}`); bad++; continue; }
  const got = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  if (got !== want.sha256) { console.error(`CHANGED ${rel}`); bad++; }
  checked++;
}
console.log(`${checked} files checked, ${bad} problems`);
process.exit(bad ? 1 : 0);
