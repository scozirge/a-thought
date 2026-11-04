using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using ShapeStudio;

public static class StudioChecks {
    static void Check(bool ok,string error){if(!ok)throw new InvalidOperationException(error);}
    public static void Run(){
        string folder=Path.GetFullPath("../artifacts/prompts");Directory.CreateDirectory(folder);
        var sheet=new Sheet();var deck=new Deck();var unique=new HashSet<string>();
        var tile=new Texture2D(Sheet.Size,Sheet.Size);var pixels=new Color32[Sheet.Size*Sheet.Size];
        const int thumb=128, gap=4, step=thumb+gap;
        for(int level=0;level<Deck.Levels;level++){
            var seen=new HashSet<int>();int last=-1;
            for(int n=0;n<Deck.PerLevel;n++){
                last=deck.Next(level);Check(last/Deck.PerLevel==level&&seen.Add(last),"抽到重複題目");
            }
            Check(deck.Next(level)!=last,"洗牌後連續抽到同題");
            var preview=new Texture2D(step*5,step*4,TextureFormat.RGB24,false);
            preview.SetPixels32(Enumerable.Repeat(new Color32(221,219,210,255),preview.width*preview.height).ToArray());
            for(int i=0;i<Deck.PerLevel;i++){
                Deck.Draw(level*Deck.PerLevel+i,sheet);Check(sheet.HasInk&&unique.Add(sheet.Pack()),"空白或重複原圖");
                var colors=new HashSet<int>();
                foreach(byte b in sheet.Bits){colors.Add(b&15);colors.Add(b>>4);}colors.Remove(0);
                Check(level==0?colors.SetEquals(new[]{7}):colors.Count==2&&colors.All(c=>c>=1&&c<=6),"原圖色彩不符："+i);
                sheet.Paint(tile,pixels);
                var reduced=new Color32[thumb*thumb];
                for(int y=0;y<thumb;y++)for(int x=0;x<thumb;x++)reduced[y*thumb+x]=pixels[y*2*Sheet.Size+x*2];
                preview.SetPixels32(i%5*step+2,(3-i/5)*step+2,thumb,thumb,reduced);
            }
            preview.Apply();File.WriteAllBytes(Path.Combine(folder,"level-"+level+".png"),preview.EncodeToPNG());
            UnityEngine.Object.DestroyImmediate(preview);
        }
        UnityEngine.Object.DestroyImmediate(tile);
        sheet.Reset();sheet.Begin("pen",10,20,7);sheet.Move(90,20);sheet.End();string ink=sheet.Pack();
        Check(sheet.ColorIndex==7 && sheet.Bits.SequenceEqual(Sheet.Unpack(ink)),"黑色粉筆傳輸錯誤");
        sheet.Begin("eraser",40,20,1);sheet.End();Check(ink!=sheet.Pack()&&sheet.Undo()&&sheet.Pack()==ink,"橡皮擦復原錯誤");
        Check(sheet.Clear()&&!sheet.HasInk&&sheet.Undo()&&sheet.Pack()==ink,"清空復原錯誤");
        for(int i=0;i<Sheet.Bytes;i++)sheet.Bits[i]=(byte)(0x10*(1+i%7)+(1+i/7%7));
        Check(sheet.Bits.SequenceEqual(Sheet.Unpack(sheet.Pack())),"密集彩色畫紙傳輸錯誤");
        Debug.Log("Verified 100 unique prompts, shuffle bags, chalk, eraser, undo, clear and dense sheet encoding.");
    }
}
