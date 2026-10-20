import {rng} from './math.js';
import {cityLightProfile} from './city-light-profile.js';

/** Three freestanding cut-paper town layers, coloured independently of fog. */
export function createCityBackdrop({THREE,scene,flags={}}){
  const group=new THREE.Group();
  group.name='Moonlamp town · layered paper horizon';
  group.userData.volumeShadow=false;
  scene.add(group);
  const palette={
    near:{night:0x293c62,day:0x8aabb1,dusk:0x8f7f9c},
    middle:{night:0x47547e,day:0xa4bfcd,dusk:0xac91ad},
    far:{night:0x626a95,day:0xc3d3dc,dusk:0xc0a2bd},
    cloud:{night:0x6e78a4,day:0xf7f0df,dusk:0xedd0d1},
  };
  const uniforms={day:{value:0},twilight:{value:0}};
  const paper=new THREE.ShaderMaterial({
    name:'Matte coloured skyline paper',uniforms,fog:false,toneMapped:false,
    side:THREE.FrontSide,
    vertexShader:`
      attribute vec3 paperNight;
      attribute vec3 paperDay;
      attribute vec3 paperDusk;
      attribute vec3 houseCoordinates;
      varying vec3 vNight;
      varying vec3 vDay;
      varying vec3 vDusk;
      varying vec2 vPaper;
      varying vec3 vHouse;
      void main(){
        vNight=paperNight;vDay=paperDay;vDusk=paperDusk;vPaper=position.xy;
        vHouse=houseCoordinates;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform float day;
      uniform float twilight;
      varying vec3 vNight;
      varying vec3 vDay;
      varying vec3 vDusk;
      varying vec2 vPaper;
      varying vec3 vHouse;
      float rectangle(vec2 p,vec2 lo,vec2 hi){
        vec2 inside=smoothstep(lo,lo+vec2(.018),p)*(1.0-smoothstep(hi-vec2(.018),hi,p));
        return inside.x*inside.y;
      }
      float random21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 ink=mix(mix(vNight,vDay,day),vDusk,twilight*.55);
        if(vHouse.z>=0.0&&vPaper.y>.5){
          vec2 grid=vec2(vHouse.x*2.0,vHouse.y);
          vec2 cell=fract(grid);
          float seed=random21(floor(grid)+vec2(vHouse.z*23.7,vHouse.z*11.3));
          // Printed window surrounds and tiny glazing bars remain crisp paper marks.
          float surround=rectangle(cell,vec2(.25,.22),vec2(.75,.72));
          float pane=rectangle(cell,vec2(.30,.26),vec2(.70,.68));
          vec3 frame=mix(ink*.56,ink*1.21,day);
          vec3 glass=mix(ink*.54,vec3(.17,.29,.34),day);
          float lit=step(.71,seed)*(1.0-day);
          glass=mix(glass,vec3(.78,.48,.22),lit*.87);
          ink=mix(ink,frame,surround);
          ink=mix(ink,glass,pane);
          float bar=(1.0-smoothstep(.012,.025,abs(cell.x-.5)))*pane;
          ink=mix(ink,frame,bar*.65);
          float sill=rectangle(cell,vec2(.22,.19),vec2(.78,.225));
          ink=mix(ink,mix(vNight,vDay,day)*1.29,sill);
          // One quiet horizontal crease per storey; broad walls never become blank blocks.
          float crease=smoothstep(.966,.977,cell.y)*(1.0-smoothstep(.986,.997,cell.y));
          ink*=1.0-crease*.16;
        }
        float grain=fract(sin(dot(floor(vPaper*89.0),vec2(127.1,311.7)))*43758.5453);
        gl_FragColor=vec4(ink*(.987+grain*.026),1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const glow=new THREE.MeshBasicMaterial({name:'Warm cut-paper moon and stars',
    color:0xffffff,vertexColors:true,transparent:true,opacity:1,depthWrite:false,
    side:THREE.FrontSide,fog:false,toneMapped:false});
  const batches=[],buildings=[],layers=[];
  const color=new THREE.Color(),white=new THREE.Color(0xf1e9d8);
  function batch(name,material=paper){
    const result={name,material,positions:[],night:[],day:[],dusk:[],colors:[],details:[]};
    batches.push(result);return result;
  }
  function tint(hex,shade=1,edge=0){
    color.setHex(hex).multiplyScalar(shade).lerp(white,edge);
    return [color.r,color.g,color.b];
  }
  function triangle(target,a,b,c,stock,shade=1,edge=0,facade=null){
    target.positions.push(...a,...b,...c);
    if(target.material===glow){
      const rgb=tint(stock,shade,edge);for(let i=0;i<3;i++)target.colors.push(...rgb);
    }else{
      for(const point of [a,b,c])target.details.push(...(facade?
        [(point[0]-facade.x)/facade.width,(point[1]-facade.height)/facade.storey+8.0,facade.seed]:[-1,-1,-1]));
      for(const [key,source] of [['night','night'],['day','day'],['dusk','dusk']]){
        const rgb=tint(stock[source],shade,edge);for(let i=0;i<3;i++)target[key].push(...rgb);
      }
    }
  }
  function polygon(target,points,z,stock,shade=1,edge=0,facade=null){
    const contour=points.map(([x,y])=>new THREE.Vector2(x,y));
    if(THREE.ShapeUtils.isClockWise(contour))contour.reverse();
    for(const indices of THREE.ShapeUtils.triangulateShape(contour,[])){
      const [a,b,c]=indices.map(index=>[contour[index].x,contour[index].y,z]);
      triangle(target,a,b,c,stock,shade,edge,facade);
    }
  }
  function rect(target,x,y,w,h,z,stock,shade=1,edge=0,facade=null){
    polygon(target,[[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x-w/2,y+h]],z,stock,shade,edge,facade);
  }
  function line(target,a,b,width,z,stock,shade=1,edge=0){
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<1e-5)return;
    const nx=-dy/length*width*.5,ny=dx/length*width*.5;
    polygon(target,[[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],
      [b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]],z,stock,shade,edge);
  }
  const configs=[
    {name:'far',z:-28,min:7.7,range:2.05,width:3.85,storey:1.55,seed:112},
    {name:'middle',z:-18,min:5.2,range:2.0,width:3.2,storey:1.4,seed:243},
    {name:'near',z:-10,min:3.1,range:1.65,width:2.55,storey:1.25,seed:876},
  ];
  for(const config of configs){
    const random=rng(config.seed),stock=palette[config.name];
    const city=batch(`${config.name} town paper cutouts`),tops=[];
    let x=-72,index=0;
    while(x<86){
      const width=config.width*(.80+random()*.40),right=Math.min(86,x+width);
      const center=(x+right)/2,height=config.min+random()*config.range;
      const kind=index%7,shade=.89+random()*.22;
      let roof;
      if(config.name==='far'&&index===21){
        // Only one slender bell spire; the school's foreground clock stays the landmark.
        roof=[[x,height],[x+width*.2,height+.48],[center,height+1.8],
          [right-width*.2,height+.48],[right,height]];
      }else if(kind===2){
        roof=[[x,height],[x+width*.18,height+.38],[right-width*.18,height+.38],[right,height]];
      }else if(kind===5){
        roof=[[x,height+.21],[right,height+.38]];
      }else{
        const peak=height+.45+random()*.36,skew=(random()-.5)*width*.16;
        roof=[[x,height],[center+skew,peak],[right,height]];
      }
      tops.push(...roof);
      // Separate narrow houses with gentle pigment variation, rather than one unbroken wall.
      rect(city,center,-3,right-x,height+3,config.z,stock,shade,0,
        {x,width:right-x,height,seed:index+config.seed,storey:config.storey});
      polygon(city,[[x,height-.055],...roof,[right,height-.055]],config.z+.016,stock,shade*.75);
      for(let i=1;i<roof.length;i++){
        const a=roof[i-1],b=roof[i];
        line(city,a,b,.028,config.z+.037,stock,shade,.13);
      }
      rect(city,right-.037,-3,.074,height+3,config.z+.021,stock,shade*.70);
      if(kind===1||kind===4){
        const chimneyX=x+width*.22;
        rect(city,chimneyX,height+.24,.18,.66,config.z+.020,stock,shade*.82);
        rect(city,chimneyX,height+.86,.25,.06,config.z+.023,stock,shade,.11);
      }
      // Folded dormers punctuate every fourth roof without repeating a major landmark.
      if(kind===0&&config.name!=='far'){
        polygon(city,[[center-.22,height+.04],[center-.22,height+.42],
          [center,height+.61],[center+.22,height+.42],[center+.22,height+.04]],config.z+.030,stock,shade*1.1);
        rect(city,center,height+.13,.18,.23,config.z+.034,stock,shade*.48);
      }
      buildings.push({layer:config.name,x:center,width:right-x,z:config.z,
        roofY:Math.max(...roof.map(p=>p[1])),kind});
      x=right;index++;
    }
    layers.push({name:config.name,z:config.z,minX:-72,maxX:86,
      maxY:Math.max(...tops.map(p=>p[1])),minRoofY:config.min});
  }

  const clouds=batch('Scalloped paper clouds');
  clouds.sky=true;
  const cloudSpecs=[[-31,12.5,-27,8.3,1.20],[-8,11.8,-25,6.0,.85],
    [20,12.5,-29,9.4,1.05],[47,12.2,-27,7.3,1.0],[73,13.2,-28,7.6,1.13]];
  for(const [cx,cy,z,width,height] of cloudSpecs){
    const shape=[[-.50,-.13],[-.48,.12],[-.42,.24],[-.33,.26],[-.29,.49],
      [-.20,.64],[-.10,.65],[0,.53],[.06,.32],[.15,.45],[.25,.41],
      [.30,.18],[.41,.16],[.48,.03],[.50,-.13]];
    const points=shape.map(([x,y])=>[cx+x*width,cy+y*height]);
    polygon(clouds,points,z,palette.cloud);
    line(clouds,[cx-width*.40,cy-height*.13],[cx+width*.39,cy-height*.13],.045,z+.018,palette.cloud,1,.12);
    // A second pasted strip at the bottom reads as thin layered stationery.
    polygon(clouds,[[cx-width*.35,cy-height*.13],[cx+width*.35,cy-height*.13],
      [cx+width*.28,cy-height*.27],[cx-width*.26,cy-height*.27]],z-.025,palette.cloud,.84);
  }
  const celestial=batch('Crescent moon and four-point paper stars',glow);
  celestial.sky=true;
  const moon={x:5.5,y:11.8,z:-27,radius:1.2};
  const radius=moon.radius,offset=radius*.67,angle=Math.acos(offset/(radius*2));
  const crescent=[];
  // Two intersecting circular arcs make an actual open crescent silhouette.
  for(let i=0;i<=28;i++){
    const a=angle+(Math.PI*2-angle*2)*i/28;
    crescent.push([Math.cos(a)*radius,Math.sin(a)*radius]);
  }
  for(let i=0;i<=20;i++){
    const a=(Math.PI+angle)-(angle*2)*i/20;
    crescent.push([offset+Math.cos(a)*radius,Math.sin(a)*radius]);
  }
  const rotate=-.32;
  const moonPoints=crescent.map(([x,y])=>[
    moon.x+x*Math.cos(rotate)-y*Math.sin(rotate),moon.y+x*Math.sin(rotate)+y*Math.cos(rotate)]);
  polygon(celestial,moonPoints,moon.z,0xffe6af);
  for(const [x,y,r] of [[-42,13.4,.16],[-20,14.1,.12],[-12,15.1,.20],
    [-1,12.8,.12],[12,14.2,.17],[31,14.5,.15],[41,15.6,.21],[60,14.2,.17],[80,15.3,.13]]){
    const star=[];
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,rr=i%2?r*.24:r;
      star.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*1.35]);
    }
    polygon(celestial,star,-29.5,0xe4d7b9);
  }

  let triangles=0;
  for(const source of batches){
    if(!source.positions.length)continue;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));
    if(source.material===glow)geometry.setAttribute('color',new THREE.Float32BufferAttribute(source.colors,3));
    else for(const [key,name] of [['night','paperNight'],['day','paperDay'],['dusk','paperDusk']]){
      geometry.setAttribute(name,new THREE.Float32BufferAttribute(source[key],3));
    }
    if(source.material===paper)geometry.setAttribute('houseCoordinates',new THREE.Float32BufferAttribute(source.details,3));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,source.material);
    mesh.name=source.name;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
    mesh.userData.volumeShadow=false;
    mesh.userData.backdrop=true;
    mesh.userData.paperSky=!!source.sky;
    group.add(mesh);triangles+=source.positions.length/9;
  }
  group.userData.cityBackdrop={layers,buildings,moon,clouds:cloudSpecs.length};
  let lastDay=-1,lastTwilight=-1,skyVisible=true;
  function setSkyVisible(visible){
    skyVisible=!!visible;
    for(const mesh of group.children)if(mesh.userData.paperSky){
      mesh.visible=skyVisible&&(mesh.material!==glow||glow.opacity>.001);
    }
    flags.render=true;
  }
  function updateLighting(time=.875){
    const {day,night,twilight}=cityLightProfile(Number.isFinite(time)?time:.875);
    if(day===lastDay&&twilight===lastTwilight)return;
    uniforms.day.value=day;uniforms.twilight.value=twilight;
    glow.opacity=night;
    for(const mesh of group.children)if(mesh.material===glow)mesh.visible=skyVisible&&night>.001;
    lastDay=day;lastTwilight=twilight;flags.render=true;
  }
  updateLighting(.875);
  flags.depth=true;
  return {group,updateLighting,setSkyVisible,stats:()=>({batches:group.children.length,materials:2,triangles,
    layers:layers.map(layer=>({...layer})),buildings:buildings.length,clouds:cloudSpecs.length,
    moon:{...moon},day:uniforms.day.value,twilight:uniforms.twilight.value,nightOpacity:glow.opacity})};
}
