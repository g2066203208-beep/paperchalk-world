/* Underground lift shaft: rock is always outside the cabin, never a new room.
   The landing is a thin opening between upper/lower rock ledges. During travel,
   a continuous textured shaft sweeps vertically opposite the elevator direction.
   All elements are real Three.js world geometry and shared by both cameras. */
export function createShaftExterior(THREE,scene){
 const ROCK=0xb1a49a, trim=0x716a66;
 const group=new THREE.Group();group.name='underground-shaft-exterior';scene.add(group);
 const landing=new THREE.Group();landing.name='floor-rock-landing';group.add(landing);
 const travel=new THREE.Group();travel.name='scrolling-earth-transition';group.add(travel);
 const makeMat=(color)=>new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide});
 const baseStone=makeMat(0xaaa09a),iron=makeMat(trim),floorMat=makeMat(0xaaa19b);
 const hash=(value)=>{let x=(value|0)^0x9e3779b9;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return(x^(x>>>15))>>>0};
 const rand=(seed)=>{let v=hash(seed);return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296}};
 function addBox(parent,w,h,d,x,y,z,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 function rockTexture(seed){
  const size=1024,canvas=document.createElement('canvas');
  canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');
  const r=rand(seed);ctx.fillStyle='#9d948e';ctx.fillRect(0,0,size,size);
  // Hand-painted desaturated strata; no photorealistic noise or magical glow.
  const strata=['#a89d93','#b2a69a','#8f8b87','#b3a398','#99918b','#8b8986'];
  let y=-24;
  while(y<size+30){
   const step=45+Math.floor(r()*56);
   ctx.beginPath();ctx.moveTo(-10,y+10);
   for(let x=0;x<=size+30;x+=28){ctx.lineTo(x,y+Math.sin(x/75+r()*2)*6+(r()-.5)*14)}
   for(let x=size+30;x>=-10;x-=28){ctx.lineTo(x,y+step+(r()-.5)*16)}
   ctx.closePath();ctx.fillStyle=strata[Math.floor(r()*strata.length)];ctx.fill();
   ctx.strokeStyle='rgba(69,65,65,.30)';ctx.lineWidth=2.8;ctx.stroke();
   y+=step;
  }
  // Large irregular chips with visible flat edge linework.
  for(let i=0;i<160;i++){
   const x=r()*size,Y=r()*size,w=12+r()*85,h=5+r()*38;
   ctx.fillStyle=i%3===0?'rgba(228,213,200,.28)':'rgba(65,68,71,.12)';
   ctx.beginPath();ctx.moveTo(x,Y);ctx.lineTo(x+w*.45,Y-h*.27);
   ctx.lineTo(x+w,Y+h*.30);ctx.lineTo(x+w*.7,Y+h);ctx.lineTo(x+w*.13,Y+h*.7);ctx.closePath();ctx.fill();
  }
  for(let i=0;i<120;i++){
   const x=r()*size,Y=r()*size,len=8+r()*48;
   ctx.beginPath();ctx.moveTo(x,Y);ctx.lineTo(x+len*.4,Y+len*.3);
   ctx.lineTo(x+len,Y+len*.34);ctx.strokeStyle='rgba(56,56,58,.26)';
   ctx.lineWidth=1.2+r()*2.3;ctx.stroke();
  }
  // Vertical seams of the tiling texture are kept subtle; narrow repetitive
  // tiles are hidden by real 3D framing strips and horizontally moving chips.
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;return texture;
 }
 const variants=[rockTexture(182),rockTexture(711),rockTexture(1451),rockTexture(2907)];
 const rockMats=variants.map(map=>new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide}));
 const landingRockSurfaces=[];
 function face(parent,w,h,x,y,z,mat){
  const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
  p.position.set(x,y,z);parent.add(p);return p;
 }
 // Rock occupies the space ABOVE and BELOW a real little stop. Between them
 // is just a pale stone staging opening, not an independently painted level.
 face(landing,13,6.1,0,6.0,-7.6,rockMats[0]); // roof y 2.95..9.05
 face(landing,13,5.2,0,-2.5,-7.6,rockMats[0]); // sill y -5.1..0.1
 const backdrop=face(landing,11.6,2.86,0,1.60,-8.30,makeMat(0xd1c9bf));
 face(landing,2.2,3.0,-6.45,1.55,-7.48,rockMats[0]);
 face(landing,2.2,3.0,6.45,1.55,-7.48,rockMats[0]);
 const ledge=addBox(landing,11.7,.14,1.6,0,.065,-6.72,floorMat);
 addBox(landing,11.7,.24,.55,0,2.99,-7.35,baseStone);
 addBox(landing,11.7,.19,.55,0,.02,-7.35,baseStone);
 // Low profile edges anchor the vertical soil section in actual 3D space.
 for(const sign of [-1,1]){
  addBox(landing,.16,3.0,.15,sign*5.70,1.58,-7.37,iron);
  addBox(landing,.08,2.75,.07,sign*5.95,1.58,-7.30,baseStone);
 }
 const chips=[];
 for(let i=0;i<36;i++){
  const q=rand(1000+i)(),sign=i%2?-1:1;
  const rock=new THREE.Mesh(
   new THREE.DodecahedronGeometry(.10+.13*q,0),
   makeMat([0x827f7d,0x8d837d,0xa99b90,0xbbb0a4][i%4])
  );
  rock.scale.set(1+.9*q,.38+.5*q,.22+.3*q);
  rock.rotation.z=q*5;rock.position.set(sign*(.4+i%16*.39),i%3===0?3.1+q*.8:-.20-q*.65,-7.25);
  landing.add(rock);chips.push(rock);
 }
 // Fully continuous wall, behind both doors during motion; made of one large
 // real plane + independently scrolling horizontal geological ledges.
 const scrollingTexture=rockTexture(4640);
 scrollingTexture.repeat.set(1.25,4.5);
 const wallMat=new THREE.MeshLambertMaterial({map:scrollingTexture,side:THREE.DoubleSide});
 face(travel,17,23,0,1.5,-7.5,wallMat);
 const seamLines=[],lineMat=[makeMat(0x77716d),makeMat(0xc6b3a1),makeMat(0x817a73)];
 const rng=rand(3852);
 for(let i=0;i<20;i++){
  const width=3.2+rng()*9.0,thickness=.025+rng()*.09;
  const line=addBox(travel,width,thickness,.06,(rng()-.5)*(17-width),0,-7.39,lineMat[i%3]);
  line.userData.baseY=-9+i*.95;line.position.y=line.userData.baseY;
  seamLines.push(line);
 }
 const atSurface=new THREE.Group();group.add(atSurface);
 // B0 retains its original simple white exterior; subterranean strata only
 // appear below ground and while descending into the first level.
 const shaftInfo={floor:0,traveling:false,direction:0,scrollDistance:0,stoneCount:chips.length+seamLines.length};
 function setFloor(depth){
  shaftInfo.floor=depth;
  landing.visible=depth>0&&!shaftInfo.traveling;
  atSurface.visible=depth===0&&!shaftInfo.traveling;
  if(depth>0){
   const mat=rockMats[Math.floor((depth-1)%rockMats.length)];
   for(const x of landingRockSurfaces)x.material=mat;
   for(const child of landing.children)if(child.isMesh&&child.material===rockMats[0]&&!landingRockSurfaces.includes(child))landingRockSurfaces.push(child);
   for(const rock of landingRockSurfaces)rock.material=mat;
   // Slight per-floor layer offset, preserving the same modular geometry.
   for(const rock of landingRockSurfaces)rock.material.map.offset.y=(depth*.173)%1;
   backdrop.material.color.setHex(depth>16?0xbdb7b0:0xd1c9bf);
  }
 }
 function setTraveling(value,direction=0){
  shaftInfo.traveling=Boolean(value);
  shaftInfo.direction=direction;
  travel.visible=Boolean(value);landing.visible=!value&&shaftInfo.floor>0;
  atSurface.visible=!value&&shaftInfo.floor===0;
 }
 function update(dt){
  if(!shaftInfo.traveling)return;
  // Elevator going DOWN sees earth moving UP; up travel reverses it.
  const travelStep=dt*1.58*shaftInfo.direction;
  shaftInfo.scrollDistance+=travelStep;
  scrollingTexture.offset.y+=travelStep*.19;
  for(const line of seamLines){
   line.position.y=line.userData.baseY+(shaftInfo.scrollDistance*4.3+9.5)%19-9.5;
   if(line.position.y>10)line.position.y-=19;
  }
 }
 travel.visible=false;landing.visible=false;setFloor(0);
 return Object.freeze({setFloor,setTraveling,update,getState:()=>({...shaftInfo,landingVisible:landing.visible,travelVisible:travel.visible,textureOffset:scrollingTexture.offset.y})});
}
