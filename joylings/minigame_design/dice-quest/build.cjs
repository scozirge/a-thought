const fs=require('node:fs'),path=require('node:path');
const output=path.join(__dirname,'dist/h5');fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','styles.css','core.js','art.js','app.js'])fs.copyFileSync(path.join(__dirname,file),path.join(output,file));
console.log('骰子魔法冒險已輸出到 '+output);
