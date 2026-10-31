// R0.1 deterministic sprite control group, not a trained AI model.
export const W=48,H=64,INKS=['#00000000','#393657','#F2A5C2','#A9BAE9','#FFF5E6'];
export const POSES=['站立','挥手','行走'],HAIRS=['短发','长发','双丸子','侧马尾'],OUTFITS=['围裙','外套','连衣裙','工装'];
export function random(seed){let x=(Number(seed)>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
export function makeCharacter({seed=1,pose='站立',hair='短发',outfit='围裙'}={}){
 const rnd=random(seed),a=new Uint8Array(W*H);const p=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H)a[y*W+x]=c};
 const rect=(x,y,w,h,c)=>{for(let j=Math.floor(y);j<y+h;j++)for(let i=Math.floor(x);i<x+w;i++)p(i,j,c)};
 const ellipse=(x,y,rx,ry,c)=>{for(let j=Math.floor(y-ry);j<=y+ry;j++)for(let i=Math.floor(x-rx);i<=x+rx;i++)if(((i-x)/rx)**2+((j-y)/ry)**2<=1)p(i,j,c)};
 const line=(x,y,x2,y2,c,t=3)=>{const n=Math.max(Math.abs(x2-x),Math.abs(y2-y),1);for(let z=0;z<=n;z++)rect(x+(x2-x)*z/n-t/2,y+(y2-y)*z/n-t/2,t,t,c)};
 const cx=24+Math.floor(rnd()*5)-2,hc=1+Math.floor(rnd()*3),cloth=rnd()<.5?2:3,other=cloth===2?3:2;
 const stride=pose==='行走';const a1=stride?9:5;
 line(cx-5,43,cx-a1,55,1,7);line(cx+5,43,cx+a1,55,1,7);line(cx-5,43,cx-a1,55,4,5);line(cx+5,43,cx+a1,55,4,5);
 ellipse(cx-a1,58,5,3,1);ellipse(cx+a1,58,5,3,1);rect(cx-a1-3,56,6,2,other);rect(cx+a1-3,56,6,2,other);
 ellipse(cx,35,11,12,1);ellipse(cx,35,9,11,cloth);rect(cx-4,23,8,6,4);
 const wave=pose==='挥手';line(cx-9,29,cx-15,wave?16:41,1,7);line(cx-9,29,cx-15,wave?16:41,4,5);ellipse(cx-15,wave?15:41,3,3,4);
 line(cx+9,29,cx+15,stride?34:41,1,7);line(cx+9,29,cx+15,stride?34:41,4,5);ellipse(cx+15,stride?34:41,3,3,4);
 if(outfit==='围裙'){rect(cx-7,34,14,11,4);rect(cx-2,40,4,5,other);rect(cx-9,32,18,2,other)}
 if(outfit==='工装'){rect(cx-7,35,14,10,other);rect(cx-3,31,6,12,cloth);rect(cx-6,37,3,3,4);rect(cx+3,37,3,3,4)}
 if(outfit==='外套'){rect(cx-9,30,5,14,1);rect(cx+4,30,5,14,1);rect(cx-6,32,3,12,other);rect(cx+3,32,3,12,other)}
 if(outfit==='连衣裙'){ellipse(cx,42,10,7,cloth);rect(cx-3,37,6,7,other);rect(cx-7,46,14,2,1)}
 if(hair==='长发'){ellipse(cx,23,12,16,1);ellipse(cx,23,10,15,hc)}
 if(hair==='侧马尾'){line(cx+9,12,cx+17,22,1,8);line(cx+9,12,cx+17,22,hc,6)}
 ellipse(cx,16,11,11,1);ellipse(cx,16,9,9,4);ellipse(cx,10,11,6,1);ellipse(cx,10,9,5,hc);rect(cx-9,7,11,4,hc);rect(cx-8,13,4,3,hc);
 if(hair==='双丸子'){ellipse(cx-9,7,5,5,1);ellipse(cx+9,7,5,5,1);ellipse(cx-9,7,4,4,hc);ellipse(cx+9,7,4,4,hc)}
 if(hair==='长发'){rect(cx-10,18,3,11,hc);rect(cx+8,18,3,11,hc)}
 rect(cx-6,18,3,2,1);rect(cx+3,18,3,2,1);p(cx-5,18,4);p(cx+4,18,4);p(cx,21,2);rect(cx-1,23,3,1,1);rect(cx+7,8,3,3,other);
 return a;
}
export function audit(a){if(a.length!==W*H)throw Error('Not 48x64');let count=0,seen=new Uint8Array(a.length),islands=0,components=0;for(let i=0;i<a.length;i++){if(a[i]>4)throw Error('Off palette');if(!a[i])continue;count++;if(seen[i])continue;components++;let n=0,stack=[i];seen[i]=1;while(stack.length){const k=stack.pop(),x=k%W,y=Math.floor(k/W);n++;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const j=yy*W+xx;if(a[j]&&!seen[j]){seen[j]=1;stack.push(j)}}}if(n<=2)islands++}return {nativeResolution:W+'x'+H,opaquePixels:count,connectedRegions:components,tinyIslands:islands,strictPalette:true,alphaBinary:true}}
export function toRGBA(a){const v=new Uint8ClampedArray(a.length*4);for(let i=0;i<a.length;i++){if(!a[i])continue;const s=INKS[a[i]].slice(1);v[i*4]=parseInt(s.slice(0,2),16);v[i*4+1]=parseInt(s.slice(2,4),16);v[i*4+2]=parseInt(s.slice(4,6),16);v[i*4+3]=255}return v}
export function splitIdentity(id){if(!String(id).trim())throw Error('identity_id required');let h=2166136261;for(const ch of String(id)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}const p=(h>>>0)%10;return p<8?'train':p===8?'val':'test'}
