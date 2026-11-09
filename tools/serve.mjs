// tools/serve.mjs
// Static file server tanpa dependency untuk folder site/.
// Jalankan: node tools/serve.mjs   ->  http://localhost:4321

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const PORT = Number(process.env.PORT || 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('400 Bad Request');
  }

  // Cegah path traversal keluar dari site/.
  const target = path.resolve(SITE, '.' + urlPath);
  if (target !== SITE && !target.startsWith(SITE + path.sep)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(target, (err, stat) => {
    let filePath = target;

    if (!err && stat.isDirectory()) {
      filePath = path.join(target, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found');
      }
      const type = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, {
        'content-type': type,
        'content-length': data.length,
        'cache-control': 'no-store',
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`serve: ${SITE}`);
  console.log(`serve: http://localhost:${PORT}`);
});
