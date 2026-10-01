// Compare decoded game payloads, not only filenames or compressed byte counts.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [beforeArg,afterArg]=process.argv.slice(2);
if(!beforeArg||!afterArg)throw Error('Usage: node Tools/VerifyCompressedBuild.cjs BEFORE_WEB AFTER_WEB');
const before=path.resolve(beforeArg),after=path.resolve(afterArg);
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||'Logs/DownloadOptimization');fs.mkdirSync(output,{recursive:true});
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const result={before,after,payloads:[],ok:false};
try{
  for(const suffix of ['data','wasm','framework.js']){
    const oldFiles=fs.readdirSync(path.join(before,'Build')).filter(name=>name.endsWith('.'+suffix));
    const newFiles=fs.readdirSync(path.join(after,'Build')).filter(name=>name.endsWith('.'+suffix+'.unityweb'));
    assert.equal(oldFiles.length,1,'one baseline '+suffix);assert.equal(newFiles.length,1,'one compressed '+suffix);
    const original=fs.readFileSync(path.join(before,'Build',oldFiles[0])),packed=fs.readFileSync(path.join(after,'Build',newFiles[0]));
    const decoded=zlib.brotliDecompressSync(packed);
    const row={kind:suffix,before:oldFiles[0],after:newFiles[0],originalBytes:original.length,compressedBytes:packed.length,decodedBytes:decoded.length,originalSha256:digest(original),decodedSha256:digest(decoded),identical:decoded.equals(original)};
    result.payloads.push(row);console.log(JSON.stringify(row));
  }
  // Only the loader adapts the transport; all decoded payloads must match.
  for(const row of result.payloads)assert.ok(row.identical,'decoded '+row.kind+' must match the previously validated game byte for byte');
  for(const name of ['learning.js','learning.css'])assert.ok(fs.readFileSync(path.join(before,name)).equals(fs.readFileSync(path.join(after,name))),'quiz unchanged: '+name);
  result.ok=true;console.log('COMPRESSED_GAME_PAYLOADS_OK');
}finally{fs.writeFileSync(path.join(output,'payload-comparison.json'),JSON.stringify(result,null,2)+'\n');}
