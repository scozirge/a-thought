const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files={'/':'index.html','/index.html':'index.html','/core.js':'core.js','/art.js':'art.js','/app.js':'app.js','/styles.css':'styles.css'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const port=Number(process.argv[2]||18122);
http.createServer((req,res)=>{
 const file=files[new URL(req.url,'http://localhost').pathname];
 if(!file){res.writeHead(404).end('Not found');return;}
 fs.readFile(path.join(__dirname,file),(error,data)=>{
  if(error){res.writeHead(500).end('File unavailable');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(data);
 });
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/`));
