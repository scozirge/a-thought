const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const G=require('../core.js');
for(const level of G.levels)for(const input of level.cases)assert.equal(G.trace(level.solution,level,input).ok,true);
const output=path.resolve(__dirname,'../dist/h5');fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','styles.css','core.js','art.js','app.js'])fs.copyFileSync(path.resolve(__dirname,'..',file),path.join(output,file));
console.log('三個任務的解法皆通過；H5 已輸出到 '+output);
