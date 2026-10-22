const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/core.js':'core.js','/art.js':'art.js','/app.js':'app.js'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const port=Number(process.argv[2]||18120);
http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname,file=files[pathname];
 if(!file){res.writeHead(404).end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 fs.createReadStream(path.join(__dirname,file)).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/`));
