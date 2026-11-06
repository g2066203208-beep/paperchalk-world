/* City scenery: 2D vector art blockouts with original room compositions.
 * Keeps the existing source bedroom, character assets and card combat intact.
 * Designed for dynamic time-of-day tint and replaceable future concept art.
 */
(function(root){
 'use strict';
 const R=(x,y,w,h,c,more='')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'" '+more+'/>';
 const L=(x,y,a,b,c='#515b5b',w=2)=>'<path d="M'+x+' '+y+'L'+a+' '+b+'" stroke="'+c+'" stroke-width="'+w+'" fill="none"/>';
 const P=(coords,c)=>'<polygon points="'+coords+'" fill="'+c+'"/>';
 const T=(x,y,t,size=24,c='#ccd0c7')=>'<text x="'+x+'" y="'+y+'" fill="'+c+'" font-family="sans-serif" font-size="'+size+'">'+t+'</text>';
 const colors=['#a4ada5','#929d95','#c2b8a5','#73837f','#85796c'];
 function floor(base=520,color='#5b625f'){
   let out=R(0,base,1440,810-base,color);
   for(let i=1;i<9;i++){const y=base+Math.pow(i/9,1.5)*(810-base);out+=L(0,y,1440,y,'#ffffff',1).replace('/>',' opacity=".1"/>');}
   for(let i=0;i<15;i++)out+=L(720,base,100*i,810,'#000000',1).replace('/>',' opacity=".08"/>');
   return out;
 }
 function win(x,y,w,h){
   return R(x,y,w,h,'#4d5a5e')+R(x+11,y+11,w-22,h-22,'url(#sky)')+
    R(x+w*.48,y,10,h,'#969e99')+R(x,y+h*.5,w,10,'#969e99')+
    R(x+35,y+h*.47,55,h*.5,'#506268')+R(x+130,y+h*.38,70,h*.6,'#647379');
 }
 function plant(x,y,scale=1){
   let out=R(x-16*scale,y-29*scale,32*scale,32*scale,'#6f6d62');
   out+=L(x,y-29*scale,x,y-103*scale,'#5d6d5f',5*scale);
   for(let i=0;i<7;i++){
     const a=i*2.39,xx=x+Math.cos(a)*39*scale,yy=y-104*scale+Math.sin(a)*32*scale;
     out+='<ellipse cx="'+xx+'" cy="'+yy+'" rx="'+(42*scale)+'" ry="'+(24*scale)+'" fill="'+(i%2?'#5c776c':'#738779')+'"/>';
   }
   return out;
 }
 function school(){
   let out=R(0,0,1440,535,'#aaa99f')+R(0,0,1440,105,'#7f8985');
   out+=R(103,130,492,289,'#576760', 'rx="5" stroke="#555d56" stroke-width="16"')+
     R(120,146,457,259,'#435d56')+
     T(187,211,'本 日 值 日',23,'#e4e3d5')+
     L(142,246,542,246,'#dce0d6',2)+L(142,278,476,278,'#c4d0c6',2)+
     L(142,319,513,319,'#c4d0c6',2);
   out+=win(803,137,449,281)+R(1307,125,125,395,'#728079')+
     R(659,145,128,283,'#bbc0b2')+R(680,154,8,259,'#74847a')+
     R(678,366,45,10,'#76837a')+R(0,510,1440,28,'#909187');
   out+=floor(535,'#66645a');
   for(let row=0;row<3;row++)for(let col=0;col<4;col++){
     const k=.57+row*.24,x=190+col*300,y=489+row*101,w=180*k;
     out+=P((x-w/2)+','+y+' '+(x+w/2)+','+y+' '+(x+w/2-18)+','+(y+34*k)+' '+(x-w/2-18)+','+(y+34*k),'#9b8f79')+
       R(x-w/2+2,y+27*k,w-13,14*k,'#655f52')+
       L(x-w/2+14,y+35*k,x-w/2+3,y+89*k,'#565b52',5)+
       L(x+w/2-13,y+35*k,x+w/2-7,y+88*k,'#565b52',5);
   }
   out+=R(388,437,198,43,'#827668')+R(408,479,16,51,'#565651')+
     R(547,479,16,51,'#565651');
   out+='<circle cx="739" cy="101" r="36" fill="#e2dfd3" stroke="#757c75" stroke-width="7"/>'+
     L(739,101,739,77,'#505753',3)+L(739,101,759,116,'#505753',3);
   return out;
 }
 function store(){
   let out=R(0,0,1440,544,'#b6bcb5')+R(0,0,1440,116,'#87968f')+
      R(0,92,1440,29,'#d1d3c5')+win(1064,133,320,365)+floor(545,'#727a74');
   for(let s=0;s<3;s++){
     const x=60+s*316;out+=R(x,140,280,389,'#69736d')+R(x+7,145,266,370,'#a0a99f');
     for(let row=0;row<4;row++){
       const y=183+row*85;out+=R(x+7,y+52,266,12,'#63726b');
       for(let j=0;j<11;j++){
         const height=22+((j*9+row*7+s*5)%31);
         out+=R(x+17+j*23,y+50-height,16,height,colors[(j+row+s)%5]);
       }
     }
   }
   out+=R(970,515,470,164,'#7f8b82')+
     P('966,501 1440,501 1440,540 976,540','#b5af9f')+
     R(1012,448,153,50,'#3a4a4b')+R(1030,460,112,29,'#9caea4')+
     R(1202,549,187,66,'#607a71')+
     R(1162,156,249,41,'#e0daca')+T(1180,185,'街 区 便 利 店',21,'#586a65')+
     T(1229,588,'24 H',24,'#dfded2');
   return out;
 }
 function cafe(){
   let out=R(0,0,1440,535,'#897e75')+R(0,0,1440,102,'#5e6560')+
     win(63,125,495,373)+R(628,131,750,386,'#a59886');
   for(let i=0;i<6;i++){
     out+=R(644+i*118,175,92,16,'#555d57')+
       R(658+i*118,200,64,43,colors[i%5])+
       R(651+i*118,278,80,13,'#636f66');
   }
   out+=T(720,376,'COFFEE',52,'#eee5d3')+floor(535,'#5e615a')+
     P('480,520 1440,520 1440,566 500,566','#baa891')+
     R(510,566,930,101,'#786d61');
   for(let i=0;i<4;i++){
     const x=806+i*141;
     out+='<ellipse cx="'+x+'" cy="669" rx="49" ry="15" fill="#786f64"/>'+
       R(x-8,680,16,107,'#555e59')+L(x-27,772,x+30,772,'#6b7068',6);
   }
   out+=plant(384,558,.8)+R(1108,367,119,145,'#5a6e67')+
     R(1120,382,97,113,'#9aaea3');
   return out;
 }
 function mall(){
   let out=R(0,0,1440,536,'#a7b3b0')+R(0,0,1440,117,'#64777a');
   for(let i=0;i<9;i++)out+=R(15+i*164,20,146,101,i%2?'#a4b6b5':'#879ca1');
   out+=R(58,153,1324,267,'#778c8c');
   for(let i=0;i<8;i++)out+=R(74+i*163,166,139,241,colors[i%5]);
   out+=R(0,399,1440,28,'#586a69')+R(0,448,1440,68,'#8c9994')+
     floor(540,'#778783')+P('369,537 904,537 1140,810 543,810','#a1a5a0');
   for(let i=0;i<12;i++)out+=L(387+i*16,558+i*20,886+i*18,558+i*20,'#74827d',3);
   out+=R(1114,516,239,120,'#586f6e')+R(1125,526,218,101,'#99afaa')+
     T(1151,592,'B1 — 3F',22,'#f5f1df')+plant(160,685,1.1)+
     plant(1291,747,.83)+T(555,376,'CITY MALL',57,'#f5f1e5');
   return out;
 }
 function park(){
   let out=R(0,0,1440,540,'url(#sky)')+R(0,440,1440,172,'#829788');
   for(let i=0;i<15;i++){
     const x=i*106-18,y=354-(i%4)*17;
     out+=R(x,y,100+(i%3)*26,184+(i%4)*17,
       ['#526b72','#6b7979','#637981'][i%3]);
   }
   out+=R(0,519,1440,291,'#65776a')+
     P('539,515 859,515 1264,810 149,810','#afb2a8')+
     P('594,515 800,515 1033,810 365,810','#bdc0b3');
   const trees=[[-24,541,1.65],[190,489,1.12],[1330,558,1.45],[1504,560,1.55]];
   for(const [x,y,z] of trees){
     out+=R(x-13*z,y-195*z,26*z,195*z,'#5f6156');
     for(let i=0;i<8;i++){
       const angle=i*2.54,xx=x+Math.sin(angle)*68*z,yy=y-205*z+Math.cos(angle)*50*z;
       out+='<ellipse cx="'+xx+'" cy="'+yy+'" rx="'+(71*z)+'" ry="'+(53*z)+'" fill="'+(i%2?'#677f6d':'#577064')+'"/>';
     }
   }
   out+=R(1024,580,199,21,'#746d5f')+R(1032,609,185,18,'#6f695d')+
     L(1045,623,1035,700,'#535a57',8)+L(1199,623,1210,700,'#535a57',8)+
     R(296,508,14,139,'#535f58')+R(278,505,50,22,'#8a9690');
   return out;
 }
 const scenes=Object.freeze({
   school:{label:'学校 · 教室',draw:school},
   convenience:{label:'便利店',draw:store},
   cafe:{label:'咖啡店',draw:cafe},
   mall:{label:'购物商场',draw:mall},
   park:{label:'社区公园',draw:park}
 });
 function markup(id,minute=720){
   const def=scenes[id];if(!def)return null;
   const hour=Math.floor(minute/60);
   const tint=hour>=19?'#1b2635':hour>=17?'#5b6a70':'#a4b5ae';
   const opacity=hour>=19?.42:hour>=17?.15:.04;
   return '<svg class="city-scene-svg" viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice"'+
     ' xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+def.label+'">'+
     '<defs><linearGradient id="sky" x1="0" y1="0" x2=".5" y2="1">'+
     '<stop offset="0" stop-color="#b7c7c6"/><stop offset="1" stop-color="#637b86"/>'+
     '</linearGradient></defs>'+def.draw()+
     R(0,0,1440,810,tint,'opacity="'+opacity+'"')+
     '</svg>';
 }
 root.PaperWorldCityScenes=Object.freeze({scenes,markup});
})(window);
