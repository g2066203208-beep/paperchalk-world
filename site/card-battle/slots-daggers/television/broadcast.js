/* WORK Television network: six animated fictional broadcasts, made for the
 * existing 496x324 CRT texture. Uses the canonical approved game portraits.
 * This is programming INSIDE the 3D set, not a second flat television prop. */
(()=>{'use strict';
const labels=['午夜新闻','WORK 广告','人物访谈','夜间综艺','城市纪录','天气播报'];
const ids=['NEWS','AD','TALK','SHOW','DOC','WEATHER'];
const sources={host:'../../../assets/characters/protagonist-front.webp',guest:'../../../assets/characters/char-002/front.png'};
const actors={},bounds={};let loaded=0,errors=[];
const canvas=document.createElement('canvas');canvas.width=248;canvas.height=162;
const ctx=canvas.getContext('2d',{alpha:false});
const output=document.createElement('canvas');output.width=496;output.height=324;
const out=output.getContext('2d',{alpha:false});
out.imageSmoothingEnabled=false;
for(const [key,url] of Object.entries(sources)){
 const im=new Image();actors[key]=im;
 im.onload=()=>{loaded++;bounds[key]=alphaBounds(im);};
 im.onerror=()=>errors.push('missing portrait: '+url);
 im.src=url;
}
function alphaBounds(im){
 // Only inspect a small canvas once; preserve the original source pixels.
 const c=document.createElement('canvas'),w=128,h=Math.max(1,Math.round(im.naturalHeight*128/im.naturalWidth));
 c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});
 x.drawImage(im,0,0,w,h);const p=x.getImageData(0,0,w,h).data;
 let l=w,t=h,r=0,b=0,found=0;
 for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){
   const i=(y*w+xx)*4;
   if(p[i+3]>55){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,y);b=Math.max(b,y);found++;}
 }
 if(!found)return {x:0,y:0,w:im.naturalWidth,h:im.naturalHeight};
 const k=im.naturalWidth/w;
 return {x:l*k,y:t*k,w:Math.max(1,(r-l+1)*k),h:Math.max(1,(b-t+1)*k)};
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function line(x1,y1,x2,y2,c='#d1ab68',width=1){
 ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1+.5,y1+.5);ctx.lineTo(x2+.5,y2+.5);ctx.stroke();
}
function txt(str,x,y,size=9,color='#f9e6c4',align='left',weight=700){
 ctx.fillStyle=color;ctx.textAlign=align;ctx.font=weight+' '+size+'px "Microsoft YaHei","Noto Sans CJK SC",sans-serif';ctx.fillText(str,x,y);
}
function gradient(top,bottom){
 const g=ctx.createLinearGradient(0,0,0,162);g.addColorStop(0,top);g.addColorStop(1,bottom);
 rect(0,0,248,162,g);
}
function dots(t){
 for(let i=0;i<34;i++){
  const x=(i*71+13)%248,y=(i*43+7)%162;
  const a=.045+.045*Math.sin(t+i);
  rect(x,y,1,1,'rgba(251,216,158,'+a+')');
 }
}
function portrait(key,x,y,w,h,t=0,zoom=1){
 const im=actors[key];if(!im?.complete||!im.naturalWidth)return false;
 const b=bounds[key]||{x:0,y:0,w:im.naturalWidth,h:im.naturalHeight};
 // Broadcast head-and-shoulders crop; no copied face, no AI-redrawn actor.
 const sy=b.y,sh=b.h*.65,sw=b.w,sx=b.x;
 const s=Math.min(w/sw,h/sh)*zoom;
 const dw=sw*s,dh=sh*s;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.translate(Math.round(x+(w-dw)/2+Math.sin(t*.63)*1.0),Math.round(y+h-dh+Math.sin(t*1.3)*1.1));
 ctx.imageSmoothingEnabled=true;ctx.drawImage(im,sx,sy,sw,sh,0,0,dw,dh);ctx.restore();
 return true;
}
function person(key,x,y,w,h,t){
 if(!portrait(key,x,y,w,h,t)){
  // No fake substitute portrait: expose missing assets plainly for QA.
  rect(x,y,w,h,'#141c28');txt('角色加载中',x+w/2,y+h/2,8,'#c8b9a4','center');
 }
}
function network(ch,t){
 rect(0,0,248,15,'#0b1119');rect(0,14,248,1,'#ad8a51');
 txt('W / WORK NETWORK',8,10,8,'#e2ba73');
 txt(ids[ch]+'  ·  '+String(ch+1).padStart(2,'0')+'/06',240,10,7,'#a7c1ce','right');
}
function ticker(t,str){
 rect(0,148,248,14,'#090e15');rect(0,147,248,1,'#ae8c4f');
 const words=str+'   ◆   '+str;const x=248-((t*17)%390);
 txt(words,x,158,7,'#e6d9bc');txt(words,x+400,158,7,'#e6d9bc');
}
function studio(t){
 gradient('#203a47','#10121e');
 for(let i=0;i<17;i++){const x=i*17;rect(x,22,11,102,i%2?'#192a35':'#20313c');rect(x+2,27,2,46,'#304a58');}
 for(let i=0;i<8;i++)line(0,117+i*5,248,117+i*5,'rgba(171,144,105,.12)');
 rect(0,120,248,28,'#121925');rect(0,119,248,2,'#8c6b45');dots(t);
}
function mic(x,y){
 rect(x,y,2,19,'#cdb789');rect(x-3,y-8,8,10,'#222f37');
 rect(x-2,y-6,6,6,'#bbc8bf');rect(x-5,y+17,12,2,'#6f756f');
}
function news(t){
 studio(t);rect(135,25,103,87,'#122430');rect(138,28,97,81,'#22475a');
 const cx=187,cy=66;
 for(let k=0;k<7;k++){const a=k*Math.PI/3.5+t*.08;
 line(cx+Math.cos(a)*17,cy+Math.sin(a)*17,cx+Math.cos(a)*34,cy+Math.sin(a)*31,'#658f9b');}
 txt('NIGHT REPORT',186,50,12,'#f7ddad','center');
 txt('深夜新闻 · 城市特别报道',186,65,8,'#e8e0cf','center');
 txt(['今夜的城市仍在运转','街区故事正在发生','请关注下一期调查'][Math.floor(t/7)%3],186,85,8,'#e1d8c5','center');
 person('host',8,22,120,115,t);rect(0,124,248,23,'#192c3c');
 rect(0,123,64,23,'#b45739');txt('直播新闻',32,138,10,'#fff1db','center');
 txt('主播 · CHAR-001',73,137,9);
 network(0,t);ticker(t,'虚构世界新闻 · 本节目内容属于原创游戏世界观');
}
function advert(t){
 gradient('#292132','#0e1921');
 for(let k=0;k<13;k++){const x=k*24+t*3%24;line(x,26,x+56,144,'rgba(231,176,92,.10)');}
 txt('WORK ORIGINALS',10,35,12,'#f2d19a');
 txt(['质感来自真实的光','每个细节都有重量','让金属与光相遇'][Math.floor(t/5)%3],10,52,9,'#eee0cc');
 const items=['coin','dagger','star'];
 for(let i=0;i<3;i++){
  const x=15+i*52;
  rect(x,73,46,44,'#141823');
  if(window.ReelArt?.face){
   ctx.save();ctx.translate(0,Math.round(Math.sin(t*2+i)*2));
   window.ReelArt.face(ctx,items[i],x+3,76,40,40,{iconOnly:true});ctx.restore();
  }else txt('✦',x+23,104,23,'#ddb970','center');
 }
 person('host',170,31,77,110,t);
 rect(0,123,248,24,'#3a2c25');txt('WORK · ORIGINAL SERIES',9,138,10,'#ffe4ad');
 network(1,t);ticker(t,'原创 WORK 广告 · 金币 / 匕首 / 星辰');
}
function talk(t){
 gradient('#241c30','#0b1923');
 for(let k=0;k<4;k++){const x=16+k*62;rect(x,22,42,97,k%2?'#2b2a3e':'#212d40');}
 rect(5,116,238,27,'#35261f');rect(5,114,238,4,'#ac8658');
 person('host',9,25,96,94,t);person('guest',140,25,100,94,t+.37);
 mic(115,97);txt('午夜访谈',124,28,12,'#e8c38a','center');
 rect(6,124,112,17,'#151d2b');rect(130,124,112,17,'#151d2b');
 txt('主持 · CHAR-001',10,136,8,'#f0d7b6');
 txt('特邀嘉宾 · CHAR-002',135,136,8,'#f0d7b6');
 network(2,t);ticker(t,'对谈 · 城市里不为人知的故事');
}
function show(t){
 gradient('#372338','#101c32');
 const wave=Math.sin(t*2.5);
 for(let k=0;k<6;k++){
  const x=12+k*43;
  ctx.beginPath();ctx.moveTo(x,17);ctx.lineTo(x+Math.sin(t+k)*25,120);ctx.lineTo(x+20+Math.sin(t+k)*25,120);ctx.closePath();
  ctx.fillStyle=k%2?'rgba(224,154,79,.08)':'rgba(100,155,205,.11)';ctx.fill();
 }
 for(let k=0;k<23;k++){const x=(k*47+t*7)%248,y=(k*59+t*(k%3+2))%125+17;rect(x,y,2,3,k%2?'#e5c27f':'#74a9bd');}
 person('host',83,20,84,118,t);
 txt('THE WORK SHOW',124,36,13,'#ffe0a2','center');
 txt('今晚一起开场！',124,52,10,'#e6dee1','center');
 rect(0,120,248,27,'#332333');
 txt('现场互动',14,136,11,'#fbe0a8');
 txt('ROUND '+String(Math.floor(t/6)%3+1),230,136,9,'#fbe0a8','right');
 network(3,t);ticker(t,'综艺舞台 · 主持人现场播报 · 每一轮都有新惊喜');
}
function documentary(t){
 gradient('#111d27','#354750');
 for(let i=0;i<13;i++){const x=i*23-8;rect(x,78+(i%4)*6,18,67,'#1b2e39');rect(x+3,87,3,3,'#bda775');}
 for(let i=0;i<3;i++)line(-20,130+i*10,270,119+i*8,'rgba(229,197,135,.18)');
 person('host',145,35,103,108,t);
 rect(0,23,144,67,'rgba(10,18,26,.68)');
 txt('城市档案',12,43,15,'#eed6aa');
 txt('CITY / FIELD NOTES',12,60,8,'#afc5c7');
 txt(['走进暗处的街角','从一个故事看一座城','寻找被时间隐藏的线索'][Math.floor(t/6)%3],12,79,8,'#f0e6d7');
 network(4,t);ticker(t,'原创纪录片 · 虚构都市的街道与记忆');
}
function weather(t){
 gradient('#162b3a','#254759');
 person('host',4,28,93,110,t);
 rect(100,28,140,105,'#102534');rect(103,31,134,99,'#2c4e5d');
 for(let i=0;i<8;i++){const x=113+i*17;line(x,35,x-10,122,'#3c6674');}
 for(let i=0;i<5;i++)line(105,48+i*16,231,48+i*16,'#3c6674');
 txt('虚构城市 · 天气观察',171,43,9,'#f1d8ad','center');
 const icons=['☀','☁','☂'];const vals=['22°','19°','17°'];
 for(let i=0;i<3;i++){const x=122+i*42;txt(icons[i],x,79,21,'#ffe1a0','center');txt(vals[i],x,99,10,'#e8e4d8','center');txt(['今日','明日','后日'][i],x,113,8,'#bdd0d4','center');}
 rect(0,125,248,21,'#132c38');txt('天气主持 · CHAR-001',9,139,10);
 network(5,t);ticker(t,'游戏世界气象 · 所有数值均为虚构示意');
}
const scenes=[news,advert,talk,show,documentary,weather];
function frame(ch,t){
 const index=((ch%scenes.length)+scenes.length)%scenes.length;
 ctx.clearRect(0,0,248,162);scenes[index](t);
 out.imageSmoothingEnabled=false;out.drawImage(canvas,0,0,496,324);
 return output;
}
window.WorkTVBroadcast=Object.freeze({
 labels,ids,frame,portraitSources:sources,
 status:()=>({channels:labels.length,loadedPortraits:loaded,errors:errors.slice(),hostIsCanonical:!!actors.host?.naturalWidth})
});
})();