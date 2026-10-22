// Export AI edits into the original game's canvas and layered-file contracts.
// The live Unity project is read only. No prefabs, scripts, animation or .meta edits.
// PSB layout: https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=__dirname, GAME=path.resolve(ROOT,'../../unity/Assets/Resources/Images/Role');
const OUT=path.join(ROOT,'replacement/Assets/Resources/Images/Role');
const MAGICK='E:/Program Files/ImageMagick-7.1.1-Q16-HDRI/magick.exe';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ensure=p=>fs.mkdirSync(path.dirname(p),{recursive:true});
function im(args,input){const r=cp.spawnSync(MAGICK,args,{input,maxBuffer:80*1024*1024});if(r.status!==0)throw Error(r.stderr.toString());return r.stdout;}
function read(file){const [w,h]=im(['identify','-format','%w %h',file]).toString().split(' ').map(Number);return {w,h,data:im([file,'-alpha','on','-depth','8','rgba:-'])};}
function write(file,img){ensure(file);const output=Buffer.from(img.data);for(let i=0;i<output.length;i+=4)if(!output[i+3])output.fill(0,i,i+3);im(['-size',`${img.w}x${img.h}`,'-depth','8','rgba:-','-define','png:color-type=6',file],output);}
function bbox(img,threshold=0){let x0=img.w,y0=img.h,x1=0,y1=0;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++)if(img.data[(y*img.w+x)*4+3]>threshold){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}assert(x1>x0);return [x0,y0,x1,y1];}
const palette=[[29,49,86],[134,232,216],[226,202,139]];
function nearest(data,offset,colors=palette){let best=0,dist=Infinity;for(let i=0;i<colors.length;i++){const d=colors[i].reduce((s,v,c)=>s+(data[offset+c]-v)**2,0);if(d<dist){dist=d;best=i;}}return best;}
function fit(file,reference,colors=palette){
  const src=read(file),to=bbox(reference),from=bbox(src,32);
  // Remove generated lighting variation; preserve the generated alpha channel.
  for(let i=0;i<src.data.length;i+=4){const color=colors[nearest(src.data,i,colors)];for(let c=0;c<3;c++)src.data[i+c]=color[c];}
  const w=to[2]-to[0],h=to[3]-to[1];
  const scaled=im(['-size',`${src.w}x${src.h}`,'-depth','8','rgba:-','-crop',`${from[2]-from[0]}x${from[3]-from[1]}+${from[0]}+${from[1]}`,'+repage','-filter','Lanczos','-resize',`${w}x${h}!`,'-depth','8','rgba:-'],src.data);
  const result={w:reference.w,h:reference.h,data:Buffer.alloc(reference.w*reference.h*4)};
  for(let y=0;y<h;y++)scaled.copy(result.data,((y+to[1])*result.w+to[0])*4,y*w*4,(y+1)*w*4);
  return {image:result,sourceBox:from,targetBox:to};
}
function decodeRle(bytes,w,h){const kind=bytes.readUInt16BE();if(kind===0){assert.equal(bytes.length-2,w*h);return Buffer.from(bytes.subarray(2));}assert.equal(kind,1);const out=Buffer.alloc(w*h);let p=2+4*h;for(let y=0;y<h;y++){const end=p+bytes.readUInt32BE(2+4*y);let x=0;while(p<end){const n=bytes.readInt8(p++);if(n>=0){bytes.copy(out,y*w+x,p,p+n+1);p+=n+1;x+=n+1;}else if(n!==-128){out.fill(bytes[p++],y*w+x,y*w+x+1-n);x+=1-n;}}assert.equal(x,w);}assert.equal(p,bytes.length);return out;}
function packRow(row){const chunks=[];let i=0;while(i<row.length){let n=1;while(i+n<row.length&&n<128&&row[i+n]===row[i])n++;if(n>=3){chunks.push(Buffer.from([257-n,row[i]]));i+=n;}else{const start=i;i+=n;while(i<row.length&&i-start<128){let run=1;while(i+run<row.length&&run<3&&row[i+run]===row[i])run++;if(run>=3)break;const take=Math.min(run,128-(i-start));i+=take;if(take<run)break;}chunks.push(Buffer.from([i-start-1]),row.subarray(start,i));}}return Buffer.concat(chunks);}
function encodeRows(channels,w,h){const rows=[];for(const ch of channels)for(let y=0;y<h;y++)rows.push(packRow(ch.subarray(y*w,(y+1)*w)));const header=Buffer.alloc(2+rows.length*4);header.writeUInt16BE(1);rows.forEach((row,i)=>header.writeUInt32BE(row.length,2+4*i));return Buffer.concat([header,...rows]);}
function parsePsb(bytes){assert.equal(bytes.toString('ascii',0,4),'8BPS');assert.equal(bytes.readUInt16BE(4),2);assert.equal(bytes.readUInt16BE(22),8);assert.equal(bytes.readUInt16BE(24),3);let p=26;p+=4+bytes.readUInt32BE(p);p+=4+bytes.readUInt32BE(p);const maskPos=p,maskLen=Number(bytes.readBigUInt64BE(p));p+=8;const layerPos=p,layerLen=Number(bytes.readBigUInt64BE(p));p+=8;const countPos=p,count=bytes.readInt16BE(p);p+=2;const layers=[];
  for(let i=0;i<Math.abs(count);i++){const start=p,top=bytes.readInt32BE(p),left=bytes.readInt32BE(p+4),bottom=bytes.readInt32BE(p+8),right=bytes.readInt32BE(p+12),num=bytes.readUInt16BE(p+16);p+=18;const channels=[];for(let j=0;j<num;j++){channels.push({id:bytes.readInt16BE(p),length:Number(bytes.readBigUInt64BE(p+2)),lengthOffset:p+2-start});p+=10;}const flags=bytes[p+10];p+=12;const extraLen=bytes.readUInt32BE(p);p+=4;const end=p+extraLen;p+=4+bytes.readUInt32BE(p);p+=4+bytes.readUInt32BE(p);const n=bytes[p];let name=bytes.toString('latin1',p+1,p+1+n),id=null;p+=Math.ceil((n+1)/4)*4;while(p+12<=end){const key=bytes.toString('ascii',p+4,p+8),len=bytes.readUInt32BE(p+8);if(key==='lyid')id=bytes.readUInt32BE(p+12);if(key==='luni'){const lenChars=bytes.readUInt32BE(p+12);const chars=[];for(let k=0;k<lenChars;k++)chars.push(bytes.readUInt16BE(p+16+k*2));name=String.fromCharCode(...chars);}p+=12+len+(len%2);}assert.equal(p,end);layers.push({name,id,left,top,right,bottom,w:right-left,h:bottom-top,flags,record:Buffer.from(bytes.subarray(start,end)),channels});}
  for(const layer of layers)for(const ch of layer.channels){ch.bytes=Buffer.from(bytes.subarray(p,p+ch.length));ch.decoded=decodeRle(ch.bytes,layer.w,layer.h);p+=ch.length;}
  const layerEnd=layerPos+8+layerLen,maskEnd=maskPos+8+maskLen;assert(p<=layerEnd);return {bytes,maskPos,layerPos,layerLen,maskLen,maskEnd,countPos,count,layers,padding:bytes.subarray(p,layerEnd),tail:bytes.subarray(layerEnd,maskEnd),w:bytes.readUInt32BE(18),h:bytes.readUInt32BE(14),channelCount:bytes.readUInt16BE(12)};
}
function layerImage(layer){const rgba=Buffer.alloc(layer.w*layer.h*4);for(const ch of layer.channels){const k=ch.id===-1?3:ch.id;if(k<0||k>3)continue;for(let i=0;i<ch.decoded.length;i++)rgba[4*i+k]=ch.decoded[i];}return {w:layer.w,h:layer.h,data:rgba};}
function compose(layers,w,h,reverse=false){const out={w,h,data:Buffer.alloc(w*h*4)};for(const layer of (reverse?[...layers].reverse():layers)){if(layer.flags&2)continue;const img=layer.image||layerImage(layer);for(let y=0;y<layer.h;y++)for(let x=0;x<layer.w;x++){const i=(y*layer.w+x)*4,j=((y+layer.top)*w+x+layer.left)*4,a=img.data[i+3]/255,b=out.data[j+3]/255,alpha=a+b*(1-a);if(!alpha)continue;for(let c=0;c<3;c++)out.data[j+c]=Math.round((img.data[i+c]*a+out.data[j+c]*b*(1-a))/alpha);out.data[j+3]=Math.round(alpha*255);}}return out;}
function alphaDistances(img){const dist=new Uint16Array(img.w*img.h);for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++){const i=y*img.w+x;dist[i]=img.data[4*i+3]<128?0:Math.min(x?dist[i-1]:0,y?dist[i-img.w]:0)+1;}for(let y=img.h-1;y>=0;y--)for(let x=img.w-1;x>=0;x--){const i=y*img.w+x;dist[i]=Math.min(dist[i],1+Math.min(x+1<img.w?dist[i+1]:0,y+1<img.h?dist[i+img.w]:0));}return dist;}
function exportGod(){
  const original=fs.readFileSync(path.join(GAME,'god.psb')),psb=parsePsb(original),ref=read(path.join(ROOT,'references/god-original.png'));
  const godColors=[[27,43,69],[134,211,220],[226,202,139]];
  const fitted=fit(path.join(ROOT,'generated/god.png'),ref,godColors).image;
  write(path.join(ROOT,'preview/god-ai-aligned.png'),fitted);
  const owner=new Int16Array(ref.w*ref.h);owner.fill(-1);
  psb.layers.forEach((layer,index)=>{if(layer.flags&2)return;const alpha=layer.channels.find(c=>c.id===-1).decoded;for(let y=0;y<layer.h;y++)for(let x=0;x<layer.w;x++)if(alpha[y*layer.w+x]>128)owner[(y+layer.top)*ref.w+x+layer.left]=index;});
  const report=[];
  for(const layer of psb.layers){const image=layerImage(layer),before=Buffer.from(image.data);if(!(layer.flags&2)){
    const distance=alphaDistances(image);
    for(let y=0;y<layer.h;y++)for(let x=0;x<layer.w;x++){
      const i=(y*layer.w+x)*4,j=((y+layer.top)*ref.w+x+layer.left)*4;if(!before[i+3])continue;
      // Keep the native painted contour. Only flat interior details are transferred.
      const line=Math.max(0,Math.min(1,(before[i+2]-66)/40));
      let color=godColors[0].map((v,c)=>Math.round(v*(1-line)+godColors[1][c]*line));
      const generatedColor=nearest(fitted.data,j,godColors);
      if(fitted.data[j+3]>=192&&distance[y*layer.w+x]>=5&&owner[j/4]===psb.layers.indexOf(layer)){
        if(generatedColor===2)color=godColors[2];
        else if(generatedColor===1&&line<.25)color=godColors[1];
      }
      for(let c=0;c<3;c++)image.data[i+c]=color[c];
    }
    layer.image=image;
    for(const ch of layer.channels){if(ch.id<0||ch.id>2)continue;const data=Buffer.alloc(layer.w*layer.h);for(let i=0;i<data.length;i++)data[i]=image.data[i*4+ch.id];ch.decoded=data;ch.bytes=encodeRows([data],layer.w,layer.h);layer.record.writeBigUInt64BE(BigInt(ch.bytes.length),ch.lengthOffset);}
  }
    write(path.join(ROOT,`preview/god-layer-${layer.id}.png`),image);
    const alpha=layer.channels.find(ch=>ch.id===-1);
    report.push({name:layer.name,layerId:layer.id,rect:[layer.left,layer.top,layer.right,layer.bottom],hidden:!!(layer.flags&2),alphaSha256:sha(alpha.decoded),alphaCompressedSha256:sha(alpha.bytes)});
  }
  // Photoshop's native layer stack and Unity's sprite identities stay byte-identical.
  const merged=compose(psb.layers,psb.w,psb.h),planes=[];for(let c=0;c<psb.channelCount;c++){const plane=Buffer.alloc(psb.w*psb.h);for(let i=0;i<plane.length;i++)plane[i]=c===3?ref.data[i*4+3]:merged.data[i*4+c];planes.push(plane);}
  for(let i=0;i<psb.w*psb.h;i++)merged.data[i*4+3]=ref.data[i*4+3];
  const layerData=Buffer.concat([original.subarray(psb.countPos,psb.countPos+2),...psb.layers.map(l=>l.record),...psb.layers.flatMap(l=>l.channels.map(c=>c.bytes)),psb.padding]);
  const layerLen=Buffer.alloc(8);layerLen.writeBigUInt64BE(BigInt(layerData.length));const maskData=Buffer.concat([layerLen,layerData,psb.tail]);const maskLen=Buffer.alloc(8);maskLen.writeBigUInt64BE(BigInt(maskData.length));
  const output=Buffer.concat([original.subarray(0,psb.maskPos),maskLen,maskData,encodeRows(planes,psb.w,psb.h)]);
  const target=path.join(OUT,'god.psb');ensure(target);fs.writeFileSync(target,output);fs.copyFileSync(path.join(GAME,'god.psb.meta'),target+'.meta');write(path.join(ROOT,'preview/god-candidate.png'),merged);
  const again=parsePsb(output);assert.equal(again.layers.length,psb.layers.length);again.layers.forEach((layer,i)=>{const old=psb.layers[i];assert.equal(layer.id,old.id);assert.equal(layer.name,old.name);assert.deepEqual([layer.left,layer.top,layer.right,layer.bottom],[old.left,old.top,old.right,old.bottom]);assert.deepEqual(layer.channels.find(c=>c.id===-1).bytes,old.channels.find(c=>c.id===-1).bytes);const record=Buffer.from(layer.record);for(const ch of layer.channels)record.writeBigUInt64BE(BigInt(old.channels.find(c=>c.id===ch.id).length),ch.lengthOffset);const orig=parsePsb(original).layers[i];assert.deepEqual(record,orig.record);});
  return {file:'god.psb',width:psb.w,height:psb.h,layers:report,layerAlphaUnchanged:true,metadataUnchanged:true,sourceSha256:sha(original),candidateSha256:sha(output)};
}
function main(){const jobs=JSON.parse(fs.readFileSync(path.join(ROOT,'prompts.json'),'utf8')).jobs;const reports=[];for(const job of jobs.filter(j=>j.key!=='god')){const generated=path.join(ROOT,'generated',job.key+'.png');if(!fs.existsSync(generated))continue;const original=path.join(GAME,job.file),ref=read(original),result=fit(generated,ref,palette.slice(0,2)),target=path.join(OUT,job.file);write(target,result.image);fs.copyFileSync(original+'.meta',target+'.meta');const check=read(target);assert.equal(check.w,ref.w);assert.equal(check.h,ref.h);assert.deepEqual(bbox(check),result.targetBox);assert.deepEqual(fs.readFileSync(original+'.meta'),fs.readFileSync(target+'.meta'));reports.push({key:job.key,file:job.file,width:check.w,height:check.h,originalAlphaBounds:bbox(ref),candidateAlphaBounds:bbox(check),sourceSha256:sha(fs.readFileSync(original)),candidateSha256:sha(fs.readFileSync(target)),metadataUnchanged:true});}
  const god=exportGod();fs.writeFileSync(path.join(ROOT,'contract-check.json'),JSON.stringify({roleSprites:reports,god,liveGameModified:false},null,2)+'\n');console.log(JSON.stringify({sprites:reports.length,godLayers:god.layers.length,metadataUnchanged:true}));
}
if(require.main===module)main();
module.exports={parsePsb,read,write,compose,layerImage,sha};
