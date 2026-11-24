export function library(){
// Each tuple is shoulder, abduction, elbow, wrist, hip, knee, ankle; left/right independent.
const limb=(a=[0,0,0,0,0,0,0],b=a,body={})=>({...Object.fromEntries(["R","L"].flatMap((s,i)=>["shoulder","abduct","elbow","wrist","hip","knee","ankle"].map((k,j)=>[k+s,(i?b:a)[j]||0]))),...body});
const idle=limb([0,5,8,0,0,4,0]), crouch=limb([50,14,40,0,82,125,-20],[47,15,42,0,82,125,-20],{lean:23}), tuck=limb([70,15,60,0,85,126,-12],[65,15,62,0,85,126,-12],{lean:20});
const reach=limb([68,118,18,0,15,18,0],[68,118,18,0,15,18,0],{lean:-4});
const guard=limb([48,20,92,0,16,35,-5],[60,22,95,0,-10,25,0],{lean:8,twist:10});
const step=(s=1,run=false)=>{let a=run?[ -55,12,80,0,55,58,10]:[-30,10,28,0,30,18,5],b=run?[65,12,85,0,-35,108,-18]:[30,10,36,0,-25,65,-15];return limb(s===1?a:b,s===1?b:a,{lean:run?17:3,twist:s*(run?14:7)})};
const climb=(s=1)=>limb(s===1?[55,125,18,0,65,112,-10]:[85,64,93,0,15,40,10],s===1?[85,64,93,0,15,40,10]:[55,125,18,0,65,112,-10],{lean:9,twist:s*10});
const swordA=limb([-65,45,75,-15,25,45,-5],[40,22,75,0,-15,30,0],{twist:-48,lean:8});
const swordB=limb([80,55,22,15,-12,25,0],[35,25,70,0,35,60,-10],{twist:52,lean:15});
const clips=[];
const add=(id,name,group,duration,frames,travel={},loop=false,guide="")=>clips.push({id,name,group,duration,frames,travel,loop,guide});
add("idle","战斗待机","移动",1.6,[idle,guard,idle],{},true);
add("walk","行走","移动",1.1,[step(1),step(-1),step(1)],{z:1.4},true);
add("run","奔跑","移动",.78,[step(1,true),step(-1,true),step(1,true)],{z:2.6,hop:.16},true);
add("sprint","冲刺","移动",.64,[limb([-65,15,90,0,66,70,10],[72,16,100,0,-45,125,-20],{lean:25,twist:15}),limb([72,16,100,0,-45,125,-20],[-65,15,90,0,66,70,10],{lean:25,twist:-15}),limb([-65,15,90,0,66,70,10],[72,16,100,0,-45,125,-20],{lean:25,twist:15})],{z:3.4,hop:.25},true);
add("backstep","后撤步","移动",.65,[guard,step(-1),guard],{z:-1.1});
add("strafe","侧移","移动",.85,[guard,limb([30,55,55,0,25,55,0],[40,32,70,0,-10,28,0],{lean:8,sideLean:12,spread:24}),guard],{x:1.25},true);
add("stop","急停","移动",.62,[step(1,true),limb([70,26,30,0,40,75,-8],[60,25,40,0,12,65,-8],{lean:-13}),idle],{z:.8});
add("crouch","深蹲起立","跳跃与闪避",1.25,[idle,crouch,crouch,idle]);
add("crouchwalk","蹲行","跳跃与闪避",1.05,[crouch,limb([45,20,70,0,75,118,-10],[50,18,60,0,48,85,-6],{lean:25}),crouch,limb([50,18,60,0,48,85,-6],[45,20,70,0,75,118,-10],{lean:25}),crouch],{z:.8},true);
add("jump","大跳","跳跃与闪避",1.25,[idle,crouch,reach,tuck,limb([40,20,30,0,20,35,12]),crouch,idle],{jump:1.22});
add("longjump","助跑远跳","跳跃与闪避",1.25,[step(1,true),crouch,reach,limb([65,20,80,0,75,110,0],[30,25,55,0,-35,85,0],{lean:23}),tuck,crouch,idle],{jump:.9,z:2.7});
add("doublejump","二段跳","跳跃与闪避",1.45,[crouch,reach,tuck,reach,tuck,crouch,idle],{jump:1.5,double:true});
add("fall","高处落地","跳跃与闪避",1.05,[reach,tuck,crouch,crouch,idle],{fall:1.5});
add("roll","前滚翻","跳跃与闪避",.9,[idle,crouch,{...tuck,rootPitch:90},{...tuck,rootPitch:180},{...tuck,rootPitch:270},{...crouch,rootPitch:360},{...idle,rootPitch:360}],{z:1.7});
add("backroll","后滚翻","跳跃与闪避",.95,[guard,crouch,{...tuck,rootPitch:-90},{...tuck,rootPitch:-180},{...tuck,rootPitch:-270},{...crouch,rootPitch:-360},{...idle,rootPitch:-360}],{z:-1.5});
add("dodge","侧闪","跳跃与闪避",.7,[guard,limb([25,50,50,0,35,75,0],[55,20,85,0,55,100,0],{sideLean:30,spread:20,lean:18}),guard],{x:1.3});
add("slide","滑铲","跳跃与闪避",.95,[step(1,true),limb([30,35,80,0,80,20,12],[45,30,90,0,65,120,-8],{lean:-30}),crouch,idle],{z:1.7});
add("turn","180°急转身","转向",.7,[guard,{...guard,rootYaw:45,twist:-25},{...crouch,rootYaw:100},{...guard,rootYaw:180}]);
add("spin","360°旋身","转向",.9,[guard,{...swordA,rootYaw:90},{...swordB,rootYaw:180},{...guard,rootYaw:270},{...guard,rootYaw:360}]);
add("slash","横向挥砍","战斗",.85,[guard,swordA,swordB,guard]);
add("overhead","纵向重砍","战斗",1.05,[guard,limb([45,125,35,0,15,35,0],[35,25,60,0,-12,22,0],{lean:-9,twist:-20}),limb([65,25,20,0,45,80,-10],[35,30,72,0,10,45,0],{lean:34,twist:18}),guard]);
add("uppercut","上挑斩","战斗",.82,[guard,{...crouch,twist:-24},limb([60,120,32,0,20,30,0],[25,25,80,0,-15,25,0],{lean:-12,twist:32}),guard]);
add("thrust","突刺","战斗",.8,[guard,swordA,limb([95,12,5,0,50,65,-5],[35,38,85,0,-25,35,0],{lean:25,twist:18}),guard],{z:.7});
add("combo","三段连击","战斗",1.65,[guard,swordA,swordB,{...swordA,twist:-35},limb([45,125,35,0,15,35,0],[35,25,60,0,-12,22,0]),swordB,guard]);
add("punch","直拳","战斗",.65,[guard,limb([85,12,3,0,30,40,0],[55,22,110,0,-10,30,0],{twist:32,lean:12}),guard]);
add("kick","高踢","战斗",.9,[guard,limb([30,40,85,0,90,115,0],[35,35,80,0,8,20,0],{lean:-13}),limb([25,55,70,0,100,15,10],[35,40,70,0,5,20,0],{lean:-25}),guard]);
add("block","防御格挡","战斗",.65,[idle,limb([65,20,105,-10,25,55,0],[70,20,110,-10,25,55,0],{lean:10}),guard]);
add("aim","举枪瞄准","战斗",.9,[idle,limb([85,12,15,0,15,25,0],[68,20,75,0,-10,20,0],{twist:12}),limb([85,12,15,0,15,25,0],[68,20,75,0,-10,20,0],{twist:12})]);
add("hit","受击踉跄","战斗",.75,[guard,limb([-45,52,25,0,10,45,0],[15,55,30,0,-25,65,0],{lean:-28,twist:-25}),guard],{z:-.35});
add("knockdown","击倒","战斗",1.15,[guard,limb([-45,65,35,0,20,50,0],[-30,55,35,0,-15,45,0],{rootPitch:-45}),{...tuck,rootPitch:-90},{...idle,rootPitch:-90}]);
add("getup","倒地起身","战斗",1.3,[{...idle,rootPitch:-90},{...tuck,rootPitch:-45},crouch,idle]);
add("wallclimb","攀墙上升","攀爬",1.2,[climb(1),climb(-1),climb(1)],{up:1.1},true,"wall");
add("ropeclimb","爬绳上升","攀爬",1.25,[limb([60,120,25,0,65,100,0],[85,65,95,0,35,85,0],{lean:6}),limb([85,65,95,0,35,85,0],[60,120,25,0,65,100,0],{lean:6}),limb([60,120,25,0,65,100,0],[85,65,95,0,35,85,0],{lean:6})],{up:1.2},true,"rope");
add("hang","悬挂","攀爬",1.1,[reach,limb([55,135,15,0,30,70,0],[55,135,15,0,15,45,0]),reach],{up:.65,hang:true},true,"ledge");
add("mantle","翻上平台","攀爬",1.45,[reach,climb(1),limb([85,25,90,0,90,130,-15],[75,30,85,0,45,80,0],{lean:38}),crouch,idle],{up:1.15,z:.8},"","ledge");
add("ladder","爬梯","攀爬",1.2,[climb(1),climb(-1),climb(1)],{up:.9},true,"ladder");
add("vault","撑越障碍","攀爬",1.1,[step(1,true),limb([85,25,20,0,65,105,0],[75,30,40,0,50,95,0],{lean:38,rootPitch:15}),tuck,crouch,idle],{z:1.6,jump:.65},false,"ledge");
add("crawl","低姿匍匐","攀爬",1.4,[{...climb(1),rootPitch:76,lean:15},{...climb(-1),rootPitch:76,lean:15},{...climb(1),rootPitch:76,lean:15}],{z:.85},true);
for(let c of clips){let p=c.frames[c.id==="mantle"||c.id==="thrust"?2:1];if(c.id==="dodge")p.abductL+=15;if(c.id==="thrust")p.abductR+=35;if(c.id==="punch")p.abductR+=25;if(c.id==="block"){p.abductR+=15;p.abductL+=15;p.elbowR-=30;p.elbowL-=30}if(c.id==="mantle")Object.assign(p,{shoulderR:35,shoulderL:35,abductR:55,abductL:55,elbowR:20,elbowL:20,lean:24,hipR:82});}return clips;
}
export function sample(clip,t){let n=clip.frames.length-1,x=Math.max(0,Math.min(1,t))*n,i=Math.min(n-1,Math.floor(x)),u=x-i;u=u*u*(3-2*u);let a=clip.frames[i],b=clip.frames[i+1],p={};for(let k of new Set([...Object.keys(a),...Object.keys(b)]))p[k]=(a[k]||0)*(1-u)+(b[k]||0)*u;return p}
export function world(M,clip,t,pose){let p=sample(clip,t),P=pose(M,p),rad=Math.PI/180,cl=x=>Math.max(0,Math.min(1,x)),sm=x=>{x=cl(x);return x*x*(3-2*x)},rx=(q,a)=>[q[0],q[1]*Math.cos(a)-q[2]*Math.sin(a),q[1]*Math.sin(a)+q[2]*Math.cos(a)],ry=(q,a)=>[q[0]*Math.cos(a)+q[2]*Math.sin(a),q[1],-q[0]*Math.sin(a)+q[2]*Math.cos(a)],rz=(q,a)=>[q[0]*Math.cos(a)-q[1]*Math.sin(a),q[0]*Math.sin(a)+q[1]*Math.cos(a),q[2]],sub=(q,c)=>q.map((v,i)=>v-c[i]),add=(q,c)=>q.map((v,i)=>v+c[i]),pivot=[0,1.42,0];
function local(q,r,zone){let w=zone===1||zone===2?1:zone>=3?0:sm((r[1]-1.38)/.52),v=sub(q,pivot);v=ry(v,(p.twist||0)*rad*w);v=rx(v,(p.lean||0)*rad*w);v=rz(v,-(p.sideLean||0)*rad*w);return add(v,pivot)}
function root(q){let v=sub(q,pivot);v=rx(v,(p.rootPitch||0)*rad);v=ry(v,(p.rootYaw||0)*rad);return add(v,pivot)}
let L=P.map((q,i)=>root(local(q,M.positions[i],M.zones[i]))),min=Math.min(...L.map(q=>q[1])),restMin=Math.min(...M.positions.map(q=>q[1])),tr=clip.travel||{},s=cl(t),h=0;
if(tr.jump){let u=cl((s-.16)/.67);h=tr.jump*(tr.double?doubleHeight(u):Math.sin(Math.PI*u));if(s<.16||s>.83)h=0;}
if(tr.hop)h+=tr.hop*Math.abs(Math.sin(s*2*Math.PI));if(tr.fall)h+=tr.fall*Math.pow(Math.max(0,1-s/.52),2);if(tr.up)h+=tr.up*(tr.hang?1:s);
let shift=[(tr.x||0)*s,restMin-min+h,(tr.z||0)*s];let apply=q=>add(q,shift);let modules=Object.fromEntries(Object.entries(M.modules).map(([k,m])=>[k,{...m,positions:m.positions.map(q=>apply(root(local(q,q,0))))}]));return {positions:L.map(apply),modules,p,shift,height:h}}
function doubleHeight(u){let k=[[0,0],[.23,.58],[.43,.40],[.67,1],[1,0]],i=0;while(i<k.length-2&&u>k[i+1][0])i++;let t=(u-k[i][0])/(k[i+1][0]-k[i][0]);t=t*t*(3-2*t);return k[i][1]*(1-t)+k[i+1][1]*t}
export function correct(M,P){
let Q=P.map(p=>p.slice()),sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function cosine(f){let [a,b,c,d]=f.map(i=>Q[i]),n=cross(sub(b,a),sub(c,a)),m=cross(sub(c,a),sub(d,a));return dot(n,m)/Math.max(1e-12,Math.hypot(...n)*Math.hypot(...m))}
let allowed=M.positions.map(p=>(p[1]>1.10&&p[1]<1.62)||(p[1]>1.80&&p[1]<2.08));let fs=M.polygons.filter(f=>f.every(i=>allowed[i]));
for(let pass=0;pass<12;pass++){let changed=0;for(let f of fs){let cos=cosine(f);if(cos>=.06)continue;let grad=[],sum=0;for(let i of f){let g=[];for(let k=0;k<3;k++){let x=Q[i][k],h=.0001;Q[i][k]=x+h;let a=cosine(f);Q[i][k]=x-h;let b=cosine(f);Q[i][k]=x;g.push((a-b)/(2*h))}grad.push(g);sum+=dot(g,g)}if(sum<1e-8)continue;let scale=Math.min(.018/(Math.sqrt(sum)||1),(.13-cos)/sum*.8);for(let j=0;j<4;j++){let i=f[j],v=Q[i].map((x,k)=>x+grad[j][k]*scale),d=sub(v,P[i]),len=Math.hypot(...d);if(len>.065)v=P[i].map((x,k)=>x+d[k]*.065/len);Q[i]=v}changed++}if(!changed)break}return Q}

export function evaluate(M,clip,t,pose){let q=world(M,clip,t,pose);q.positions=correct(M,q.positions);return q}
