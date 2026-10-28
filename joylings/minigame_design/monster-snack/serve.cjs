'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const publicFiles = new Set(['index.html', 'styles.css', 'game.js', 'art.js', 'app.js']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
let port = Number(process.argv[2] || 4320);
const maxPort = port + 10;
const server = http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html'; }
  catch { res.writeHead(400).end(); return; }
  if (name === 'favicon.ico') { res.writeHead(204).end(); return; }
  if (!publicFiles.has(name)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(path.join(root, name)).pipe(res);
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < maxPort) server.listen(++port, '127.0.0.1');
  else { console.error(error.message); process.exitCode = 1; }
});
server.on('listening', () => console.log(`Local: http://127.0.0.1:${port}/`));
server.listen(port, '127.0.0.1');
