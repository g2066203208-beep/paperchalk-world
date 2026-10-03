import {CITY_DISTRICTS,districtAt} from '../world/CityLayout.mjs';
import {clamp} from './math.js';

/**
 * A small paper theatre behind the authored city.
 *
 * The city remains walkable on one horizontal axis, but its scenery is made
 * from three receding sheets. Every neighbourhood is a six-panel accordion:
 * alternating facets catch the light and the dark registration seams make the
 * folds readable on a phone without adding a texture or a post process.
 */
export function createCityFoldedStage({THREE,scene,flags={}}={}){
  if(!THREE||!scene)throw new TypeError('Folded city stage requires THREE and a scene.');
  const group=new THREE.Group();
  group.name='Folded paper city stage · three layers';
  group.userData.volumeShadow=false;
  scene.add(group);

  // Keep the folds below the skyline roofline. Their upper edges read as
  // layered paper scenery instead of long green strips floating in the sky.
  const layerSpec=[
    {name:'back skyline sheet',z:-34.2,height:4.8,fold:.64,light:.42},
    {name:'middle accordion street',z:-23.25,height:3.65,fold:.54,light:.56},
    {name:'near folded proscenium',z:-14.18,height:2.75,fold:.42,light:.70},
  ];
  const layerMaterials=layerSpec.map((spec,index)=>{
    // These are set pieces behind the authored buildings. A little paper
    // translucency lets the skyline and shop roofs remain readable through
    // the folded sheets instead of turning the horizon into a solid wall.
    const material=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,
      side:THREE.DoubleSide,flatShading:true,transparent:true,
      opacity:[.16,.19,.23][index],depthWrite:false});
    material.name='Paper accordion '+spec.name;
    return material;
  });
  const edgeMaterial=new THREE.MeshLambertMaterial({color:0x526375,side:THREE.DoubleSide,flatShading:true});
  edgeMaterial.name='Paper accordion cut seams';
  const cueMaterial=new THREE.MeshLambertMaterial({color:0xf0d39b,side:THREE.DoubleSide,flatShading:true,
    transparent:true,opacity:.92});
  cueMaterial.name='Paper fold interaction cue';

  // A small folded tab appears at the seam while the player turns the layer.
  // It gives the action a physical paper affordance without covering the
  // street for more than the short transition.
  const cueGeometry=new THREE.BufferGeometry();
  cueGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, -.88,0,.08, -.42,2.42,.02,
    0,0,0, .42,2.42,.02, .88,0,.08,
  ],3));
  cueGeometry.computeVertexNormals();cueGeometry.computeBoundingBox();cueGeometry.computeBoundingSphere();
  const cueGroup=new THREE.Group();cueGroup.name='Active paper seam tab';
  // Lift the cue above the character's shoulders while retaining a rear depth
  // plane; the fold reads clearly without ever sitting over the body.
  cueGroup.position.set(0,1.0,-2.4);cueGroup.visible=false;
  const cueMesh=new THREE.Mesh(cueGeometry,cueMaterial);cueMesh.name='Fold seam paper tab';cueMesh.userData.volumeShadow=false;cueGroup.add(cueMesh);
  group.add(cueGroup);

  const layers=[],districtRecords=[];
  const scratch=new THREE.Color();
  const toneFor=(hex,factor)=>{
    scratch.setHex(hex);scratch.multiplyScalar(factor);
    return [scratch.r,scratch.g,scratch.b];
  };
  function addTriangle(batch,a,b,c,color){
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
    const length=Math.hypot(...n)||1;const normal=n.map(value=>value/length);const rgb=toneFor(color,1);
    for(const point of [a,b,c]){batch.positions.push(...point);batch.normals.push(...normal);batch.colors.push(...rgb);}
  }
  function appendFacet(batch,x0,x1,y0,y1,z0,z1,color){
    // A facet is a thin folded sheet. Splitting at the ridge makes the two
    // planes shade independently, while DoubleSide keeps it legible in orbit.
    const a=[x0,y0,z0],b=[x1,y0,z1],c=[x1,y1,z1],d=[x0,y1,z0];
    addTriangle(batch,a,b,c,color);addTriangle(batch,a,c,d,color);
  }
  function appendTriangle(batch,points,color){addTriangle(batch,points[0],points[1],points[2],color);}
  function geometryFor(batch,THREE){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return geometry;
  }

  for(const district of CITY_DISTRICTS){
    const districtRoot=new THREE.Group();
    districtRoot.name='Accordion district · '+district.name;
    districtRoot.position.x=district.x;
    districtRoot.userData={districtId:district.id,index:district.index};
    group.add(districtRoot);
    const record={district,root:districtRoot,layers:[]};
    for(const [layerIndex,spec] of layerSpec.entries()){
      const batch={positions:[],normals:[],colors:[]};
      const edge={positions:[],normals:[],colors:[]};
      const width=20,panelCount=6,half=width/2;
      const baseColor=district.color;
      const frontColor=THREE.Color?new THREE.Color(baseColor):null;
      // Lighter paper on the near sheet; the far sheet is deliberately quiet.
      const factor=spec.light;
      for(let panel=0;panel<panelCount;panel++){
        const center=-50+panel*width;
        const phase=panel%2===0?1:-1;
        const z=spec.z;
        const ridge=z;
        const leftOuter=z+phase*spec.fold,rightOuter=z-phase*spec.fold;
        const paperColor=frontColor?frontColor.clone().offsetHSL(0,.02*(layerIndex-1),.06*(layerIndex-1)).getHex():baseColor;
        const facetColor=frontColor?new THREE.Color(paperColor).multiplyScalar(factor).getHex():paperColor;
        // Convert local district x to a world-independent panel position. The
        // district root supplies the 120-unit neighbourhood translation.
        appendFacet(batch,center-half,center,0,spec.height,leftOuter,z,facetColor);
        appendFacet(batch,center,center+half,0,spec.height,z,rightOuter,facetColor);
        // Fold tabs are small, alternating triangles above each sheet.
        const tabColor=frontColor?new THREE.Color(paperColor).offsetHSL(0,.01,.12).multiplyScalar(Math.min(1,factor+.16)).getHex():paperColor;
        appendTriangle(batch,[[center-half*.72,spec.height+.5,leftOuter],[center,spec.height+.16,ridge],[center-half*.08,spec.height+.5,ridge-.02]],tabColor);
        appendTriangle(batch,[[center+half*.08,spec.height+.5,ridge-.02],[center,spec.height+.16,ridge],[center+half*.72,spec.height+.5,rightOuter]],tabColor);
        // Registration crease and outer cuts. They are part of the same small
        // district mesh, so switching a layer never creates draw-call spikes.
        const seams=[center-half,center,center+half];
        for(const seamX of seams){
          const seamZ=seamX===center?ridge+.035:(seamX===center-half?leftOuter+.035:rightOuter+.035);
          appendFacet(edge,seamX-.035,seamX+.035,0,spec.height,seamZ,seamZ,0x526375);
        }
      }
      const mesh=new THREE.Mesh(geometryFor(batch,THREE),layerMaterials[layerIndex]);
      mesh.name=spec.name+' · '+district.name;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
      mesh.userData.volumeShadow=false;mesh.userData.foldedStage=true;mesh.userData.district=district.id;
      mesh.position.y=.5;
      const seams=new THREE.Mesh(geometryFor(edge,THREE),edgeMaterial);
      seams.name='Fold registration seams · '+district.name;seams.castShadow=false;seams.receiveShadow=false;seams.frustumCulled=true;
      seams.userData.volumeShadow=false;seams.userData.foldedStage=true;
      seams.position.y=.5;
      const layerRoot=new THREE.Group();
      layerRoot.name=spec.name;
      layerRoot.userData={layer:layerIndex,district:district.id,baseZ:spec.z,baseScale:1};
      layerRoot.add(mesh,seams);districtRoot.add(layerRoot);
      record.layers.push({root:layerRoot,mesh,seams,layer:layerIndex,baseZ:spec.z});
      layers.push(record.layers.at(-1));
    }
    districtRecords.push(record);
  }

  let activeDistrict=0,selectedLayer=1,foldTarget=1,fold=1,clock=0,seamPulse=0,seamX=0;
  function setLayer(layer=1,{seam=false,progress}={}){
    if(!Number.isFinite(layer))layer=1;
    selectedLayer=Math.round(clamp(layer,0,2));
    if(Number.isFinite(progress))foldTarget=clamp(progress,0,1);
    if(seam){
      fold=0;if(!Number.isFinite(progress))foldTarget=1;seamPulse=1;
      seamX=Number.isFinite(seam.x)?seam.x:seamX;
      cueGroup.position.x=seamX;cueGroup.visible=true;
    }
    flags.render=flags.depth=flags.ao=true;
    return {layer:selectedLayer,seam:!!seam,progress:foldTarget};
  }
  function update(playerX=0,dt=0,state={}){
    if(typeof dt==='object'){state=dt;dt=0;}
    if(!state||typeof state!=='object')state={};
    const district=districtAt(Number.isFinite(playerX)?playerX:0);
    activeDistrict=district.index;
    if(Number.isFinite(state.layer))selectedLayer=Math.round(clamp(state.layer,0,2));
    if(Number.isFinite(state.fold))foldTarget=clamp(state.fold,0,1);
    if(state.seam)seamPulse=1;
    const step=Math.min(.08,Math.max(0,Number(dt)||0));clock+=step;
    const ease=1-Math.exp(-8*step);fold+=(foldTarget-fold)*ease;seamPulse=Math.max(0,seamPulse-step*1.8);
    cueGroup.visible=seamPulse>.001;
    cueGroup.scale.set(1,1+seamPulse*.12,1);
    cueMaterial.opacity=.28+seamPulse*.64;
    for(const record of districtRecords){
      const localActive=record.district.index===activeDistrict;
      // The selected lane rises by a few centimetres; the other two settle
      // back, making layer changes readable while preserving the skyline.
      for(const item of record.layers){
        const laneDistance=Math.abs(item.layer-selectedLayer);
        const focus=localActive&&laneDistance===0?1:0;
        const accordion=(localActive?fold:1)*(.035+focus*.035);
        item.root.position.z=item.baseZ-accordion+(localActive&&item.layer===selectedLayer?seamPulse*.12:0);
        item.root.position.y=localActive&&item.layer===selectedLayer?seamPulse*.025:0;
        item.root.scale.x=localActive&&item.layer===selectedLayer?1+seamPulse*.018:1;
      }
    }
    if(step>0||state.seam)flags.render=flags.depth=flags.ao=true;
    return {district:district.id,layer:selectedLayer,fold,progress:fold,seamPulse};
  }
  function stats(){
    let triangles=0,batches=0;
    group.traverse(object=>{if(!object.isMesh)return;batches++;triangles+=object.geometry.getAttribute('position').count/3;});
    return {layers:3,districts:CITY_DISTRICTS.length,panels:CITY_DISTRICTS.length*3*6,
      seams:CITY_DISTRICTS.length*3*18,batches,triangles,materials:5,
      activeDistrict:CITY_DISTRICTS[activeDistrict].id,selectedLayer,fold,progress:fold,
      worldMinX:CITY_DISTRICTS[0].minX,worldMaxX:CITY_DISTRICTS.at(-1).maxX,
      cueVisible:cueGroup.visible};
  }
  function dispose(){
    group.removeFromParent();
    const geometries=new Set(),materials=new Set();
    group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material){for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);}});
    for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();
  }
  update(0,0);
  return {group,update,setLayer,stats,dispose};
}
