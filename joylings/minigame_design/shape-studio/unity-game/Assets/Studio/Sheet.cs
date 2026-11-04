using System;
using System.Collections.Generic;
using UnityEngine;

namespace ShapeStudio {
    // Two palette indices per byte. Zero is paper, 1–6 are pastels, 7 is black.
    public sealed class Sheet {
        public const int Size = 256, Bytes = Size * Size / 2, MaxPackedChars = ((Bytes+3)/3)*4;
        public static readonly string[] Palette={"#FFFEF9","#DD8592","#EAA171","#DBBA56","#81B995","#81AED8","#B298CB","#292929"};
        static readonly Color32[] PaintColors=Array.ConvertAll(Palette, hex=>{
            ColorUtility.TryParseHtmlString(hex,out Color c);return (Color32)c;
        });
        public byte ColorIndex {get;set;}=7;
        public byte[] Bits { get; private set; } = new byte[Bytes];
        readonly List<byte[]> undo = new List<byte[]>();
        byte[] before; int lastX, lastY;
        public bool Down => before != null;
        public bool Dirty { get; set; } = true;
        public bool HasInk => Array.Exists(Bits, b => b != 0);
        public void Reset(byte[] bits = null) {
            Bits = bits != null ? (byte[])bits.Clone() : new byte[Bytes];
            undo.Clear(); before = null; Dirty = true;
        }
        void Dot(int x, int y) {
            int radius=ColorIndex==0?8:1;
            for (int dy = -radius; dy <= radius; dy++)
                for (int dx = -radius; dx <= radius; dx++) {
                    int px = x+dx, py = y+dy;
                    if (px < 0 || py < 0 || px >= Size || py >= Size || dx*dx+dy*dy > radius*radius+1) continue;
                    int i=py*Size+px,shift=(i&1)*4;
                    Bits[i>>1]=(byte)((Bits[i>>1]&~(15<<shift)) | (ColorIndex<<shift));
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
        public void Begin(string selected, int x, int y, int chalk) {
            End(); before=(byte[])Bits.Clone(); lastX=x; lastY=y;
            ColorIndex=(byte)(selected=="eraser"?0:Mathf.Clamp(chalk,1,Palette.Length-1));
            Dot(x,y);
        }
        public void Move(int x, int y) {
            if (!Down) return;
            Line(lastX,lastY,x,y);
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
        public bool Clear() {
            End();if(!HasInk)return false;
            if(undo.Count>=32)undo.RemoveAt(0);
            undo.Add(Bits);Bits=new byte[Bytes];Dirty=true;return true;
        }
        // Zero runs dominate children's line drawings. Use raw bits if a packed sheet would grow.
        public string Pack() {
            var packed=new List<byte>{3};
            for (int i=0; i<Bytes;) {
                while (i<Bytes && Bits[i]==0) i++;
                if (i==Bytes) break;
                int start=i; while (i<Bytes && Bits[i]!=0 && i-start<255) i++;
                packed.Add((byte)(start>>8)); packed.Add((byte)start); packed.Add((byte)(i-start));
                for (int j=start;j<i;j++) packed.Add(Bits[j]);
            }
            if (packed.Count<=Bytes) return Convert.ToBase64String(packed.ToArray());
            var raw=new byte[Bytes+1];raw[0]=2;Array.Copy(Bits,0,raw,1,Bytes);return Convert.ToBase64String(raw);
        }
        public static byte[] Unpack(string value) {
            if (string.IsNullOrEmpty(value) || value.Length>MaxPackedChars) return null;
            byte[] data; try {data=Convert.FromBase64String(value);} catch(FormatException){return null;}
            if(data.Length<1) return null;
            var bits=new byte[Bytes];
            if (data[0]==2 && data.Length==Bytes+1) {Array.Copy(data,1,bits,0,Bytes);}
            else if(data[0]==3){
                int previous=0;
                for(int i=1;i<data.Length;) {
                    if(i+3>data.Length) return null;
                    int start=(data[i]<<8)|data[i+1], length=data[i+2]; i+=3;
                    if(length==0 || start<previous || start+length>Bytes || i+length>data.Length)return null;
                    Array.Copy(data,i,bits,start,length);i+=length;previous=start+length;
                }
            }else return null;
            // Only student sheets are received over the wire.
            if(Array.Exists(bits,b=>(b&15)>=Palette.Length || (b>>4)>=Palette.Length))return null;
            return bits;
        }
        public void Paint(Texture2D texture, Color32[] pixels) {
            for(int y=0;y<Size;y++) for(int x=0;x<Size;x++){
                int i=y*Size+x;pixels[(Size-1-y)*Size+x]=PaintColors[(Bits[i>>1]>>((i&1)*4))&15];
            }
            texture.SetPixels32(pixels);texture.Apply(false,false);Dirty=false;
        }
    }
}
