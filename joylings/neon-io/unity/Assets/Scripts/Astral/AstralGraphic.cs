using UnityEngine;
using UnityEngine.UI;

namespace Neon.Astral
{
    // Resolution-independent ornaments: a few UI triangles, no rasterised mockup panels.
    public sealed class AstralGraphic : MaskableGraphic
    {
        public enum Shape { Plate, Frame, Orbit, Star, Starfield, Rule, Glow, Disc, Exit }
        public Shape shape;
        public Color border = new Color(.76f, .65f, .43f, .65f);
        public float thickness = 2.4f;
        public float ornament = 1;
        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear(); var r = rectTransform.rect;
            if (shape == Shape.Plate || shape == Shape.Frame)
            {
                float cut = Mathf.Min(18, Mathf.Min(r.width, r.height) * .15f);
                Vector2[] p = { new Vector2(r.xMin+cut,r.yMin),new Vector2(r.xMax-cut,r.yMin),new Vector2(r.xMax,r.yMin+cut),new Vector2(r.xMax,r.yMax-cut),new Vector2(r.xMax-cut,r.yMax),new Vector2(r.xMin+cut,r.yMax),new Vector2(r.xMin,r.yMax-cut),new Vector2(r.xMin,r.yMin+cut) };
                if(shape==Shape.Plate) for(int i=0;i<p.Length;i++)
                {
                    int k=vh.currentVertCount;vh.AddVert(r.center,Shade(color,1.04f),Vector2.zero);
                    foreach(var point in new[]{p[i],p[(i+1)%p.Length]})vh.AddVert(point,Shade(color,Mathf.Lerp(.86f,1.12f,Mathf.InverseLerp(r.yMin,r.yMax,point.y))),Vector2.zero);
                    vh.AddTriangle(k,k+1,k+2);
                }
                for(int i=0;i<p.Length;i++) Line(vh,p[i],p[(i+1)%p.Length],thickness,border);
                if (ornament > 0 && r.width > 280 && r.height > 100)
                {
                    foreach(float x in new[]{r.xMin+20,r.xMax-20}) foreach(float y in new[]{r.yMin+20,r.yMax-20}) Star(vh,new Vector2(x,y),4,border);
                    Line(vh,new Vector2(r.xMin+38,r.yMax-9),new Vector2(r.xMax-38,r.yMax-9),.5f,new Color(border.r,border.g,border.b,border.a*.45f));
                }
            }
            else if(shape==Shape.Exit)
            {
                float s=Mathf.Min(r.width,r.height);
                Vector2 a=r.center+new Vector2(-.1f,.38f)*s,b=r.center+new Vector2(-.38f,.38f)*s,c=r.center+new Vector2(-.38f,-.38f)*s,d=r.center+new Vector2(-.1f,-.38f)*s;
                Line(vh,a,b,thickness,color);Line(vh,b,c,thickness,color);Line(vh,c,d,thickness,color);
                var tip=r.center+new Vector2(.38f,0)*s;
                Line(vh,r.center+new Vector2(-.12f,0)*s,tip,thickness,color);
                Line(vh,r.center+new Vector2(.16f,.22f)*s,tip,thickness,color);
                Line(vh,r.center+new Vector2(.16f,-.22f)*s,tip,thickness,color);
            }
            else if(shape==Shape.Disc)
            {
                float radius=Mathf.Min(r.width,r.height)*.48f;
                for(int i=0;i<64;i++)
                {float a=i*Mathf.PI*2/64,b=(i+1)*Mathf.PI*2/64;Tri(vh,r.center,r.center+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*radius,r.center+new Vector2(Mathf.Cos(b),Mathf.Sin(b))*radius,color);}
                Ring(vh,r.center,radius,thickness,border);
            }
            else if(shape==Shape.Orbit)
            {
                float radius=Mathf.Min(r.width,r.height)*.46f;
                Ring(vh,r.center,radius,2.2f,color); Ring(vh,r.center,radius*.86f,1.8f,new Color(color.r,color.g,color.b,color.a*.6f));
                if(radius>120)Ring(vh,r.center,radius*.57f,1.5f,new Color(color.r,color.g,color.b,color.a*.35f));
                int ticks=radius>120?60:12;
                for(int i=0;i<ticks;i++)
                {
                    float a=i*Mathf.PI*2/ticks;var d=new Vector2(Mathf.Cos(a),Mathf.Sin(a));
                    Line(vh,r.center+d*(radius+(i%5==0?-7:-3)),r.center+d*(radius+3),i%5==0?2:1.5f,color);
                }
                if(radius>120)for(int i=0;i<8;i++) { float a=i*Mathf.PI/4; Star(vh,r.center+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*radius,i%2==0?8:4,color); }
            }
            else if(shape==Shape.Star) Star(vh,r.center,Mathf.Min(r.width,r.height)*.49f,color);
            else if(shape==Shape.Rule)
            {
                Line(vh,new Vector2(r.xMin,r.center.y),new Vector2(r.xMax,r.center.y),thickness,color);
                Star(vh,r.center,5,color);
            }
            else if(shape==Shape.Glow)
            {
                int k=vh.currentVertCount;vh.AddVert(r.center,color,Vector2.zero);
                for(int i=0;i<=96;i++){float a=i*Mathf.PI*2/96;vh.AddVert(r.center+new Vector2(Mathf.Cos(a)*r.width*.5f,Mathf.Sin(a)*r.height*.5f),new Color(color.r,color.g,color.b,0),Vector2.zero);if(i>0)vh.AddTriangle(k,k+i,k+i+1);}
            }
            else if(shape==Shape.Starfield)
            {
                // Fixed, deterministic placement; no gameplay Random state is consumed.
                for(int i=0;i<110;i++)
                {
                    float x=Mathf.Repeat(i*.618033989f+.13f,1), y=Mathf.Repeat(i*i*.034732f+.27f,1);
                    var p=new Vector2(Mathf.Lerp(r.xMin,r.xMax,x),Mathf.Lerp(r.yMin,r.yMax,y));
                    var c=new Color(color.r,color.g,color.b,color.a*(.2f+(i%5)*.15f));
                    Star(vh,p,i%11==0?5.5f:2.3f,c);
                }
            }
        }
        static void Ring(VertexHelper v,Vector2 c,float radius,float width,Color col)
        {
            for(int i=0;i<144;i++) { float a=i*Mathf.PI*2/144,b=(i+1)*Mathf.PI*2/144;Line(v,c+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*radius,c+new Vector2(Mathf.Cos(b),Mathf.Sin(b))*radius,width,col); }
        }
        static void Star(VertexHelper v,Vector2 c,float radius,Color col)
        {
            var p=new Vector2[8]; for(int i=0;i<8;i++){float a=i*Mathf.PI/4;p[i]=c+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*(i%2==0?radius:radius*.23f);}
            for(int i=0;i<8;i++)Tri(v,c,p[i],p[(i+1)%8],col);
        }
        static void Line(VertexHelper v,Vector2 a,Vector2 b,float width,Color col)
        {
            var d=(b-a).normalized;var n=new Vector2(-d.y,d.x);int k=v.currentVertCount;float inner=Mathf.Max(.1f,width*.5f-.45f),outer=width*.5f+.6f;
            var clear=new Color(col.r,col.g,col.b,0);
            v.AddVert(a-n*outer,clear,Vector2.zero);v.AddVert(b-n*outer,clear,Vector2.zero);v.AddVert(a-n*inner,col,Vector2.zero);v.AddVert(b-n*inner,col,Vector2.zero);
            v.AddVert(a+n*inner,col,Vector2.zero);v.AddVert(b+n*inner,col,Vector2.zero);v.AddVert(a+n*outer,clear,Vector2.zero);v.AddVert(b+n*outer,clear,Vector2.zero);
            for(int j=0;j<6;j+=2){v.AddTriangle(k+j,k+j+1,k+j+2);v.AddTriangle(k+j+1,k+j+3,k+j+2);}
        }
        static Color Shade(Color c,float f)=>new Color(c.r*f,c.g*f,c.b*f,c.a);
        static void Tri(VertexHelper v,Vector2 a,Vector2 b,Vector2 c,Color col)
        {int k=v.currentVertCount;v.AddVert(a,col,Vector2.zero);v.AddVert(b,col,Vector2.zero);v.AddVert(c,col,Vector2.zero);v.AddTriangle(k,k+1,k+2);}
    }
}
