using System;
using System.Collections.Generic;
using UnityEngine;

namespace ShapeStudio {
    public static class Deck {
        // Bounds are in paper coordinates, measured from its top left. Each card has
        // one silhouette and two or three count, placement or orientation cues.
        static readonly string[] Cards = {
            "oval 55 70 199 200;box 57 43 91 77;tri 153 38 200 77;oval 91 116 103 128;oval 152 116 164 128;tri 117 141 137 156",
            "box 58 119 196 211;tri 41 49 211 119;box 162 47 181 79;oval 109 139 137 167",
            "tri 91 39 177 138;line 134 138 134 154;line 41 154 213 154;line 213 154 182 193;line 182 193 77 193;line 77 193 41 154;oval 95 166 105 176;oval 122 166 132 176;oval 149 166 159 176",
            "box 52 84 202 188;line 127 84 127 52;oval 115 28 139 52;box 74 114 94 134;oval 149 111 175 137;box 202 122 220 149",
            "box 62 77 194 169;line 128 77 128 169;tri 87 40 129 77;tri 129 40 166 77;oval 73 169 109 205;oval 146 169 182 205",
            "tri 89 21 167 80;box 89 80 167 177;box 112 98 143 129;tri 90 178 113 216;tri 143 178 166 216",
            "oval 59 77 176 170;line 176 122 215 89;line 215 89 215 156;line 215 156 176 122;oval 79 104 98 123;oval 43 61 57 75;oval 25 38 34 47",
            "oval 77 124 177 218;oval 87 60 166 128;line 73 73 177 47;tri 91 25 153 62;box 118 153 136 171",
            "line 127 28 183 95;line 183 95 127 152;line 127 152 73 95;line 73 95 127 28;line 73 95 183 95;line 127 152 99 205;line 127 152 153 195;oval 88 202 104 218;box 150 194 165 209",
            "box 55 87 166 176;oval 166 105 204 151;oval 76 120 92 136;oval 122 120 138 136;line 43 189 190 189",
            "box 49 69 206 156;line 49 69 127 120;line 206 69 127 120;line 93 156 93 197;line 158 156 158 197;box 65 191 94 206",
            "tri 38 86 139 189;tri 112 58 212 189;line 162 58 162 26;line 162 26 190 37;line 190 37 162 46;oval 50 43 76 69",
            "box 39 64 217 190;line 128 64 128 190;oval 60 94 105 139;tri 150 92 198 145",
            "tri 40 49 211 133;line 126 133 126 198;line 126 198 150 198;box 84 96 104 116",
            "oval 65 66 190 192;tri 55 38 100 81;line 127 129 127 88;line 127 129 157 144;line 96 184 80 210;line 159 185 171 206",
            "box 38 94 214 164;box 53 107 83 133;box 107 107 137 133;oval 164 106 193 135;oval 63 164 99 200;oval 154 164 190 200"
        };
        static readonly Queue<int> bag = new Queue<int>();
        static int previous=-1;
        public static int Next() {
            if(bag.Count==0){
                var cycle=new List<int>();for(int i=0;i<Cards.Length;i++)cycle.Add(i);
                for(int i=cycle.Count-1;i>0;i--){int j=UnityEngine.Random.Range(0,i+1);int t=cycle[i];cycle[i]=cycle[j];cycle[j]=t;}
                if(cycle[0]==previous) {int t=cycle[0];cycle[0]=cycle[1];cycle[1]=t;}
                foreach(int n in cycle)bag.Enqueue(n);
            }
            return previous=bag.Dequeue();
        }
        public static void Draw(int id,Sheet sheet) {
            sheet.Reset();
            foreach(string item in Cards[id].Split(';')){
                var p=item.Split(' ');sheet.Shape(p[0],int.Parse(p[1]),int.Parse(p[2]),int.Parse(p[3]),int.Parse(p[4]));
            }
        }
    }
}
