/* Universal 2.5D environment geometry presets.
 * ring/arc stays authored in the original worldMesh; these are two other
 * SHAPES of the same WebGL scene, never a separate subway renderer.
 * Each vertex is [worldX,worldY,worldZ,textureU,textureV].
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldSceneGeometry=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const TYPES=Object.freeze(['arc','strip','box']);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
 function geometry(input={}){
  const shape=TYPES.includes(input.shape)?input.shape:'arc';
  if(shape==='arc')return Object.freeze({shape});
  const width=clamp(input.widthMeters??input.width,5,40);
  const depth=clamp(input.depthMeters??input.depth,3,16);
  const height=clamp(input.heightMeters??input.height,2.2,4.2);
  const backZ=clamp(input.backZ,-2,16);
  return Object.freeze({shape,width,depth,height,backZ,frontZ:backZ+depth});
 }
 function build(input){
  const g=geometry(input);
  if(g.shape==='arc')throw Error('Arc remains the original universal ring mesh');
  const out={floorOuter:[],floorInner:[],backInner:[],backOuter:[],
   ceilingOuter:[],ceilingInner:[],wingOuter:[],wingInner:[],exterior:[]};
  const tri=(dst,a,b,c)=>dst.push(...a,...b,...c);
  const grid=(dst,n,m,vertex)=>{
   for(let i=0;i<n;i++)for(let j=0;j<m;j++){
    const a=vertex(i/n,j/m),b=vertex((i+1)/n,j/m);
    const c=vertex((i+1)/n,(j+1)/m),d=vertex(i/n,(j+1)/m);
    tri(dst,a,b,c);tri(dst,a,c,d);
   }
  };
  const x=u=>(u-.5)*g.width, z=v=>g.backZ+g.depth*v;
  // Separate real floor and ceiling meshes; natural tile repeat distance.
  for(const [kind,y,tile] of [['floor',0,1.2],['ceiling',g.height,1.9]]){
   const data=[];
   grid(data,48,28,(u,v)=>[x(u),y,z(v),(x(u)+g.width/2)/tile,g.depth*v/tile]);
   out[kind+'Outer']=data;out[kind+'Inner']=data.slice();
  }
  // The author-provided 2048x1024 picture is ONE continuous wall. Never
  // tile a second train door, or curve it as though it were a shop facade.
  const wall=[];
  grid(wall,64,12,(u,v)=>[x(u),g.height*v,g.backZ,.001+u*.998,v]);
  out.backInner=wall;out.backOuter=wall.slice();
  // Physical outside beyond the pierced window apertures, rendered first
  // into the same depth buffer. This is a genuine separate 3D backdrop.
  grid(out.exterior,64,12,(u,v)=>[x(u),g.height*v,g.backZ-.16,u,v]);
  // True perpendicular end walls looking into the NEXT carriage.
  // The gangway texture is continuous from back to front and has its own
  // color texture; never stretch the side-wall's first and last columns.
  const wings=[];
  for(const side of [-1,1])
   grid(wings,28,12,(u,v)=>[
    side*g.width/2,g.height*v,z(u),side<0?u:1-u,v
   ]);
  out.wingOuter=wings;out.wingInner=wings.slice();
  return Object.freeze({geometry:g,meshes:out});
 }
 function lightRig(input){
  const g=geometry(input);
  if(g.shape==='arc')throw Error('Use original authored arc light rig');
  const positions=[];
  const xs=[-Math.min(4.15,g.width*.29),0,Math.min(4.15,g.width*.29)];
  const zs=[g.backZ+Math.min(g.depth*.22,1.8),
   g.backZ+Math.min(g.depth*.68,g.depth-1.0)];
  for(const z of zs)for(const x of xs)
   positions.push(x,g.height-.07,z);
  return Object.freeze({shape:g.shape,count:6,
   positions:new Float32Array(positions)});
 }
 return Object.freeze({TYPES,geometry,build,lightRig});
});
