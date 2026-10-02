import {createCityPaperAtlas} from './city-art.js';

/** A continuous school-to-shop street made from illustrated, folded cardstock. */
export function createCityScenery({THREE,scene,world,flags={}}){
  const group=new THREE.Group();group.name='21:00 paper city street';scene.add(group);
  const atlas=createCityPaperAtlas({THREE});
  const facadeMaterial=new THREE.MeshLambertMaterial({color:0xffffff,map:atlas.color,vertexColors:true,
    emissive:0xffffff,emissiveMap:atlas.emissive,emissiveIntensity:.76,side:THREE.FrontSide});
  facadeMaterial.name='Illustrated city facades and selected lit windows';
  const paperMaterial=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:THREE.FrontSide});
  paperMaterial.name='City folded paper stock and narrow cut edges';
  const batches=new Map(),cards=[],color=new THREE.Color();
  const baseY=x=>world?.surfaceY(x,0)??.5;
  function batchFor(x,material,{castShadow=true,receiveShadow=true,distant=false}={}){
    const chunk=Math.floor(x/14),key=[chunk,material,castShadow,receiveShadow,distant].join('/');
    if(!batches.has(key))batches.set(key,{chunk,material,castShadow,receiveShadow,distant,positions:[],normals:[],uvs:[],colors:[],names:new Set()});
    return batches.get(key);
  }
  function triangle(batch,a,b,c,uvA,uvB,uvC,hex=0xffffff){
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz)||1;
    color.setHex(hex);
    for(const [point,uv] of [[a,uvA],[b,uvB],[c,uvC]]){
      batch.positions.push(...point);batch.normals.push(nx/length,ny/length,nz/length);batch.uvs.push(...uv);batch.colors.push(color.r,color.g,color.b);
    }
  }
  function card({name,points,x=0,y=.5,z=-3,depth=.07,region=null,tint=0xffffff,stock=0x738496,edge=0xa0aaae,angle=0,...options}){
    const outline=points.map(([px,py])=>new THREE.Vector2(px,py));
    if(THREE.ShapeUtils.isClockWise(outline))outline.reverse();
    const xs=outline.map(p=>p.x),ys=outline.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),spanX=Math.max(...xs)-minX,spanY=Math.max(...ys)-minY;
    const material=region?0:1,front=batchFor(x,material,options),back=batchFor(x,1,options);
    front.names.add(name);back.names.add(name);
    const transform=(point,d)=>[x+point.x*Math.cos(angle)+d*Math.sin(angle),y+point.y,z-point.x*Math.sin(angle)+d*Math.cos(angle)];
    const uv=point=>region?[region.u0+(point.x-minX)/spanX*(region.u1-region.u0),region.v0+(point.y-minY)/spanY*(region.v1-region.v0)]:[0,0];
    for(const face of THREE.ShapeUtils.triangulateShape(outline,[])){
      const [a,b,c]=face.map(i=>outline[i]);
      triangle(front,transform(a,depth/2),transform(b,depth/2),transform(c,depth/2),uv(a),uv(b),uv(c),region?tint:stock);
      triangle(back,transform(a,-depth/2),transform(c,-depth/2),transform(b,-depth/2),[0,0],[0,0],[0,0],stock);
    }
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];
      triangle(back,transform(a,depth/2),transform(a,-depth/2),transform(b,-depth/2),[0,0],[0,0],[0,0],edge);
      triangle(back,transform(a,depth/2),transform(b,-depth/2),transform(b,depth/2),[0,0],[0,0],[0,0],edge);
    }
    cards.push({name,x,y,z,width:spanX,height:spanY,depth,region:region??null,distant:!!options.distant});
  }
  const rect=(w,h)=>[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]];
  const panel=(name,x,y,z,w,h,region,options={})=>card({name,x,y,z,points:rect(w,h),region,...options});
  function canopy(name,x,y,z,width,depth,stock=0x6d8595){
    // Two broad bent faces and a thin hanging lip form a folded paper awning.
    const front=batchFor(x,1),a=[x-width/2,y,z],b=[x+width/2,y,z],c=[x+width/2,y-.18,z+depth],d=[x-width/2,y-.18,z+depth];
    front.names.add(name);triangle(front,a,d,c,[0,0],[0,0],[0,0],stock);triangle(front,a,c,b,[0,0],[0,0],[0,0],stock);
    triangle(front,a,b,c,[0,0],[0,0],[0,0],0x526a7d);triangle(front,a,c,d,[0,0],[0,0],[0,0],0x526a7d);
    panel(name+' cut lip',x,y-.35,z+depth,width,.18,null,{stock,edge:0xa1afb6,depth:.035});
  }
  function strip(name,points,z,width,stock=0x4e627c){
    const batch=batchFor(points[0][0],1);batch.names.add(name);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len*width*.5,ny=(b[0]-a[0])/len*width*.5;
      const p=[a[0]+nx,a[1]+ny,z],q=[b[0]+nx,b[1]+ny,z],r=[b[0]-nx,b[1]-ny,z],s=[a[0]-nx,a[1]-ny,z];
      triangle(batch,p,r,q,[0,0],[0,0],[0,0],stock);triangle(batch,p,s,r,[0,0],[0,0],[0,0],stock);
      triangle(batch,p,q,r,[0,0],[0,0],[0,0],stock);triangle(batch,p,r,s,[0,0],[0,0],[0,0],stock);
    }
  }

  // Tall, staggered buildings leave two oblique moonlight corridors open.
  const distantBuildings=[
    [-17.5,-22,5.3,17.5],[-10.3,-25,5.8,21],[-2.6,-23,4.1,15.8],
    [5.5,-25,5.5,20.5],[14.2,-24,6.2,17.2],[24.0,-23,6.1,21.5],[33.0,-25,5.7,18.8],
    [-11.8,-13.8,5.5,12.8],[-3.7,-15.5,4.9,11.6],[6.1,-15.8,5.2,14.3],
    [17.0,-16.8,5.5,13.6],[27.2,-14.7,5.4,12.5],
  ];
  distantBuildings.forEach(([x,z,w,h],i)=>{
    const profile=[[-w/2,0],[w/2,0],[w/2,h-.48],[w*.29,h-.48],[w*.29,h],[-w*.15,h],[-w*.15,h-.26],[-w/2,h-.26]];
    card({name:'Layered skyline '+i,x,y:.45,z,points:profile,depth:.085,region:atlas.regions.highrise,
      tint:i<7?0xaebed0:0xc2ccd2,stock:0x475d75,edge:i<7?0x6d8297:0x8899a6,distant:true,castShadow:i>=7});
    panel('Skyline folded return '+i,x+w/2-.20,.45,z-.50,.65,h-.50,null,
      {stock:i<7?0x435a73:0x566e84,edge:0x738697,angle:-.65,distant:true,castShadow:i>=7});
    panel('Rooftop utility '+i,x-w*.09,h+.45,z-.04,w*.22,.36,null,{stock:0x50677e,edge:0x8192a0,distant:true,castShadow:false});
    if(i%3===0)strip('Rooftop aerial '+i,[[x+.2,h+.78],[x+.2,h+1.54],[x-.20,h+1.31],[x+.54,h+1.31]],z,.038,0x758ba2);
  });

  // The school is a recognisable civic building, with a gate set in front.
  card({name:'School main teaching building',x:-5.2,y:baseY(-5.2),z:-4.45,depth:.12,
    points:[[-5.4,0],[5.4,0],[5.4,7.75],[4.15,7.75],[4.15,8.25],[-2.6,8.25],[-2.6,7.96],[-5.4,7.96]],region:atlas.regions.school,stock:0x64778a,edge:0xa3adb3});
  panel('School west folded wall',-10.47,.5,-4.9,.75,7.96,null,{stock:0x65768a,edge:0x9ba8b2,angle:.72,depth:.07});
  panel('School roof parapet',-5.2,8.39,-4.36,10.78,.19,null,{stock:0x81919e,edge:0xb0b6b3});
  for(const x of [-2.35,2.35]){
    panel('School gate stone-paper pillar',x,.5,-2.55,.47,3.55,null,{stock:0x8794a0,edge:0xb9bdb5,depth:.14});
    panel('School gate pillar foot',x,.5,-2.48,.64,.23,null,{stock:0x64798d,edge:0x9caab1,depth:.17});
    panel('School gate pillar cap',x,3.99,-2.51,.65,.18,null,{stock:0xa4afb2,edge:0xc2c6ba,depth:.18});
  }
  panel('School name board',0,3.88,-2.52,5.8,.98,atlas.regions.gate,{depth:.11,stock:0x657b8a,edge:0xb7bcae});
  canopy('School gate folded roof',0,4.92,-2.64,6.15,.75,0x617f91);
  // Open central gate, with short paper rail panels to either side.
  for(const [center,width] of [[-5.6,5.5],[4.10,2.9]]){
    for(let i=0;i<=Math.floor(width/.33);i++){
      const x=center-width/2+i*.33;
      card({name:'School thin ironwork on card',x,y:.5,z:-2.1,depth:.025,stock:0x647b8f,edge:0x9cabb4,
        points:[[-.025,0],[.025,0],[.025,1.92],[0,2.03],[-.025,1.92]]});
    }
    panel('School railing upper',center,2.20,-2.05,width,.07,null,{stock:0x8296a4,edge:0xaeb9ba,depth:.03});
    panel('School railing lower',center,.91,-2.05,width,.055,null,{stock:0x647d93,edge:0x95a5af,depth:.025});
    panel('School boundary plinth',center,.5,-2.16,width,.27,null,{stock:0x748697,edge:0x9eaeb3,depth:.13});
  }
  const detail=atlas.regions.detail;
  const crop=(region,u0,v0,u1,v1)=>({u0:region.u0+(region.u1-region.u0)*u0,v0:region.v0+(region.v1-region.v0)*v0,
    u1:region.u0+(region.u1-region.u0)*u1,v1:region.v0+(region.v1-region.v0)*v1,aspect:1});
  panel('School notice case',-3.46,1.05,-1.98,.91,1.20,crop(detail,271/768,21/192,389/768,174/192),{depth:.065});

  // Three complementary street fronts share the printed atlas and thin edges.
  panel('Convenience store upper floors',12.0,.5,-3.32,6.48,8.7,atlas.regions.office,{depth:.09,edge:0x9cabb4});
  panel('Convenience store folded corner',15.05,.5,-3.53,.73,8.7,null,{stock:0x5d748b,edge:0x889cae,angle:-.63});
  panel('Convenience store illuminated facade',12.0,.5,-2.68,6.12,3.88,atlas.regions.store,{depth:.085,edge:0xafbec0});
  canopy('Convenience store blue paper awning',12,4.45,-2.80,6.42,.69,0x6f949e);
  panel('Store threshold folded lip',12,.50,-2.54,6.2,.10,null,{stock:0x9bafb8,edge:0xc6d2d0,depth:.27});
  panel('Pharmacy upper floors',18.15,.5,-3.72,4.72,7.85,atlas.regions.office,{tint:0xc4d1cc,depth:.10,edge:0x929faa});
  panel('Pharmacy illuminated facade',18.15,.5,-2.84,4.61,3.76,atlas.regions.pharmacy,{depth:.075,edge:0x9fb8b5});
  canopy('Pharmacy folded canopy',18.15,4.30,-2.96,4.89,.55,0x71918b);
  panel('Closed shop upper floors',23.25,.5,-3.83,4.71,8.95,atlas.regions.office,{tint:0xbcc9d8,depth:.09,edge:0x91a1b2});
  panel('Closed stationery store',23.25,.5,-2.96,4.64,3.79,atlas.regions.closed,{depth:.085,edge:0xa1abb5});
  canopy('Stationery folded canopy',23.25,4.33,-3.08,4.82,.46,0x737f93);
  panel('Store roof fascia',12,9.11,-3.27,6.62,.15,null,{stock:0x8da1ae,edge:0xabb9bc});
  panel('Pharmacy parapet',18.15,8.29,-3.66,4.85,.14,null,{stock:0x8ba29f,edge:0xb0bfba});
  panel('Stationery parapet',23.25,9.39,-3.75,4.85,.15,null,{stock:0x8c9bae,edge:0xb4bdc3});
  // A few broad air-conditioner cards and the rain pipe establish human scale.
  for(const [x,y,z] of [[14.3,5.18,-3.17],[16.9,5.38,-3.57],[24.52,5.63,-3.68]]){
    panel('Folded air conditioner case',x,y,z,.73,.46,crop(detail,412/768,21/192,545/768,174/192),{depth:.11,edge:0xa0b1bd});
    strip('Air conditioner pipe',[[x+.30,y],[x+.32,y-.19],[x+.45,y-.23]],z+.015,.033,0x8ca4b6);
  }
  strip('Shop rain downpipe',[[8.85,8.6],[8.85,4.5],[8.65,4.2],[8.65,.63]],-2.98,.073,0x617d94);

  // Sparse street furniture is also cut from sheets; nothing is a round pole.
  function lamp(x,y,z,name){
    card({name:name+' folded pole',x,y:.5,z,depth:.042,stock:0x687f97,edge:0xa6b7c3,
      points:[[-.075,0],[.075,0],[.053,y-.89],[.22,y-.76],[.90,y-.76],[.94,y-.62],[.22,y-.58],[-.04,y-.68]]});
    panel(name+' pedestal',x,.5,z,.24,.21,null,{stock:0x5b7189,edge:0x8ba3b5,depth:.10});
    panel(name+' cool lamp head',x+.73,y-.17,z+.035,.56,.15,crop(detail,571/768,117/192,722/768,157/192),{depth:.06,edge:0xb6c8d2});
  }
  lamp(1.62,5.69,-.01,'School road light');lamp(13.42,5.20,.37,'Store road light');
  panel('Street sign pole',6.5,.5,-1.5,.074,3.01,null,{stock:0x7188a0,edge:0xa6b9c5,depth:.037});
  panel('School road sign',6.5,2.77,-1.44,1.32,.79,crop(detail,12/768,14/192,247/768,180/192),{depth:.042,edge:0xbdcac5});
  for(const [x,z] of [[7.3,-1.45],[15.58,-1.37],[21.05,-1.42]]){
    card({name:'Folded street bin',x,y:.5,z,depth:.10,stock:0x5f7b90,edge:0x9cabb9,
      points:[[-.24,0],[.24,0],[.26,.63],[.19,.76],[-.19,.76],[-.26,.63]]});
    panel('Street bin slot',x,1.02,z+.07,.30,.085,null,{stock:0x344f6a,edge:0x7893a7,depth:.025});
  }
  // One low roadside rail; the walking lane and every shop entrance stay open.
  for(const [center,width] of [[-5.7,4.2],[19.2,3.3]]){
    for(const dx of [-width/2,0,width/2])panel('Roadside paper rail post',center+dx,.5,1.40,.055,.67,null,{stock:0x8297a9,edge:0xaec0ca,depth:.04});
    panel('Roadside paper rail',center,1.05,1.40,width,.05,null,{stock:0x879fab,edge:0xbbc8cc,depth:.032});
  }
  for(const [x0,x1,y,z] of [[-8.5,3.3,6.60,-3.72],[8.6,20.3,6.04,-3.00]]){
    const points=[];for(let i=0;i<=12;i++){const t=i/12;points.push([x0+(x1-x0)*t,y-.24*Math.sin(Math.PI*t)]);}
    strip('Sagging printed service wire',points,z,.022,0x455d77);
  }

  let triangles=0;
  for(const batch of batches.values()){
    if(!batch.positions.length)continue;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,batch.material===0?facadeMaterial:paperMaterial);mesh.name=`City paper batch ${batch.chunk}/${batch.material}/${batch.distant}`;
    mesh.castShadow=batch.castShadow;mesh.receiveShadow=batch.receiveShadow;mesh.frustumCulled=true;
    mesh.userData={cityPaperBatch:true,chunk:batch.chunk,distant:batch.distant,parts:[...batch.names]};group.add(mesh);triangles+=batch.positions.length/9;
  }
  function localLight(name,x,y,z,tx,ty,tz,hex){
    const light=new THREE.SpotLight(hex,4,14,.46,.38,1.5);light.name=name;light.position.set(x,y,z);
    light.target.position.set(tx,ty,tz);light.castShadow=true;light.shadow.mapSize.set(512,512);
    light.shadow.camera.near=.15;light.shadow.camera.far=15;light.shadow.bias=-.00035;light.shadow.normalBias=.018;light.shadow.radius=1.4;
    light.userData.volumetricIntensity=.85;light.userData.cityLocalLight=true;scene.add(light);scene.add(light.target);return light;
  }
  const localLights=[localLight('School gate cool streetlight',1,5.5,.1,2,.5,-.1,0xd5e8ff),
    localLight('Convenience store cool streetlight',12,5,.5,12,.5,0,0xcde4fa)];
  const stats={cards:cards.length,triangles,batches:group.children.length,materials:2,localLights:localLights.length,
    atlasWidth:atlas.stats.width,atlasHeight:atlas.stats.height,atlasBytes:atlas.stats.textureBytes,illustratedTiles:atlas.stats.tiles,
    regions:atlas.regions,signText:atlas.stats.signText};
  group.userData.city={...stats,landmarks:[{name:'school gate',x:0},{name:'convenience store',x:12},{name:'closed shop',x:23}]};
  flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;
  return {group,localLights,stats:()=>({...stats})};
}
