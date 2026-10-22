// Deterministic packaging of the six AI-edited full textures into native tiles.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {read,write,sha,parsePsb}=require('../character-flat-v2/package-assets.cjs');
const ROOT=__dirname,GAME=path.resolve(ROOT,'../../unity/Assets'),OUT=path.join(ROOT,'replacement/Assets');
const MAGICK='E:/Program Files/ImageMagick-7.1.1-Q16-HDRI/magick.exe';
const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'baseline.json'),'utf8'));
const palette=[[24,40,64],[53,87,110],[158,140,96]];
function bbox(img){let x0=img.w,y0=img.h,x1=0,y1=0;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++)if(img.data[4*(y*img.w+x)+3]>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}return [x0,y0,x1,y1];}
function flatColor(data,i,colors){
 const base=colors[0],gold=colors.length===3&&data[i]>data[i+2]+4;
 const ink=gold?colors[2]:colors[1];
 const t=gold?Math.min(1,(data[i]-data[i+2])/30):Math.max(0,Math.min(1,(data[i+2]-64)/46));
 // Retain fractional edge coverage instead of thresholding smooth strokes.
 const coverage=Math.max(0,Math.min(1,(t-.16)/.70));
 return base.map((v,c)=>Math.round(v+(ink[c]-v)*coverage));
}
function distance(img){const a=new Uint16Array(img.w*img.h);for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++){const i=y*img.w+x;a[i]=img.data[4*i+3]<128?0:1+Math.min(x?a[i-1]:0,y?a[i-img.w]:0);}for(let y=img.h-1;y>=0;y--)for(let x=img.w-1;x>=0;x--){const i=y*img.w+x;a[i]=Math.min(a[i],1+Math.min(x+1<img.w?a[i+1]:0,y+1<img.h?a[i+img.w]:0));}return a;}
function alpha(img){const a=Buffer.alloc(img.w*img.h);for(let i=0;i<a.length;i++)a[i]=img.data[4*i+3];return a;}
function sourceBytes(relative){return cp.execFileSync('git',['show',baseline.sourceCommit+':joylings/neon-io/unity/Assets/'+relative],{cwd:ROOT,maxBuffer:30*1024*1024});}
const reports=[];
for(const job of baseline.jobs){
 const reference=read(path.join(ROOT,'references',job.key+'.png')),generated=read(path.join(ROOT,'generated',job.key+'.png'));
 const from=bbox(generated),to=bbox(reference),colors=palette.slice(0,job.key==='hand'?3:2);
 // Quantize away generated lighting; Lanczos subsequently antialiases line edges.
 for(let i=0;i<generated.data.length;i+=4){const color=flatColor(generated.data,i,colors);for(let c=0;c<3;c++)generated.data[i+c]=color[c];}
 const w=to[2]-to[0],h=to[3]-to[1];
 const result=cp.spawnSync(MAGICK,['-size',`${generated.w}x${generated.h}`,'-depth','8','rgba:-','-crop',`${from[2]-from[0]}x${from[3]-from[1]}+${from[0]}+${from[1]}`,'+repage','-filter','Lanczos','-resize',`${w}x${h}!`,'-depth','8','rgba:-'],{input:generated.data,maxBuffer:80*1024*1024});
 if(result.status!==0)throw Error(result.stderr.toString());
 const fitted=result.stdout,dist=distance(reference),native={w:reference.w,h:reference.h,data:Buffer.from(reference.data)};
 for(let y=0;y<native.h;y++)for(let x=0;x<native.w;x++){
  const i=(y*native.w+x)*4;if(!native.data[i+3])continue;
  const j=((y-to[1])*w+x-to[0])*4;let color=palette[0];
  if(x>=to[0]&&x<to[2]&&y>=to[1]&&y<to[3]&&fitted[j+3]>=128)color=[fitted[j],fitted[j+1],fitted[j+2]];
  // The native silhouette and a narrow original contour remain exact, including tile edges.
  if(dist[i/4]<=8){const t=Math.max(0,Math.min(1,(reference.data[i+2]-66)/40));color=palette[0].map((v,c)=>Math.round(v*(1-t)+palette[1][c]*t));}
  for(let c=0;c<3;c++)native.data[i+c]=color[c];
 }
 assert.deepEqual(alpha(native),alpha(reference));
 write(path.join(ROOT,'preview',job.key+'.png'),native);
 for(const tile of job.tiles){
  const image={w:1000,h:1000,data:Buffer.alloc(4000000)},original={w:1000,h:1000,data:Buffer.alloc(4000000)};
  for(let y=0;y<1000;y++){const a=((y+tile.y)*native.w+tile.x)*4;native.data.copy(image.data,y*4000,a,a+4000);reference.data.copy(original.data,y*4000,a,a+4000);}
  const relative='Resources/Images/Scene/'+tile.file,target=path.join(OUT,relative),base=baseline.files.find(f=>f.path===relative);
  write(target,image);const imported=read(target);assert.deepEqual(imported.data,image.data);assert.deepEqual(alpha(imported),alpha(original));
  const metadata=fs.readFileSync(path.join(GAME,relative+'.meta'));assert.equal(sha(metadata),base.metadataSha256);
  fs.writeFileSync(target+'.meta',metadata);
  reports.push({path:relative,originalSha256:base.sha256,replacementSha256:sha(fs.readFileSync(target)),metadataSha256:base.metadataSha256,width:1000,height:1000,alphaUnchanged:true,alphaSha256:sha(alpha(imported)),master:job.key,crop:[tile.x,tile.y,1000,1000]});
 }
}
const godPath='Resources/Images/Role/god.psb',oldGod=sourceBytes(godPath),newGod=fs.readFileSync(path.resolve(ROOT,'../character-flat-v2/replacement/Assets/Resources/Images/Role/god.psb'));
const before=parsePsb(oldGod),after=parsePsb(newGod);assert.equal(before.layers.length,after.layers.length);
before.layers.forEach((a,i)=>{const b=after.layers[i];assert.equal(a.id,b.id);assert.equal(a.name,b.name);assert.deepEqual([a.left,a.top,a.right,a.bottom,a.flags],[b.left,b.top,b.right,b.bottom,b.flags]);assert.deepEqual(a.channels.find(c=>c.id===-1).bytes,b.channels.find(c=>c.id===-1).bytes);});
fs.mkdirSync(path.dirname(path.join(OUT,godPath)),{recursive:true});fs.writeFileSync(path.join(OUT,godPath),newGod);fs.copyFileSync(path.join(GAME,godPath+'.meta'),path.join(OUT,godPath+'.meta'));
const godBase=baseline.files.find(f=>f.path===godPath);assert.equal(sha(oldGod),godBase.sha256);
reports.push({path:godPath,originalSha256:sha(oldGod),replacementSha256:sha(newGod),metadataSha256:godBase.metadataSha256,width:1000,height:1000,layerAlphaUnchanged:true,layers:9,visibleSprites:8,approvedCandidate:'character-flat-v2'});
const manifest={date:'2026-10-22',version:'1.1.2-web',sourceCommit:baseline.sourceCommit,scope:'Only approved Star God and background cloud/hand textures. Original metadata, scenes, animation, gameplay and audio unchanged.',files:reports};
fs.writeFileSync(path.join(ROOT,'replacement-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
for(const [relative,hash] of Object.entries(baseline.protectedFiles))assert.equal(sha(fs.readFileSync(path.join(GAME,relative))),hash,'Protected content: '+relative);
if(process.argv.includes('--apply'))for(const report of reports){const dest=path.join(GAME,report.path);assert.equal(sha(fs.readFileSync(dest+'.meta')),report.metadataSha256);fs.copyFileSync(path.join(OUT,report.path),dest);}
console.log(JSON.stringify({exportedAssets:reports.length,backgroundAlphaUnchanged:true,godLayerAlphaUnchanged:true,metadataUnchanged:true,protectedFiles:Object.keys(baseline.protectedFiles).length,applied:process.argv.includes('--apply')}));
