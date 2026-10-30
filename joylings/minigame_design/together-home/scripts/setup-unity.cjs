const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../puzzle-party/unity-game'),target=path.join(root,'unity-game');
for(const name of ['Assets/Photon','Packages','ProjectSettings']){
 const dest=path.join(target,name);
 if(!fs.existsSync(dest))fs.cpSync(path.join(source,name),dest,{recursive:true});
}
fs.mkdirSync(path.join(target,'Assets/Resources'),{recursive:true});
for(const name of ['NotoSansTC-Regular.otf','NotoSansTC-OFL.txt'])fs.copyFileSync(path.join(source,'Assets/Resources',name),path.join(target,'Assets/Resources',name));
const project=path.join(target,'ProjectSettings/ProjectSettings.asset');
let settings=fs.readFileSync(project,'utf8');
settings=settings.replace(/productGUID: .*/, 'productGUID: 921d14afc2754a68b1dd17627be99872');
fs.writeFileSync(project,settings);
console.log('Prepared independent Unity project; shared Photon SDK and licensed font copied from puzzle-party.');
