const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=fs.existsSync(path.join(__dirname,'index.html'))?__dirname:path.resolve(__dirname,'../Builds/UnityWeb');
const port=Number(process.env.PORT||process.argv[2]||18136);
if(!fs.existsSync(path.join(root,'index.html')))throw new Error('請先執行 npm run build。');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.png':'image/png'};
http.createServer((req,res)=>{
  let url;
  try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(root,'.'+url,url.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,
      'Cache-Control':req.url.includes('?v=')?'public, max-age=31536000, immutable':'no-cache'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
}).on('error',err=>{console.error(err.code==='EADDRINUSE'?'畫室已經啟動，請開啟 http://127.0.0.1:'+port:err.message);process.exitCode=1;})
.listen(port,'0.0.0.0',()=>{
  console.log('本機：http://127.0.0.1:'+port+'/');
  for(const inets of Object.values(os.networkInterfaces()))for(const net of inets||[])
    if(net.family==='IPv4'&&!net.internal)console.log('同網路裝置：http://'+net.address+':'+port+'/');
});
