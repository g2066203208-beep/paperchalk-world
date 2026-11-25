// Cleaner expressive state machine. Values are continuous and independent.
const FACE=(()=>{
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},lerp=(a,b,t)=>a+(b-a)*t,pi=Math.PI;
 const modes={idle:8,blink:2,wink:2,talk:6,yawn:5,daydream:7,look:6,sleep:9,wake:4,nod:3,shake:3,smile:4,surprise:4,annoyed:4,think:5,sigh:4,sneeze:3,doze:7};
 const pulse=(t,a,b,c,d)=>smooth((t-a)/(b-a))* (1-smooth((t-c)/(d-c)));
 const blink=(t,c)=>pulse(t,c-.11,c-.025,c+.035,c+.17);
 function sample(mode,t,speech='困了……等一下，我还能继续。'){
 let duration=modes[mode]||8;t=((t%duration)+duration)%duration;
 let q={eye:.72,left:0,right:0,gazeX:0,gazeY:0,mouth:0,wide:.70,smile:0,brow:0,yaw:0,pitch:0,roll:0,breath:Math.sin(t*2*pi/3.8),blush:0,viseme:'rest'};
 const e=(a,b,c,d)=>pulse(t,a,b,c,d);
 const close=Math.max(blink(t,1.9),blink(t,5.3),blink(t,7.4));q.eye*=1-close;
 switch(mode){
 case 'idle':q.eye=.10*(1-close);q.yaw=3*Math.sin(t*.65);q.roll=-2+1.2*Math.sin(t*.8);q.smile=.15;break;
 case 'blink':q.eye=.82*(1-Math.max(blink(t,.65),blink(t,1.38)));break;
 case 'wink':q.eye=.82;q.left=e(.35,.50,.94,1.22);q.smile=.65*e(.2,.5,1.1,1.7);q.roll=-5*q.left;break;
 case 'talk':{let chars=Array.from(speech||'困了……'),k=Math.min(chars.length-1,Math.floor(t/.19)),c=chars[k]||'',a=Math.sin(pi*(t/.19%1)),pause=/[，。！？、…,.!?\s]/.test(c)||t>chars.length*.19;let pattern=[['A',.72,.72],['I',.28,1],['U',.56,.35],['E',.48,.85],['O',.82,.40],['M',.03,.8]],v=pattern[(c.charCodeAt(0)||0)%6];q.mouth=pause?0:v[1]*a;q.wide=v[2];q.viseme=pause?'rest':v[0];q.eye=.38*(1-close);q.yaw=3*Math.sin(t*2);q.pitch=-2+2*Math.sin(t*2.5);break}
 case 'yawn':{let v=e(.25,1.3,2.8,4.25);q.eye=.30*(1-v)*(1-close);q.mouth=.82*v;q.wide=.55;q.brow=.35*v;q.pitch=-9*v;q.roll=-3*v;break}
 case 'daydream':q.eye=.76*(1-close);q.gazeX=.6*e(.2,1.1,5.0,6.7);q.gazeY=-.43;q.yaw=12*e(.2,1.6,5.2,6.8);q.roll=-7*e(.2,1.6,5.2,6.8);q.mouth=.10;break;
 case 'look':q.yaw=-18*e(.15,.9,1.65,2.45)+18*e(2.5,3.3,4.4,5.5);q.gazeX=clamp(q.yaw/13,-1,1);q.eye=.80*(1-close);q.pitch=2*Math.sin(t*1.6);break;
 case 'sleep':q.eye=0;q.pitch=12*e(.0,1.5,7.8,8.9)+2*Math.sin(t*1.5);q.roll=-8*e(0,1.7,7.9,9);q.mouth=.11+.055*Math.sin(t*2.2);q.breath*=1.5;break;
 case 'wake':{let v=e(.45,.7,1.3,2.5);q.eye=smooth((t-.35)/.3)*(.9-.38*smooth((t-2)/1.6));q.mouth=.40*v;q.pitch=10*(1-smooth((t-.4)/.4))-4*v;q.brow=v;break}
 case 'nod':q.pitch=9*Math.sin(t*2*pi/1.3)*e(.05,.3,2.3,2.95);q.eye=.45*(1-close);break;
 case 'shake':q.yaw=14*Math.sin(t*2*pi/1.3)*e(.05,.3,2.3,2.95);q.eye=.5*(1-close);q.brow=-.25;break;
 case 'smile':q.smile=e(.15,.7,3.1,3.9);q.eye=.50*(1-q.smile)*(1-close);q.blush=.8*q.smile;q.mouth=.26*q.smile;break;
 case 'surprise':{let v=e(.2,.48,2.4,3.8);q.eye=.48+.3*v;q.brow=v;q.mouth=.65*v;q.wide=.43;q.pitch=-5*v;break}
 case 'annoyed':q.eye=.38*(1-close);q.brow=-.8*e(.1,.5,3.3,3.9);q.smile=-.65;q.gazeX=-.5;q.yaw=-7;break;
 case 'think':q.eye=.74*(1-close);q.gazeX=.6;q.gazeY=-.7;q.roll=9*e(.1,.6,4.1,4.9);q.yaw=7;q.smile=-.15;q.mouth=.09;break;
 case 'sigh':{let v=e(.3,1.05,2.5,3.8);q.eye=.5*(1-v);q.mouth=.32*v;q.wide=.37;q.pitch=6*v;q.breath=Math.sin(t*1.7)*1.3;break}
 case 'sneeze':{let v=e(.45,.85,1.05,1.18);q.eye=.6*(1-v);q.mouth=.65*v;q.pitch=-6*v+10*e(1.12,1.18,1.36,1.8);q.brow=-.4*v;break}
 case 'doze':{let v=e(.3,1.9,4.8,5.5),j=e(5.1,5.3,5.7,6.4);q.eye=.25*(1-v)+.65*j;q.pitch=14*v-5*j;q.roll=-6*v;q.mouth=.09*v;break}
 }q.mode=mode;return q;
 }
 const sequence=['idle','daydream','look','yawn','idle','doze','wake','smile','sigh','sleep'];
 function auto(t){let total=sequence.reduce((s,k)=>s+modes[k],0),u=((t%total)+total)%total;for(const k of sequence){if(u<modes[k])return {mode:k,t:u};u-=modes[k]}return {mode:'idle',t:0}}
 // The eye and mouth channels are individually composited into the original UV map.
 // Hand-authored pixel sprite layers on a 128x128 grid, scaled nearest-neighbour to 256.
 // All shapes are tiny and warm; no black cavities, teeth, or large white eyes.
// V03: fixed authored pixel cels, no runtime eye/mouth shape generation.
// Transparent dots keep the underlying face skin. Every cel has an invariant anchor.
const EYES={
 closed:["...............","...............","...............","...............","...............","...............","..k.........k..","...kk.....kk...",".....kkkkk.....","...............","..............."],
 sleepy:["...............","...............","...............","...............",".kkkkkkkkkkkkk.","..kdddddiddk...","...diilllid....","....llllll.....","...............","...............","..............."],
 half:["...............","...............","...............","..kkkkkkkkkkk..",".kkdddddidddkk.","..kddhhdddiwk..","..wddiiiiiww...","...wiiilllw....",".....llll......","...............","..............."],
 open:["...............","....kkkkkkk....","..kkdddddddkk..",".kkddhddddddkk.","..wddhhdddddkw.","..wdddddiddiw..","..wddiiiiiilw..","...wiiillllw...","....wlllllw....",".....sssss.....","..............."],
 happy:["...............","...............","...............",".....kkkkk.....","...kk.....kk...","..k.........k..",".s...........s.","...............","...............","...............","..............."],
 annoyed:["...............","...............","..kk...........","....kk.........","......kkkkkkkk.","..kdddddddddkk.","...ddiiiiiid...","....illllli....","...............","...............","..............."],
 left:["...............","....kkkkkkk....","..kkdddddddkk..",".kkdhdddddwwkk.","..kdhhdddiwww..","..kdddddiiwww..","..wddiiillwww..","...wiiilllww...","....wllllww....",".....sssss.....","..............."],
 right:["...............","....kkkkkkk....","..kkdddddddkk..",".kkwwddhddddkk.","..wwwddhhdddk..","..wwwiddddddk..","..wwwlliiiddw..","...wwllliiiw...","....wwllllw....",".....sssss.....","..............."],
 up:["...............","....kkkkkkk....","..kkdhdddddkk..",".kkddhhdddddkk.","..wdddddddddw..","..wiiiiiilllw..","..wwlllllllww..","...wwwwwwwww...","....wwwwwww....",".....sssss.....","..............."],
};
const MOUTHS={
 rest:[".........",".........",".........","...sks...",".........",".........","........."],
 smile:[".........",".........","..s...s..","...kkk...",".........",".........","........."],
 small:[".........",".........","...kkk...","...kpk...","....p....",".........","........."],
 A:[".........","..kkkkk..",".krrrppk.",".krrrrpk.","..kpppk..","...kkk...","........."],
 I:[".........",".........",".kkkkkkk.",".ktttttk.","..kpppk..",".........","........."],
 U:[".........","...kkk...","..krrk...","..krpk...","...kkk...",".........","........."],
 E:[".........",".........","..kkkkk..",".ktttttk.","..kpppk..","...kkk...","........."],
 O:[".........","...kkk...","..krrrk..","..krrrk..","..kpppk..","...kkk...","........."],
 M:[".........",".........",".........","..skkks..",".........",".........","........."],
 yawn:["..kkkkk..",".krrrrrk.","krrrrrrrk","krrrrrrrk","krppppprk",".kpppppk.","..kkkkk.."],
 grin:[".........",".........",".k.....k.",".kkkkkkk.","..kpppk..","...kkk...","........."],
 pout:[".........",".........","....s....","...ksk...",".........",".........","........."],
};
const COLORS={k:[105,65,62],s:[169,111,101],d:[129,84,72],i:[164,108,84],l:[199,141,108],h:[250,220,182],w:[252,232,215],r:[157,86,86],p:[231,153,145],t:[253,219,202]};
function frames(q){
 const pick=(v,mirror)=>{
   if(v<.18)return q.smile>.55?'happy':'closed';
   if(q.mode==='annoyed')return 'annoyed';
   if(v<.43)return 'sleepy';
   if(v<.68)return 'half';
   if(q.gazeX<-.28)return 'left';
   if(q.gazeX>.28)return 'right';
   if(q.gazeY<-.3)return 'up';
   return 'open';
 };
 let mouth='rest';
 if(q.mode==='talk'&&q.viseme!=='rest'&&q.mouth>=.10)mouth=MOUTHS[q.viseme]?q.viseme:'A';
 else if(q.mode==='yawn'&&q.mouth>.52)mouth='yawn';
 else if(q.smile>.55)mouth=q.mouth>.16?'grin':'smile';
 else if(q.mode==='annoyed')mouth='pout';
 else if(q.mouth>.46)mouth='O';
 else if(q.mouth>.12)mouth='small';
 return {left:pick(q.eye*(1-q.left),true),right:pick(q.eye*(1-q.right),false),mouth};
}
const textureCache=new Map();
let lastBase=null;
function texture(base,q){
 if(lastBase!==base){textureCache.clear();lastBase=base;}
 const f=frames(q),blush=q.blush>.5, key=[f.left,f.right,f.mouth,blush].join(':');
 if(textureCache.has(key))return textureCache.get(key);
 const d=new Uint8ClampedArray(base),skin=[255,222,205];
 function put(x,y,c){x*=2;y*=2;if(x<0||y<0||x>254||y>254)return;for(let j=0;j<2;j++)for(let i=0;i<2;i++){let p=((y+j)*256+x+i)*4;d[p]=c[0];d[p+1]=c[1];d[p+2]=c[2];d[p+3]=255;}}
 function rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c)}
 function cel(rows,cx,cy,flip=false){let w=rows[0].length, h=rows.length;rows.forEach((row,j)=>{if(row.length!==w)throw Error('inconsistent cel width');for(let i=0;i<w;i++){let c=COLORS[row[flip?w-1-i:i]];if(c)put(cx+i-(w>>1),cy+j-(h>>1),c)}})}
 rect(17,60,41,37,skin);rect(70,60,41,37,skin);rect(51,94,26,15,skin);
 for(let [cx,name,flip] of [[39,f.left,true],[89,f.right,false]]){
   cel(EYES[name],cx,79,name==='annoyed'&&flip);
   for(let k=-2;k<=2;k++){put(cx+k,68,[185,132,116]);if(blush||k%2===0)put(cx+k,89,blush?[246,179,165]:[250,205,188]);}
 }
 rect(63,90,2,2,[240,193,176]);put(64,89,[247,208,190]);
 cel(MOUTHS[f.mouth],64,101);
 if(textureCache.size>=64)textureCache.delete(textureCache.keys().next().value);
 textureCache.set(key,d);return d;
}

 // Head transform acts on original face AND all independent hair/ears. Neck transition
 // is weighted; scarf is left attached to the torso. No geometry is replaced.
 function pose(model,rest,q,ears){let hair=new Set();model.polygons.forEach((f,i)=>{if(model.mats[i].startsWith('hair'))f.forEach(k=>hair.add(k))});const p0=[0,2.12,0],ang=[q.pitch,q.yaw,q.roll].map(x=>x*pi/180);
 function head(p,w=1){let [x,y,z]=p.map((v,i)=>v-p0[i]),[a,b,c]=ang.map(v=>v*w),u=y*Math.cos(a)-z*Math.sin(a);z=y*Math.sin(a)+z*Math.cos(a);y=u;u=x*Math.cos(b)+z*Math.sin(b);z=-x*Math.sin(b)+z*Math.cos(b);x=u;u=x*Math.cos(c)-y*Math.sin(c);y=x*Math.sin(c)+y*Math.cos(c);x=u;return [x+p0[0],y+p0[1],z+p0[2]]}
 function breathe(p){let k=smooth((p[1]-.6)/1.48);return [p[0],p[1]+q.breath*.008*k,p[2]+q.breath*.004*k]}
 let positions=model.positions.map((p,i)=>{let w=i<model.baseCount?smooth((rest[i][1]-2.05)/.15):(hair.has(i)?1:0);return breathe(w?head(p,w):p)});
 let modules=Object.fromEntries(Object.entries(ears).map(([k,m])=>[k,{...m,positions:m.positions.map(p=>breathe(head(p)))}]));return {model:{...model,positions},modules}
 }
 return {sample,auto,texture,pose,modes,sequence,frames,EYES,MOUTHS,COLORS};
})();