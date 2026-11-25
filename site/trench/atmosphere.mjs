// Shared pixel-sky and atmosphere controls, no photo overlays.
export const ENVIRONMENTS={
 rain:{fog:[.48,.51,.51],sky:[.23,.30,.35],sun:[-.52,.72,.28],density:.018,wet:1},
 dusk:{fog:[.66,.49,.36],sky:[.25,.32,.43],sun:[-.86,.34,.23],density:.0095,wet:.18},
 clear:{fog:[.67,.69,.65],sky:[.35,.46,.56],sun:[-.58,.78,.21],density:.0075,wet:0}
};
export function regionEnvironment(env,z){return z>=-92?env:{...env,density:env.density*(z>=-220?.78:.69)}}
const fract=x=>x-Math.floor(x),cl=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t,hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
function noise(x,y){let a=Math.floor(x),b=Math.floor(y),u=fract(x),v=fract(y);u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v)}
export function skyPixel(u,v,env,yaw=0,pitch=0,white=false){
 let elevation=cl((1-v-.44+pitch*.46)*1.65),x=Math.floor((u+yaw*.16)*180)/180,y=Math.floor((v-pitch*.27)*110)/110;
 let cloud=noise(x*8,y*6)*.68+noise(x*18+3,y*13)*.32,c=cl((cloud-.45)*3.7)*cl(elevation*3),fade=cl(elevation*.98);
 let top=white?[.76,.77,.77]:env.sky||env.fog,low=white?[.88,.87,.84]:env.fog;
 return top.map((a,i)=>cl(mix(low[i],a,fade)+c*(env.wet>.5?-.12:.115)*fade))
}
export const SKY_VS='attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
export const SKY_FS=`precision mediump float;
varying vec2 uv;uniform vec3 horizon,zenith;uniform float heading,pitch,wet,white;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){float v=1.-uv.y,e=clamp((uv.y-.44+pitch*.46)*1.65,0.,1.);vec2 p=floor(vec2(uv.x+heading*.16,v-pitch*.27)*vec2(180.,110.))/vec2(180.,110.);float c=clamp((ns(p*vec2(8,6))*.68+ns(p*vec2(18,13)+vec2(3,0))*.32-.45)*3.7,0.,1.)*clamp(e*3.,0.,1.);vec3 lo=mix(horizon,vec3(.88,.87,.84),white),hi=mix(zenith,vec3(.76,.77,.77),white);gl_FragColor=vec4(clamp(mix(lo,hi,e*.98)+c*(wet>.5?-.12:.115)*e,0.,1.),1.);}`;
