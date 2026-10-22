const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),G=require('./core.js');
for(const [i,level] of G.levels.entries())for(const input of level.cases)assert.equal(G.trace(i,level.solution,input).ok,true);
const output=path.join(__dirname,'dist/h5');fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','styles.css','core.js','art.js','app.js'])fs.copyFileSync(path.join(__dirname,name),path.join(output,name));
console.log('三關運算、15 張訂單通過；靜態網頁已輸出到 '+output);
