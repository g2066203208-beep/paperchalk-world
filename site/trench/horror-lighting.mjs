// V32 shared horror lighting. World-space lighting, no grain or full-screen dark overlay.
export const HORROR={fog:[.155,.196,.225],sky:[.038,.063,.091],sun:[-.62,.58,.52],density:.023,wet:.88,horror:1};
export const LAMP_COLOR=[1.0,.64,.30],NIGHT_AMBIENT=[.14,.20,.27];
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=cl(x);return x*x*(3-2*x)},dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)};
export function selectLights(all,eye,max=6){
 return all.map(p=>[p,Math.hypot(p[0]-eye[0],p[2]-eye[2])]).filter(x=>x[1]<46).sort((a,b)=>a[1]-b[1]).slice(0,max).map(x=>x[0]);
}
export function surfaceLight({p,n,eye,sun,visibility=1,ao=1,wet=.88,mat=0,lights=[],night=1}){
 const d=cl(dot(n,norm(sun))),up=Math.max(0,n[1]),a=cl(ao,.45,1),moon=Math.floor(d*5+.5)/5*visibility;
 const light=night?NIGHT_AMBIENT.map((v,i)=>(v+[.06,.08,.09][i]*up)*a+[.15,.22,.31][i]*moon):[.34,.39,.43].map((v,i)=>(v+[.20,.19,.16][i]*up)*a+[.49,.42,.31][i]*moon*(1-wet*.30));
 const sheen=[0,0,0],view=norm(eye.map((x,i)=>x-p[i]));
 if(night)for(const q of lights){let delta=q.slice(0,3).map((x,i)=>x-p[i]),dist=Math.hypot(...delta);if(dist>=q[3])continue;let L=norm(delta),edge=smooth(1-dist/q[3]),att=edge*edge*2.65,nd=Math.max(0,dot(n,L)),diff=att*(.17+.83*nd),half=norm(L.map((x,i)=>x+view[i])),spec=wet*up*att*Math.pow(Math.max(0,dot(n,half)),18)*([0,4,18,19,35,47,48].includes(mat)?.68:.17);for(let i=0;i<3;i++){light[i]+=LAMP_COLOR[i]*diff;sheen[i]+=LAMP_COLOR[i]*spec;}}
 if(night&&mat===43)for(let i=0;i<3;i++)sheen[i]+=LAMP_COLOR[i]*.8;
 return {light,sheen};
}
export function fogFactor(dist,y,density,night=1){return cl(1-Math.exp(-dist*density*(night?.65+.75*Math.exp(-Math.max(0,y-2.2)*.27):.75+.25*Math.exp(-Math.max(0,y-2)*.035))),0,.96)}
export function shadeSurface(base,params,env){let {light,sheen}=surfaceLight(params),f=fogFactor(Math.hypot(...params.p.map((x,i)=>x-params.eye[i])),params.p[1],env.density,params.night);return base.map((v,i)=>cl((v*light[i]+sheen[i])*(1-f)+env.fog[i]*f))}
export const HORROR_GLSL=`
uniform vec4 uLamps[6];uniform float uHorror;uniform vec3 uEye;
void localHorror(vec3 p,vec3 n,float mat,float wet,inout vec3 lighting,inout vec3 sheen){
 if(uHorror<.5)return;
 vec3 view=normalize(uEye-p);
 for(int i=0;i<6;i++){
  vec4 lamp=uLamps[i];if(lamp.w<=0.)continue;
  vec3 delta=lamp.xyz-p;float dist=length(delta);if(dist>=lamp.w)continue;
  vec3 L=delta/max(.001,dist);float t=clamp(1.-dist/lamp.w,0.,1.);t=t*t*(3.-2.*t);
  float att=t*t*2.65,nd=max(0.,dot(n,L));vec3 col=vec3(1.,.64,.30);
  lighting+=col*att*(.17+.83*nd);
  float surface=(mat==0.||mat==4.||mat==18.||mat==19.||mat==35.||mat==47.||mat==48.)?.68:.17;
  sheen+=col*wet*max(0.,n.y)*att*pow(max(0.,dot(n,normalize(L+view))),18.)*surface;
 }
 if(mat==43.)sheen+=vec3(1.,.64,.30)*.8;
}
`;
