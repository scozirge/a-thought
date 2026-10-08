// Transport-only release: retain the already-tested resource archive when a
// Unity rebuild merely regenerates build IDs / serialization order. Do not use
// this for gameplay or asset changes; the source and binary guards reject them.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const [beforeArg,afterArg,compressor]=process.argv.slice(2);
if(!beforeArg||!afterArg||!compressor)throw Error('Usage: node Tools/CompressExistingWebData.cjs BEFORE_WEB AFTER_WEB UNITY_BROTLI');
const root=path.resolve(__dirname,'..'),before=path.resolve(beforeArg),after=path.resolve(afterArg),build=path.join(after,'Build');
const info=JSON.parse(fs.readFileSync(path.join(before,'版本資訊.json'),'utf8'));
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const changed=execFileSync('git',['diff','--name-only',info.gameSourceCommit,'--','Assets'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const allowed=['Assets/Rivals/Editor/WebBuild.cs','Assets/WebGLTemplates/Rivals/index.html'];
assert.ok(changed.every(file=>allowed.some(suffix=>file.endsWith('/'+suffix)||file===suffix)),'only the build compression and HTML cache policy may change');
const added=execFileSync('git',['ls-files','--others','--exclude-standard','--','Assets'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert.ok(added.every(file=>file.endsWith('.meta')),'new game assets require a complete rebuild');
for(const [name,sha] of Object.entries(info.sourceFiles))if(!name.startsWith('Assets/WebGLTemplates/'))assert.equal(digest(fs.readFileSync(path.join(root,name))),sha,'validated source changed: '+name);
for(const suffix of ['wasm','framework.js']){
  const original=fs.readdirSync(path.join(before,'Build')).filter(name=>name.endsWith('.'+suffix));
  const packed=fs.readdirSync(build).filter(name=>name.endsWith('.'+suffix+'.unityweb'));
  assert.equal(original.length,1);assert.equal(packed.length,1);
  assert.ok(zlib.brotliDecompressSync(fs.readFileSync(path.join(build,packed[0]))).equals(fs.readFileSync(path.join(before,'Build',original[0]))),'game binary changed: '+suffix);
}
const oldFiles=fs.readdirSync(path.join(before,'Build')).filter(name=>/^[a-f0-9]{32}\.data$/.test(name));assert.equal(oldFiles.length,1);
const htmlPath=path.join(after,'index.html'),html=fs.readFileSync(htmlPath,'utf8');
const current=html.match(/dataUrl:'Build\/([a-f0-9]{32}\.data\.unityweb)'/);assert.ok(current);
const target=oldFiles[0]+'.unityweb',destination=path.join(build,target);
execFileSync(path.resolve(compressor),['--input',path.join(before,'Build',oldFiles[0]),'--output',destination,'--comment','UnityWeb Compressed Content (brotli)','--force'],{stdio:'inherit',windowsHide:true});
assert.ok(zlib.brotliDecompressSync(fs.readFileSync(destination)).equals(fs.readFileSync(path.join(before,'Build',oldFiles[0]))),'resource round-trip mismatch');
fs.writeFileSync(htmlPath,html.replace("dataUrl:'Build/"+current[1]+"'","dataUrl:'Build/"+target+"'"));
// Only the exact, no-longer-referenced generated file inside this Build folder.
if(current[1]!==target)fs.unlinkSync(path.join(build,current[1]));
console.log('VALIDATED_WEB_DATA_PRESERVED '+JSON.stringify({sourceCommit:info.gameSourceCommit,file:target,bytes:fs.statSync(destination).size}));
