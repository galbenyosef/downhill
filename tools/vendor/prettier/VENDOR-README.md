# Vendored prettier 3.9.6 (module API)

The pinned renderer this mirror's `readable/`, `src/` and `split-spec.json`
were produced with, vendored INTO THIS MIRROR so the derivation never has to
reach into a sibling mirror's tree.

- version: 3.9.6 (exact; `tools/derive.mjs` and `tools/audit.js` both refuse
  any other version)
- source: the published npm tarball `prettier-3.9.6.tgz`
  (integrity `sha512-OpN0zzVdiaiAhxpuuj5efpIS4sY9j7bY6uR5mnj5yPzGkdkjNKSJeUThPb60Jw29QuAZgA4o+/iB49kFiaBX6g==`)
- files: `index.mjs` + `doc.mjs` + `plugins/*.mjs` (all 13 language plugins)
  + `package.json` + `LICENSE` + `THIRD-PARTY-NOTICES.md`
- `index.mjs` is the MODULE API entry point (never the CLI: the CLI respects
  `.gitignore` and can silently echo its input instead of formatting).
- `package.json` here is a MINIMAL stub carrying `name`/`version`/`license`
  so the `pkg.version === PINNED` check in the loaders works. It is NOT the
  published `package.json` (whose `exports` map would point at files that are
  not vendored here).

The bytes are identical to the published 3.9.6 tarball, so a mirror's
derived layers re-render byte-for-byte.

## Why this is vendored rather than resolved at runtime

The derive/audit tools used to fall back to a path in ANOTHER mirror's
`node_modules/`. That directory is gitignored and uncommitted, so it exists
only on whichever machine happened to install it: a clean checkout, a disk
cleanup or a different machine broke every mirror's derive tools at once, and
the failure looked like a broken tool rather than a missing dependency.

`tools/derive.mjs` now resolves, in order:
1. `$PRETTIER_MJS` (explicit override),
2. `tools/vendor/prettier/index.mjs` (this vendored copy — the normal case),
3. `node_modules/prettier/index.mjs` (a local `npm install` of the same
   pinned version still works).

If none of those resolves, the tool fails with a message naming the file it
looked for and the exact command to get it.
