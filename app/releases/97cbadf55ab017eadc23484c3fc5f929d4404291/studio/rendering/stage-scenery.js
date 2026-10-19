/** Illustrated paper architecture: painted detail, a few physical cut silhouettes. */
export function createStageScenery({THREE,scene,world}){
  const group=new THREE.Group();group.name='Illustrated paper cottages';scene.add(group);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext('2d');ctx.scale(.5,.5);
  const ink='#796957',cream='#f0deb6',teal='#789b92';
  const wall=[[-1.09,0],[1.10,0],[1.10,1.61],[.26,2.28],[-.21,2.38],[-1.09,1.62]];
  const roof=[[-1.35,1.56],[-1.13,1.91],[-.28,2.56],[.16,2.49],[1.32,1.62],[1.17,1.49],[.10,2.19],[-.30,2.27],[-1.08,1.51]];
  const chimney=[[-.98,1.91],[-.98,2.47],[-1.04,2.47],[-1.04,2.59],[-.62,2.59],[-.62,2.47],[-.69,2.47],[-.69,2.11]];
  const cottageBounds={minX:-1.5,maxX:1.5,minY:-.12,maxY:2.8};
  const houseTiles=[{x:0,y:0,w:1024,h:1024},{x:1024,y:0,w:1024,h:1024}];
  const signTile={x:0,y:1060,w:512,h:512},fenceTile={x:550,y:1080,w:1000,h:600};

  function path(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
  function fill(points,color,stroke=null,width=.014){path(points);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
  function line(points,color,width=.015){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function ellipse(x,y,rx,ry,color,angle=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function tile(area,bounds,paint){
    ctx.save();ctx.beginPath();ctx.rect(area.x,area.y,area.w,area.h);ctx.clip();
    ctx.translate(area.x,area.y+area.h);ctx.scale(area.w/(bounds.maxX-bounds.minX),-area.h/(bounds.maxY-bounds.minY));
    ctx.translate(-bounds.minX,-bounds.minY);paint();ctx.restore();
  }
  function arch(x,y,w,h,color){
    ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x+w/2,y);ctx.lineTo(x+w/2,y+h-w/2);
    ctx.bezierCurveTo(x+w/2,y+h+w*.13,x-w/2,y+h+w*.13,x-w/2,y+h-w/2);ctx.closePath();
    ctx.fillStyle=color;ctx.fill();
  }
  function paintedWindow(x,y,w,h){
    rect(x-w*.5-.045,y-.035,w+.09,h+.075,'#bead87');
    rect(x-w*.5,y,w,h,'#6f807b');
    rect(x-w*.5+.04,y+.04,w-.08,h-.08,'#efd48c');
    fill([[x-w*.5+.04,y+h-.04],[x+w*.5-.04,y+h-.04],[x-w*.5+.04,y+.17]],'#f9e7b6');
    rect(x-.023,y+.025,.046,h-.05,cream);rect(x-w*.5+.025,y+h*.5,w-.05,.043,cream);
    for(const side of [-1,1]){
      const sx=x+side*(w*.5+.095);rect(sx-.065,y+.02,.13,h-.035,teal);
      line([[sx-.052,y+.06],[sx+.052,y+h-.06]],'#acc4ac',.011);
      for(let j=1;j<5;j++)line([[sx-.047,y+h*j/5],[sx+.047,y+h*j/5]],'#5b817d',.009);
    }
    fill([[x-w*.5-.10,y-.045],[x+w*.5+.1,y-.045],[x+w*.5+.07,y-.105],[x-w*.5-.08,y-.105]],'#a77b57');
    line([[x-w*.5-.08,y-.04],[x+w*.5+.08,y-.04]],'#e0c194',.018);
  }
  function paintCottage(variant){
    // Broad pigment washes keep the art quiet at gameplay scale.
    fill(chimney,variant?'#bd896d':'#c59c78',ink,.012);
    rect(-1.055,2.49,.455,.10,'#dcc4a0');
    for(const [x,y] of [[-.95,2.39],[-.77,2.30],[-.92,2.20]])line([[x,y],[x+.16,y]],'#e6c9a2',.016);
    fill(wall,variant?'#e4d7b4':cream,ink,.016);
    fill([[-1.08,0],[-.9,.03],[-.86,1.66],[-1.08,1.61]],'#d2c69e');
    fill([[.91,.02],[1.10,0],[1.10,1.61],[.98,1.7]],'#d6c59d');
    fill([[-.85,.24],[-.10,.20],[.1,.38],[-.25,.5],[-.86,.42]],'#edd7ac');
    fill([[.58,1.3],[1.02,1.35],[1.0,1.60],[.74,1.8],[.53,1.64]],'#eedebb');
    // Warm timber marks, with pale cut edges rather than dark outlines.
    for(const x of [-1.00,1.02]){line([[x,.06],[x-.015,1.62]],'#a28968',.045);line([[x-.018,.08],[x-.032,1.60]],'#d4be91',.012);}
    line([[-1.01,.17],[1.02,.17]],'#b2956f',.051);
    line([[-1.06,1.59],[1.03,1.59]],'#ad8d68',.045);
    line([[-.18,1.58],[-.18,2.27]],'#b29a74',.042);
    paintedWindow(-.57,.72,.43,.51);
    paintedWindow(.61,1.03,.36,.43);
    // A softly arched teal door, painted plank joins and a brass latch.
    arch(.27,.03,.58,1.16,'#ad956e');arch(.27,.03,.48,1.10,variant?'#7e9681':'#6f9187');
    for(const x of [.14,.28,.41])line([[x,.1],[x,.91]],'#597b74',.011);
    line([[.06,.1],[.06,.9]],'#9fbaa0',.018);
    ellipse(.41,.56,.025,.028,'#ddbd70');ellipse(.405,.57,.010,.011,'#fff0c3');
    fill([[-.10,-.025],[.61,-.025],[.68,.07],[-.06,.08]],'#c3aa85');
    line([[-.08,.08],[.61,.075]],'#f7e4b6',.025);
    // Small attic window and softly scalloped terracotta tiles.
    ellipse(-.15,1.95,.17,.19,'#b49e79');ellipse(-.15,1.95,.126,.145,'#e1bf77');
    line([[-.27,1.95],[-.03,1.95]],cream,.025);line([[-.15,1.81],[-.15,2.09]],cream,.025);
    fill(roof,variant?'#bf846f':'#b86f59',ink,.015);
    ctx.save();path(roof);ctx.clip();
    const bands=variant?['#bb7f69','#cb9578','#ad715c','#c78c72']:['#b97059','#cc8a65','#ac654f','#c47d5e'];
    for(let row=0;row<7;row++){
      const y=1.48+row*.166;
      rect(-1.5,y,3,.10,bands[row%bands.length]);
      for(let j=0;j<10;j++){
        const x=-1.5+j*.34+(row%2)*.17;
        ctx.beginPath();ctx.moveTo(x,y+.04);ctx.quadraticCurveTo(x+.16,y-.006,x+.32,y+.045);
        ctx.strokeStyle='#dcaa83';ctx.lineWidth=.012;ctx.stroke();
        line([[x+.02,y+.05],[x+.055,y+.15]],'#965d4c',.009);
      }
    }
    ctx.restore();
    line([[-1.33,1.56],[-1.10,1.54],[-.30,2.31],[.10,2.23],[1.17,1.53],[1.30,1.62]],'#e8b68a',.034);
    line([[-1.30,1.60],[-1.11,1.92],[-.28,2.54],[.16,2.47]],'#e3aa83',.020);
    // Botanical accents are part of the illustration, not separate meshes.
    const stem=[[-.93,.18],[-.98,.48],[-.87,.79],[-.97,1.02],[-.89,1.29],[-.78,1.47]];
    line(stem,'#83906a',.017);
    for(let i=0;i<13;i++){
      const y=.22+i*.094,x=-.94+.06*Math.sin(i*1.9),side=i%2?1:-1;
      ellipse(x+side*.046,y,.071,.030,i%3?'#87976c':'#a4ae7c',side*.65);
    }
    for(const [x,y] of [[-.87,.71],[-1.00,1.1],[-.79,1.43]]){
      ellipse(x,y,.024,.027,'#e1bf99');ellipse(x+.028,y+.013,.022,.025,'#f1d4ad');
    }
    for(const x of [-.72,-.60,-.49]){ellipse(x,.61,.035,.028,'#af9470');ellipse(x,.66,.055,.046,'#849971');}
  }
  houseTiles.forEach((area,i)=>tile(area,cottageBounds,()=>paintCottage(i)));
  const signBounds={minX:-.58,maxX:.58,minY:-.06,maxY:1.05};
  const sign=[[-.04,0],[.045,0],[.045,.6],[.29,.6],[.48,.77],[.29,.94],[-.46,.94],[-.46,.6],[-.04,.6]];
  tile(signTile,signBounds,()=>{
    fill(sign,'#d7bb8e',ink,.012);fill([[-.46,.61],[.29,.61],[.47,.77],[.29,.93],[-.46,.93]],'#ead7af');
    line([[-.43,.91],[.27,.91],[.43,.77]],'#faf0cc',.018);
    line([[-.23,.77],[.21,.77]],'#83917c',.035);line([[.11,.85],[.21,.77],[.11,.69]],'#83917c',.035);
    ellipse(-.36,.77,.015,.018,'#a78a62');
  });
  const fenceBounds={minX:-.78,maxX:.78,minY:-.03,maxY:.81};
  const fence=[[-.71,0],[-.60,0],[-.60,.32],[-.06,.32],[-.06,0],[.06,0],[.06,.32],[.60,.32],[.60,0],[.71,0],[.71,.66],[.65,.75],[.60,.66],[.60,.42],[.06,.42],[.06,.66],[0,.75],[-.06,.66],[-.06,.42],[-.60,.42],[-.60,.66],[-.65,.75],[-.71,.66]];
  tile(fenceTile,fenceBounds,()=>{
    fill(fence,'#d9c59a',ink,.008);rect(-.64,.335,1.28,.060,'#f0e0b9');
    for(const x of [-.65,0,.65])line([[x-.035,.05],[x-.035,.65]],'#f4e6c5',.025);
  });
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  texture.name='Cottage painted detail atlas';
  const faceMaterial=new THREE.MeshLambertMaterial({map:texture,color:0xffffff});
  const edgeMaterial=new THREE.MeshLambertMaterial({color:0xbfa579});
  faceMaterial.name='Matte illustrated color paper';edgeMaterial.name='Thin kraft cut edges';
  const batches=[{positions:[],uvs:[]},{positions:[],uvs:[]}];let sourceMeshes=0,cottageTriangles=0;
  function piece(points,{x,y,z,scale=1,depth=.045,tile:area,bounds,isCottage=false}){
    sourceMeshes++;
    let vectors=points.map(([px,py])=>new THREE.Vector2(px,py));
    if(THREE.ShapeUtils.isClockWise(vectors)){points=[...points].reverse();vectors=[...vectors].reverse();}
    const triangles=THREE.ShapeUtils.triangulateShape(vectors,[]);
    const before=(batches[0].positions.length+batches[1].positions.length)/9;
    function triangle(vertices,batch){
      for(const [px,py,pz] of vertices){
        batches[batch].positions.push(x+px*scale,y+py*scale,z+pz*scale);
        batches[batch].uvs.push((area.x+(px-bounds.minX)/(bounds.maxX-bounds.minX)*area.w)/2048,
          1-(area.y+area.h-(py-bounds.minY)/(bounds.maxY-bounds.minY)*area.h)/2048);
      }
    }
    for(const indices of triangles){
      triangle(indices.map(i=>[...points[i],depth]),0);
      triangle([...indices].reverse().map(i=>[...points[i],0]),1);
    }
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      triangle([[...a,0],[...b,0],[...b,depth]],1);
      triangle([[...a,0],[...b,depth],[...a,depth]],1);
    }
    if(isCottage)cottageTriangles+=(batches[0].positions.length+batches[1].positions.length)/9-before;
  }
  function cottage(x,z,scale,index){
    const y=world.surfaceY(x,0)??.5;
    const options={x,y,z,scale,tile:houseTiles[index],bounds:cottageBounds,isCottage:true};
    piece(chimney,{...options,z:z-.014,depth:.040});
    piece(wall,{...options,depth:.075});
    piece(roof,{...options,z:z+.082,depth:.040});
  }
  cottage(20.1,-3.3,1.25,0);cottage(23.0,-5.1,.83,1);
  for(const x of [3.1,13.1])piece(sign,{x,y:world.surfaceY(x)??.5,z:-.8,tile:signTile,bounds:signBounds,depth:.035});
  for(const x of [18,23.9])piece(fence,{x,y:world.surfaceY(x)??.5,z:-1.8,tile:fenceTile,bounds:fenceBounds,depth:.028});
  let triangles=0;
  batches.forEach((batch,i)=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    triangles+=batch.positions.length/9;
    const mesh=new THREE.Mesh(geometry,i?edgeMaterial:faceMaterial);
    mesh.name=i?'Cottage kraft perimeters':'Cottage painted silhouettes';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  });
  group.userData={sourceMeshes,batches:2,triangles,cottageTriangles,atlasSize:1024};
  return {group};
}
