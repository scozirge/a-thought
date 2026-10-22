const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),port=Number(process.argv[2]||18124);
const allowed=new Set(['index.html','styles.css','core.js','art.js','app.js']);
http.createServer((req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname,file=p==='/'?'index.html':p.slice(1);
 if(!allowed.has(file)){res.writeHead(404).end('Not found');return;}
 fs.readFile(path.join(__dirname,file),(err,data)=>{if(err){res.writeHead(500).end('Unavailable');return;}res.writeHead(200,{'Content-Type':(file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript')+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/`));
