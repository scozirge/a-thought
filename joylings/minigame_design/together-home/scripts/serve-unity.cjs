const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../Builds/UnityWeb'),port=Number(process.argv[2]||18130);
http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}const target=path.resolve(root,'.'+name,(name.endsWith('/')?'index.html':''));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(error,data)=>{if(error){res.writeHead(404).end();return;}const ext=path.extname(target);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.png':'image/png'})[ext]||'application/octet-stream','Cache-Control':'no-cache'}).end(data);});
}).listen(port,'0.0.0.0',()=>console.log('Unity game: http://127.0.0.1:'+port+'/'));
