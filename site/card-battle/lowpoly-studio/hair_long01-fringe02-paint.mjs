export function paintFringe(){
const width=256,height=256,data=new Uint8Array(width*height*4);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const paths=[
{p:[[0,0],[.29,0],[.31,.22],[.25,.43],[.20,.62],[.12,.81],[.065,.96],[.025,.86],[0,.72]],axis:.14,tone:[231,215,236]},
{p:[[.12,0],[.47,0],[.48,.19],[.43,.41],[.36,.56],[.29,.70],[.23,.78],[.235,.66],[.19,.72],[.13,.78],[.15,.58],[.13,.36]],axis:.30,tone:[247,234,245]},
{p:[[.34,0],[.65,0],[.66,.23],[.61,.45],[.55,.62],[.49,.78],[.43,.86],[.43,.73],[.38,.77],[.35,.68],[.33,.45]],axis:.49,tone:[250,237,247]},
{p:[[.57,0],[.86,0],[.89,.24],[.87,.43],[.80,.61],[.72,.75],[.68,.79],[.68,.67],[.63,.71],[.59,.62],[.57,.40]],axis:.72,tone:[244,230,243]},
{p:[[.76,0],[1,0],[1,.77],[.96,.89],[.91,.98],[.87,.86],[.82,.79],[.79,.62],[.77,.38]],axis:.88,tone:[231,215,236]}
];
// Round the roots and long curves lightly, retain pointed lower corners.
function smooth(p){let a=[];for(let i=0;i<p.length;i++){let x=p[i],y=p[(i+1)%p.length];if(x[1]>.62||y[1]>.62){a.push(x);continue}a.push([x[0]*.8+y[0]*.2,x[1]*.8+y[1]*.2],[x[0]*.2+y[0]*.8,x[1]*.2+y[1]*.8])}return a}
const inside=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
for(let l of paths)l.p=smooth(l.p);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,z=(y+.5)/height,col=null;for(let i of [0,4,1,3,2]){let l=paths[i];if(!inside(l.p,u,z))continue;let axis=l.axis+(i-2)*.025*z,d=u-axis;let shade=.04+.16*z+.22*Math.min(1,Math.pow(Math.abs(d)/.18,2));if(d>.045&&z>.24)shade+=.10;let shine=.20*Math.exp(-Math.pow((z-.29-.05*Math.cos(u*7))/.13,2));col=mix(l.tone,[158,136,190],shade-shine);if(z>.30&&(!inside(l.p,u+.006,z)||!inside(l.p,u-.006,z)))col=mix(col,[166,146,193],.32)}if(col)data.set([...col.map(Math.round),255],(y*width+x)*4)}
return {width,height,data};
}
