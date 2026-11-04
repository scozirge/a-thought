using System;
using System.Collections.Generic;
using UnityEngine;

namespace ShapeStudio {
    public sealed class Deck {
        public const int Levels=5, PerLevel=20;
        const int Full=(1<<PerLevel)-1;
        // Five used-card masks followed by each bag's last card (one-based).
        public readonly int[] History=new int[Levels*2];
        static string[] cards;
        public void Restore(int[] history){
            Array.Clear(History,0,History.Length);
            if(history!=null && history.Length==History.Length)Array.Copy(history,History,History.Length);
        }
        public int Next(int level){
            int used=History[level];bool newBag=used==Full;
            if(newBag)used=0;
            var choices=new List<int>(PerLevel);
            for(int i=0;i<PerLevel;i++)
                if((used&(1<<i))==0 && !(newBag&&History[Levels+level]==i+1))choices.Add(i);
            int pick=choices[UnityEngine.Random.Range(0,choices.Count)];
            History[level]=used|(1<<pick);History[Levels+level]=pick+1;
            return level*PerLevel+pick;
        }
        static string[] Load(){
            var asset=Resources.Load<TextAsset>("chalk-cards");
            var list=new List<string>();int tier=-1;
            foreach(string raw in asset.text.Split('\n')){
                string line=raw.Trim();
                if(line==""||line.StartsWith("#"))continue;
                if(line.StartsWith("[")){
                    tier++;
                    if(line!="["+tier+"]" || list.Count!=tier*PerLevel)throw new FormatException("題庫分組錯誤："+line);
                }else list.Add(line);
            }
            if(tier!=Levels-1 || list.Count!=Levels*PerLevel)throw new FormatException("每個難度必須有 20 張圖。");
            return list.ToArray();
        }
        public static void Draw(int id,Sheet sheet){
            cards??=Load();sheet.Reset();
            foreach(string command in cards[id].Split(';')){
                string[] fields=command.Trim().Split(new[]{' '},StringSplitOptions.RemoveEmptyEntries);
                string op=fields[0];
                sheet.ColorIndex=op.Length==1?(byte)7:byte.Parse(op.Substring(1));
                if(id/PerLevel==0?sheet.ColorIndex!=7:sheet.ColorIndex<1||sheet.ColorIndex>6)
                    throw new FormatException("原圖顏色不符難度："+id);
                int[] n=new int[fields.Length-1];
                for(int i=0;i<n.Length;i++)n[i]=int.Parse(fields[i+1]);
                if(op[0]=='p'){
                    if(n.Length<4||n.Length%2!=0)throw new FormatException(command);
                    for(int i=2;i<n.Length;i+=2)sheet.Line(n[i-2],n[i-1],n[i],n[i+1]);
                }else if(op[0]=='c'){
                    if(n.Length!=8)throw new FormatException(command);
                    Curve(sheet,n);
                }else{
                    if(n.Length!=3&&n.Length!=4)throw new FormatException(command);
                    int w=n[2],h=n.Length==4?n[3]:w;
                    int x=n[0]-w/2,y=n[1]-h/2,u=x+w,v=y+h;
                    switch(op[0]){
                        case 'o':sheet.Shape("oval",x,y,u,v);break;
                        case 'r':sheet.Shape("box",x,y,u,v);break;
                        case 't':sheet.Shape("tri",x,y,u,v);break;
                        case 'v':sheet.Line(x,y,u,y);sheet.Line(u,y,n[0],v);sheet.Line(n[0],v,x,y);break;
                        case 'd':sheet.Line(n[0],y,u,n[1]);sheet.Line(u,n[1],n[0],v);sheet.Line(n[0],v,x,n[1]);sheet.Line(x,n[1],n[0],y);break;
                        case 's':
                            int px=n[0],py=y;
                            for(int k=1;k<=10;k++){
                                float angle=k*Mathf.PI/5-Mathf.PI/2,scale=k%2==0?.5f:.22f;
                                int nx=n[0]+Mathf.RoundToInt(w*scale*Mathf.Cos(angle));
                                int ny=n[1]+Mathf.RoundToInt(h*scale*Mathf.Sin(angle));
                                sheet.Line(px,py,nx,ny);px=nx;py=ny;
                            }
                            break;
                        case 'w':
                            Curve(sheet,new[]{x,n[1],x+w/6,y-h/6,n[0]-w/6,y-h/6,n[0],n[1]});
                            Curve(sheet,new[]{n[0],n[1],n[0]+w/6,v+h/6,u-w/6,v+h/6,u,n[1]});
                            break;
                        default:throw new FormatException(command);
                    }
                }
            }
        }
        static void Curve(Sheet sheet,int[] n){
            var a=new Vector2(n[0],n[1]);var b=new Vector2(n[2],n[3]);
            var c=new Vector2(n[4],n[5]);var d=new Vector2(n[6],n[7]);var prev=a;
            for(int i=1;i<=48;i++){
                float t=i/48f,s=1-t;
                var p=s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d;
                sheet.Line(Mathf.RoundToInt(prev.x),Mathf.RoundToInt(prev.y),Mathf.RoundToInt(p.x),Mathf.RoundToInt(p.y));prev=p;
            }
        }
    }
}
