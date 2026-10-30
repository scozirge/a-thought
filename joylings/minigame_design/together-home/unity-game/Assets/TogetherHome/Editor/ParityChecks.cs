using System;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using CatDog;
public static class ParityChecks {
 public static string Run(string assets){
  var levels=JsonConvert.DeserializeObject<Level[]>(File.ReadAllText(assets+"/Resources/levels.json"));
  var tapes=JsonConvert.DeserializeObject<Tape[]>(File.ReadAllText(assets+"/Resources/solutions.json"));
  var cases=JArray.Parse(File.ReadAllText(assets+"/TogetherHome/Editor/parity.json"));
  int total=0,frames=0;
  for(int level=0;level<levels.Length;level++){
   var s=Rules.Fresh(levels[level],level);var keys=new Keys();int frame=0,checkpoint=0;
   foreach(var action in tapes[level].actions)for(int n=0;n<action[0];n++){
    keys.Set(action[1]);s=Rules.Step(s,keys.Read(),levels[level]);keys.Consume();frame++;frames++;
    if(checkpoint<((JArray)cases[level]).Count&&frame==(int)cases[level][checkpoint]["frame"]){
     var expected=cases[level][checkpoint++]["state"];var actual=JObject.FromObject(s);
     foreach(string name in new[]{"players","boxes","lifts","rafts","balances","gravity","collected","collectedBy","mode","key","won","failed","lostCargo","switches"})Compare(expected[name],actual[name],level,frame,name);
     total++;
    }
   }
   if(!s.won||s.failed||frame!=tapes[level].frames)throw new Exception("Level "+level+" did not win");
  }
  return "TOGETHER_PARITY_OK "+levels.Length+" levels / "+total+" checkpoints / "+frames+" input frames";
 }
 static void Compare(JToken expected,JToken actual,int level,int frame,string path){
  if(expected==null)return;
  if(expected is JObject obj){foreach(var p in obj.Properties())Compare(p.Value,actual?[p.Name],level,frame,path+"."+p.Name);return;}
  if(expected is JArray arr){if(!(actual is JArray a)||a.Count!=arr.Count)throw new Exception(path+" length");for(int i=0;i<arr.Count;i++)Compare(arr[i],a[i],level,frame,path+"["+i+"]");return;}
  bool numeric=expected.Type==JTokenType.Float||expected.Type==JTokenType.Integer;
  bool equal=numeric&&actual!=null&&actual.Type!=JTokenType.Null?Math.Abs((double)expected-(double)actual)<.00001:JToken.DeepEquals(expected,actual);
  if(!equal)throw new Exception("Level "+level+" frame "+frame+" "+path+": expected "+expected+" actual "+actual);
 }
}
