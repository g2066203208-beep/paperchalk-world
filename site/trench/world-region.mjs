import {generateCity,triangles,PALETTE,walkHeight,canWalk} from '../castle-city/city-core.mjs';
export const CITY_Z=-420,CITY_Y=2.20,BOUNDS={xmin:-184,xmax:184,zmin:-611,zmax:57};
const names=Object.keys(PALETTE),ids=Object.fromEntries(names.map((m,i)=>[m,16+i]));
export const ATLAS_HEIGHT=1024;
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,sm=t=>{t=cl(t);return t*t*(3-2*t)};
export function extendWorld(world){
 const original=world.height,city=generateCity(),col=[.5,.5,.5];
 const roadCenter=z=>0;
 function countryHeight(x,z){let t=sm((-92-z)/42),base=CITY_Y+.24*Math.sin(x*.095)*Math.sin((z+220)*.045)*Math.min(1,Math.abs(x)/12)*sm((z+220)/18);return mix(original(x,-92),base,t)}
 const height=(x,z)=>{if(z>=-92)return original(x,z);if(z>=-220)return countryHeight(x,z);let y=walkHeight(city,x,z-CITY_Z);return y===null?CITY_Y-3.00:CITY_Y+y};
 // Existing trench triangles remain untouched. All new geometry is appended to its world buffer.
 const start=world.V.length/30;
 for(let z=-220;z<-92;z+=2)for(let x=-76;x<76;x+=2){let a=[x,countryHeight(x,z),z],b=[x+2,countryHeight(x+2,z),z],c=[x+2,countryHeight(x+2,z+2),z+2],d=[x,countryHeight(x,z+2),z+2],m=Math.abs(x+1-roadCenter(z))<5?'cobble':Math.abs(x+1)<8?'earth':'grass';world.quad(a,d,c,b,col,ids[m])}
 // City parts use their original mesh, not image planes. Same vertex format and material IDs.
 const shift=p=>[p[0],p[1]+CITY_Y,p[2]+CITY_Z];
 for(let part of city.parts)triangles(part,(a,b,c)=>{let u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-8)world.tri(shift(a),shift(b),shift(c),col,ids[part.mat]??ids.stone)});
 // Add real, sparse transition props. Use original trench registry for local collision.
 const box=(x,y,z,w,h,d,m,rot=0)=>world.box(x,y,z,w,h,d,col,ids[m],rot);
 for(let z=-208;z<-104;z+=18)for(let s of [-1,1]){let x=s*(8+(Math.abs(z)%7)*.5),y=countryHeight(x,z);box(x,y+.8,z,.35,1.6,.35,'wood');box(x,y+1.9,z,.60,.65,.60,'iron');box(x,y+1.94,z,.48,.49,.48,'light');}
 // Explicit colliders for major city structures; bridge rail colliders start at deck height.
 for(let q of city.colliders){let x=(q[0]+q[2])/2,z=(q[1]+q[3])/2,w=q[2]-q[0],l=q[3]-q[1],rail=Math.abs(z)<.01&&Math.abs(l-40)<.01&&w<1,y=rail?CITY_Y+2.15+.55:CITY_Y+8;world.objects.push({x,z:z+CITY_Z,w,l,y,h:rail?1.1:16,rot:0,kind:'box',walkable:false,region:'city'})}
 // Street furniture and lower-level props: only small grounded boxes/cylinders, not windows/awnings.
 for(let p of city.parts){let [x,y,z]=p.pos,[w,h,d]=p.size;if(y<.05||y>1.6||y-h/2>.18||h<.32||h>2.8)continue;if(p.kind==='box'&&w<=2.5&&d<=2.5&&w>.24&&d>.24||p.kind==='cylinder'&&w<.65&&w>.16){world.objects.push({x,z:z+CITY_Z,w:p.kind==='cylinder'?2*w:w,l:p.kind==='cylinder'?2*w:d,y:y+CITY_Y,h,rot:-(p.rot||0),kind:'box',walkable:false,region:'city-detail'})}}
 world.height=height;
 world.region=(x,z)=>z>=-92?'战壕前线':z>=-220?'城外古道':Math.abs(z-CITY_Z)<30?'河岸与石桥':z<CITY_Z-100?'王城堡垒':'王城旧城区';
 world.valid=(x,z)=>{if(z<BOUNDS.zmin||z>BOUNDS.zmax)return false;if(z>=-92)return Math.abs(x)<=73;if(z>=-220)return Math.abs(x)<=73;let local=z-CITY_Z;return Math.abs(x)<=184&&(local>192?Math.abs(x)<6:walkHeight(city,x,local)!==null)};
 world.city=city;world.integration={originalTriangles:start,addedTriangles:world.V.length/30-start,buildings:city.buildings.length,shops:city.shops.length,bridges:city.bridges.length,cityCenter:[0,CITY_Y,CITY_Z],bounds:BOUNDS};
 return world;
}
export function extendAtlas(original){
 if(original.length!==256*256*3)throw Error('original terrain atlas size mismatch');
 const data=new Uint8Array(256*ATLAS_HEIGHT*3);data.set(original);
 const stone=new Set(['stone','darkStone','trim','road','cobble']),wood=new Set(['wood','woodLight']),roof=new Set(['roof','roof2','roof3']);
 const m=(a,b)=>((a%b)+b)%b;
 for(let name of names){let id=ids[name],base=[1,3,5].map(i=>parseInt(PALETTE[name].slice(i,i+2),16)),ox=id%4*64,oy=Math.floor(id/4)*64;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 let q=1,grain=((Math.imul(x+id*71,73856093)^Math.imul(y+19,19349663))>>>0)%19;
 if(stone.has(name)){let small=name==='road'||name==='cobble',bh=small?10:16,bw=small?16:32,row=Math.floor(y/bh),u=m(x+(row%2)*bw/2,bw),v=m(y,bh);q=u<1||v<1?.73:u===1||v===1?1.08:v===bh-1?.91:1+(grain-9)*.003}
 else if(wood.has(name)){let u=x%16;q=u===0?.68:u===1?1.10:1+(grain-9)*.003;if((x+Math.floor(y/13)*7)%13===3)q*=.88}
 else if(roof.has(name)){let v=y%12,u=m(x+Math.floor(y/12)%2*8,16);q=v===0||u===0?.73:v===1?1.12:1+(grain-9)*.003}
 else if(name==='water'){q=m(x+Math.floor(y/4)*17,37)<8&&y%7===0?1.12:1+(grain-9)*.002}
 else if(['grass','leaf','leaf2','earth'].includes(name)){q=1+(grain-9)*.008;if((x%8===1)&&(y%7===2))q*=.88}
 else if(name==='glass'){q=(x+y*2)%61<2?1.15:.97}
 else q=1+(grain-9)*.002;
 let k=((oy+y)*256+ox+x)*3;for(let c=0;c<3;c++)data[k+c]=cl(Math.round(base[c]*q),0,255)
 }}
 return data;
}
