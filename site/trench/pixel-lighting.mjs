// V28 baked pixel lighting. Shared CPU/GPU inputs, deterministic, no image overlays.
// Conservative heightfield ray occlusion derived from the existing physical object registry.
// Approximation: no overhang transmission, not full triangle ray tracing.
export const LIGHT_CELL=.5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function bakeLighting(world,{sun=[-.62,.58,.52],maxDistance=32}={}){
 const V=refineGround(world.V);world.V=V;const cell=LIGHT_CELL,x0=-200,z0=-630,W=800,H=1400,top=new Float32Array(W*H).fill(-100);
 const bounds=o=>{let c=Math.abs(Math.cos(o.rot||0)),s=Math.abs(Math.sin(o.rot||0));return [c*o.w/2+s*o.l/2,s*o.w/2+c*o.l/2]};
 for(let o of world.objects){if(o.walkable||o.h<.32||o.w<.18||o.l<.18)continue;let [rx,rz]=bounds(o),h=o.y+o.h/2;if(!Number.isFinite(h))continue;let a=clamp(Math.floor((o.x-rx-x0)/cell),0,W-1),b=clamp(Math.floor((o.x+rx-x0)/cell),0,W-1),c=clamp(Math.floor((o.z-rz-z0)/cell),0,H-1),d=clamp(Math.floor((o.z+rz-z0)/cell),0,H-1);for(let j=c;j<=d;j++)for(let i=a;i<=b;i++)top[j*W+i]=Math.max(top[j*W+i],h)}
 function sample(x,z){let i=Math.floor((x-x0)/cell),j=Math.floor((z-z0)/cell);return i>=0&&i<W&&j>=0&&j<H?top[j*W+i]:-100}
 let l=Math.hypot(...sun),sx=sun[0]/l,sy=sun[1]/l,sz=sun[2]/l,cache=new Map(),shadowed=0,contacted=0;
 function light(x,y,z,nx,ny,nz){
 // offset outward before tracing to avoid self-shadow at wall surfaces
 let ox=x+nx*.31,oy=y+Math.max(.13,ny*.20),oz=z+nz*.31;
 let key=[Math.round(ox*2),Math.round(oy*2),Math.round(oz*2),Math.round(nx),Math.round(ny),Math.round(nz)].join(',');
 if(cache.has(key))return cache.get(key);
 let blocked=0;for(let t=1.2;t<maxDistance;t+=t<5?.65:1.5){if(sample(ox+sx*t,oz+sz*t)>oy+sy*t+.18){blocked=1;break}}
 let near=0;for(let [dx,dz] of [[.65,0],[-.65,0],[0,.65],[0,-.65],[1.3,0],[-1.3,0],[0,1.3],[0,-1.3]])if(sample(ox+dx,oz+dz)>oy+.45)near++;
 let ao=1-near*.035;
 let result=[blocked,ao];cache.set(key,result);return result;
 }
 // Encode occlusion in existing per-vertex color: red=direct visibility, green=ambient visibility, blue=original material tint.
 // Shared lighting shader reads channels instead of averaging them.
 for(let i=0;i<V.length;i+=10){let x=V[i],y=V[i+1],z=V[i+2],nx=V[i+3],ny=V[i+4],nz=V[i+5],original=(V[i+6]+V[i+7]+V[i+8])/3;let [shadow,ao]=light(x,y,z,nx,ny,nz);V[i+6]=shadow?.14:1;V[i+7]=ao;V[i+8]=original;if(shadow)shadowed++;if(ao<.99)contacted++}
 let result={vertices:V.length/10,shadowed,contacted,grid:[W,H],cell,cache:cache.size,sun,method:'heightfield occlusion + contact AO, baked at vertices'};world.integration={...world.integration,lighting:result};return result;
}
export function lightTint(n,sun,visibility,ao,base,wet=0){let d=Math.max(0,n[0]*sun[0]+n[1]*sun[1]+n[2]*sun[2]),q=Math.floor(d*5+.5)/5;return (0.31+0.23*Math.max(0,n[1]))*ao+(0.46*q)*visibility*(1-.25*wet)}

// Split only broad top-facing surfaces to give the shadow field spatial resolution.
// Never subdivide character, roofs, or arbitrary vertical geometry.
export function refineGround(src){let out=[];for(let i=0;i<src.length;i+=30){let n=src[i+4],y=src[i+1],z=src[i+2];if(Math.abs(n)>.97&&z<-92&&y<2.45&&y>1.8){let a=src.slice(i,i+10),b=src.slice(i+10,i+20),c=src.slice(i+20,i+30);split(a,b,c,0)}else for(let j=0;j<30;j++)out.push(src[i+j])}return out;
function split(a,b,c,depth){let p=[a,b,c],lens=[0,1,2].map(i=>Math.hypot(p[i][0]-p[(i+1)%3][0],p[i][2]-p[(i+1)%3][2])),m=lens.indexOf(Math.max(...lens));if(lens[m]<=5.2||depth>=19){out.push(...a,...b,...c);return}let u=p[m],v=p[(m+1)%3],w=p[(m+2)%3],mid=u.map((x,i)=>i===9?x:(x+v[i])*.5);split(u,mid,w,depth+1);split(mid,v,w,depth+1)}}
