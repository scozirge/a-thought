const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, process.argv.includes('--unity') ? '../Builds/UnityWeb' : '../Builds/Web');
const file = path.join(root, 'index.html');
const port = Number(process.argv[2] || 8190);
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('連接埠必須為 1–65535。');
if (!fs.existsSync(file)) throw new Error('請先執行 npm run build。');
http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let decoded; try { decoded = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
  const target = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); return res.end('Not found'); }
  const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.wasm':'application/wasm','.data':'application/octet-stream','.json':'application/json','.png':'image/png','.css':'text/css'};
  res.writeHead(200, { 'Content-Type': mime[path.extname(target)]||'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': fs.statSync(target).size });
  if(req.method === 'HEAD')res.end();else fs.createReadStream(target).pipe(res);
}).listen(port, host, () => {
  console.log(`一起想想：http://127.0.0.1:${port}/`);
  if (host === '0.0.0.0') console.log('已開放區域網路；手機可使用這台電腦的區網 IP 與上述連接埠。');
});
