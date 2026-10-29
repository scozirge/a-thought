(function(root){
  const level={id:-1,group:'tutorial',tutorial:true,name:'一起出發',saveKey:'warmup-1',cameraTop:80,
    starts:[380,80],platforms:[],boxes:[],lifts:[],switches:[],
    gates:[{x:450,y:-120,w:28,h:520,buttons:[{x:280,y:400,w:96,owner:1}],openAfterKey:0}],
    keys:[{x:560,y:320,r:14,owner:0}],door:{x:820,y:318,w:68,h:82},
    hint:'狗狗踩藍色圓圈，幫貓咪開門。',
    solution:['狗狗按 → 走到藍色圓圈上，停在按鈕上幫貓咪開門。','貓咪按 D 往右走，接近鑰匙時按 W 跳起來拿。拿到後，門會一直開著。','貓咪和狗狗一起往右走，兩人都進小屋就完成暖身。']};
  const data={level,tape:{"frames":509,"actions":[[125,34],[48,2],[1,6],[39,2],[296,34]]}};
  if(typeof module!=='undefined')module.exports=data;else root.TogetherWarmup=data;
})(globalThis);
