const fs=require('node:fs'),path=require('node:path'),out=path.join(__dirname,'dist/h5');
fs.mkdirSync(out,{recursive:true});for(const file of ['index.html','core.js','art.js','app.js','styles.css'])fs.copyFileSync(path.join(__dirname,file),path.join(out,file));console.log('已輸出到 '+out);
