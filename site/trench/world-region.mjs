import {triangles} from '../castle-city/city-core.mjs';
import {generateCity,PALETTE,walkHeight} from './ww2-settlement.mjs';
export const CITY_Z=-420,CITY_Y=2.20,BOUNDS={xmin:-184,xmax:184,zmin:-611,zmax:57};
const names=Object.keys(PALETTE),ids=Object.fromEntries(names.map((m,i)=>[m,16+i]));
export const ATLAS_HEIGHT=1024;
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,sm=t=>{t=cl(t);return t*t*(3-2*t)};
export function extendWorld(world){
 const original=world.height,city=generateCity(),col=[.53,.53,.53];
 const roadCenter=z=>0;
 const countryProps=[],countryColliders=[];
 function countryHeight(x,z){let t=sm((-92-z)/42),base=CITY_Y+.24*Math.sin(x*.095)*Math.sin((z+220)*.045)*Math.min(1,Math.abs(x)/12)*sm((z+220)/18);return mix(original(x,-92),base,t)}
 const height=(x,z)=>{if(z>=-92)return original(x,z);if(z>=-220)return countryHeight(x,z);let y=walkHeight(city,x,z-CITY_Z);return y===null?CITY_Y-3.00:CITY_Y+y};
 // Existing trench triangles remain untouched. All new geometry is appended to its world buffer.
 const start=world.V.length/30;
 for(let z=-220;z<-92;z+=2)for(let x=-76;x<76;x+=2){let a=[x,countryHeight(x,z),z],b=[x+2,countryHeight(x+2,z),z],c=[x+2,countryHeight(x+2,z+2),z+2],d=[x,countryHeight(x,z+2),z+2],m=Math.abs(x+1-roadCenter(z))<3.8?'mud':Math.abs(x+1)<6?'earth':((Math.floor((x+76)/20)+Math.floor((z+220)/29))%3===0?'earth':'grass');world.quad(a,d,c,b,col,ids[m])}
 // Shared triangle path: baked contact shading is encoded as per-face tint, never a separate illustrated background.
 const addPart=(part,shift=p=>p)=>triangles(part,(a,b,c)=>{let u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(Math.hypot(...n)<1e-8)return;
 let mid=(a[1]+b[1]+c[1])/3,ground=part.pos[1]-part.size[1]/2,contact=part.kind==='box'&&mid<ground+.35?.34:.53;
 if(part.mat==='glass'||part.mat==='black')contact=.38;
 world.tri(shift(a),shift(b),shift(c),[contact,contact,contact],ids[part.mat]??ids.stone)});
 const shift=p=>[p[0],p[1]+CITY_Y,p[2]+CITY_Z];
 for(let part of city.parts)addPart(part,shift);
 // Rural scenery, same world coordinates and real geometry.
 const add=(kind,pos,size,mat,extra={})=>{let p={kind,pos,size,mat,...extra};countryProps.push(p);addPart(p);return p};
 const box=(x,y,z,w,h,d,m,rot=0,coll=false)=>{add('box',[x,y,z],[w,h,d],m,{rot});if(coll)countryColliders.push({x,z,w,l:d,y,h,rot:-rot,kind:'box',walkable:false,region:'country'})};
 let seed=43771,rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 function tree(x,z,dead=false){let y=countryHeight(x,z),h=3.6+rnd()*2.2;add('cylinder',[x,y+h*.5,z],[.20,h,.08],'wood',{n:6});if(!dead){add('foliage',[x,y+h*.84,z],[1.65,2.9,1.5],'leaf');add('foliage',[x+.55,y+h,z+.2],[1.20,2.2,1.10],'leaf2')}else{for(let s of [-1,1])box(x+s*.43,y+h*.72,z,.16,1.7,.15,'wood',0)}countryColliders.push({x,z,w:.42,l:.42,y:y+h*.5,h,rot:0,kind:'box',walkable:false,region:'country'})}
 // Normandy-inspired bocage: irregular low hedges with gaps, earth banks, shade.
 for(let s of [-1,1])for(let z=-208;z<-108;z+=5.2){if((Math.floor(z/5)%7+7)%7===0)continue;let x=s*(11+2*Math.sin(z*.06)),y=countryHeight(x,z),w=1.5+rnd()*.8;box(x,y+.33,z,w,.66,5.1,'earth',0,true);add('foliage',[x,y+1.03,z],[w*.68,1.75,2.85],'leaf');if(rnd()>.72)tree(x+s*2,z,rnd()<.3)}
 // Fields, drainage strips and telegraph line. Main road kept entirely clear.
 for(let s of [-1,1])for(let z=-204;z<-116;z+=3.6){let x=s*34,y=countryHeight(x,z);box(x,y+.015,z,25,.035,.18,'earth');if(Math.floor((z+204)/3.6)%5===0){let xx=s*55;tree(xx,z,rnd()<.27)}}
 for(let z=-210;z<-105;z+=21){let x=-8.5,y=countryHeight(x,z);box(x,y+2.4,z,.22,4.8,.22,'wood',0,true);box(x,y+4.72,z,2.1,.15,.17,'wood');for(let s of [-1,1])box(x+s*.76,y+4.86,z,.13,.24,.12,'trim')}
 // Two small stone farmhouses and a damaged barn are real structures; no fantasy props.
 for(let [x,z,w,d,ruin] of [[-27,-157,10,8,false],[27,-176,11,9,true],[-35,-193,8,7,false]]){let y=countryHeight(x,z),H=5.5;box(x,y+H/2,z,w,H,d,'stone',0,true);
 if(!ruin)add('gable',[x,y+H,z],[w+.4,2.5,d+.4],'roof2');
 else{ // lower half remains, upper silhouette broken; missing roof.
 const last=countryColliders.at(-1);last.h=H;for(let i=0;i<5;i++){let hh=.8+rnd()*1.2;box(x+(i-2)*w/5,y+H+hh/2,z-d/2+.18,w/5-.04,hh,.35,'brick')}}
 for(let s of [-1,1]){box(x+s*2.5,y+3.7,z+d/2+.06,1.08,1.48,.12,'darkStone');box(x+s*2.5,y+3.7,z+d/2+.15,.82,1.2,.06,'glass')}
 box(x,y+1.25,z+d/2+.11,1.25,2.5,.18,'wood');for(let j=0;j<8;j++){let xx=x+(rnd()-.5)*w,zz=z+d/2+1+rnd()*2,hh=.15+rnd()*.38;box(xx,countryHeight(xx,zz)+hh/2,zz,.35+rnd()*.6,hh,.30+rnd()*.6,'rubble')}}
 // Low silhouettes beyond the navigable corridor remove the void horizon.
 for(let s of [-1,1])for(let z=-216;z<-96;z+=12){let x=s*(67+rnd()*4);tree(x,z,rnd()<.4)}
 world.objects.push(...countryColliders);
 // Explicit colliders for major city structures; bridge rail colliders start at deck height.
 for(let q of city.colliders){let x=(q[0]+q[2])/2,z=(q[1]+q[3])/2,w=q[2]-q[0],l=q[3]-q[1],rail=Math.abs(z)<.01&&Math.abs(l-40)<.01&&w<1,y=rail?CITY_Y+2.15+.55:CITY_Y+8;world.objects.push({x,z:z+CITY_Z,w,l,y,h:rail?1.1:16,rot:0,kind:'box',walkable:false,region:'city'})}
 // Street furniture and lower-level props: only small grounded boxes/cylinders, not windows/awnings.
 for(let p of city.parts){let [x,y,z]=p.pos,[w,h,d]=p.size;if(y<.05||y>1.6||y-h/2>.18||h<.32||h>2.8)continue;if(p.kind==='box'&&w<=2.5&&d<=2.5&&w>.24&&d>.24||p.kind==='cylinder'&&w<.65&&w>.16){world.objects.push({x,z:z+CITY_Z,w:p.kind==='cylinder'?2*w:w,l:p.kind==='cylinder'?2*w:d,y:y+CITY_Y,h,rot:-(p.rot||0),kind:'box',walkable:false,region:'city-detail'})}}
 world.height=height;
 world.region=(x,z)=>z>=-92?'前线战壕':z>=-220?'诺曼底乡野与农舍':Math.abs(z-CITY_Z)<30?'石桥与河岸':z<CITY_Z-100?'教堂及市政区':'1944 欧洲城镇';
 world.valid=(x,z)=>{if(z<BOUNDS.zmin||z>BOUNDS.zmax)return false;if(z>=-92)return Math.abs(x)<=73;if(z>=-220)return Math.abs(x)<=73;let local=z-CITY_Z;return Math.abs(x)<=184&&(local>192?Math.abs(x)<6:walkHeight(city,x,local)!==null)};
 world.city=city;world.integration={originalTriangles:start,addedTriangles:world.V.length/30-start,buildings:city.buildings.length,shops:city.shops.length,bridges:city.bridges.length,cityCenter:[0,CITY_Y,CITY_Z],ruins:city.buildings.filter(b=>b.ruin).length,countryProps:countryProps.length,bounds:BOUNDS,historicalStatus:'fictional Normandy-inspired 1944; not a verified town reconstruction'};
 return world;
}
export function extendAtlas(original){
 if(original.length!==256*256*3)throw Error('original terrain atlas size mismatch');
 const data=new Uint8Array(256*ATLAS_HEIGHT*3);data.set(original);
 const stone=new Set(['stone','darkStone','trim','road','cobble','brick','rubble']),wood=new Set(['wood','woodLight']),roof=new Set(['roof','roof2','roof3']);
 const m=(a,b)=>((a%b)+b)%b;
 for(let name of names){let id=ids[name],base=[1,3,5].map(i=>parseInt(PALETTE[name].slice(i,i+2),16)),ox=id%4*64,oy=Math.floor(id/4)*64;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 let q=1,grain=((Math.imul(x+id*71,73856093)^Math.imul(y+19,19349663))>>>0)%19;
 if(stone.has(name)){let small=name==='road'||name==='cobble',bh=small?10:16,bw=small?16:32,row=Math.floor(y/bh),u=m(x+(row%2)*bw/2,bw),v=m(y,bh);q=u<1||v<1?.73:u===1||v===1?1.08:v===bh-1?.91:1+(grain-9)*.003}
 else if(wood.has(name)){let u=x%16;q=u===0?.68:u===1?1.10:1+(grain-9)*.003;if((x+Math.floor(y/13)*7)%13===3)q*=.88}
 else if(roof.has(name)){let v=y%12,u=m(x+Math.floor(y/12)%2*8,16);q=v===0||u===0?.73:v===1?1.12:1+(grain-9)*.003}
 else if(name==='water'){q=m(x+Math.floor(y/4)*17,37)<8&&y%7===0?1.12:1+(grain-9)*.002}
 else if(['grass','leaf','leaf2','earth','mud','moss','asphalt'].includes(name)){q=1+(grain-9)*.008;if((x%8===1)&&(y%7===2))q*=.88}
 else if(name==='rail'||name==='iron'||name==='rust'){q=.94+(grain-9)*.008;if(x%16===0)q*=1.10}
 else if(name==='glass'){q=(x+y*2)%61<2?1.15:.97}
 else q=1+(grain-9)*.002;
 let k=((oy+y)*256+ox+x)*3;for(let c=0;c<3;c++)data[k+c]=cl(Math.round(base[c]*q),0,255)
 }}
 return data;
}
