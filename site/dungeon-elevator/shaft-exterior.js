/* Dungeon Elevator: exterior consists ONLY of flat 2D image planes.
 * There are zero cube, rock, or mesh-block objects. Three.js supplies perspective
 * and the two simultaneously rendered cameras; geometry is PlaneGeometry only.
 */
export function createShaftExterior(THREE,scene,assetReport=()=>{}){
 const root=new THREE.Group();root.name='paper-shaft';scene.add(root);
 const landing=new THREE.Group();landing.name='paper-landing';root.add(landing);
 const travel=new THREE.Group();travel.name='paper-earth-moving';root.add(travel);
 const surface=new THREE.Group();surface.name='surface-city-paper-stage';root.add(surface);
 const loader=new THREE.TextureLoader();
 function load(name){
  const tex=loader.load('./paint/'+name,()=>assetReport(name,true),undefined,()=>assetReport(name,false));
  tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
 }
 const baseRock=load('rock.svg'),landingMap=load('landing.svg');
 // Both materials reference the SAME source sprite, with separate UV transforms.
 const earthRock=baseRock.clone();earthRock.needsUpdate=true;
 earthRock.wrapS=earthRock.wrapT=THREE.RepeatWrapping;
 earthRock.repeat.set(1,3.7);
 const paints={
  stop:new THREE.MeshBasicMaterial({map:baseRock,side:THREE.DoubleSide}),
  backdrop:new THREE.MeshBasicMaterial({map:landingMap,side:THREE.DoubleSide}),
  travel:new THREE.MeshBasicMaterial({map:earthRock,side:THREE.DoubleSide}),
  pale:new THREE.MeshBasicMaterial({color:0xaaa096,side:THREE.DoubleSide})
 };
 function paper(parent,w,h,x,y,z,mat,name){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
  mesh.position.set(x,y,z);mesh.name=name;parent.add(mesh);return mesh;
 }
 // Landing is a rock slice with open central pocket for a future passenger PNG.
 // Upper slab + lower slab + lateral cuts all have zero modeled thickness.
 paper(landing,24,20,0,1.5,-9.35,paints.stop,'deep-flat-rock');
 paper(landing,12.1,3.10,0,1.64,-8.40,paints.backdrop,'passenger-waiting-plate');
 paper(landing,20,6.55,0,6.37,-7.65,paints.stop,'upper-rock-strata');
 paper(landing,20,5.55,0,-2.77,-7.65,paints.stop,'lower-rock-strata');
 for(const sign of [-1,1]){
  paper(landing,2.4,3.1,sign*6.05,1.55,-7.55,paints.stop,'side-cut-'+sign);
 }
 // Silhouette edge strips are 2D planar painted pieces, not 3D beams.
 paper(landing,12.1,.18,0,3.11,-7.34,paints.pale,'roof-slice-paper');
 paper(landing,12.1,.14,0,.045,-7.33,paints.pale,'floor-slice-paper');
 // During movement the entire outside becomes a scrollable repeating rock sprite.
 paper(travel,25,33,0,1.5,-7.54,paints.travel,'continuous-rock-scroll-paper');
 // B0 station: an actual street, never white blankness. Five independent
 // illustrated zero-thickness sprites placed at different Z depths.
 const cityPaint=(name,transparent=false)=>{
  const map=load(name);
  return new THREE.MeshBasicMaterial({
   map,transparent,alphaTest:transparent ? .02 : 0,
   depthWrite:!transparent,side:THREE.DoubleSide,toneMapped:false
  });
 };
 const sky=cityPaint('surface-city-backdrop.svg');
 const left=cityPaint('surface-city-left.svg',true);
 const right=cityPaint('surface-city-right.svg',true);
 const road=cityPaint('surface-city-ground.svg');
 const lamp=cityPaint('surface-city-streetlight.svg',true);
 const cityBack=paper(surface,24,14.5,0,2.6,-9.54,sky,'surface-city-painted-skyline');
 const cityLeft=paper(surface,5.35,7.8,-5.2,2.1,-7.94,left,'surface-city-left-shop-street');
 cityLeft.rotation.y=.08;
 const cityRight=paper(surface,5.35,7.8,5.2,2.1,-7.97,right,'surface-city-right-building');
 cityRight.rotation.y=-.08;
 const cityRoad=paper(surface,18,10.8,0,.022,-8.86,road,'surface-city-paper-road');
 cityRoad.rotation.x=-Math.PI/2;
 const streetLamp=paper(surface,1.7,4.3,-3.75,2.15,-6.63,lamp,'surface-city-paper-streetlight');
 const citySpriteCount=surface.children.filter(item=>item.isMesh).length;
 const seams=[];
 for(let i=0;i<15;i++){
  const width=5.4+(i%4)*1.75;
  const material=new THREE.MeshBasicMaterial({color:i%3===0?0x746f6c:0xb6a598,transparent:true,opacity:i%2===0?.23:.16,side:THREE.DoubleSide});
  const edge=paper(travel,width,.035+(i%4)*.012,(i%3-1)*1.8,-10+i*1.52,-7.47,material,'paper-layer-line-'+i);
  edge.userData.originY=-10+i*1.52;seams.push(edge);
 }
 const info={floor:0,traveling:false,direction:0,scrollDistance:0};
 function setFloor(depth){
  info.floor=Math.max(0,Math.floor(depth));
  landing.visible=info.floor>0&&!info.traveling;
  surface.visible=info.floor===0&&!info.traveling;
  if(info.floor>0){
   baseRock.offset.y=(info.floor*.079)%1;
   paints.backdrop.color.setHex(info.floor>16?0xb8b3ac:0xffffff);
  }
 }
 function setTraveling(value,direction=0){
  info.traveling=!!value;
  info.direction=direction;
  travel.visible=info.traveling;
  landing.visible=!info.traveling&&info.floor>0;
  surface.visible=!info.traveling&&info.floor===0;
 }
 function update(dt){
  if(!info.traveling)return;
  const step=dt*info.direction*1.58;
  info.scrollDistance+=step;
  // Elevator goes DOWN: earth texture rises. UP: earth texture goes down.
  earthRock.offset.y-=step*.19;
  for(const seam of seams){
   const shifted=seam.userData.originY+info.scrollDistance*5;
   seam.position.y=((shifted+17)%24+24)%24-17;
  }
 }
 travel.visible=false;landing.visible=false;setFloor(0);
 return Object.freeze({
  setFloor,setTraveling,update,
  getState:()=>({...info,landingVisible:landing.visible,travelVisible:travel.visible,surfaceCityVisible:surface.visible,surfaceSpriteCount:citySpriteCount,textureOffset:earthRock.offset.y,geometry:'2d-planes-only'})
 });
}
