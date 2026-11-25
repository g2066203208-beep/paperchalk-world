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
 case 'idle':q.eye=.08*(1-close);q.yaw=3*Math.sin(t*.65);q.roll=-2+1.2*Math.sin(t*.8);q.smile=.15;break;
 case 'blink':q.eye=.65*(1-Math.max(blink(t,.65),blink(t,1.38)));break;
 case 'wink':q.eye=.82;q.left=e(.35,.50,.94,1.22);q.smile=.65*e(.2,.5,1.1,1.7);q.roll=-5*q.left;break;
 case 'talk':{let chars=Array.from(speech||'困了……'),k=Math.min(chars.length-1,Math.floor(t/.19)),c=chars[k]||'',a=Math.sin(pi*(t/.19%1)),pause=/[，。！？、…,.!?\s]/.test(c)||t>chars.length*.19;let pattern=[['A',.72,.72],['I',.28,1],['U',.56,.35],['E',.48,.85],['O',.82,.40],['M',.03,.8]],v=pattern[(c.charCodeAt(0)||0)%6];q.mouth=pause?0:v[1]*a;q.wide=v[2];q.viseme=pause?'rest':v[0];q.eye=.38*(1-close);q.yaw=3*Math.sin(t*2);q.pitch=-2+2*Math.sin(t*2.5);break}
 case 'yawn':{let v=e(.25,1.3,2.8,4.25);q.eye=.30*(1-v)*(1-close);q.mouth=.82*v;q.wide=.55;q.brow=.35*v;q.pitch=-9*v;q.roll=-3*v;break}
 case 'daydream':q.eye=.40*(1-close);q.gazeX=.6*e(.2,1.1,5.0,6.7);q.gazeY=-.43;q.yaw=12*e(.2,1.6,5.2,6.8);q.roll=-7*e(.2,1.6,5.2,6.8);q.mouth=.10;break;
 case 'look':q.yaw=-18*e(.15,.9,1.65,2.45)+18*e(2.5,3.3,4.4,5.5);q.gazeX=clamp(q.yaw/13,-1,1);q.eye=.58*(1-close);q.pitch=2*Math.sin(t*1.6);break;
 case 'sleep':q.eye=0;q.pitch=12*e(.0,1.5,7.8,8.9)+2*Math.sin(t*1.5);q.roll=-8*e(0,1.7,7.9,9);q.mouth=.11+.055*Math.sin(t*2.2);q.breath*=1.5;break;
 case 'wake':{let v=e(.45,.7,1.3,2.5);q.eye=smooth((t-.35)/.3)*(.9-.38*smooth((t-2)/1.6));q.mouth=.40*v;q.pitch=10*(1-smooth((t-.4)/.4))-4*v;q.brow=v;break}
 case 'nod':q.pitch=9*Math.sin(t*2*pi/1.3)*e(.05,.3,2.3,2.95);q.eye=.45*(1-close);break;
 case 'shake':q.yaw=14*Math.sin(t*2*pi/1.3)*e(.05,.3,2.3,2.95);q.eye=.5*(1-close);q.brow=-.25;break;
 case 'smile':q.smile=e(.15,.7,3.1,3.9);q.eye=.24*(1-q.smile)*(1-close);q.blush=.8*q.smile;q.mouth=.26*q.smile;break;
 case 'surprise':{let v=e(.2,.48,2.4,3.8);q.eye=.48+.3*v;q.brow=v;q.mouth=.65*v;q.wide=.43;q.pitch=-5*v;break}
 case 'annoyed':q.eye=.38*(1-close);q.brow=-.8*e(.1,.5,3.3,3.9);q.smile=-.65;q.gazeX=-.5;q.yaw=-7;break;
 case 'think':q.eye=.45*(1-close);q.gazeX=.6;q.gazeY=-.7;q.roll=9*e(.1,.6,4.1,4.9);q.yaw=7;q.smile=-.15;q.mouth=.09;break;
 case 'sigh':{let v=e(.3,1.05,2.5,3.8);q.eye=.5*(1-v);q.mouth=.32*v;q.wide=.37;q.pitch=6*v;q.breath=Math.sin(t*1.7)*1.3;break}
 case 'sneeze':{let v=e(.45,.85,1.05,1.18);q.eye=.6*(1-v);q.mouth=.65*v;q.pitch=-6*v+10*e(1.12,1.18,1.36,1.8);q.brow=-.4*v;break}
 case 'doze':{let v=e(.3,1.9,4.8,5.5),j=e(5.1,5.3,5.7,6.4);q.eye=.25*(1-v)+.65*j;q.pitch=14*v-5*j;q.roll=-6*v;q.mouth=.09*v;break}
 }return q;
 }
 const sequence=['idle','daydream','look','yawn','idle','doze','wake','smile','sigh','sleep'];
 function auto(t){let total=sequence.reduce((s,k)=>s+modes[k],0),u=((t%total)+total)%total;for(const k of sequence){if(u<modes[k])return {mode:k,t:u};u-=modes[k]}return {mode:'idle',t:0}}
 // The eye and mouth channels are individually composited into the original UV map.
 // Hand-authored pixel sprite layers on a 128x128 grid, scaled nearest-neighbour to 256.
 // All shapes are tiny and warm; no black cavities, teeth, or large white eyes.
 function texture(base,q){
 const d=new Uint8ClampedArray(base),skin=[255,222,205],ink=[99,61,55],soft=[147,91,80],iris=[141,89,72],dark=[102,63,55],shine=[245,210,181],white=[246,223,207],pink=[232,167,151];
 function put(x,y,c){x=Math.round(x)*2;y=Math.round(y)*2;if(x<0||y<0||x>254||y>254)return;for(let j=0;j<2;j++)for(let i=0;i<2;i++)d.set([...c,255],((y+j)*256+x+i)*4)}
 function rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c)}
 // clear the entire previous facial feature region, including the baked old lashes
 rect(17,60,41,37,skin);rect(70,60,41,37,skin);rect(51,94,26,15,skin);
 for(let j=0;j<2;j++){
 let cx=j?89:39,op=clamp(q.eye*(1-(j?q.right:q.left))),cy=80;
 // Four discrete, deliberately authored eyelid stages. A blink has a soft crescent.
 let stage=op<.20?0:op<.43?1:op<.68?2:3,sg=j?1:-1;
 if(stage===0){
   for(let x=-9;x<=9;x++){let u=x/9,y=cy-Math.round(3*(1-u*u))+Math.round(sg*u*1.3);put(cx+x,y,ink);if(Math.abs(x)<7)put(cx+x,y+1,ink)}
   put(cx+sg*9,cy+1,soft);
 }else{
   // upper lash, tiny warm sclera corners and a broad low-contrast iris
   const height=[0,3,5,7][stage],gx=Math.round(q.gazeX*2),gy=Math.round(q.gazeY);
   for(let x=-9;x<=9;x++){let u=x/9,arc=Math.sqrt(Math.max(0,1-u*u)),top=cy-Math.round(height*arc),bot=cy+Math.round((stage===1?2:4)*arc);
     for(let y=top;y<=bot;y++){let xx=x-gx,yy=y-cy-gy;let c=Math.abs(xx)<=6?iris:white;if(Math.abs(xx)<=3&&yy<=1)c=dark;if(yy>=2&&Math.abs(xx)<=5)c=[183,122,95];if(xx===-2&&yy===-2&&stage>=2)c=shine;put(cx+x,y,c)}
     put(cx+x,top,ink);if(Math.abs(x)<7)put(cx+x,top+1,ink);if(Math.abs(x)<7&&stage>=2)put(cx+x,bot,soft);
   }
 }
 // short eyebrows, mostly concealed by bangs; no harsh lines
 for(let x=-5;x<=5;x++)put(cx+x,68-Math.round(q.brow*1.5)+Math.round(Math.abs(x)*.14),[172,119,103]);
 // tiny dithered blush, present even in neutral state
 let v=.25+q.blush*.75;let bl=[255,Math.round(222-27*v),Math.round(205-16*v)];
 for(let k=-3;k<=3;k++){put(cx+k,89,bl);if(k%2===0)put(cx+k,90,bl)}
 }
 // Nose is a tiny warm pixel cluster rather than a hard mark.
 rect(63,90,2,2,[240,193,176]);put(64,89,[247,208,190]);
 const cy=101,open=q.mouth,sm=q.smile;
 if(open<.12){if(sm>.35){put(62,cy-1,soft);put(63,cy,ink);put(64,cy,ink);put(65,cy-1,soft)}else{put(63,cy,soft);put(64,cy,ink);put(65,cy,soft)}}
 else{
 let h=open<.32?1:open<.66?2:3,w=open<.32?2:open<.66?3:4;w=Math.max(2,Math.round(w*(.73+.42*q.wide)));
 for(let y=-h;y<=h;y++)for(let x=-w;x<=w;x++){if((x/(w+.15))**2+(y/(h+.2))**2<=1){let c=y>=h-1?[210,132,127]:[139,77,75];if(y===-h||Math.abs(x)===w)c=soft;put(64+x,cy+y,c)}}
 }
 return d;
 }
 // Head transform acts on original face AND all independent hair/ears. Neck transition
 // is weighted; scarf is left attached to the torso. No geometry is replaced.
 function pose(model,rest,q,ears){let hair=new Set();model.polygons.forEach((f,i)=>{if(model.mats[i].startsWith('hair'))f.forEach(k=>hair.add(k))});const p0=[0,2.12,0],ang=[q.pitch,q.yaw,q.roll].map(x=>x*pi/180);
 function head(p,w=1){let [x,y,z]=p.map((v,i)=>v-p0[i]),[a,b,c]=ang.map(v=>v*w),u=y*Math.cos(a)-z*Math.sin(a);z=y*Math.sin(a)+z*Math.cos(a);y=u;u=x*Math.cos(b)+z*Math.sin(b);z=-x*Math.sin(b)+z*Math.cos(b);x=u;u=x*Math.cos(c)-y*Math.sin(c);y=x*Math.sin(c)+y*Math.cos(c);x=u;return [x+p0[0],y+p0[1],z+p0[2]]}
 function breathe(p){let k=smooth((p[1]-.6)/1.48);return [p[0],p[1]+q.breath*.008*k,p[2]+q.breath*.004*k]}
 let positions=model.positions.map((p,i)=>{let w=i<model.baseCount?smooth((rest[i][1]-2.05)/.15):(hair.has(i)?1:0);return breathe(w?head(p,w):p)});
 let modules=Object.fromEntries(Object.entries(ears).map(([k,m])=>[k,{...m,positions:m.positions.map(p=>breathe(head(p)))}]));return {model:{...model,positions},modules}
 }
 return {sample,auto,texture,pose,modes,sequence};
})();