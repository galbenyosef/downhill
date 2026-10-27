#!/usr/bin/env node
// tools/serve.mjs — dependency-free static server for the DOWNHILL mirror.
//
// Usage: node tools/serve.mjs [port] [root]
//   port  default 4774          root  default: this repo's root
//
// Binds 127.0.0.1 only. Serves a real directory index, honest 404s (never an
// SPA fallback), and refuses paths that escape the document root. Every
// request is logged to stdout as `<status> <path>`.
//
// This mirror serves the repo root because the entry document uses absolute
// paths (`/src/main.js`, `/vendor/...`), exactly as the origin does.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2] || 4774);
const HOST = '127.0.0.1';
const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ROOT = resolve(process.argv[3] || REPO_ROOT);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.bin': 'application/octet-stream',
  '.dat': 'application/octet-stream',
  '.hdr': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = createServer(async (req, res) => {
  let status = 0;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // Resolve inside ROOT and reject anything that escapes it.
    const target = resolve(join(ROOT, normalize(pathname)));
    if (target !== ROOT && !target.startsWith(ROOT + sep)) {
      status = 403;
      send(res, 403, 'Forbidden');
      return;
    }
    let file = target;
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
      file = join(file, 'index.html');
      info = await stat(file).catch(() => null);
    }
    if (!info?.isFile()) {
      status = 404;
      send(res, 404, 'Not Found');
      return;
    }
    status = 200;
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
    });
    createReadStream(file).on('error', () => res.end()).pipe(res);
  } catch (err) {
    if (!res.headersSent) send(res, 400, 'Bad Request');
    else res.end();
    status = 400;
  } finally {
    const path = req.url?.split('?')[0] ?? '';
    console.log(String(status).padEnd(3), path);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`serving ${ROOT} at http://${HOST}:${PORT}/`);
});
