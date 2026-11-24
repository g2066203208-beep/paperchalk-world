export function paintFront(){
const w=256,h=256,data=new Uint8Array(w*h*4);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const path=(start,segments)=>{let p=[start],a=start;for(let [b,c,d] of segments){for(let i=1;i<=24;i++){let t=i/24,s=1-t;p.push([s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]])}a=d}return p};
const inside=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
const P=(s,...q)=>path(s,q);
// Three deliberately different broad locks. UV alpha defines the silhouette, not geometry.
let locks=[
{p:P([-.08,-.08],[[.14,-.08],[.32,-.07],[.42,.04]],[[.38,.23],[.32,.42],[.22,.65]],[[.16,.76],[.10,.85],[.035,.92]],[[.01,.79],[-.02,.58],[-.08,.42]], [[-.09,.24],[-.09,.07],[-.08,-.08]]),light:[242,230,243],shade:[190,170,208],axis:y=>.25-.16*y},
{p:P([.42,-.08],[[.62,-.08],[.89,-.08],[1.08,-.08]],[[1.08,.29],[1.03,.62],[.99,.89]],[[.94,.91],[.85,.83],[.81,.77]],[[.73,.69],[.66,.49],[.64,.31]],[[.58,.16],[.49,.04],[.42,-.08]]),light:[244,233,246],shade:[186,166,204],axis:y=>.74+.14*y},
{p:P([.27,-.08],[[.38,-.08],[.55,-.08],[.66,-.02]],[[.70,.16],[.76,.37],[.70,.55]],[[.65,.72],[.58,.87],[.48,.96]],[[.40,.89],[.31,.80],[.26,.68]],[[.20,.51],[.21,.30],[.23,.16]],[[.24,.04],[.26,-.03],[.27,-.08]]),light:[251,241,249],shade:[201,184,218],axis:y=>.43+.07*Math.sin(y*2.8)}
];
for(let y=0;y<h;y++)for(let x=0;x<w;x++){let u=(x+.5)/w,z=(y+.5)/h;let col=null;
for(let l of locks){if(!inside(l.p,u,z))continue;let d=u-l.axis(z),shadow=.05+.20*z+.28*Math.pow(Math.min(1,Math.abs(d)/.23),2);let glint=.17*Math.exp(-Math.pow((z-.32-.07*Math.sin(u*5))/.17,2));col=mix(l.light,l.shade,shadow-glint); // broad soft cel-shaded lock, no repeated stripes
// Narrow painted contour only where a lock lies over another.
if(inside(l.p,u-.006,z)!==inside(l.p,u+.006,z)&&z>.23)col=mix(col,l.shade,.32);
}
if(col)data.set([...col.map(Math.round),255],(y*w+x)*4);
}
return {width:w,height:h,data};
}
