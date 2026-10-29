/**
 * Hand-composed opening street for Night Harbor, 7 September 1998.
 *
 * Unlike the nationwide procedural prototype, this location is art-directed:
 * silhouettes, building footprints, navigable negative space and street props
 * are authored together. Uses the same world coordinates and interior IDs as
 * the real walking engine; this is NOT a screenshot or decorative overlay.
 *
 * View is 960x600 game metres, rendered into a 480x300 nearest-neighbour canvas.
 */
export const OLD_HARBOR_CELL=Object.freeze({x:125,y:112});
export const isOldHarborCell=(x,y)=>x===OLD_HARBOR_CELL.x&&y===OLD_HARBOR_CELL.y;

/** Architectural arrangement deliberately avoids the repetitive national 6x4 grid. */
const SITES=[
 ['post','旧港邮电局',222,30,150,118,2,'civic'],
 ['clock','钟楼市政厅',396,80,186,78,3,'clock'],
 ['cafe','海鸥咖啡馆',602,34,157,120,2,'cafe'],
 ['books','旧港书店',790,49,138,109,2,'shop'],
 ['market','港湾杂货铺',22,239,144,102,2,'shop'],
 ['press','旧港报社',243,266,143,101,3,'press'],
 ['diner','船工食堂',788,255,147,110,2,'diner'],
 ['clinic','旧港诊所',32,443,153,99,2,'civic'],
 ['tailor','青潮裁缝铺',248,454,149,88,2,'shop'],
 ['home','老街公寓',462,440,162,103,4,'home'],
 ['warehouse','港口仓库',783,436,146,107,2,'warehouse']
];
export function oldHarborBuildings(){
 return SITES.map(([key,name,x,y,w,h,floors,style],i)=>({
  id:'building-125-112-curated-'+key,name,region:'region-0',
  x,y,w,h,doorX:x+Math.floor(w/2),doorY:y+h+14,floors,
  tint:'#aa9884',street:'旧港'+(['北街','钟楼路','河滨街','南街'][Math.min(3,Math.floor(i/3))])+' · '+(i+1)+'号',
  worldX:125,worldY:112,style,curated:true
 }));
}
export const OLD_HARBOR_WALKERS=Object.freeze([
 [102,198],[306,202],[464,207],[682,208],[850,210],
 [72,382],[279,393],[416,379],[563,371],[685,362],
 [101,558],[301,564],[546,558],[685,559],[906,558],
 [410,270],[620,281],[697,326],[441,343]
]);
const C={
 ink:'#253a43',shadow:'#1e3540',road:'#53666a',roadDeep:'#364d58',
 plaster:'#dec7a8',stucco:'#b4ac95',brick:'#b87068',brickDark:'#885f60',
 wood:'#775f59',roof:'#785b57',tile:'#a56f62',window:'#7ca5aa',
 gold:'#e9c487',cream:'#f1d7a7',leaf:'#4e7765',leafLight:'#80a18a',
 water:'#437987',waterLight:'#93bec1',paving:'#b8b19b'
};
const snap=v=>Math.floor(v/4)*4;
const q=(c,x,y,w,h,t)=>{
 const X=snap(x),Y=snap(y),W=Math.max(4,snap(w)),H=Math.max(4,snap(h));
 c.fillStyle=t;c.fillRect(X,Y,W,H);
};
const dots=(c,x,y,count,seed,color)=>{
 for(let i=0;i<count;i++){
  const a=((seed*37+i*71+i*i*19)%997)/997,b=((seed*53+i*41+i*i*7)%991)/991;
  q(c,x+a*68,y+b*36,4,4,color);
 }
};
function words(c,label,x,y,max=130,color=C.cream,size=14){
 c.save();c.textAlign='center';c.textBaseline='middle';c.font='bold '+size+'px sans-serif';
 c.lineWidth=3;c.strokeStyle=C.ink;c.strokeText(label,x,y,max);
 c.fillStyle=color;c.fillText(label,x,y,max);c.restore();
}
function sidewalk(c,x,y,w,h){
 q(c,x,y,w,h,C.paving);
 for(let yy=y;yy<y+h;yy+=22){
  q(c,x,yy,w,4,'#c9bfa6');
  for(let xx=x+((Math.floor((yy-y)/22)%2)*24);xx<x+w;xx+=48)
    q(c,xx,yy+4,4,18,'#9c9f91');
 }
}
function cobbles(c,x,y,w,h){
 q(c,x,y,w,h,'#a3a38f');
 for(let yy=y;yy<y+h;yy+=16){
  q(c,x,yy,w,4,'#b9b59e');
  for(let xx=x+((yy/16|0)%2)*12;xx<x+w;xx+=30)q(c,xx,yy+4,4,12,'#8b9288');
 }
}
function road(c,x,y,w,h,vertical=false){
 q(c,x,y,w,h,C.roadDeep);
 q(c,x+4,y+4,w-8,h-8,C.road);
 if(vertical){
  for(let yy=y+14;yy<y+h-12;yy+=44){
   q(c,x+w/2-2,yy,4,22,'#cfbd95');
  }
 }else{
  for(let xx=x+12;xx<x+w-28;xx+=69)q(c,xx,y+h/2,36,4,'#d4c39b');
 }
 q(c,x,y,vertical?5:w,vertical?h:5,'#d7c6a6');
 q(c,vertical?x+w-6:x,vertical?y:y+h-7,vertical?6:w,vertical?h:7,'#8a8980');
}
function crossing(c,x,y,vertical=false){
 for(let i=0;i<6;i++){
  if(vertical)q(c,x+i*13,y,8,45,'#f2deb3');
  else q(c,x,y+i*9,43,5,'#f2deb3');
 }
}
function tree(c,x,y,seed=0){
 q(c,x-6,y-35,12,48,C.ink);q(c,x-2,y-35,4,44,'#a58062');
 q(c,x-28,y-68,56,43,'#385f55');
 q(c,x-22,y-80,44,27,C.leaf);
 q(c,x-34,y-61,68,27,C.leaf);
 q(c,x-17,y-86,35,14,C.leafLight);
 for(let i=0;i<9;i++)q(c,x-24+(i*17+seed*3)%48,y-65+(i*11+seed)%29,6,5,'#799d7c');
 q(c,x-30,y+9,60,7,'#8b8b74');
}
function light(c,x,y){
 q(c,x-6,y-46,12,48,C.ink);q(c,x-2,y-42,4,42,'#9b8270');
 q(c,x-12,y-59,25,13,C.ink);q(c,x-8,y-55,17,14,C.gold);
 q(c,x-13,y-61,27,5,'#3b4b4c');q(c,x-14,y,28,6,C.ink);
}
function bench(c,x,y){
 q(c,x-2,y+11,49,4,'#304953');
 for(let k=0;k<3;k++)q(c,x,y+k*6,44,4,'#97745e');
 q(c,x+7,y+16,4,12,C.ink);q(c,x+37,y+16,4,12,C.ink);
}
function planter(c,x,y,seed){
 q(c,x-19,y+4,38,14,C.ink);q(c,x-15,y+4,30,9,'#c39d75');
 for(let k=0;k<7;k++){
  const dx=(k*11+seed)%26-13;
  q(c,x+dx,y-10-(k%3)*5,12,18,k%2?C.leafLight:C.leaf);
 }
}
function sign(c,b){
 const center=b.x+b.w/2;
 q(c,center-b.w*.39,b.y+b.h-42,b.w*.78,21,C.ink);
 q(c,center-b.w*.36,b.y+b.h-38,b.w*.72,15,
  b.style==='cafe'?'#67847c':b.style==='civic'?'#557780':b.style==='clock'?'#725961':'#966c61');
 const short=b.name.length>6?b.name.slice(0,6):b.name;
 words(c,short,center,b.y+b.h-30,b.w*.65);
}
function facade(c,b,i){
 const {x,y,w,h,style}=b;
 const roof=style==='clock'?'#3d6470':style==='warehouse'?'#52626b':
  style==='civic'?'#74777b':style==='cafe'?'#5c807b':style==='home'?'#8d6260':
  style==='press'?'#646a6a':'#926e63';
 const wall=style==='civic'?'#c7c4af':style==='warehouse'?'#a49f8e':
  style==='clock'?'#c8b29a':style==='cafe'?'#b7b49a':
  style==='press'?'#b2aa9a':style==='home'?'#c69f86':'#c4a58e';
 q(c,x+11,y+13,w+7,h+9,'#2339456c');
 q(c,x-8,y-12,w+13,h+18,C.ink);
 q(c,x+4,y-6,w-4,h+5,wall);
 q(c,x+w-18,y+4,18,h-1,'#766f6a');
 // Different rooftop volumes, but a consistent 3/4 projection and pixel grid.
 q(c,x-14,y-24,w+26,20,C.ink);
 q(c,x-10,y-20,w+18,14,roof);
 q(c,x-6,y-12,w+12,10,'#4f5860');
 for(let xx=x+10;xx<x+w-6;xx+=18)q(c,xx,y-20,8,4,'#d4a183');
 // Brick or plaster course variations; don't put noisy patterns everywhere.
 for(let row=0;row<4;row++){
  for(let col=0;col<5;col++){
   const px=x+11+col*27+(row%2)*8,py=y+13+row*16;
   if(px<x+w-22&&py<y+h-41&&(col+row+i)%3===0)
     q(c,px,py,14,4,style==='warehouse'?'#858e8b':'#dbb79a');
  }
 }
 const windowY=y+18;
 for(let k=0;k<(w>145?3:2);k++){
  const wx=x+12+k*(w>145?43:52);
  q(c,wx-4,windowY-4,30,39,C.ink);
  q(c,wx,windowY,21,29,'#436f7d');
  q(c,wx+4,windowY+4,7,12,C.window);
  q(c,wx+13,windowY+4,4,12,'#9cbcb8');
  q(c,wx,windowY+17,21,4,'#273d47');
  q(c,wx-6,windowY+31,34,5,C.plaster);
 }
 const door=b.doorX-12;
 q(c,door-5,y+h-36,33,43,C.ink);
 q(c,door,y+h-31,23,37,style==='cafe'?'#5b867f':style==='clock'?'#656a7c':'#665b60');
 q(c,door+15,y+h-12,4,4,C.gold);
 q(c,door-9,y+h+6,42,6,'#ab9f88');
 // Variants are architectural, rather than every building receiving the same shop awning.
 if(['shop','cafe','diner'].includes(style)){
  q(c,x+6,y+h-41,37,30,C.ink);
  q(c,x+11,y+h-35,26,20,'#67949a');
  q(c,x+13,y+h-18,22,5,'#daba8b');
  q(c,x+4,y+h-46,45,10,'#a85f58');
  for(let j=0;j<5;j++)q(c,x+4+j*9,y+h-46,5,10,'#efcc9f');
 }
 if(style==='warehouse'){
  q(c,x+12,y+h-46,34,45,C.ink);
  q(c,x+16,y+h-43,25,41,'#687e7c');
  for(let k=0;k<4;k++)q(c,x+16,y+h-38+k*10,25,4,'#a2a99a');
  q(c,x+12,y-39,40,13,'#435660');
 }
 if(style==='home'){
  for(let k=0;k<2;k++){
   q(c,x+11+k*39,y-42,33,23,C.ink);
   q(c,x+15+k*39,y-38,25,16,'#7d9494');
  }
  q(c,x+w-35,y+38,23,12,'#5a7969');
  q(c,x+w-30,y+30,13,10,'#7a9b7b');
 }
 if(style==='clock'){
  // Clock tower is the scene focal point: high contrast silhouette at the north edge.
  const tx=x+w/2-35;
  q(c,tx-9,y-69,85,56,C.ink);
  q(c,tx-4,y-65,75,50,'#c9b99f');
  q(c,tx-17,y-77,99,14,C.ink);
  q(c,tx-13,y-73,91,8,'#5a7479');
  q(c,tx+23,y-62,27,27,C.ink);
  q(c,tx+27,y-58,19,19,C.gold);
  q(c,tx+35,y-54,3,11,C.ink);
  q(c,tx+34,y-50,9,3,C.ink);
  q(c,tx+28,y-32,19,15,'#507786');
  q(c,tx+32,y-28,11,7,'#a8bec0');
 }
 if(style==='press')q(c,x+w-29,y+h-59,25,26,'#dcceaf');
 if(style==='civic'){
  q(c,x+w-29,y+h-64,19,20,'#eadcc5');
  q(c,x+w-22,y+h-61,5,14,'#b96261');
  q(c,x+w-26,y+h-57,14,5,'#b96261');
 }
 sign(c,b);
}
function streetProps(c){
 // Riverside walk and park on the left: purposeful empty space next to spawn.
 q(c,0,0,24,600,C.water);
 q(c,8,0,16,600,C.waterLight);
 for(let yy=13;yy<600;yy+=44)q(c,7,yy,8,20,'#d3e1d5');
 q(c,24,0,9,600,'#5e6b64');
 q(c,30,0,5,600,'#dcc9a8');
 for(let yy=15;yy<600;yy+=70)q(c,24,yy,12,7,C.ink);
 // Gateway garden and memorable large trees.
 q(c,50,28,124,133,'#8caa87');
 q(c,55,34,114,121,'#799b7b');
 cobbles(c,103,75,30,77);
 tree(c,70,104,1);tree(c,160,120,3);
 bench(c,79,131);
 planter(c,125,60,11);
 // Central square, fountain, gathering space, focal visual landmark.
 cobbles(c,409,255,329,130);
 q(c,433,281,278,82,'#a7ac96');
 for(let k=0;k<4;k++){
  q(c,435+k*72,260,38,5,'#d9c7a5');
  q(c,435+k*72,370,38,5,'#d9c7a5');
 }
 q(c,535,289,89,60,C.ink);
 q(c,543,293,74,51,'#d8c5a8');
 q(c,551,301,58,35,C.water);
 q(c,559,309,42,19,'#85b6b3');
 q(c,579,285,8,44,'#dcd1b6');
 q(c,569,287,27,8,'#ebe1c5');
 q(c,572,282,20,5,'#a4bfc0');
 q(c,561,319,34,4,'#daeee0');
 bench(c,443,311);bench(c,660,313);
 planter(c,423,276,3);planter(c,719,280,7);
 // Street furniture is placed in accessible, visible public-space corners.
 light(c,203,181);light(c,779,178);light(c,407,393);
 light(c,735,393);light(c,214,553);
 q(c,52,375,58,10,C.ink);q(c,57,371,48,7,'#cfa578');
 words(c,'市集',81,375,44,C.cream,11);
 for(let j=0;j<3;j++){
  const xx=95+j*47;
  q(c,xx,382,38,8,C.ink);
  q(c,xx-4,375,45,13,j%2?'#ad665e':'#668780');
  for(let k=0;k<4;k++)q(c,xx+k*11-4,375,5,12,'#edd3a8');
  q(c,xx+5,392,31,10,'#a78a72');
 }
 // Bus stop and railway-era utility lines; 1998 civic identity.
 q(c,831,173,76,8,C.ink);
 q(c,839,145,61,28,'#557982');
 words(c,'旧港站',870,157,56,C.cream,12);
 q(c,840,180,6,22,C.ink);q(c,894,180,6,22,C.ink);
 q(c,857,178,32,4,C.gold);
 for(let xx=23;xx<960;xx+=156)q(c,xx,229,4,12,'#283f49');
 // Postal board, paper adverts and small details that explain the district.
 q(c,705,248,35,47,C.ink);
 q(c,710,252,25,39,'#d3c5a5');
 q(c,713,257,17,5,'#9b5d59');
 q(c,713,268,14,4,'#8a9086');
 q(c,713,278,18,4,'#6c918d');
}
export function paintOldHarborPlaza(c,{buildings}){
 // Background hierarchy: quiet stone ground, two traffic bands, authored facades.
 q(c,0,0,960,600,'#a6a796');
 sidewalk(c,35,0,925,600);
 road(c,36,190,924,48);
 road(c,36,402,924,38);
 road(c,186,159,40,441,true);
 road(c,744,155,39,445,true);
 crossing(c,174,192,true);crossing(c,731,402,true);
 crossing(c,185,310,false);crossing(c,748,301,false);
 streetProps(c);
 for(let i=0;i<buildings.length;i++)facade(c,buildings[i],i);
 // Foreground details and view framing; leave doors and movement lanes clear.
 q(c,40,556,146,7,'#7c806f');q(c,245,566,145,7,'#7c806f');
 q(c,461,558,163,7,'#7c806f');
 for(const [x,y] of [[57,356],[367,251],[661,378],[916,378],[925,569]]){
  q(c,x,y,16,13,C.ink);q(c,x+4,y+3,9,6,'#a17f68');
 }
}
