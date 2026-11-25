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
 case 'idle':q.eye=.95*(1-close);q.yaw=3*Math.sin(t*.65);q.roll=-2+1.2*Math.sin(t*.8);q.smile=.15;break;
 case 'blink':q.eye=.82*(1-Math.max(blink(t,.65),blink(t,1.38)));break;
 case 'wink':q.eye=.82;q.left=e(.35,.50,.94,1.22);q.smile=.65*e(.2,.5,1.1,1.7);q.roll=-5*q.left;break;
 case 'talk':{let chars=Array.from(speech||'困了……'),k=Math.min(chars.length-1,Math.floor(t/.19)),c=chars[k]||'',a=Math.sin(pi*(t/.19%1)),pause=/[，。！？、…,.!?\s]/.test(c)||t>chars.length*.19;let pattern=[['A',.72,.72],['I',.28,1],['U',.56,.35],['E',.48,.85],['O',.82,.40],['M',.03,.8]],v=pattern[({a:0,i:1,u:2,e:3,o:4,m:5,b:5,p:5}[c.toLowerCase()]??[0,3,4,1,2,0][k%6])];q.mouth=pause?0:Math.max(v[0]==='M'?.11:0,v[1]*a);q.wide=v[2];q.viseme=pause?'rest':v[0];q.eye=.88*(1-close);q.yaw=3*Math.sin(t*2);q.pitch=-2+2*Math.sin(t*2.5);break}
 case 'yawn':{let v=e(.25,1.3,2.8,4.25);q.eye=.94*(1-v)*(1-close);q.mouth=.82*v;q.wide=.55;q.brow=.35*v;q.pitch=-4*v;q.roll=-3*v;break}
 case 'daydream':q.eye=.76*(1-close);q.gazeX=.6*e(.2,1.1,5.0,6.7);q.gazeY=-.43;q.yaw=12*e(.2,1.6,5.2,6.8);q.roll=-7*e(.2,1.6,5.2,6.8);q.mouth=.10;break;
 case 'look':q.yaw=-18*e(.15,.9,1.65,2.45)+18*e(2.5,3.3,4.4,5.5);q.gazeX=clamp(q.yaw/13,-1,1);q.eye=.80*(1-close);q.pitch=2*Math.sin(t*1.6);break;
 case 'sleep':q.eye=0;q.pitch=12*e(.0,1.5,7.8,8.9)+2*Math.sin(t*1.5);q.roll=-8*e(0,1.7,7.9,9);q.mouth=.11+.055*Math.sin(t*2.2);q.breath*=1.5;break;
 case 'wake':{let v=e(.45,.7,1.3,2.5);q.eye=smooth((t-.35)/.3)*(.9-.38*smooth((t-2)/1.6));q.mouth=.40*v;q.pitch=10*(1-smooth((t-.4)/.4))-4*v;q.brow=v;break}
 case 'nod':q.pitch=9*Math.sin(t*2*pi/1.3)*e(.05,.3,2.3,2.95);q.eye=.90*(1-close);break;
 case 'shake':q.yaw=14*Math.sin(t*2*pi/1.3)*e(.05,.3,2.3,2.95);q.eye=.85*(1-close);q.brow=-.25;break;
 case 'smile':q.smile=e(.15,.7,3.1,3.9);q.eye=.95*(1-q.smile)*(1-close);q.blush=.8*q.smile;q.mouth=.26*q.smile;break;
 case 'surprise':{let v=e(.2,.48,2.4,3.8);q.eye=.48+.3*v;q.brow=v;q.mouth=.65*v;q.wide=.43;q.pitch=-5*v;break}
 case 'annoyed':q.eye=.64*(1-close);q.brow=-.8*e(.1,.5,3.3,3.9);q.smile=-.65;q.gazeX=-.5;q.yaw=-7;break;
 case 'think':q.eye=.74*(1-close);q.gazeX=.6;q.gazeY=-.7;q.roll=9*e(.1,.6,4.1,4.9);q.yaw=7;q.smile=-.15;q.mouth=.09;break;
 case 'sigh':{let v=e(.3,1.05,2.5,3.8);q.eye=.94*(1-v);q.mouth=.32*v;q.wide=.37;q.pitch=6*v;q.breath=Math.sin(t*1.7)*1.3;break}
 case 'sneeze':{let v=e(.45,.85,1.05,1.18);q.eye=.92*(1-v);q.mouth=.65*v;q.pitch=-6*v+10*e(1.12,1.18,1.36,1.8);q.brow=-.4*v;break}
 case 'doze':{let v=e(.3,1.9,4.8,5.5),j=e(5.1,5.3,5.7,6.4);q.eye=.94*(1-v)+.80*j;q.pitch=14*v-5*j;q.roll=-6*v;q.mouth=.09*v;break}
 }q.mode=mode;return q;
 }
 const sequence=['idle','daydream','look','yawn','idle','doze','wake','smile','sigh','sleep'];
 function auto(t){let total=sequence.reduce((s,k)=>s+modes[k],0),u=((t%total)+total)%total;for(const k of sequence){if(u<modes[k])return {mode:k,t:u};u-=modes[k]}return {mode:'idle',t:0}}
 // The eye and mouth channels are individually composited into the original UV map.
 // Hand-authored pixel sprite layers on a 128x128 grid, scaled nearest-neighbour to 256.
 // All shapes are tiny and warm; no black cavities, teeth, or large white eyes.
// V09: fixed authored pixel cels, no runtime eye/mouth shape generation.
// Transparent dots keep the underlying face skin. Every cel has an invariant anchor.
const EYES={original:true,half:true,closed:true,happy:true};
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
const COLORS={k:[132,78,73],s:[163,100,94],d:[132,77,76],i:[164,108,84],l:[199,141,108],h:[250,220,182],w:[252,232,215],r:[198,117,119],p:[236,153,146],t:[255,221,205]};
function frames(q){
 const pick=v=>v<.17?(q.smile>.55?'happy':'closed'):v<.55?'half':'original';
 let mouth='rest';
 if(q.mode==='talk'&&q.viseme!=='rest'&&q.mouth>=.10)mouth=MOUTHS[q.viseme]?q.viseme:'A';
 else if(q.mode==='yawn'&&q.mouth>.52)mouth='yawn';
 else if(q.smile>.55)mouth=q.mouth>.16?'grin':'smile';
 else if(q.mode==='annoyed')mouth='pout';
 else if(q.mouth>.46)mouth='O';
 else if(q.mouth>.12)mouth='small';
 return {left:pick(q.eye*(1-q.left),true),right:pick(q.eye*(1-q.right),false),mouth};
}
// Face UV spans about 288 texels/model-unit. Marksman front atlas spans ~80.
// Quantize the existing red-eyed source to a 64x64 logical face grid (4x4 texels).
// Every expression uses the same grid, without new iris palette or eye proportions.
const CELL=4,GRID=64;
const textureCache=new Map();let lastBase=null,neutral=null,eyeCels=null;
const regions=[{x:10,y:35,w:17,h:12},{x:37,y:35,w:17,h:12}];
const LASH=[57,40,44,255],BROW=[102,74,67,255];
// V09: soft mouth silhouettes, no dark outline around the pink interior.
// V09 mouth art: connected clusters, broad upper edge, rounded stepped corners.
// Every mouth is centered on the same UV anchor. No lip highlights or disconnected marks.
// V09: every open mouth has a fully closed 4-connected near-black outline.
// V09 hand-authored pixel cels: 1-cell warm contour, quiet palette, meaningful silhouettes.
const mouths={
 rest:["kkkk"],smile:["k...k",".kkk."],small:[".kk.","kppk",".kk."],
 A:[".kkkk.","krrrrk","kppppk",".kkkk."],I:[".kkkkkk.","kttttttk",".kkkkkk."],
 U:[".kk.","kppk","kppk",".kk."],E:[".kkkkk.","ktttttk","kppppk.",".kkkk.."],
 O:[".kkk.","krrrk","kpppk","kpppk",".kkk."],M:["kkkk"],
 yawn:["..kkk..",".krrrk.","krrrrrk","kpppppk","kpppppk",".kpppk.","..kkk.."],
 grin:["kkkkkkk","ktttttk",".kpppk.","..kkk.."],
 pout:[".kk.k.","k..k.k"]
};
function init(base){
 neutral=new Uint8ClampedArray(base.length);
 for(let y=0;y<256;y+=CELL)for(let x=0;x<256;x+=CELL){
 const i=((y+2)*256+x+2)*4,c=base.subarray(i,i+4);
 for(let dy=0;dy<CELL;dy++)for(let dx=0;dx<CELL;dx++)neutral.set(c,((y+dy)*256+x+dx)*4);
 }
 const skin=Array.from(base.slice(0,4));
 eyeCels=regions.map((r,i)=>{
 const original=Array.from({length:r.h},(_,y)=>Array.from({length:r.w},(_,x)=>Array.from(neutral.slice(((r.y+y)*4*256+(r.x+x)*4)*4,((r.y+y)*4*256+(r.x+x)*4)*4+4))));
 const mirror=x=>i===0?x:r.w-1-x;
 const blank=()=>Array.from({length:r.h},()=>Array.from({length:r.w},()=>skin));
 const half=blank(),closed=blank(),happy=blank();
 // Retain the source red iris; add two/three-cell thick stepped upper lash.
 for(let x=2;x<=14;x++){original[1][mirror(x)]=LASH;if(x>=3&&x<=13)original[2][mirror(x)]=LASH;if(x>=3&&x<=11)original[3][mirror(x)]=LASH;}
 original[2][mirror(1)]=LASH;original[3][mirror(2)]=LASH;original[4][mirror(2)]=LASH;
 for(let y=0;y<6;y++)for(let x=0;x<r.w;x++)half[y+4][x]=original[y*2][x];
 for(let x=2;x<=14;x++){half[5][mirror(x)]=LASH;if(x>=3&&x<=13)half[6][mirror(x)]=LASH;}
 const steps=[0,0,1,1,2,2,2,2,2,1,1,0,0];
 steps.forEach((dy,j)=>{let x=mirror(j+2),cy=5+dy,hy=7-dy;closed[cy][x]=LASH;happy[hy][x]=LASH;if(j>0&&j<12){closed[cy+1][x]=LASH;happy[hy+1][x]=LASH}});
 closed[6][mirror(1)]=LASH;happy[8][mirror(1)]=LASH;
 return {original,half,closed,happy};
 });
}
function browFrame(q){return q.brow>.32?'raised':q.brow<-.30?'frown':q.smile>.55?'happy':'rest'}
function texture(base,q){
 if(lastBase!==base){textureCache.clear();lastBase=base;init(base)}
 const f=frames(q),brow=browFrame(q),key=[f.left,f.right,f.mouth,brow].join(':');
 if(textureCache.has(key))return textureCache.get(key);
 const d=new Uint8ClampedArray(neutral),skin=Array.from(base.slice(0,4));
 function put(x,y,c){if(x<0||x>=GRID||y<0||y>=GRID)return;for(let dy=0;dy<CELL;dy++)for(let dx=0;dx<CELL;dx++)d.set(c,((y*CELL+dy)*256+x*CELL+dx)*4)}
 [f.left,f.right].forEach((name,i)=>{const r=regions[i],cel=eyeCels[i][name];cel.forEach((row,y)=>row.forEach((c,x)=>put(r.x+x,r.y+y,c)));
 // Independent brows: mirrored, solid two-cell shape, one-cell tapered ends.
 for(let y=29;y<=34;y++)for(let x=r.x;x<r.x+r.w;x++)put(x,y,skin);
 let shape=brow==='frown'?[0,0,0,1,1,1,2,2,2]:brow==='raised'?[1,0,0,0,0,0,0,1,1]:brow==='happy'?[1,0,0,0,0,0,0,0,1]:[1,1,0,0,0,0,0,1,1];
 let y0=brow==='raised'?29:brow==='frown'?31:31;
 shape.forEach((dy,j)=>{let x=i===0?r.x+4+j:r.x+r.w-5-j;put(x,y0+dy,BROW);if(j>0&&j<8)put(x,y0+dy+1,BROW)});
 });
 const rows=mouths[f.mouth];rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){let c=COLORS[row[x]];if(c)put(32+x-(row.length>>1),48+y-(rows.length>>1),[...c,255])}});
 if(textureCache.size>=96)textureCache.delete(textureCache.keys().next().value);textureCache.set(key,d);return d;
}
// Head transform acts on original face AND all independent hair/ears. Neck transition
 // is weighted; scarf is left attached to the torso. No geometry is replaced.
 function pose(model,rest,q,ears){let hair=new Set();model.polygons.forEach((f,i)=>{if(model.mats[i].startsWith('hair'))f.forEach(k=>hair.add(k))});const p0=[0,2.12,0],ang=[q.pitch,q.yaw,q.roll].map(x=>x*pi/180);
 function head(p,w=1){let [x,y,z]=p.map((v,i)=>v-p0[i]),[a,b,c]=ang.map(v=>v*w),u=y*Math.cos(a)-z*Math.sin(a);z=y*Math.sin(a)+z*Math.cos(a);y=u;u=x*Math.cos(b)+z*Math.sin(b);z=-x*Math.sin(b)+z*Math.cos(b);x=u;u=x*Math.cos(c)-y*Math.sin(c);y=x*Math.sin(c)+y*Math.cos(c);x=u;return [x+p0[0],y+p0[1],z+p0[2]]}
 function breathe(p){let k=smooth((p[1]-.6)/1.48);return [p[0],p[1]+q.breath*.008*k,p[2]+q.breath*.004*k]}
 let positions=model.positions.map((p,i)=>{let w=i<model.baseCount?smooth((rest[i][1]-2.04)/.085):(hair.has(i)?1:0);return breathe(w?head(p,w):p)});
 let modules=Object.fromEntries(Object.entries(ears).map(([k,m])=>[k,{...m,positions:m.positions.map(p=>breathe(head(p)))}]));return {model:{...model,positions},modules}
 }
 return {sample,auto,texture,pose,modes,sequence,frames:q=>({...frames(q),brow:browFrame(q)}),EYES,MOUTHS:mouths,COLORS};
})();

function makeFace(){let d=new Uint8ClampedArray(256*256*4);for(let i=0;i<d.length;i+=4)d.set([255,222,205,255],i);
const c={k:[56,43,40],K:[83,60,49],b:[105,79,62],B:[153,108,86],w:[247,236,217],W:[228,209,187],D:[44,66,40],G:[70,94,49],g:[104,132,66],l:[151,176,92],h:[224,226,164],s:[183,117,100],m:[124,78,66],p:[233,174,152],n:[238,191,167]};
function put(x,y,key){if(!c[key]||x<0||x>=64||y<0||y>=64)return;for(let a=0;a<4;a++)for(let b=0;b<4;b++)d.set([...c[key],255],((y*4+a)*256+x*4+b)*4)}
// Relaxed almond shape, almost horizontal top lid, larger olive iris, soft lower rim.
const eye=["K...............","kkkKK...........",".kkkkkkkkkkkk...","..kWWDDDDDDWWkk.","..kwwDGgGgDwwwK.","...WwDGglgDwwK..","....wGglhGwwK...",".....WGGGGWK....","......KKKK......"];
const brow=["...bbbbb........","..bbbbbbbbbbb...","..........bbB..."];
for(let s=0;s<2;s++){let x0=s?36:12;let stamp=(rows,y0)=>rows.forEach((r,y)=>[...r].forEach((v,x)=>put(x0+(s?15-x:x),y0+y,v)));stamp(brow,s?30:30);stamp(eye,35)}
for(let [x,y,k] of [[29,49,'s'],[30,50,'m'],[31,50,'m'],[32,50,'m'],[33,50,'m'],[34,49,'m'],[35,49,'s'],[31,51,'p'],[32,51,'p']])put(x,y,k);
for(let [x,y] of [[32,44],[32,45],[31,45]])put(x,y,'n');
return d}

export async function loadImage(url){const im=new Image();im.src=url;await im.decode();let c=document.createElement('canvas');c.width=im.width;c.height=im.height;let g=c.getContext('2d');g.drawImage(im,0,0);return {width:im.width,height:im.height,data:g.getImageData(0,0,im.width,im.height).data}}
export async function getTextures(id){if(id==='marksman')return {'marksman-atlas':await loadImage('../markswoman-pixel-v01-atlas.png')};if(id==='cleaner'){let source=await loadImage("data:image/png;base64,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");return {'cleaner-v09':{width:256,height:256,data:FACE.texture(source.data,FACE.sample('idle',0))}}}return {'doctor-v04':{width:256,height:256,data:makeFace()}}}
