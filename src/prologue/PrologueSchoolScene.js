/* Real Three.js school model for the finite prologue street. */
export class PrologueSchoolScene{
  constructor(THREE,scene,content){
    this.THREE=THREE;this.scene=scene;this.content=content;
    this.root=new THREE.Group();this.root.name='prologue-school-real-model';
    this.meshCount=0;this.instanceCount=0;this.textures=[];this.materials=[];
    this._build();scene.add(this.root);
  }
  _paperTexture(base,seed=1){
    const THREE=this.THREE,c=document.createElement('canvas'),n=192;c.width=c.height=n;
    const x=c.getContext('2d'),r=(v)=>Math.max(0,Math.min(255,v));
    const rgb={r:(base>>16)&255,g:(base>>8)&255,b:base&255};
    x.fillStyle=`rgb(${rgb.r},${rgb.g},${rgb.b})`;x.fillRect(0,0,n,n);
    let s=seed>>>0||1,rand=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
    const img=x.getImageData(0,0,n,n),d=img.data;
    for(let i=0;i<d.length;i+=4){
      const grain=(rand()-.5)*18+(rand()-.5)*8;
      d[i]=r(d[i]+grain);d[i+1]=r(d[i+1]+grain);d[i+2]=r(d[i+2]+grain);
    }
    x.putImageData(img,0,0);
    x.globalAlpha=.12;
    for(let i=0;i<135;i++){
      const y=rand()*n,len=10+rand()*50;
      x.strokeStyle=rand()>.5?'#fff':'#402b1c';x.lineWidth=.35+rand()*.55;
      x.beginPath();x.moveTo(rand()*n,y);x.lineTo(Math.min(n,rand()*n+len),y+(rand()-.5)*2);x.stroke();
    }
    x.globalAlpha=1;
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(2,2);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    this.textures.push(t);return t;
  }
  _mat(name,color,{roughness=.94,metalness=0,emissive=0,emissiveIntensity=0}={}){
    const THREE=this.THREE,m=new THREE.MeshStandardMaterial({
      name,map:this._paperTexture(color,this.materials.length*97+31),
      color:0xffffff,roughness,metalness,emissive,emissiveIntensity
    });
    this.materials.push(m);return m;
  }
  _box(name,w,h,d,x,y,z,mat,{cast=true,receive=true}={}){
    const THREE=this.THREE,g=new THREE.BoxGeometry(w,h,d),m=new THREE.Mesh(g,mat);
    m.name=name;m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=receive;
    this.root.add(m);this.meshCount++;return m;
  }
  _instancedBoxes(name,w,h,d,rows,mat,{cast=true}={}){
    const THREE=this.THREE,g=new THREE.BoxGeometry(w,h,d),m=new THREE.InstancedMesh(g,mat,rows.length),o=new THREE.Object3D();
    m.name=name;
    rows.forEach((p,i)=>{o.position.set(p[0],p[1],p[2]);o.updateMatrix();m.setMatrixAt(i,o.matrix)});
    m.instanceMatrix.needsUpdate=true;m.castShadow=cast;m.receiveShadow=true;
    this.root.add(m);this.meshCount++;this.instanceCount+=rows.length;return m;
  }
  _build(){
    const T=this.THREE;
    const wall=this._mat('warm-plaster-paper',0xd7c5a4);
    const wallSide=this._mat('cardboard-edge',0x8c6c4e);
    const trim=this._mat('school-trim-paper',0xb9aa91);
    const roof=this._mat('charcoal-roof-paper',0x4c5052,{roughness:.88});
    const glass=this._mat('blue-window-paper',0x769baa,{roughness:.55,emissive:0x20343b,emissiveIntensity:.12});
    const metal=this._mat('painted-metal-paper',0x383c3d,{roughness:.74,metalness:.08});
    const door=this._mat('school-door-paper',0x66513e,{roughness:.82});
    const concrete=this._mat('school-wall-concrete-paper',0xb7aa93);
    const accent=this._mat('school-accent-paper',0x8f4b43);
    const yard=this._mat('yard-card-paper',0xa99472);
    const clockFace=this._mat('clock-paper',0xe7dfcc,{roughness:.8});
    const dark=this._mat('clock-hand-paper',0x322c28,{roughness:.75});

    const baseY=1;
    this._box('school-yard-base',23,.18,4.8,11.5,baseY+.09,-7.9,yard,{cast:false});

    // Three-storey teaching block: real depth, roof and façade.
    this._box('school-main-building',14.6,7.2,3.4,15.45,baseY+3.6,-9.05,wall);
    this._box('school-left-edge',.22,7.25,3.48,8.05,baseY+3.6,-9.05,wallSide);
    this._box('school-right-edge',.22,7.25,3.48,22.85,baseY+3.6,-9.05,wallSide);
    this._box('school-roof-slab',15.2,.32,3.9,15.45,baseY+7.34,-9.05,roof);
    this._box('school-roof-parapet',15.2,.48,.24,15.45,baseY+7.62,-7.22,trim);
    for(const y of [baseY+2.45,baseY+4.7])this._box('school-floor-band',14.9,.18,.18,15.45,y,-7.30,trim,{cast:false});

    // Recessed central entrance and canopy.
    this._box('school-entry-recess',3.2,3.15,.18,15.45,baseY+1.58,-7.30,wallSide,false);
    this._box('school-entry-left-door',1.05,2.45,.13,14.86,baseY+1.23,-7.17,door);
    this._box('school-entry-right-door',1.05,2.45,.13,16.04,baseY+1.23,-7.17,door);
    this._box('school-entry-glass-left',.62,1.52,.05,14.86,baseY+1.48,-7.09,glass,{cast:false});
    this._box('school-entry-glass-right',.62,1.52,.05,16.04,baseY+1.48,-7.09,glass,{cast:false});
    this._box('school-entry-canopy',4.1,.22,1.05,15.45,baseY+3.05,-6.82,roof);

    // 12 windows with real frames and inset paper-glass.
    const frames=[],panes=[];
    for(const y of [baseY+1.45,baseY+3.72,baseY+5.98]){
      for(const x of [9.45,11.85,19.05,21.45]){
        frames.push([x,y,-7.30]);panes.push([x,y,-7.21]);
      }
    }
    this._instancedBoxes('school-window-frames',1.82,1.18,.12,frames,trim,{cast:false});
    this._instancedBoxes('school-window-panes',1.55,.91,.06,panes,glass,{cast:false});

    // Clock above entrance.
    const clock=new T.Mesh(new T.CylinderGeometry(.47,.47,.11,32),clockFace);
    clock.name='school-clock';clock.rotation.x=Math.PI/2;clock.position.set(15.45,baseY+6.32,-7.18);
    clock.castShadow=false;clock.receiveShadow=true;this.root.add(clock);this.meshCount++;
    this._box('school-clock-hour-hand',.045,.28,.035,15.45,baseY+6.43,-7.10,dark,{cast:false});
    const minute=this._box('school-clock-minute-hand',.045,.36,.035,15.59,baseY+6.36,-7.09,dark,{cast:false});
    minute.rotation.z=-Math.PI*.28;

    // Low perimeter wall and entrance gate in the foreground of the school.
    this._box('school-wall-left',3.1,1.35,.42,1.55,baseY+.675,-5.92,concrete);
    this._box('school-wall-right',14.6,1.35,.42,15.7,baseY+.675,-5.92,concrete);
    for(const x of [3.35,7.85])this._box('school-gate-pillar',.62,2.15,.62,x,baseY+1.075,-5.92,concrete);
    const bars=[];
    for(let x=3.78;x<=7.42;x+=.46)bars.push([x,baseY+1.05,-5.88]);
    this._instancedBoxes('school-gate-bars',.10,1.75,.12,bars,metal);
    this._box('school-gate-top-rail',3.75,.12,.14,5.6,baseY+1.86,-5.88,metal);
    this._box('school-gate-bottom-rail',3.75,.12,.14,5.6,baseY+.26,-5.88,metal);

    // Guard room, notice board and a small accent plaque.
    this._box('school-guard-room',2.65,2.35,2.15,1.5,baseY+1.175,-7.20,wall);
    this._box('school-guard-roof',2.95,.24,2.42,1.5,baseY+2.47,-7.20,roof);
    this._box('school-guard-window',1.25,.86,.06,1.72,baseY+1.46,-6.10,glass,{cast:false});
    this._box('school-notice-board',2.2,1.15,.10,10.0,baseY+1.45,-5.68,door,{cast:false});
    this._box('school-accent-plaque',1.75,.30,.08,5.6,baseY+2.20,-5.66,accent,{cast:false});

    // Thin paper trees behind wall, built from real crossed cards plus trunks.
    for(const [x,s] of [[.4,.9],[7.8,1.0],[23.1,.95]]){
      this._box('school-tree-trunk',.28,2.8,.28,x,baseY+2.0,-7.3,door);
      const leaf=this._mat('leaf-paper-'+x,0x667e56);
      const a=this._box('school-tree-card',2.2*s,3.4*s,.08,x,baseY+4.0,-7.3,leaf,{cast:true});
      const b=this._box('school-tree-card-cross',2.2*s,3.4*s,.08,x,baseY+4.0,-7.3,leaf,{cast:true});b.rotation.y=Math.PI/2;
    }
  }
  stats(){
    return {
      enabled:true,realGeometry:true,style:'paper-cardboard-school-v1',
      meshCount:this.meshCount,instanceCount:this.instanceCount,
      materials:this.materials.length,textures:this.textures.length,
      footprintMeters:{x:[0,23],z:[-10.75,-5.5]},floors:3,
      features:['gate','perimeter-wall','guard-room','teaching-block','windows','entrance','clock','trees']
    };
  }
  dispose(){
    this.scene?.remove(this.root);
    this.root.traverse(o=>{o.geometry?.dispose?.()});
    for(const m of this.materials)m.dispose();
    for(const t of this.textures)t.dispose();
  }
}
