using System;
using System.Collections.Generic;
using UnityEngine;

namespace ShapeStudio {
    // One ink bit per pixel. Even a full sheet fits in a single bounded reliable message.
    public sealed class Sheet {
        public const int Size = 256, Bytes = Size * Size / 8;
        public byte[] Bits { get; private set; } = new byte[Bytes];
        readonly List<byte[]> undo = new List<byte[]>();
        byte[] before; int sx, sy, lastX, lastY;
        string tool = "pen";
        public bool Down => before != null;
        public bool Dirty { get; set; } = true;
        public bool HasInk => Array.Exists(Bits, b => b != 0);
        public void Reset(byte[] bits = null) {
            Bits = bits != null ? (byte[])bits.Clone() : new byte[Bytes];
            undo.Clear(); before = null; Dirty = true;
        }
        void Dot(int x, int y, int radius = 1) {
            for (int dy = -radius; dy <= radius; dy++)
                for (int dx = -radius; dx <= radius; dx++) {
                    int px = x+dx, py = y+dy;
                    if (px < 0 || py < 0 || px >= Size || py >= Size || dx*dx+dy*dy > radius*radius+1) continue;
                    int i = py*Size+px; Bits[i>>3] |= (byte)(1 << (i & 7));
                }
            Dirty = true;
        }
        public void Line(int x, int y, int u, int v) {
            int steps = Math.Max(Math.Abs(u-x), Math.Abs(v-y));
            if (steps == 0) { Dot(x,y); return; }
            for (int i=0; i<=steps; i++) Dot(x+(u-x)*i/steps, y+(v-y)*i/steps);
        }
        public void Shape(string kind, int x, int y, int u, int v) {
            int left=Math.Min(x,u), right=Math.Max(x,u), top=Math.Min(y,v), bottom=Math.Max(y,v);
            if (kind=="line") { Line(x,y,u,v); return; }
            if (kind=="tri") {
                int mid=(left+right)/2; Line(mid,top,right,bottom); Line(right,bottom,left,bottom); Line(left,bottom,mid,top); return;
            }
            if (kind=="box") {
                Line(left,top,right,top); Line(right,top,right,bottom); Line(right,bottom,left,bottom); Line(left,bottom,left,top); return;
            }
            double rx=(right-left)/2.0, ry=(bottom-top)/2.0, cx=left+rx, cy=top+ry;
            int oldX=right, oldY=(int)Math.Round(cy);
            for (int i=1; i<=120; i++) {
                double a=i*Math.PI/60; int nx=(int)Math.Round(cx+rx*Math.Cos(a)), ny=(int)Math.Round(cy+ry*Math.Sin(a));
                Line(oldX,oldY,nx,ny); oldX=nx; oldY=ny;
            }
        }
        public void Begin(string selected, int x, int y) {
            End(); before=(byte[])Bits.Clone(); sx=lastX=x; sy=lastY=y; tool=selected;
            if (tool=="pen") Dot(x,y);
        }
        public void Move(int x, int y) {
            if (!Down) return;
            if (tool=="pen") Line(lastX,lastY,x,y);
            else { Array.Copy(before,Bits,Bytes); Shape(tool,sx,sy,x,y); }
            lastX=x; lastY=y;
        }
        public void End() {
            if (!Down) return;
            if (undo.Count>=32) undo.RemoveAt(0);
            undo.Add(before); before=null;
        }
        public bool Undo() {
            End(); if (undo.Count==0) return false;
            Bits=undo[undo.Count-1]; undo.RemoveAt(undo.Count-1); Dirty=true; return true;
        }
        // Zero runs dominate children's line drawings. Use raw bits if a packed sheet would grow.
        public string Pack() {
            var packed=new List<byte>{1};
            for (int i=0; i<Bytes;) {
                while (i<Bytes && Bits[i]==0) i++;
                if (i==Bytes) break;
                int start=i; while (i<Bytes && Bits[i]!=0 && i-start<255) i++;
                packed.Add((byte)(start>>8)); packed.Add((byte)start); packed.Add((byte)(i-start));
                for (int j=start;j<i;j++) packed.Add(Bits[j]);
            }
            if (packed.Count<=Bytes) return Convert.ToBase64String(packed.ToArray());
            var raw=new byte[Bytes+1]; Array.Copy(Bits,0,raw,1,Bytes); return Convert.ToBase64String(raw);
        }
        public static byte[] Unpack(string value) {
            if (string.IsNullOrEmpty(value) || value.Length>11000) return null;
            byte[] data; try {data=Convert.FromBase64String(value);} catch(FormatException){return null;}
            if(data.Length<1) return null;
            var bits=new byte[Bytes];
            if (data[0]==0 && data.Length==Bytes+1) {Array.Copy(data,1,bits,0,Bytes);return bits;}
            if (data[0]!=1) return null;
            int previous=0;
            for(int i=1;i<data.Length;) {
                if(i+3>data.Length) return null;
                int start=(data[i]<<8)|data[i+1], length=data[i+2]; i+=3;
                if(length==0 || start<previous || start+length>Bytes || i+length>data.Length)return null;
                Array.Copy(data,i,bits,start,length);i+=length;previous=start+length;
            }
            return bits;
        }
        public void Paint(Texture2D texture, Color32[] pixels) {
            var ink=new Color32(37,52,77,255); var paper=new Color32(255,254,249,255);
            for(int y=0;y<Size;y++) for(int x=0;x<Size;x++){
                int i=y*Size+x; pixels[(Size-1-y)*Size+x]=(Bits[i>>3]&(1<<(i&7)))!=0?ink:paper;
            }
            texture.SetPixels32(pixels);texture.Apply(false,false);Dirty=false;
        }
    }
}
