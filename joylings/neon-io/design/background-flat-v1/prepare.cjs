// Reassemble the existing texture tiles before editing so borders stay continuous.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {read,write,sha}=require('../character-flat-v2/package-assets.cjs');
const ROOT=__dirname,GAME=path.resolve(ROOT,'../../unity/Assets');
if(fs.existsSync(path.join(ROOT,'baseline.json')))throw Error('Original baseline already exists; do not overwrite it after applying the art.');
const sourceCommit=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
const handTiles=[[1,1,0],[2,2,0],[3,0,1],[4,1,1],[5,2,1],[6,0,2],[7,1,2],[8,2,2],[9,1,3]];
const jobs=[{key:'hand',w:3000,h:4000,tiles:handTiles.map(([n,x,y])=>({file:`hand-${n}.png`,x:x*1000,y:y*1000}))},
 ...Array.from({length:5},(_,i)=>({key:`cloud${i+1}`,w:2000,h:1000,tiles:[1,2].map(n=>({file:`cloud${i+1}-${n}.png`,x:(n-1)*1000,y:0}))}))];
fs.mkdirSync(path.join(ROOT,'references'),{recursive:true});
const files=[];
for(const job of jobs){
 const image={w:job.w,h:job.h,data:Buffer.alloc(job.w*job.h*4)};
 for(const tile of job.tiles){
  const relative='Resources/Images/Scene/'+tile.file,p=path.join(GAME,relative),src=read(p);
  if(src.w!==1000||src.h!==1000)throw Error('Unexpected source size');
  for(let y=0;y<src.h;y++)src.data.copy(image.data,((y+tile.y)*job.w+tile.x)*4,y*src.w*4,(y+1)*src.w*4);
  files.push({path:relative,sha256:sha(fs.readFileSync(p)),metadataSha256:sha(fs.readFileSync(p+'.meta'))});
 }
 write(path.join(ROOT,'references',job.key+'.png'),image);
}
const god='Resources/Images/Role/god.psb';
files.push({path:god,sha256:sha(fs.readFileSync(path.join(GAME,god))),metadataSha256:sha(fs.readFileSync(path.join(GAME,god+'.meta')))});
// These exact hashes guard the opening, original timing, effects and scene placement.
const protectedFiles={};
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else if(/\.(unity|anim|controller|playable|prefab|wav|mp3|ogg)$/.test(p))protectedFiles[path.relative(GAME,p).replaceAll('\\','/')]=sha(fs.readFileSync(p));}}
visit(GAME);
fs.writeFileSync(path.join(ROOT,'baseline.json'),JSON.stringify({sourceCommit,files,protectedFiles,jobs},null,2)+'\n');
console.log(JSON.stringify({jobs:jobs.length,tiles:files.length-1,protectedFiles:Object.keys(protectedFiles).length,sourceCommit}));
