// Run against a served release folder or the public URL. Real-room suites are
// serial so nine-player capacity checks do not compete with other WebGL tests.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const suites={
  interface:[['LearningMenuChecks'],['TrainingMenuChecks'],['MobileBridgeChecks'],['PointerBridgeChecks'],['MobileLayoutChecks']],
  network:[['WebNetworkSmokeTest'],['WebNetworkSmokeTest','--lag'],['WebConnectionLifecycleSmokeTest'],['WebMultiplayerRecoverySmokeTest'],['WebRoomCapacitySmokeTest'],['WebCameraOwnershipSmokeTest']],
  play:[['WebTrainingSmokeTest'],['WebLearningSmokeTest'],['WebMobileSmokeTest','--lag','--respawn'],['WebBotDistributionSmokeTest']],
  public:[['WebPublishedReleaseSmokeTest'],['WebNetworkSmokeTest','--lag']],
};
const requested=process.argv.slice(2);
const groups=requested.length?requested:['interface','network','play'];
for(const group of groups)if(!suites[group])throw Error('Unknown suite '+group+'; use '+Object.keys(suites).join(', '));
const output=path.resolve(process.env.RIVALS_TEST_OUTPUT||path.join(root,'Logs/FinalQA'));
fs.mkdirSync(output,{recursive:true});
const defaultUrl=groups.every(group=>group==='public')?'https://scozirge.github.io/a-thought/rivals/':'http://127.0.0.1:8188/';
const report={startedAt:new Date().toISOString(),url:process.env.RIVALS_WEB_URL||defaultUrl,groups,tests:[],ok:false};
const reportPath=path.join(output,'validation-'+groups.join('-')+'.json');
const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
async function run(group,[name,...args]){
  const id=[name,...args.map(arg=>arg.replace(/^--/,''))].join('-');
  const folder=path.join(output,group,id);fs.mkdirSync(folder,{recursive:true});
  const entry={name,args,startedAt:new Date().toISOString(),output:folder,ok:false};report.tests.push(entry);save();
  const log=fs.createWriteStream(path.join(folder,'console.log'));
  console.log('\nWEB_VALIDATION_START '+id);
  const start=Date.now();
  try{
    entry.exitCode=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[path.join(__dirname,name+'.cjs'),...args],{
        cwd:root,env:{...process.env,RIVALS_WEB_URL:report.url,RIVALS_TEST_OUTPUT:folder},stdio:['ignore','pipe','pipe'],windowsHide:true,
      });
      child.stdout.on('data',data=>{process.stdout.write(data);log.write(data);});
      child.stderr.on('data',data=>{process.stderr.write(data);log.write(data);});
      child.on('error',reject);child.on('close',code=>resolve(code));
    });
    entry.ok=entry.exitCode===0;
    if(!entry.ok)throw Error(id+' failed with exit code '+entry.exitCode+'; see '+folder);
  }catch(error){entry.error=error.message;throw error;}
  finally{entry.durationSeconds=+( (Date.now()-start)/1000 ).toFixed(1);await new Promise(resolve=>log.end(resolve));save();}
}
(async()=>{
  for(const group of groups)for(const test of suites[group])await run(group,test);
  report.ok=true;report.finishedAt=new Date().toISOString();save();
  console.log('WEB_VALIDATION_OK '+report.tests.length+' scripts; '+reportPath);
})().catch(error=>{console.error(error);process.exitCode=1;});
