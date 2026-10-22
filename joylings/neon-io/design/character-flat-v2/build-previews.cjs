// Preview only: combine the separate, aligned equipment sprites without moving them.
const fs=require('node:fs'),path=require('node:path');
const {read,write,compose,parsePsb,layerImage}=require('./package-assets.cjs');
const root=__dirname;
const sets=[['knight',['Head/knight.png','Body/knight.png','Back/featherWing.png']],['anubis',['Head/anubis.png','Body/anubis.png','Back/discWing.png']],['beetle',['Head/beetle.png','Body/beetle.png','Back/beetle.png']]];
for(const [name,parts]of sets){for(const variant of ['original','candidate']){
  const images=parts.map((part,i)=>read(variant==='original'?path.join(root,`references/${name}-${['head','body','back'][i]}.png`):path.join(root,'replacement/Assets/Resources/Images/Role',part)));
  const layers=[images[2],images[1],images[0]].map(image=>({image,flags:0,w:180,h:180,top:0,left:0}));
  write(path.join(root,`preview/${name}-${variant}.png`),compose(layers,180,180));
}}
// Verify native layer ordering against the game's own merged PSB preview.
const source=path.resolve(root,'../../unity/Assets/Resources/Images/Role/god.psb');
const psb=parsePsb(fs.readFileSync(source)),original=read(path.join(root,'references/god-original.png'));
function error(image){let d=0,n=0;for(let i=0;i<image.data.length;i+=4)if(original.data[i+3]>250){for(let c=0;c<3;c++)d+=Math.abs(image.data[i+c]-original.data[i+c]);n+=3;}return d/n;}
const normal=error(compose(psb.layers,1000,1000)),reverse=error(compose(psb.layers,1000,1000,true));
if(normal>reverse)throw Error('Layer composition order does not match source PSB');
fs.writeFileSync(path.join(root,'preview-contract.json'),JSON.stringify({equipmentCanvas:[180,180],equipmentOrder:['Back','Body','Head'],originalGodCompositeMeanColorError:normal,reverseLayerOrderMeanColorError:reverse},null,2)+'\n');
console.log(JSON.stringify({equipmentPreviews:6,sourceGodCompositeError:normal}));
