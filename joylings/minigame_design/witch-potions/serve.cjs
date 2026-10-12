'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
let port = Number(process.argv[2] || 4318);
const lastPort = port + 10;
const server = http.createServer((req, res) => {
  let relative;
  try { relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (_) { res.writeHead(400).end(); return; }
  if (relative === '/favicon.ico') { res.writeHead(204).end(); return; }
  const target = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (!target.startsWith(root + path.sep) || !types[path.extname(target)] || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(target).pipe(res);
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < lastPort) server.listen(++port, '127.0.0.1');
  else { console.error(error.message); process.exitCode = 1; }
});
server.on('listening', () => console.log(`Local: http://127.0.0.1:${port}/`));
server.listen(port, '127.0.0.1');
