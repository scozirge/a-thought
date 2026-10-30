const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(process.argv[2]||path.join(__dirname,'../Builds/UnityWeb'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(!html.includes('{{{'),'Unresolved Unity template placeholder');
let checked=0,wasm=false;
for(const match of html.matchAll(/(?:["'])(Build\/[^"'?]+|controller\.js|style\.css)\?v=([a-f0-9]+)(?:["'])/g)){
 const bytes=fs.readFileSync(path.join(root,match[1])),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);
 assert.equal(match[2],hash,match[1]+' has a stale cache version');checked++;
 if(match[1].includes('.wasm.')){assert.equal(zlib.gunzipSync(bytes).subarray(0,4).toString('hex'),'0061736d');wasm=true;}
}
assert.equal(checked,6,'Expected loader, framework, data, wasm, controller and stylesheet');assert.ok(wasm,'Missing native WebAssembly');
for(const name of ['NotoSansTC-OFL.txt','ThirdPartyLicenses/NanoSockets-LICENSE.txt','ThirdPartyLicenses/Photon-Realtime-COPYRIGHT.txt'])assert.ok(fs.statSync(path.join(root,name)).size>0);
console.log('Verified native Unity WebAssembly, six versioned resources and third-party notices.');
