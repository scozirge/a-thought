const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['index.html', 'styles.css', 'core.js', 'art.js', 'app.js']);
const port = Number(process.argv[2] || 18130);
http.createServer((req, res) => {
  let file;
  try { file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html'; }
  catch { res.writeHead(400).end(); return; }
  if (!files.has(file)) { res.writeHead(404).end('Not found'); return; }
  fs.readFile(path.join(__dirname, file), (error, data) => {
    if (error) { res.writeHead(500).end('Unavailable'); return; }
    const mime = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
