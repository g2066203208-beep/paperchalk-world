function testCamera(html){
const av=JSON.parse(html.match(/const AVATAR=(\{[^\n]+\});/)[1]),src=html.slice(html.indexOf("const REST="),html.indexOf("function avatarData(")),{poseAvatar,metrics}=new Function("AVATAR",src+"\nreturn {poseAvatar,metrics:()=>animMetrics};")(av);
const floor=Math.min(...av.vertices.map(p=>p[1])),dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0),sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>a.map(x=>x/(Math.hypot(...a)||1));
const modes=[['carry',0,0,0],['raise',1,0,0],['down',0,-1.32,0],['crouch raise',1,0,1],['raise up',1,.25,0],['raise down',1,-.25,0]];
let results=[];
for(let [mode,raise,pitch,duck] of modes)for(let [W,H] of [[450,260],[260,450]]){
const P=poseAvatar(1.6,0,duck,raise,pitch),m=metrics(),yaw=.48+.52*raise,c=Math.cos(yaw),s=Math.sin(yaw),eye=[.04+.18*raise,(2.48-floor+m.root)*.72-.08-.08*raise,.08],F=[0,Math.sin(pitch),-Math.cos(pitch)],R=norm(cross(F,[0,1,0])),U=cross(R,F),q=1/Math.tan((1.45-.15*raise)/2),aspect=W/H;
const Q=P.map(([x,y,z])=>{let p=[.72*(-c*x+s*z),.72*(y-floor),.72*(-s*x-c*z)],d=sub(p,eye);return [dot(d,R),dot(d,U),dot(d,F)]}),depth=new Float64Array(W*H).fill(Infinity),labels=new Int8Array(W*H);
function clip(poly){let o=[];for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length],ia=a[2]>=.07,ib=b[2]>=.07;if(ia)o.push(a);if(ia!==ib){let t=(.07-a[2])/(b[2]-a[2]);o.push(a.map((v,k)=>v+(b[k]-v)*t))}}return o}
for(let f of av.quads){if(f.hair||(!f.prop&&f.group==="skin"))continue;let lab=f.prop?1:f.group==="glove"?(f.f[0]<280?2:3):4;
for(let t of [[0,1,2],[0,2,3]]){let pol=clip(t.map(j=>Q[f.f[j]]));for(let j=1;j+1<pol.length;j++){let a=[pol[0],pol[j],pol[j+1]].map(v=>[W*.5+v[0]*q/v[2]/aspect*W*.5,H*.5-v[1]*q/v[2]*H*.5,v[2]]),den=(a[1][1]-a[2][1])*(a[0][0]-a[2][0])+(a[2][0]-a[1][0])*(a[0][1]-a[2][1]);if(Math.abs(den)<1e-8)continue;for(let y=Math.max(0,Math.floor(Math.min(...a.map(v=>v[1]))));y<=Math.min(H-1,Math.ceil(Math.max(...a.map(v=>v[1]))));y++)for(let x=Math.max(0,Math.floor(Math.min(...a.map(v=>v[0]))));x<=Math.min(W-1,Math.ceil(Math.max(...a.map(v=>v[0]))));x++){let X=x+.5,Y=y+.5,A=((a[1][1]-a[2][1])*(X-a[2][0])+(a[2][0]-a[1][0])*(Y-a[2][1]))/den,B=((a[2][1]-a[0][1])*(X-a[2][0])+(a[0][0]-a[2][0])*(Y-a[2][1]))/den,C=1-A-B;if(Math.min(A,B,C)<0)continue;let z=1/(A/a[0][2]+B/a[1][2]+C/a[2][2]),i=y*W+x;if(z>=depth[i])continue;depth[i]=z;labels[i]=lab;}}}}
let counts=[0,0,0,0,0];for(let v of labels)counts[v]++;
results.push({mode,W,H,prop:counts[1],frontHand:counts[2],rearHand:counts[3],body:counts[4]});
}
return results;
}
const fs=require('node:fs'),path=require('node:path');console.log(JSON.stringify(testCamera(fs.readFileSync(path.join(__dirname,'index.html'),'utf8')),null,2));