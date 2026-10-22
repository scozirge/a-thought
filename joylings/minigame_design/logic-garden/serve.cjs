const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const allow=new Set(['index.html','styles.css','core.js','art.js','app.js']);
const port=Number(process.argv[2]||18123);
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!allow.has(file)){res.writeHead(404).end('Not found');return;}
 fs.readFile(path.join(__dirname,file),(error,content)=>{
  if(error){res.writeHead(500).end('Unavailable');return;}
  const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript';
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(content);
 });
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/`));
