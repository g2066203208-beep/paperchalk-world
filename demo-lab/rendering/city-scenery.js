import {createCityPaperAtlas} from './city-art.js';

/** Moon-lantern Academy Street: a small, layered, folded-paper neighbourhood. */
export function createCityScenery({THREE,scene,world,flags={}}){
  const group=new THREE.Group();group.name='Moonlit paper academy street';scene.add(group);
  const atlas=createCityPaperAtlas({THREE});
  const facadeMaterial=new THREE.MeshLambertMaterial({color:0xffffff,map:atlas.color,vertexColors:true,
    emissive:0xffffff,emissiveMap:atlas.emissive,emissiveIntensity:.74,side:THREE.FrontSide});
  facadeMaterial.name='Cream printed architectural paper and warm window ink';
  const paperMaterial=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:THREE.FrontSide});
  paperMaterial.name='Coloured folded card with warm exposed cut edges';
  const batches=new Map(),cards=[],color=new THREE.Color();
  const P={cream:0xeadbb9,edge:0xffedc8,ivory:0xf7e9c9,teal:0x477f78,tealLight:0x75a497,tealDark:0x305d5d,
    sage:0x91a885,leaf:0x638c77,peach:0xd6a17f,rose:0xa56e75,ink:0x39485d,gold:0xc7a66c};
  const baseY=x=>world?.surfaceY(x,0)??.5;
  function batchFor(x,material,{castShadow=true,receiveShadow=true,distant=false}={}){
    const chunk=Math.floor(x/14),key=[chunk,material,castShadow,receiveShadow,distant].join('/');
    if(!batches.has(key))batches.set(key,{chunk,material,castShadow,receiveShadow,distant,positions:[],normals:[],uvs:[],colors:[],names:new Set()});
    return batches.get(key);
  }
  function triangle(batch,a,b,c,uvA=[0,0],uvB=[0,0],uvC=[0,0],hex=0xffffff){
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz)||1;
    color.setHex(hex);
    for(const [point,uv] of [[a,uvA],[b,uvB],[c,uvC]]){
      batch.positions.push(...point);batch.normals.push(nx/length,ny/length,nz/length);batch.uvs.push(...uv);batch.colors.push(color.r,color.g,color.b);
    }
  }
  function card({name,points,x=0,y=.5,z=-3,depth=.065,region=null,tint=0xffffff,stock=P.cream,edge=P.edge,angle=0,...options}){
    const outline=points.map(([px,py])=>new THREE.Vector2(px,py));
    if(THREE.ShapeUtils.isClockWise(outline))outline.reverse();
    const xs=outline.map(p=>p.x),ys=outline.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),spanX=Math.max(...xs)-minX,spanY=Math.max(...ys)-minY;
    const front=batchFor(x,region?0:1,options),back=batchFor(x,1,options);
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
    cards.push({name,x,y,z,width:spanX,height:spanY,depth,region,distant:!!options.distant});
  }
  const rect=(w,h)=>[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]];
  const panel=(name,x,y,z,w,h,region=null,options={})=>card({name,x,y,z,points:rect(w,h),region,...options});
  const disk=(name,x,y,z,r,stock,segments=20)=>card({name,x,y,z,depth:.04,stock,
    points:Array.from({length:segments},(_,i)=>[Math.cos(i*Math.PI*2/segments)*r,Math.sin(i*Math.PI*2/segments)*r])});
  function line(name,points,z,width,stock=P.tealDark){
    const batch=batchFor(points[0][0],1);batch.names.add(name);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!len)continue;
      const nx=-(b[1]-a[1])/len*width*.5,ny=(b[0]-a[0])/len*width*.5;
      const p=[a[0]+nx,a[1]+ny,z],q=[b[0]+nx,b[1]+ny,z],r=[b[0]-nx,b[1]-ny,z],s=[a[0]-nx,a[1]-ny,z];
      triangle(batch,p,r,q,[0,0],[0,0],[0,0],stock);triangle(batch,p,s,r,[0,0],[0,0],[0,0],stock);
      triangle(batch,p,q,r,[0,0],[0,0],[0,0],stock);triangle(batch,p,r,s,[0,0],[0,0],[0,0],stock);
    }
  }
  function canopy(name,x,y,z,width,depth,stock=P.teal,stripe=P.tealLight){
    const batch=batchFor(x,1);batch.names.add(name);
    const divisions=8;
    for(let i=0;i<divisions;i++){
      const x0=x-width/2+width*i/divisions,x1=x-width/2+width*(i+1)/divisions;
      const a=[x0,y,z],b=[x1,y,z],c=[x1,y-.26,z+depth],d=[x0,y-.26,z+depth],shade=i%2?stock:stripe;
      triangle(batch,a,d,c,[0,0],[0,0],[0,0],shade);triangle(batch,a,c,b,[0,0],[0,0],[0,0],shade);
      triangle(batch,a,b,c,[0,0],[0,0],[0,0],P.tealDark);triangle(batch,a,c,d,[0,0],[0,0],[0,0],P.tealDark);
    }
    const scallop=[[-width/2,.15],[width/2,.15],[width/2,0]];
    for(let i=divisions;i>0;i--){const right=-width/2+width*i/divisions,left=right-width/divisions;
      scallop.push([right-width/divisions*.22,-.035],[(left+right)/2,-.085],[left+width/divisions*.22,-.035],[left,0]);}
    card({name:name+' scalloped paper edge',x,y:y-.4,z:z+depth,points:scallop,stock,depth:.035});
  }
  function roof(name,x,y,z,w,h,stock=P.teal){
    card({name:name+' cream cut silhouette',x,y:y-.05,z:z-.025,depth:.1,stock:P.ivory,
      points:[[-w/2-.08,0],[w/2+.08,0],[w*.34,h+.06],[-w*.32,h+.06]]});
    card({name:name+' broad folded roof',x,y,z:z+.055,depth:.06,stock,
      points:[[-w/2,0],[w/2,0],[w*.34,h],[-w*.32,h]]});
    card({name:name+' left paper facet',x,y,z:z+.095,depth:.022,stock:P.tealLight,
      points:[[-w/2,0],[-w*.27,0],[-w*.32,h]]});
    card({name:name+' right paper facet',x,y,z:z+.097,depth:.022,stock:P.tealDark,
      points:[[w*.29,0],[w/2,0],[w*.34,h]]});
    panel(name+' projecting eave',x,y-.12,z+.14,w+.18,.17,null,{stock:P.tealDark,depth:.16});
    panel(name+' ridge fold',x+w*.01,y+h-.015,z+.11,w*.66,.09,null,{stock:P.tealLight,depth:.1});
    for(const fraction of [-.12,.12])line(name+' restrained roof crease',[[x+w*fraction,y+.08],[x+w*fraction*.90,y+h-.07]],z+.13,.023,P.tealLight);
  }
  function facade(name,x,y,z,w,h,region,stock=P.cream){
    panel(name,x,y,z,w,h,region,{stock,depth:.13});
    panel(name+' left folded return',x-w/2-.09,y,z-.18,.38,h,null,{stock,angle:.58,depth:.07});
    panel(name+' right folded return',x+w/2+.04,y,z-.23,.48,h,null,{stock:P.peach,angle:-.56,depth:.07});
    panel(name+' left corner trim',x-w/2+.05,y,z+.115,.11,h,null,{stock:P.ivory,depth:.055});
    panel(name+' right corner trim',x+w/2-.05,y,z+.115,.11,h,null,{stock:P.ivory,depth:.055});
    panel(name+' plinth',x,y,z+.12,w+.1,.15,null,{stock:P.cream,depth:.13});
  }
  const crop=(region,u0,v0,u1,v1)=>({u0:region.u0+(region.u1-region.u0)*u0,v0:region.v0+(region.v1-region.v0)*v0,
    u1:region.u0+(region.u1-region.u0)*u1,v1:region.v0+(region.v1-region.v0)*v1,aspect:1});

  // A generous two-storey academy gives the character a believable scale.
  const schoolY=baseY(-5.2);
  facade('School main teaching building',-5.2,schoolY,-4.8,9,3.65,atlas.regions.school);
  roof('School jade mansard',-5.2,schoolY+3.58,-4.57,9.7,1.08);
  panel('School central string course',-5.2,schoolY+1.81,-4.59,8.88,.09,null,{stock:P.cream,depth:.10});
  // Match the four printed window columns; raised card sits below the glass.
  for(const x of [-8.5366,-6.9539,-3.5051,-1.9224]){
    panel('School raised upper window sill',x,schoolY+1.915,-4.54,1.50,.065,null,{stock:P.ivory,depth:.17});
    panel('School raised ground window sill',x,schoolY+.706,-4.54,1.50,.065,null,{stock:P.ivory,depth:.17});
  }
  // The clock is real stacked card, with a jewel-like little folded roof.
  panel('School clock tower shadow fold',-7.23,schoolY+3.4,-4.55,1.31,1.97,null,{stock:P.peach,depth:.10});
  card({name:'School clock tower cream face',x:-7.3,y:schoolY+3.40,z:-4.37,stock:P.ivory,depth:.1,
    points:[[-.61,0],[.61,0],[.61,1.72],[0,2.03],[-.61,1.72]]});
  roof('School clock tower cap',-7.3,schoolY+5.18,-4.27,1.68,.7);
  disk('School clock brass rim',-7.3,schoolY+4.47,-4.24,.45,P.gold);
  disk('School clock ivory dial',-7.3,schoolY+4.47,-4.18,.385,P.ivory);
  for(const [dx,dy] of [[0,.28],[.28,0],[0,-.28],[-.28,0]]){
    panel('School clock quarter mark',-7.3+dx,schoolY+4.445+dy,-4.13,dx?.055:.027,dx?.027:.065,null,{stock:P.ink,depth:.02});
  }
  line('School clock nine o clock hands',[[-7.52,schoolY+4.47],[-7.3,schoolY+4.47],[-7.3,schoolY+4.74]],-4.10,.035,P.ink);
  disk('School clock centre pin',-7.3,schoolY+4.47,-4.07,.048,P.gold,10);

  // A light open gate. Its low rails never turn into a wall across the school.
  for(const x of [-2.1,2.1]){
    panel('School gate cream pillar',x,baseY(x),-2.76,.27,2.48,null,{stock:P.cream,depth:.14});
    panel('School gate pillar foot',x,baseY(x),-2.72,.44,.21,null,{stock:P.peach,depth:.16});
    panel('School gate pillar cap',x,baseY(x)+2.46,-2.71,.45,.12,null,{stock:P.ivory,depth:.15});
    disk('School gate gold finial',x,baseY(x)+2.68,-2.7,.09,P.gold,10);
  }
  panel('School name board',0,schoolY+2.17,-2.62,4.1,.53,atlas.regions.gate,{depth:.095});
  panel('School name board folded cap',0,schoolY+2.70,-2.63,4.35,.09,null,{stock:P.teal,depth:.13});
  for(const [center,width] of [[-5.78,6.35],[2.75,.84]]){
    const count=Math.ceil(width/.48);
    for(let i=0;i<=count;i++){
      const x=center-width/2+i*width/count;
      card({name:'School low paper ironwork',x,y:baseY(x)+.10,z:-2.61,depth:.025,stock:P.tealDark,
        points:[[-.021,0],[.021,0],[.021,.81],[0,.89],[-.021,.81]]});
    }
    panel('School low rail top',center,schoolY+.81,-2.57,width,.045,null,{stock:P.teal,depth:.025});
    panel('School low boundary stock',center,schoolY,-2.64,width,.14,null,{stock:P.cream,depth:.1});
  }

  // Three low individual shop silhouettes, each with a warm window and its own roof.
  const storeY=baseY(12);
  facade('Convenience store illuminated facade',12,storeY,-3.16,6,2.84,atlas.regions.store,P.peach);
  roof('Convenience store broad jade roof',12,storeY+2.82,-3.00,6.52,1.03);
  canopy('Convenience store striped folded awning',12,storeY+2.18,-2.94,6.16,.56,0xce8057,P.ivory);
  panel('Store threshold folded lip',12,storeY,-2.96,6.18,.10,null,{stock:P.cream,depth:.25});
  // A small lantern dormer breaks the broad roof into a memorable silhouette.
  card({name:'Store dormer cream outline',x:12.85,y:storeY+3.05,z:-2.81,depth:.075,stock:P.ivory,
    points:[[-.48,0],[.48,0],[.48,.45],[0,.84],[-.48,.45]]});
  panel('Store dormer blue glass',12.85,storeY+3.15,-2.74,.47,.40,null,{stock:P.ink,depth:.045});
  line('Store dormer cut roof',[ [12.32,storeY+3.49],[12.85,storeY+3.96],[13.38,storeY+3.49]],-2.68,.09,P.tealDark);
  panel('Store dormer mullion',12.85,storeY+3.15,-2.67,.035,.40,null,{stock:P.cream,depth:.03});

  const pharmacyY=baseY(18.15);
  facade('Pharmacy illuminated facade',18.15,pharmacyY,-3.43,4.35,2.95,atlas.regions.pharmacy);
  card({name:'Pharmacy stepped sage parapet',x:18.15,y:pharmacyY+2.90,z:-3.24,stock:P.sage,depth:.12,
    points:[[-2.37,0],[2.37,0],[2.37,.4],[1.51,.4],[1.51,.72],[-1.51,.72],[-1.51,.4],[-2.37,.4]]});
  panel('Pharmacy parapet cream top',18.15,pharmacyY+3.60,-3.18,3.18,.10,null,{stock:P.ivory,depth:.13});
  panel('Pharmacy parapet cream course',18.15,pharmacyY+3.24,-3.18,4.85,.09,null,{stock:P.ivory,depth:.13});
  canopy('Pharmacy soft sage awning',18.15,pharmacyY+2.21,-3.17,4.48,.49,P.leaf);
  disk('Pharmacy hanging sign cream medallion',20.35,pharmacyY+2.61,-2.66,.38,P.ivory);
  disk('Pharmacy hanging sign sage centre',20.35,pharmacyY+2.61,-2.60,.31,P.leaf);
  panel('Pharmacy hanging sign cross horizontal',20.35,pharmacyY+2.56,-2.54,.36,.10,null,{stock:P.ivory,depth:.035});
  panel('Pharmacy hanging sign cross vertical',20.35,pharmacyY+2.43,-2.53,.10,.36,null,{stock:P.ivory,depth:.035});
  line('Pharmacy sign folded bracket',[[20.03,pharmacyY+3.02],[20.35,pharmacyY+3.02],[20.35,pharmacyY+2.91]],-2.73,.044,P.ink);

  const bookY=baseY(23);
  facade('Closed stationery store',23,bookY,-3.61,4.43,3.30,atlas.regions.closed,P.peach);
  card({name:'Bookshop pointed ivory gable',x:23,y:bookY+3.18,z:-3.43,stock:P.ivory,depth:.1,
    points:[[-2.32,0],[2.32,0],[0,1.41]]});
  card({name:'Bookshop rose folded roof',x:23,y:bookY+3.27,z:-3.33,stock:P.rose,depth:.075,
    points:[[-2.52,-.05],[0,1.48],[2.52,-.05],[2.08,-.05],[0,1.15],[-2.08,-.05]]});
  line('Bookshop exposed gable edge',[[20.48,bookY+3.22],[23,bookY+4.75],[25.52,bookY+3.22]],-3.26,.045,P.ivory);
  disk('Bookshop attic paper rosette',23,bookY+3.81,-3.21,.34,P.gold);
  disk('Bookshop attic round window',23,bookY+3.81,-3.15,.265,P.ink);
  panel('Bookshop round window upright',23,bookY+3.55,-3.10,.04,.52,null,{stock:P.cream,depth:.02});
  panel('Bookshop round window crossbar',23,bookY+3.79,-3.10,.52,.04,null,{stock:P.cream,depth:.02});
  canopy('Bookshop little jade canopy',23,bookY+2.46,-3.34,4.59,.45,P.tealDark);

  // Broad leaf silhouettes and separated foliage layers keep the scene legible.
  function leaf(name,x,y,z,w,h,stock,flip=1){
    card({name,x,y,z,stock,depth:.055,points:[[0,0],[w*.42*flip,h*.08],[w*.66*flip,h*.40],[w*.53*flip,h*.76],[w*.13*flip,h],[-w*.25*flip,h*.77],[-w*.33*flip,h*.42]]});
    line(name+' central paper fold',[[x,y+.10],[x+w*.13*flip,y+h*.84]],z+.043,.018,P.sage);
  }
  function tree(name,x,z,scale=1){
    const y=baseY(x);
    card({name:name+' cut trunk',x,y,z,depth:.085,stock:0x947559,
      points:[[-.11,0],[.15,0],[.10,1.78*scale],[.68*scale,2.25*scale],[.61*scale,2.31*scale],[.045,1.98*scale],[-.25*scale,2.49*scale],[-.32*scale,2.43*scale],[-.08,1.58*scale]]});
    leaf(name+' left sage crown',x-.49*scale,y+1.48*scale,z-.04,1.46*scale,1.48*scale,P.sage,-1);
    leaf(name+' right teal crown',x+.11*scale,y+1.66*scale,z+.04,1.59*scale,1.77*scale,P.leaf);
    leaf(name+' front jade crown',x-.22*scale,y+1.42*scale,z+.16,1.40*scale,1.55*scale,P.tealLight);
  }
  tree('School west paper tree',-10.82,-3.3,1.05);
  tree('Alley young paper tree',7.50,-3.25,.75);
  tree('Bookshop garden paper tree',26.45,-3.11,.94);
  function planter(name,x,z,width=.7,height=.4){
    const y=baseY(x);
    card({name:name+' terracotta folded pot',x,y,z,depth:.13,stock:P.peach,
      points:[[-width*.40,0],[width*.40,0],[width/2,height],[-width/2,height]]});
    panel(name+' cream rim',x,y+height-.055,z+.10,width+.06,.10,null,{stock:P.cream,depth:.12});
    for(const [dx,flip,h] of [[-.17,-1,.42],[.10,1,.53],[.01,-1,.35]])leaf(name+' clipped leaves',x+dx,y+height-.03,z-.03+dx*.1,.29,h,P.leaf,flip);
  }
  planter('Store welcome planter',8.61,-2.47,.69,.35);
  planter('Pharmacy herb pot',16.0,-2.47,.56,.35);
  planter('Bookshop potted fern',25.12,-2.57,.66,.40);
  // Foreground accents are lower than the character's boots, with no continuous sill.
  for(const [x,width] of [[-7.35,1.30],[17.05,1.12]]){
    const y=baseY(x);
    card({name:'Low foreground flower box',x,y,z:.8,depth:.13,stock:P.teal,points:[[-width/2,0],[width/2,0],[width*.56,.18],[-width*.56,.18]]});
    panel('Low foreground planter rim',x,y+.15,.84,width+.16,.055,null,{stock:P.cream,depth:.09});
    for(const [dx,h,stock] of [[-.36,.10,P.sage],[-.08,.15,P.leaf],[.23,.12,P.tealLight]]){
      card({name:'Low foreground folded leaves',x:x+dx,y:y+.19,z:.76,stock,depth:.03,
        points:[[-.17,0],[.18,0],[.22,h*.72],[.07,h],[-.12,h*.78]]});
    }
  }

  // A quiet bench and a small red postbox animate the open alley without filling it.
  const benchY=baseY(4.7);
  for(const dx of [-.62,.62])panel('Alley bench folded foot',4.7+dx,benchY,-1.99,.09,.48,null,{stock:P.ink,depth:.08});
  panel('Alley bench wood seat',4.7,benchY+.37,-1.83,1.60,.12,null,{stock:P.gold,depth:.25});
  panel('Alley bench wood back',4.7,benchY+.67,-2.13,1.62,.23,null,{stock:P.cream,depth:.09});
  panel('Alley bench back lower slat',4.7,benchY+.48,-2.13,1.62,.12,null,{stock:P.gold,depth:.075});
  panel('Small red postbox stand',14.9,storeY,-1.95,.12,.48,null,{stock:P.ink,depth:.08});
  card({name:'Small red folded postbox',x:14.9,y:storeY+.42,z:-1.95,stock:P.rose,depth:.17,
    points:[[-.25,0],[.25,0],[.25,.61],[.15,.73],[-.15,.73],[-.25,.61]]});
  panel('Postbox cream address card',14.9,storeY+.60,-1.83,.25,.16,null,{stock:P.ivory,depth:.02});
  panel('Postbox letter slot',14.9,storeY+.94,-1.81,.30,.045,null,{stock:P.ink,depth:.018});

  function lantern(name,x,y,z){
    const ground=baseY(x);
    panel(name+' folded standard',x+.44,ground,z,.07,y-ground-.13,null,{stock:P.tealDark,depth:.045});
    panel(name+' broad foot',x+.44,ground,z,.22,.15,null,{stock:P.teal,depth:.09});
    line(name+' crooked bracket',[[x+.44,y-.18],[x+.33,y+.08],[x,y+.08],[x,y-.08]],z,.065,P.tealDark);
    card({name:name+' cream lantern glass',x,y:y-.49,z:z+.025,stock:0xf4ca8b,depth:.075,
      points:[[-.15,0],[.15,0],[.19,.38],[-.19,.38]]});
    card({name:name+' folded lantern hood',x,y:y-.11,z:z+.08,stock:P.teal,depth:.055,
      points:[[-.25,0],[.25,0],[.13,.15],[-.13,.15]]});
    panel(name+' lantern base',x,y-.53,z+.075,.33,.07,null,{stock:P.tealDark,depth:.075});
    for(const dx of [-.145,.145])line(name+' lantern mullion',[[x+dx,y-.48],[x+dx*1.27,y-.14]],z+.09,.028,P.tealDark);
  }
  lantern('School road lantern',1,4.35,-1.16);
  lantern('Store road lantern',12,3.93,-1.25);
  const detail=atlas.regions.detail;
  panel('School road sign post',6.43,baseY(6.43),-2.15,.055,1.65,null,{stock:P.tealDark,depth:.035});
  panel('School road sign',6.43,baseY(6.43)+1.32,-2.09,1.11,.45,crop(detail,12/768,14/192,247/768,180/192),{depth:.065});

  let triangles=0;
  for(const batch of batches.values()){
    if(!batch.positions.length)continue;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));geometry.computeBoundingBox();
    const bounds=geometry.boundingBox,pivotX=(bounds.min.x+bounds.max.x)/2,pivotZ=(bounds.min.z+bounds.max.z)/2;
    // Each chunk gets its own physical foot hinge. This keeps the fold local
    // and also gives the director an X coordinate for the player-centred ripple.
    geometry.translate(-pivotX,-.5,-pivotZ);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,batch.material===0?facadeMaterial:paperMaterial);mesh.name=`City paper batch ${batch.chunk}/${batch.material}/${batch.distant}`;
    mesh.position.set(pivotX,.5,pivotZ);mesh.castShadow=batch.castShadow;mesh.receiveShadow=batch.receiveShadow;mesh.frustumCulled=true;
    mesh.userData={cityPaperBatch:true,chunk:batch.chunk,distant:batch.distant,parts:[...batch.names],stageX:pivotX,stageHinge:true,stageBaseRotationX:mesh.rotation.x};group.add(mesh);triangles+=batch.positions.length/9;
  }
  function localLight(name,x,y,z,tx,ty,tz,hex){
    const light=new THREE.SpotLight(hex,4,14,.46,.38,1.5);light.name=name;light.position.set(x,y,z);
    light.target.position.set(tx,ty,tz);light.castShadow=true;light.shadow.mapSize.set(512,512);
    light.shadow.camera.near=.15;light.shadow.camera.far=15;light.shadow.bias=-.00035;light.shadow.normalBias=.018;light.shadow.radius=1.4;
    light.userData.volumetricIntensity=.85;light.userData.cityLocalLight=true;scene.add(light);scene.add(light.target);return light;
  }
  const localLights=[localLight('School gate warm streetlight',1,4.03,-1.06,1,.5,.05,0xffd2a1),
    localLight('Convenience store warm streetlight',12,3.61,-1.15,12,.5,.10,0xffc58f)];
  const stats={cards:cards.length,triangles,batches:group.children.length,materials:2,localLights:localLights.length,
    atlasWidth:atlas.stats.width,atlasHeight:atlas.stats.height,atlasBytes:atlas.stats.textureBytes,illustratedTiles:atlas.stats.tiles,
    regions:atlas.regions,signText:atlas.stats.signText,
    stageFrame:{layers:0,backdrop:0,sideWings:0,topBeam:0,foreground:0,parts:[]}};
  group.userData.city={...stats,stage:{backdrop:false,moon:false,roofline:true,proscenium:false,wings:false},
    artDirection:'Moon-lantern Academy Street',landmarks:[{name:'school gate',x:0},{name:'convenience store',x:12},{name:'closed shop',x:23}]};
  flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;
  return {group,localLights,stats:()=>({...stats})};
}
