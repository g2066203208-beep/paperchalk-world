/* Paperchalk World — independent, five-faced 2.5D school room.
 * Reuses the battle room's perspective principles, NEVER its combat state.
 * All five room materials are flat orthographic images on real 3D planes.
 */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldSchoolRoom=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const ROOM=Object.freeze({width:10,height:3.38,depth:9});
  const MATERIALS=Object.freeze({
    back:'./assets/school-room/back-painted.png',floor:'./assets/school-room/floor-painted.png',
    ceiling:'./assets/school-room/ceiling.svg',left:'./assets/school-room/left-windows-alpha.svg',
    right:'./assets/school-room/right-door-painted.svg'
  });
  // One transparent drawing per object: no 3D desk/chair/podium models.
  // 3D is reserved for the room's placement, camera, depth and wall planes.
  const FURNITURE_MATERIALS=Object.freeze({
    desk:'./assets/school-room/student-desk-standee.svg',
    chair:'./assets/school-room/student-chair-standee.svg',
    podium:'./assets/school-room/teacher-podium-standee.svg'
  });
  // The distant view and fall animation are also separate 2D texture planes.
  const EXTERIOR_MATERIALS=Object.freeze({
    sky:'./assets/school-room/exterior-overcast-sky.svg',
    facade:'./assets/school-room/exterior-school-facade.svg'
  });
  const FALL_MATERIAL='./assets/school-room/falling-schoolgirl-silhouette.svg';
  const BOSS_MATERIALS=Object.freeze({
    creature:'./assets/school-room/boss-emergence-shadow.svg',
    rupture:'./assets/school-room/boss-rupture-floor.svg'
  });
  // Standalone boss birth cinematic. It never overrides the existing
  // first-act window-fall storyline or assumes the eventual boss identity.
  const BOSS_DURATION=4.15;
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const smooth=t=>{const v=clamp(t,0,1);return v*v*(3-2*v);};
  function bossPhaseAt(t){
    const s=Math.max(0,Number(t)||0);
    const flight=smooth((s-.78)/1.90);
    return Object.freeze({
      elapsed:s,
      phase:s<.48?'warning':s<.78?'rupture':s<2.68?'blast':
        s<3.70?'manifest':'boss-ready',
      flyingFurniture:s>=.78&&s<2.68,
      furnitureVisible:s<2.68,
      furnitureOpacity:1-smooth((s-1.85)/.83),
      displacement:flight,
      bossGrowth:smooth((s-.48)/2.92),
      bossOpacity:smooth((s-.58)/1.10),
      ruptureStrength:s<.42?.12:s<2.70?Math.max(0,1-(s-.42)/2.28):0,
      flash:s>=.78?Math.exp(-Math.pow((s-.9)/.20,2))*.8:0
    });
  }
  // Rows face the blackboard (z=9). Clear walking lanes on each side and center.
  const CLASSROOM_LAYOUT=Object.freeze({
    columns:Object.freeze([-3.48,-1.22,1.22,3.48]),
    rows:Object.freeze([2.15,3.3,4.45,5.6,6.75]),
    desks:20,chairs:20,
    centerAisle:1.35,sideAisle:.95
  });
  // The game's daily-life minute owns all light transitions; no real clock.
  const LIGHTING_KEYS=Object.freeze([
    {at:0,phase:'night',ambient:[.16,.21,.32],sun:[1,.62,.32],sky:[.055,.083,.15],sunPower:0,lamp:.30},
    {at:315,phase:'predawn',ambient:[.25,.31,.44],sun:[1,.56,.35],sky:[.25,.32,.48],sunPower:0,lamp:.22},
    {at:355,phase:'sunrise',ambient:[.52,.53,.59],sun:[1,.54,.28],sky:[.83,.50,.48],sunPower:.20,lamp:.09},
    {at:390,phase:'sunrise',ambient:[.68,.66,.62],sun:[1,.64,.34],sky:[1,.68,.53],sunPower:.53,lamp:0},
    {at:450,phase:'morning',ambient:[.76,.78,.78],sun:[1,.78,.54],sky:[.74,.79,.87],sunPower:.74,lamp:0},
    {at:660,phase:'day',ambient:[.85,.88,.90],sun:[.99,.94,.82],sky:[.69,.79,.92],sunPower:.82,lamp:0},
    {at:780,phase:'day',ambient:[.88,.90,.92],sun:[1,.96,.87],sky:[.70,.82,.96],sunPower:.86,lamp:0},
    {at:960,phase:'afternoon',ambient:[.79,.79,.78],sun:[1,.81,.61],sky:[.80,.80,.85],sunPower:.78,lamp:0},
    {at:1050,phase:'sunset',ambient:[.67,.61,.60],sun:[1,.49,.28],sky:[.97,.56,.43],sunPower:.74,lamp:0},
    {at:1100,phase:'sunset',ambient:[.48,.47,.56],sun:[1,.42,.28],sky:[.89,.38,.42],sunPower:.40,lamp:.06},
    {at:1145,phase:'twilight',ambient:[.30,.35,.49],sun:[1,.49,.34],sky:[.30,.27,.48],sunPower:0,lamp:.17},
    {at:1200,phase:'night',ambient:[.17,.23,.34],sun:[1,.62,.33],sky:[.07,.12,.25],sunPower:0,lamp:.29},
    {at:1440,phase:'night',ambient:[.16,.21,.32],sun:[1,.62,.32],sky:[.055,.083,.15],sunPower:0,lamp:.30}
  ]);
  const mix=(a,b,t)=>a+(b-a)*t;
  const mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  function lightingAt(minute=420){
    const m=clamp(Number.isFinite(Number(minute))?Number(minute):420,0,1440);
    let lo=LIGHTING_KEYS[0],hi=LIGHTING_KEYS[LIGHTING_KEYS.length-1];
    for(let i=0;i<LIGHTING_KEYS.length-1;i++)
      if(m>=LIGHTING_KEYS[i].at&&m<=LIGHTING_KEYS[i+1].at){
        lo=LIGHTING_KEYS[i];hi=LIGHTING_KEYS[i+1];break;
      }
    let t=clamp((m-lo.at)/Math.max(1,hi.at-lo.at),0,1);
    t=t*t*(3-2*t);
    const stage=clamp((m-355)/(1105-355),0,1);
    // Left-facing window glazing exposes the sun's arc: morning and evening
    // rays advance in opposite directions across the painted classroom.
    const altitude=.12+1.12*Math.sin(Math.PI*stage);
    const azimuth=(stage-.5)*1.62;
    const ray=[-.92,altitude,azimuth];
    const n=Math.hypot(...ray)||1;
    return {
      minute:m,phase:m===hi.at?hi.phase:lo.phase,
      ambient:mix3(lo.ambient,hi.ambient,t),
      sunColor:mix3(lo.sun,hi.sun,t),
      skyColor:mix3(lo.sky,hi.sky,t),
      sunPower:mix(lo.sunPower,hi.sunPower,t),
      lampPower:mix(lo.lamp,hi.lamp,t),
      sunDirection:ray.map(v=>v/n)
    };
  }
  function blendLight(a,b,t){
    return {
      ...b,
      ambient:mix3(a.ambient,b.ambient,t),
      sunColor:mix3(a.sunColor,b.sunColor,t),
      skyColor:mix3(a.skyColor,b.skyColor,t),
      sunPower:mix(a.sunPower,b.sunPower,t),
      lampPower:mix(a.lampPower,b.lampPower,t),
      sunDirection:mix3(a.sunDirection,b.sunDirection,t)
    };
  }
  const ACTORS=Object.freeze([
    {id:'boy',src:'./assets/school-room/small-boy.svg',x:-.76,z:4.55,h:1.70,ends:5},
    {id:'girl',src:'./assets/school-room/class-idol.svg',x:-1.75,z:4.43,h:1.73,ends:1},
    {id:'female2',src:'./assets/characters/civilians/schoolgirls/sg01/front.png',x:2.48,z:5.18,h:1.72},
    {id:'male1',src:'./assets/characters/char-003/front.png',x:-2.90,z:6.20,h:1.79},
    {id:'male2',src:'./assets/characters/char-016/front.png',x:2.05,z:6.10,h:1.80},
    {id:'extra2',src:'./assets/characters/civilians/npc-c002/front.png',x:1.04,z:4.82,h:1.78},
  ]);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function camera(px=0,py=0){
    const axis=t=>{
      const v=clamp(Number(t)||0,-1,1),m=Math.abs(v);
      if(m<.13)return 0;const s=(m-.13)/.87;
      return Math.sign(v)*s*s*(3-2*s);
    };
    // Battle-room-inspired human-scale lens. The viewer is INSIDE the
    // classroom, not photographing the whole room from beyond its back wall.
    // Let the ceiling crop naturally instead of shrinking every character.
    return {x:.10,y:1.25,z:-.90,hFov:54,yaw:axis(px)*.085,
      pitch:-.006-axis(py)*.039};
  }
  function project(p,cam,w,h){
    const dx=p[0]-cam.x,dy=p[1]-cam.y,dz=p[2]-cam.z;
    const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
    const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
    const xx=cy*dx-sy*dz,z0=sy*dx+cy*dz,yy=cp*dy-sp*z0,zz=sp*dy+cp*z0;
    if(zz<.04)return null;
    const f=Math.min(w,h*16/9)/(2*Math.tan(cam.hFov*Math.PI/360));
    return {x:w/2+f*xx/zz,y:h/2-f*yy/zz,z:zz};
  }
  const projectionShader=[
    'vec3 d=worldP-u_camera;',
    'float cy=cos(u_angles.x),sy=sin(u_angles.x);',
    'float cp=cos(u_angles.y),sp=sin(u_angles.y);',
    'float xx=cy*d.x-sy*d.z,zz=sy*d.x+cy*d.z;',
    'float yy=cp*d.y-sp*zz,depth=sp*d.y+cp*zz;',
    'float n=.06,f=44.0;',
    'float cz=(f+n)/(f-n)*depth-2.0*f*n/(f-n);',
    'gl_Position=vec4(xx/u_tan.x,yy/u_tan.y,cz,depth);'
  ].join('\n');
  const uniforms='uniform vec3 u_camera;uniform vec2 u_angles;uniform vec2 u_tan;\n';
  const TVS='attribute vec3 a_position;attribute vec2 a_uv;'+uniforms+
    'uniform mediump vec3 u_sunDirection;uniform mediump float u_shadowProjection;'+
    'varying mediump vec2 v_uv;varying mediump vec3 v_world;void main(){'+
    'vec3 worldP=a_position;'+
    'if(u_shadowProjection>.5){'+
    'float reach=max(0.0,worldP.y)/max(.22,u_sunDirection.y);'+
    'worldP.x-=u_sunDirection.x*reach;worldP.z-=u_sunDirection.z*reach;'+
    'worldP.y=.022;}'+
    'v_world=worldP;'+projectionShader+'v_uv=a_uv;}';
  const TFS=[
    'precision mediump float;',
    'varying mediump vec2 v_uv;varying mediump vec3 v_world;',
    'uniform sampler2D u_tex;',
    'uniform vec3 u_light,u_ambient,u_sunColor,u_skyColor;',
    'uniform mediump vec3 u_sunDirection;',
    'uniform float u_sprite,u_surface,u_sunPower,u_lampPower,u_objectOpacity;',
    'uniform mediump float u_shadowProjection;uniform float u_shadowOpacity;',
    // Window transmission analytically projects the actual 16 glass panes
    // onto each 3D receiver. It is not a fixed screen-space overlay.
    'float bounds(float x,float a,float b,float feather){',
    'return smoothstep(a-feather,a+feather,x)*(1.0-smoothstep(b-feather,b+feather,x));}',
    'float windowTransmission(vec3 p){',
    'if(u_sunDirection.x>-.09)return 0.0;',
    'float travel=(-5.0-p.x)/u_sunDirection.x;',
    'if(travel<0.0)return 0.0;',
    'vec3 hit=p+u_sunDirection*travel;',
    'float windowPixel=hit.z/9.0*2048.0;',
    'float yPixel=(1.0-hit.y/3.38)*760.0;',
    'float rel=mod(windowPixel-98.0+1856.0,464.0);',
    'float bay=bounds(windowPixel,90.0,1915.0,18.0);',
    'float leftPane=bounds(rel,19.0,201.0,9.0);',
    'float rightPane=bounds(rel,218.0,402.0,9.0);',
    'float high=bounds(yPixel,115.0,307.0,10.0);',
    'float low=bounds(yPixel,328.0,530.0,10.0);',
    'return bay*min(1.0,leftPane+rightPane)*min(1.0,high+low);}',
    'void main(){',
    'vec4 c=texture2D(u_tex,v_uv);if(c.a<.045)discard;',
    'if(u_sprite>.5&&c.r>.965&&c.g>.965&&c.b>.965)discard;',
    'if(u_shadowProjection>.5){',
    'gl_FragColor=vec4(.055,.067,.092,c.a*u_shadowOpacity*u_objectOpacity);return;}',
    // Sky and building are illustrated on independent 2D cards.
    'if(u_surface>6.5){',
    'gl_FragColor=vec4(c.rgb,c.a*u_objectOpacity);return;}',
    'if(u_surface>4.5){',
    'if(u_surface<5.5){',
    'float horizon=1.0-smoothstep(-.4,3.0,v_world.y);',
    'vec3 sky=mix(c.rgb,u_skyColor,.78);',
    'sky+=horizon*u_sunColor*u_sunPower*.12;',
    'gl_FragColor=vec4(clamp(sky,0.0,1.0),c.a*u_objectOpacity);return;}',
    'vec3 facade=c.rgb*(u_ambient*.78+.07);',
    'facade+=u_sunColor*u_sunPower*.12;',
    'gl_FragColor=vec4(clamp(facade,0.0,1.0),c.a*u_objectOpacity);return;}',
    'float windowNear=exp(-max(0.0,v_world.x+5.0)*.27);',
    'float bounce=u_sunPower*(.065+.13*windowNear);',
    'float direct=u_sunPower*windowTransmission(v_world);',
    'vec3 diffuse=u_ambient*u_light;',
    'diffuse+=u_sunColor*(direct*.72+bounce);',
    'float lampDx=(v_world.x-1.4)*.23;',
    'float lampPool=.72+.28*exp(-lampDx*lampDx);',
    'diffuse+=vec3(.93,.85,.72)*u_lampPower*lampPool*.65;',
    'float floorGlow=clamp(1.0-v_world.y/.23,0.0,1.0);',
    'vec3 finalColor=c.rgb*min(diffuse,vec3(1.46));',
    'finalColor+=u_sunColor*direct*floorGlow*.12*c.rgb;',
    'gl_FragColor=vec4(clamp(finalColor,0.0,1.0),c.a*u_objectOpacity);}'
  ].join('\n');
  const faces=Object.freeze({
    back:[[-5,0,9],[5,0,9],[5,ROOM.height,9],[-5,ROOM.height,9]],
    floor:[[-5,0,0],[-5,0,9],[5,0,9],[5,0,0]],
    ceiling:[[-5,ROOM.height,0],[5,ROOM.height,0],[5,ROOM.height,9],[-5,ROOM.height,9]],
    left:[[-5,0,0],[-5,ROOM.height,0],[-5,ROOM.height,9],[-5,0,9]],
    right:[[5,0,0],[5,0,9],[5,ROOM.height,9],[5,ROOM.height,0]]
  });
  const uvs=Object.freeze({
    back:[[0,0],[1,0],[1,1],[0,1]],
    floor:[[0,0],[0,1],[1,1],[1,0]],
    ceiling:[[0,0],[1,0],[1,1],[0,1]],
    left:[[0,0],[0,1],[1,1],[1,0]],
    right:[[0,0],[1,0],[1,1],[0,1]]
  });
  // Lightweight X/Y drawing planes at world-space Z. The camera supplies
  // perspective scaling and the depth buffer supplies correct occlusion.
  const furnitureSurfaces={desk:[],chair:[],podium:[]};
  const furnitureInstances=[];
  function furnitureQuad(id,points){
    const uv=[[0,0],[1,0],[1,1],[0,1]];
    for(const i of [0,1,2,0,2,3])furnitureSurfaces[id].push(...points[i],...uv[i]);
  }
  // Far to near: each element is a single textured 2D plane.
  // No facade windows / clouds / roof are modelled in 3D.
  const EXTERIOR=Object.freeze({skyX:-10,schoolX:-8.15,windowWallX:-5});
  function exteriorQuad(x){
    const y0=-3,y1=6,z0=-10,z1=30;
    const corners=[[x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0]];
    const uv=[[0,0],[1,0],[1,1],[0,1]];
    const v=[];
    for(const i of [0,1,2,0,2,3])v.push(...corners[i],...uv[i]);
    return new Float32Array(v);
  }
  const EXTERIOR_QUADS=Object.freeze({
    sky:exteriorQuad(EXTERIOR.skyX),
    facade:exteriorQuad(EXTERIOR.schoolX)
  });
  function standee(id,x,z,w,h){
    // The stable 2D card defines both its regular batch and independent
    // flight trajectory. No 3D mesh parts or duplicated artwork.
    furnitureInstances.push(Object.freeze({id,x,z,w,h,index:furnitureInstances.length}));
    furnitureQuad(id,[
      [x-w/2,0,z],[x+w/2,0,z],[x+w/2,h,z],[x-w/2,h,z]
    ]);
  }
  function flightQuad(prop,phase){
    // Deterministic per-card shock physics; every desk and chair has its own
    // x/z displacement, lift, spin and final removal, not a sheet translation.
    const f=phase.displacement;
    const seed=((prop.index*47+17)%101)/101;
    const fromX=prop.x+.12*Math.sin(prop.index*1.37);
    const fromZ=prop.z-4.8+.10*Math.cos(prop.index*.92);
    const len=Math.hypot(fromX,fromZ)||1;
    const dx=fromX/len,dz=fromZ/len;
    const lift=(1.7+seed*1.45)*Math.sin(Math.PI*f*.5);
    const turn=(prop.index%2?-1:1)*f*(1.12+seed*2.40);
    const cx=prop.x+dx*f*f*(3.4+seed*2.9);
    const cz=prop.z+dz*f*f*(3.6+seed*2.5);
    const cy=lift-.2*f*f;
    const co=Math.cos(turn),si=Math.sin(turn),twist=.20*Math.sin(f*Math.PI)*((prop.index%3)-1);
    const corners=[[-prop.w/2,0],[prop.w/2,0],[prop.w/2,prop.h],[-prop.w/2,prop.h]];
    const uv=[[0,0],[1,0],[1,1],[0,1]],out=[];
    for(const k of [0,1,2,0,2,3]){
      const [u,v]=corners[k],yLocal=v-prop.h*.48;
      out.push(cx+u*co-yLocal*si,cy+u*si+yLocal*co+prop.h*.48,
        cz+u*twist,...uv[k]);
    }
    return new Float32Array(out);
  }
  function bossQuad(t){
    const phase=bossPhaseAt(t),scale=Math.max(.001,phase.bossGrowth);
    const w=2.26*scale,h=3.10*scale,x=.16,z=4.85;
    // The silhouette rises from BELOW the floor, expands, then holds.
    const base=-1.32*(1-phase.bossGrowth)+.02;
    const pts=[[x-w/2,base,z],[x+w/2,base,z],[x+w/2,base+h,z],[x-w/2,base+h,z]];
    const uv=[[0,0],[1,0],[1,1],[0,1]],out=[];
    for(const k of [0,1,2,0,2,3])out.push(...pts[k],...uv[k]);
    return new Float32Array(out);
  }
  function ruptureQuad(t){
    const phase=bossPhaseAt(t);
    const growth=smooth((t-.45)/1.70);
    const radius=.75+4.15*growth,x=.04,z=4.81,y=.028;
    const pts=[[x-radius,y,z-radius],[x-radius,y,z+radius],
      [x+radius,y,z+radius],[x+radius,y,z-radius]];
    const uv=[[0,0],[0,1],[1,1],[1,0]],out=[];
    for(const k of [0,1,2,0,2,3])out.push(...pts[k],...uv[k]);
    return new Float32Array(out);
  }
  CLASSROOM_LAYOUT.rows.forEach((z)=>
    CLASSROOM_LAYOUT.columns.forEach((x)=>{
      standee('desk',x,z,1.14,1.05);
      standee('chair',x,z-.64,.72,.97);
    }));
  standee('podium',.48,8.12,1.65,1.44);
  function textureFaces(){
    return Object.fromEntries(Object.entries(faces).map(([id,pts])=>{
      const arr=[];
      // The painted floor is roughly 2:1. Repeat it over two actual floor
      // strips rather than stretching one image over the entire 10x9m room.
      // Each segment has independent UVs, so NPOT PNGs stay CLAMP-compatible.
      const patches=id==='floor'
        ? [0,4.5].map(z=>[
            [-5,0,z],[-5,0,z+4.5],[5,0,z+4.5],[5,0,z]
          ])
        : [pts];
      for(const patch of patches)
        for(const i of [0,1,2,0,2,3])
          arr.push(...patch[i],...uvs[id][i]);
      return [id,new Float32Array(arr)];
    }));
  }
  // Just like the ring arena's sole/crown calibration: actor.h is the
  // physical INK height, never the pixel canvas's padded height. Preserve
  // authored horizontal and vertical scale exactly, without a fixed 0.49:1
  // body squash or cutting pixels from the original 2D texture.
  const FULL_IMAGE=Object.freeze({left:0,top:0,right:1,bottom:1});
  function portraitPlacement(actor,pixels={width:512,height:960},ink=FULL_IMAGE){
    const width=Math.max(1,Number(pixels.width)||512);
    const height=Math.max(1,Number(pixels.height)||960);
    const top=clamp(ink.top,0,.98),bottom=clamp(ink.bottom,top+.02,1);
    const left=clamp(ink.left,0,.98),right=clamp(ink.right,left+.02,1);
    const inkFraction=bottom-top;
    const planeHeight=actor.h/inkFraction;
    const planeWidth=planeHeight*(width/height);
    const x0=actor.x-(left+right)*.5*planeWidth;
    const y0=-(1-bottom)*planeHeight;
    return Object.freeze({
      sourceAspect:width/height,planeAspect:planeWidth/planeHeight,
      planeHeight,planeWidth,visibleHeight:inkFraction*planeHeight,
      x0,y0,x1:x0+planeWidth,y1:y0+planeHeight,
      ink:{left,top,right,bottom}
    });
  }
  function spriteGeometry(actor,pixels,ink){
    const fit=portraitPlacement(actor,pixels,ink),z=actor.z;
    return new Float32Array([
      fit.x0,fit.y0,z,0,0,fit.x1,fit.y0,z,1,0,fit.x1,fit.y1,z,1,1,
      fit.x0,fit.y0,z,0,0,fit.x1,fit.y1,z,1,1,fit.x0,fit.y1,z,0,1
    ]);
  }
  function measurePortraitInk(image){
    // The original source pixels stay intact. Read a small temporary
    // downsample for alpha bounds only; its size never affects drawing.
    const width=image.naturalWidth||1,height=image.naturalHeight||1;
    const scale=Math.min(1,384/Math.max(width,height));
    const sample=document.createElement('canvas');
    sample.width=Math.max(1,Math.round(width*scale));
    sample.height=Math.max(1,Math.round(height*scale));
    try{
      const ctx=sample.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(image,0,0,sample.width,sample.height);
      const rgba=ctx.getImageData(0,0,sample.width,sample.height).data;
      let left=sample.width,top=sample.height,right=-1,bottom=-1,count=0;
      for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++){
        const p=(y*sample.width+x)*4;
        // White matte is discarded by the existing sprite shader too.
        const white=rgba[p]>247&&rgba[p+1]>247&&rgba[p+2]>247;
        if(rgba[p+3]<42||white)continue;
        left=Math.min(left,x);right=Math.max(right,x);
        top=Math.min(top,y);bottom=Math.max(bottom,y);count++;
      }
      if(count<12)return FULL_IMAGE;
      const pad=2;
      return {
        left:Math.max(0,(left-pad)/sample.width),
        top:Math.max(0,(top-pad)/sample.height),
        right:Math.min(1,(right+pad+1)/sample.width),
        bottom:Math.min(1,(bottom+pad+1)/sample.height)
      };
    }catch(_){return FULL_IMAGE;}
  }
  const FALL_DURATION=4.30;
  const FALL_WINDOW=Object.freeze({
    wallX:-5,figureX:-5.57,z:6.10,width:.88,height:1.68,
    start:0.44,dropEnd:1.63,viewAngle:-.670
  });
  function fallPhaseAt(seconds){
    const t=Math.max(0,Number(seconds)||0);
    // The witness notices movement at the left of their vision, turns to
    // the window before the figure crosses it, then stares at the empty pane.
    const gaze=smooth((t-.10)/.54)*(1-smooth((t-3.19)/.91));
    const travel=clamp((t-FALL_WINDOW.start)/
      (FALL_WINDOW.dropEnd-FALL_WINDOW.start),0,1);
    // Accelerating downward without showing the offscreen impact.
    const yBottom=3.65-5.35*Math.pow(travel,1.76);
    const tilt=travel*.27+Math.sin(travel*Math.PI*1.35)*.06;
    const centerZ=FALL_WINDOW.z+.23*travel+
      .035*Math.sin(travel*11)*Math.sin(travel*Math.PI);
    const visible=t>=.68&&t<1.65;
    const phantom=t>=.87&&t<=1.57;
    const shock=smooth((t-1.47)/.10)*(1-smooth((t-1.84)/.31));
    return Object.freeze({
      elapsed:t,stage:t<.40?'peripheral-motion':t<.78?'turn':
        t<1.65?'fall':t<3.16?'empty-window':'aftermath',
      gaze,travel,centerZ,yBottom,tilt,
      fallingVisible:visible,afterimage:phantom,
      afterimageOpacity:phantom?.12*Math.sin(Math.PI*travel):0,
      shock,finished:t>=FALL_DURATION
    });
  }
  function fallingSprite(phase,trailSeconds=0){
    // A real 2D alpha cutout parallel to the LEFT window wall:
    // its width is in z, height in y, x is constant (outside x<-5).
    // Old code incorrectly varied x, making the figure edge-on.
    const p=trailSeconds?fallPhaseAt(Math.max(0,phase.elapsed-trailSeconds)):phase;
    const x=FALL_WINDOW.figureX,z=p.centerZ,h=FALL_WINDOW.height,
      w=FALL_WINDOW.width,bottom=p.yBottom,ang=p.tilt;
    const co=Math.cos(ang),si=Math.sin(ang);
    const corners=[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]];
    const uv=[[0,0],[1,0],[1,1],[0,1]],out=[];
    for(const k of [0,1,2,0,2,3]){
      const [horizontal,vertical]=corners[k];
      const verticalCenter=vertical-h*.50;
      const zRot=z+horizontal*co+verticalCenter*si;
      const yRot=bottom+verticalCenter*co-horizontal*si+h*.50;
      out.push(x,yRot,zRot,...uv[k]);
    }
    return new Float32Array(out);
  }
  function create({stage,view}={}){
    if(!stage||!view)throw Error('School must mount inside the actual game');
    const original=stage.querySelector('#source');
    const canvas=document.createElement('canvas');
    canvas.id='school-room-surface';
    canvas.hidden=true;
    canvas.setAttribute('aria-label','方正五面三维教室，真实空间透视的课桌椅和窗户');
    original.insertAdjacentElement('afterend',canvas);
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,
      powerPreference:'low-power',preserveDrawingBuffer:true});
    let renderer='not-initialized',error=null,active=false,frame=0,fallStart=0,fallTriggerCount=0,heldFallFrame=null,lastFrameKey='';
    let bossBornAt=0,heldBossTime=null,bossTriggerCount=0;
    const worldFaceData=textureFaces();
    const pt={},textures={},sprites={},faceGPU={},furnitureTextures={},furnitureGPU={};
    const exteriorTextures={},exteriorGPU={};
    const flyingFurniture=[],bossTextures={},bossGPU={};
    let tprogram=null,fallGPU=null,fallTexture=null,ready=0;
    // One light field for every 2D wall, prop and actor. Time-jump fades are
    // smoothed; unchanged minutes do not redraw the GPU each frame.
    let previewMinute=null,lightingMinute=null,lightingSince=0,lightingFrom=null,
      lightingState=lightingAt(420);
    function updateLighting(life){
      const minute=previewMinute!==null?previewMinute:
        (Number.isFinite(life?.minute)?life.minute:420);
      const target=lightingAt(minute);
      if(minute!==lightingMinute){
        lightingFrom=lightingState;lightingMinute=minute;
        lightingSince=performance.now();
      }
      if(previewMinute!==null)lightingState=target;
      else if(lightingFrom){
        let blend=clamp((performance.now()-lightingSince)/2200,0,1);
        blend=blend*blend*(3-2*blend);
        lightingState=blendLight(lightingFrom,target,blend);
        if(blend>=1)lightingFrom=null;
      }else lightingState=target;
      return lightingState;
    }
    function compile(type,code){
      const obj=gl.createShader(type);gl.shaderSource(obj,code);gl.compileShader(obj);
      if(!gl.getShaderParameter(obj,gl.COMPILE_STATUS))
        throw Error('School shader compile: '+gl.getShaderInfoLog(obj));
      return obj;
    }
    function link(vsrc,fsrc){
      const v=compile(gl.VERTEX_SHADER,vsrc),f=compile(gl.FRAGMENT_SHADER,fsrc);
      const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);
      gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))
        throw Error('School shader link: '+gl.getProgramInfoLog(p));
      return p;
    }
    function mesh(data){
      const gpu=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gpu);
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      return {gpu,count:data.length/5};
    }
    function loadTexture(src,onLoaded=null){
      const item={src,ready:false,texture:gl.createTexture(),sourcePixels:null};
      gl.bindTexture(gl.TEXTURE_2D,item.texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const image=new Image();
      image.onload=()=>{
        try{
          gl.bindTexture(gl.TEXTURE_2D,item.texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
          if(gl.getError()!==gl.NO_ERROR)throw Error('GPU texture upload');
          item.sourcePixels={width:image.naturalWidth,height:image.naturalHeight};
          if(onLoaded)onLoaded(image,item);
          item.ready=true;ready++;lastFrameKey='';
        }catch(e){item.error=String(e);}
      };
      image.onerror=()=>item.error='Failed to load '+src;
      image.src=src;return item;
    }
    function setup(){
      if(!gl){renderer='missing-webgl';return;}
      tprogram=link(TVS,TFS);
      pt.pos=gl.getAttribLocation(tprogram,'a_position');
      pt.uv=gl.getAttribLocation(tprogram,'a_uv');
      pt.camera=gl.getUniformLocation(tprogram,'u_camera');
      pt.angles=gl.getUniformLocation(tprogram,'u_angles');
      pt.tan=gl.getUniformLocation(tprogram,'u_tan');
      pt.light=gl.getUniformLocation(tprogram,'u_light');
      pt.tex=gl.getUniformLocation(tprogram,'u_tex');
      pt.sprite=gl.getUniformLocation(tprogram,'u_sprite');
      pt.ambient=gl.getUniformLocation(tprogram,'u_ambient');
      pt.sunColor=gl.getUniformLocation(tprogram,'u_sunColor');
      pt.sunDirection=gl.getUniformLocation(tprogram,'u_sunDirection');
      pt.skyColor=gl.getUniformLocation(tprogram,'u_skyColor');
      pt.sunPower=gl.getUniformLocation(tprogram,'u_sunPower');
      pt.lampPower=gl.getUniformLocation(tprogram,'u_lampPower');
      pt.surface=gl.getUniformLocation(tprogram,'u_surface');
      pt.shadowProjection=gl.getUniformLocation(tprogram,'u_shadowProjection');
      pt.shadowOpacity=gl.getUniformLocation(tprogram,'u_shadowOpacity');
      pt.objectOpacity=gl.getUniformLocation(tprogram,'u_objectOpacity');
      fallGPU=mesh(fallingSprite(fallPhaseAt(0)));
      fallTexture=loadTexture(FALL_MATERIAL);
      for(const [id,src] of Object.entries(EXTERIOR_MATERIALS)){
        exteriorTextures[id]=loadTexture(src);
        exteriorGPU[id]=mesh(EXTERIOR_QUADS[id]);
      }
      for(const [id,data] of Object.entries(worldFaceData))faceGPU[id]=mesh(data);
      for(const [id,src] of Object.entries(MATERIALS))textures[id]=loadTexture(src);
      for(const [id,src] of Object.entries(FURNITURE_MATERIALS)){
        furnitureTextures[id]=loadTexture(src);
        furnitureGPU[id]=mesh(new Float32Array(furnitureSurfaces[id]));
      }
      for(const prop of furnitureInstances)
        flyingFurniture.push({...prop,quad:mesh(flightQuad(prop,bossPhaseAt(0)))});
      for(const [id,src] of Object.entries(BOSS_MATERIALS))
        bossTextures[id]=loadTexture(src);
      bossGPU.creature=mesh(bossQuad(0));
      bossGPU.rupture=mesh(ruptureQuad(0));
      for(const actor of ACTORS){
        const slot={...mesh(spriteGeometry(actor)),fit:null};
        slot.texture=loadTexture(actor.src,(image,item)=>{
          const ink=measurePortraitInk(image);
          const fit=portraitPlacement(actor,item.sourcePixels,ink);
          gl.bindBuffer(gl.ARRAY_BUFFER,slot.gpu);
          gl.bufferData(gl.ARRAY_BUFFER,
            spriteGeometry(actor,item.sourcePixels,ink),gl.STATIC_DRAW);
          slot.fit=fit;
        });
        sprites[actor.id]=slot;
      }
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      renderer='webgl-five-face-room';
      canvas.addEventListener('webglcontextlost',evt=>{
        evt.preventDefault();error='WebGL context lost';renderer='context-lost';
      });
    }
    try{setup()}catch(e){renderer='error';error=String(e);console.warn('School 2.5D:',e);}
    function uniforms(cam,w,h,prog,loc){
      gl.useProgram(prog);
      const focal=Math.min(w,h*16/9)/(2*Math.tan(cam.hFov*Math.PI/360));
      gl.uniform3f(loc.camera,cam.x,cam.y,cam.z);
      gl.uniform2f(loc.angles,cam.yaw,cam.pitch);
      gl.uniform2f(loc.tan,w/(2*focal),h/(2*focal));
    }
    function textureDraw(tex,mesh,cam,w,h,light,isSprite=false,surface=0,shadow=false,opacity=1){
      if(!tex?.ready||opacity<=.001)return;
      uniforms(cam,w,h,tprogram,pt);gl.uniform3f(pt.light,...light);
      gl.uniform1f(pt.sprite,isSprite?1:0);
      gl.uniform1f(pt.objectOpacity,clamp(opacity,0,1));
      gl.uniform3fv(pt.ambient,lightingState.ambient);
      gl.uniform3fv(pt.sunColor,lightingState.sunColor);
      gl.uniform3fv(pt.sunDirection,lightingState.sunDirection);
      gl.uniform3fv(pt.skyColor,lightingState.skyColor);
      gl.uniform1f(pt.sunPower,lightingState.sunPower);
      gl.uniform1f(pt.lampPower,lightingState.lampPower);
      gl.uniform1f(pt.surface,surface);
      gl.uniform1f(pt.shadowProjection,shadow?1:0);
      gl.uniform1f(pt.shadowOpacity,shadow?.28*lightingState.sunPower:0);
      gl.activeTexture(gl.TEXTURE0);gl.uniform1i(pt.tex,0);
      gl.bindTexture(gl.TEXTURE_2D,tex.texture);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.gpu);
      gl.enableVertexAttribArray(pt.pos);gl.enableVertexAttribArray(pt.uv);
      gl.vertexAttribPointer(pt.pos,3,gl.FLOAT,false,20,0);
      gl.vertexAttribPointer(pt.uv,2,gl.FLOAT,false,20,12);
      gl.drawArrays(gl.TRIANGLES,0,mesh.count);
      gl.disableVertexAttribArray(pt.pos);gl.disableVertexAttribArray(pt.uv);
    }
    function bossElapsed(){
      if(heldBossTime!==null)return heldBossTime;
      return bossBornAt?Math.min(BOSS_DURATION,(performance.now()-bossBornAt)/1000):null;
    }
    function updateQuad(slot,vertices){
      gl.bindBuffer(gl.ARRAY_BUFFER,slot.gpu);
      gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    }
    function renderBossRupture(t,cam,w,h){
      const phase=bossPhaseAt(t);
      if(phase.ruptureStrength<=.001)return;
      updateQuad(bossGPU.rupture,ruptureQuad(t));
      gl.depthMask(false);
      textureDraw(bossTextures.rupture,bossGPU.rupture,cam,w,h,[1,1,1],
        false,7,false,Math.min(1,phase.ruptureStrength*.96+phase.flash*.32));
      gl.depthMask(true);
    }
    function renderBossBody(t,cam,w,h){
      const phase=bossPhaseAt(t);
      if(phase.bossOpacity<=.001)return;
      updateQuad(bossGPU.creature,bossQuad(t));
      textureDraw(bossTextures.creature,bossGPU.creature,cam,w,h,[1.1,.95,1.08],
        false,4,false,phase.bossOpacity);
    }
    function visibleActors(life){
      const day=life?.day||1;
      return ACTORS.filter(a=>!a.ends||day<=a.ends);
    }
    function render(px=0,py=0,life=null){
      if(!active||!gl||!tprogram||error)return false;
      const w=stage.clientWidth,h=stage.clientHeight;
      if(w<1||h<1)return false;
      const ratio=Math.min(1.5,window.devicePixelRatio||1,Math.sqrt(2200000/w/h));
      const bw=Math.max(1,Math.round(w*ratio)),bh=Math.max(1,Math.round(h*ratio));
      if(canvas.width!==bw)canvas.width=bw;
      if(canvas.height!==bh)canvas.height=bh;
      const cam=camera(px,py),s=life||window.PaperWorldDailyLifeUI?.snapshot?.();
      let daylight=updateLighting(s);
      const bossT=bossElapsed(),bossPhase=bossT===null?null:bossPhaseAt(bossT);
      if(bossPhase){
        // Three modest, quickly decaying impulses. All props and walls see
        // the same actual camera, with no CSS transform or head-bob drift.
        const shake=clamp((bossT-.30)/.35,0,1)*Math.exp(-Math.max(0,bossT-.8)*1.5);
        cam.yaw+=Math.sin(bossT*34)*.019*shake;
        cam.pitch+=Math.cos(bossT*28)*.013*shake;
        const darkness=smooth(bossT/1.25);
        const warmth=bossPhase.flash;
        lightingState={...daylight,
          ambient:daylight.ambient.map((v,i)=>Math.min(1.16,
            v*(1-darkness*.57)+warmth*[.43,.13,.20][i])),
          sunPower:daylight.sunPower*(1-darkness*.84),
          lampPower:daylight.lampPower*(1-darkness*.58)};
        daylight=lightingState;
      }
      // The same camera sees the actual 3D window and falling sprite.
      // No screen-space CSS fall figure or moving world background.
      const fallTime=heldFallFrame!==null?heldFallFrame:
        (fallStart?(performance.now()-fallStart)/1000:null);
      const fallState=fallTime!==null?fallPhaseAt(fallTime):null;
      if(fallState){
        cam.yaw+=FALL_WINDOW.viewAngle*fallState.gaze;
        cam.pitch+=.014*fallState.gaze;
        cam.hFov-=4.6*fallState.gaze;
        const jolt=fallState.shock;
        cam.yaw+=Math.sin(fallTime*39)*.009*jolt;
        cam.pitch+=Math.cos(fallTime*45)*.012*jolt;
        if(fallState.finished&&heldFallFrame===null)fallStart=0;
      }
      const fallFrame=fallState?(heldFallFrame!==null?'frozen-'+
        fallTime.toFixed(3):Math.min(999,Math.floor(fallTime*48))):'none';
      const fingerprint=[bw,bh,ready,s?.day||1,cam.yaw.toFixed(3),
        cam.pitch.toFixed(3),fallFrame,
        bossPhase?(bossT>=BOSS_DURATION?'boss-ready':Math.floor(bossT*42)):'boss-idle',
        lightingMinute,
        daylight.ambient[0].toFixed(3),daylight.sunPower.toFixed(3),
        daylight.sunDirection[2].toFixed(3)].join('|');
      // No WebGL redraws while the head is stationary, no assets changed
      // and no event is running. Existing fluid fog animates independently.
      if(fingerprint===lastFrameKey)return true;
      lastFrameKey=fingerprint;
      gl.viewport(0,0,bw,bh);
      gl.clearColor(.44,.47,.47,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      try{
        // Independent hand-painted sky & distant building. Both are transparent
        // or opaque 2D materials on planes BEHIND the cut-out window wall.
        textureDraw(exteriorTextures.sky,exteriorGPU.sky,cam,w,h,[1,1,1],false,5);
        textureDraw(exteriorTextures.facade,exteriorGPU.facade,cam,w,h,[1,1,1],false,6);
        const shades={back:[.94,.96,.98],floor:[.98,.99,1],
          ceiling:[.89,.91,.94],left:[.96,.98,1],right:[.94,.96,.98]};
        const surfaceTypes={back:2,floor:1,ceiling:2,left:2,right:2};
        for(const id of Object.keys(MATERIALS))
          textureDraw(textures[id],faceGPU[id],cam,w,h,shades[id],false,surfaceTypes[id]);
        // The first abnormal impact begins at the center of the floor.
        // All of its art is still 2D, drawn into this SAME depth buffer.
        if(bossPhase)renderBossRupture(bossT,cam,w,h);
        // Shadows are projected from the exact character/desk silhouettes.
        if(daylight.sunPower>.01){
          gl.depthMask(false);
          if(!bossPhase||bossT<.78){
            for(const [id,geo] of Object.entries(furnitureGPU))
              textureDraw(furnitureTextures[id],geo,cam,w,h,[1,1,1],false,3,true);
          }
          for(const actor of visibleActors(s)){
            const sprite=sprites[actor.id];
            textureDraw(sprite.texture,sprite,cam,w,h,[1,1,1],true,4,true);
          }
          gl.depthMask(true);
        }
        if(!bossPhase||bossT<.78){
          for(const [id,geo] of Object.entries(furnitureGPU))
            textureDraw(furnitureTextures[id],geo,cam,w,h,[.97,.98,.99],false,3);
        }else if(bossPhase.furnitureVisible){
          // No large batch translation: 41 individually animated cutouts.
          for(const prop of flyingFurniture){
            updateQuad(prop.quad,flightQuad(prop,bossPhase));
            textureDraw(furnitureTextures[prop.id],prop.quad,cam,w,h,
              [.97,.98,.99],false,3,false,bossPhase.furnitureOpacity);
          }
        }
        for(const actor of visibleActors(s)){
          const sprite=sprites[actor.id];
          textureDraw(sprite.texture,sprite,cam,w,h,[.97,.99,1],true,4);
        }
        if(bossPhase)renderBossBody(bossT,cam,w,h);
        if(fallState?.fallingVisible){
          // Motion echo is drawn behind the principal cutout in the same
          // world-space window opening; no duplicate overlay on top of the UI.
          if(fallState.afterimage){
            updateQuad(fallGPU,fallingSprite(fallState,.085));
            gl.depthMask(false);
            textureDraw(fallTexture,fallGPU,cam,w,h,[.68,.75,.86],false,4,
              false,fallState.afterimageOpacity);
            gl.depthMask(true);
          }
          updateQuad(fallGPU,fallingSprite(fallState));
          textureDraw(fallTexture,fallGPU,cam,w,h,[.91,.94,1],false,4);
        }
        if(gl.getError()!==gl.NO_ERROR)throw Error('School GL draw');
        frame++;
      }catch(e){error=String(e);console.warn('School 2.5D render:',e);return false;}
      return true;
    }
    function setActive(value){
      active=!!value;canvas.hidden=!active;
      view.classList.toggle('school-room-active',active);
      lastFrameKey='';
      if(active){
        const flags=new URLSearchParams(window.location.search);
        if(flags.get('fallPreview')==='1'&&fallTriggerCount===0)
          triggerFall();
        else if(flags.get('bossPreview')==='1' &&
          !bossBornAt&&heldBossTime===null)triggerBossBirth();
        else render(0,0);
      }else{
        fallStart=0;heldFallFrame=null;bossBornAt=0;heldBossTime=null;
      }
    }
    function triggerFall(){
      if(!active)return false;
      heldFallFrame=null;fallStart=performance.now();fallTriggerCount++;lastFrameKey='';render();return true;
    }
    function triggerBossBirth(){
      if(!active||error||bossBornAt||heldBossTime!==null)return false;
      bossBornAt=performance.now();
      bossTriggerCount++;lastFrameKey='';
      render(0,0);
      return true;
    }
    function setBossBirthPreview(t){
      if(new URLSearchParams(window.location.search).get('storyCapture')!=='1')
        return false;
      heldBossTime=t===null?null:clamp(Number(t)||0,0,BOSS_DURATION);
      if(t===null)bossBornAt=0;
      lastFrameKey='';render(0,0);return true;
    }
    function fallTimeSnapshot(){
      const t=heldFallFrame!==null?heldFallFrame:
        (fallStart?(performance.now()-fallStart)/1000:null);
      return t===null?{stage:'idle',elapsed:0,fallingVisible:false,
        gaze:0,finished:false}:fallPhaseAt(t);
    }
    function inspect(){return {
      active,renderer,error,frame,room:ROOM,
      lighting:{...lightingState,source:previewMinute!==null?'qa-preview':'game-time'},
      lightingTimeMinute:lightingMinute,
      faces:Object.keys(faces),deskCount:CLASSROOM_LAYOUT.desks,
      chairCount:CLASSROOM_LAYOUT.chairs,
      classroomLayout:CLASSROOM_LAYOUT,
      propRendering:'painted-2d-standees',
      propCount:CLASSROOM_LAYOUT.desks+CLASSROOM_LAYOUT.chairs+1,
      bossEncounter:{
        ...((bossElapsed()===null)?{
          phase:'idle',elapsed:0,furnitureVisible:true,
          furnitureOpacity:1,bossGrowth:0,bossOpacity:0,displacement:0,
          ruptureStrength:0
        }:bossPhaseAt(bossElapsed())),
        triggerCount:bossTriggerCount,
        animatedFurnitureCount:furnitureInstances.length,
        visibleFurnitureCount:bossElapsed()===null||bossElapsed()<2.68?
          furnitureInstances.length:0,
        cinematicDuration:BOSS_DURATION,
        modelCount:0,
        readyAssets:Object.fromEntries(Object.entries(bossTextures).map(
          ([id,t])=>[id,{src:t.src,ready:t.ready,error:t.error||null}]))
      },
      propTriangles:Object.fromEntries(Object.entries(furnitureSurfaces).map(
        ([id,verts])=>[id,verts.length/15])),
      furnitureTextures:Object.fromEntries(
        Object.entries(furnitureTextures).map(([id,entry])=>
          [id,{src:entry.src,ready:entry.ready,error:entry.error||null}])),
      exterior:{...EXTERIOR,geometryTriangles:4,mode:'textured-2d-planes',
        materials:Object.fromEntries(Object.entries(exteriorTextures).map(
          ([id,entry])=>[id,{src:entry.src,ready:entry.ready,error:entry.error||null}]))},
      fallingTexture:fallTexture?{src:fallTexture.src,ready:fallTexture.ready,error:fallTexture.error||null}:null,
      geometryPolicy:'textured-2d-planes-only',
      solidMeshes:0,
      textureCount:ready,expectedTextures:5+ACTORS.length+
        Object.keys(FURNITURE_MATERIALS).length+
        Object.keys(EXTERIOR_MATERIALS).length+
        Object.keys(BOSS_MATERIALS).length+1,
      faceTextures:Object.fromEntries(Object.entries(textures).map(([id,entry])=>
        [id,{src:entry.src,ready:entry.ready,error:entry.error||null}])),
      visibleActors:active?visibleActors(window.PaperWorldDailyLifeUI?.snapshot?.()).map(a=>a.id):[],
      actorArtwork:Object.fromEntries(ACTORS.map(a=>{
        const slot=sprites[a.id];
        return [a.id,{source:a.src,physicalHeight:a.h,
          sourcePixels:slot?.texture?.sourcePixels||null,
          fit:slot?.fit||null,ready:!!slot?.texture?.ready}];
      })),
      fallActive:fallStart>0,fallTriggerCount,heldFallFrame,
      fallSequence:fallTimeSnapshot(),
      fallMaterialGeometry:{parallelTo:'left-window-wall',worldX:FALL_WINDOW.figureX,
        windowWallX:FALL_WINDOW.wallX,worldZ:FALL_WINDOW.z,
        figureHeight:FALL_WINDOW.height,figureWidth:FALL_WINDOW.width,
        portraitAspect:FALL_WINDOW.width/FALL_WINDOW.height}
    };}
    function holdFallFrame(t){
      // QA captures a paused actual rendered animation frame, not a mockup.
      if(new URLSearchParams(window.location.search).get('storyCapture')!=='1')
        return false;
      // Keep compatibility with the older normalized .57 fall-frame test:
      // it now lands during the actual transparent window crossing.
      heldFallFrame=clamp(Number(t)||.55,.05,1.15)*2.08;
      lastFrameKey='';render(0,0);return true;
    }
    function releaseFallFrame(){heldFallFrame=null;lastFrameKey='';return true;}
    function setFallPreview(seconds){
      if(new URLSearchParams(window.location.search).get('storyCapture')!=='1')
        return false;
      heldFallFrame=seconds===null?null:clamp(Number(seconds)||0,0,FALL_DURATION);
      if(seconds===null)fallStart=0;
      lastFrameKey='';render(0,0);return true;
    }
    function setLightingPreview(minute){
      // QA only; no player-visible daylight slider or production time cheat.
      if(new URLSearchParams(window.location.search).get('storyCapture')!=='1')
        return false;
      previewMinute=minute===null?null:clamp(Number(minute)||0,0,1440);
      lightingFrom=null;lightingMinute=null;lastFrameKey='';
      render(0,0);return true;
    }
    return Object.freeze({setActive,triggerFall,holdFallFrame,releaseFallFrame,
      setFallPreview,
      triggerBossBirth,setBossBirthPreview,
      setLightingPreview,render,inspect,get canvas(){return canvas}});
  }
  return Object.freeze({ROOM,MATERIALS,FURNITURE_MATERIALS,EXTERIOR_MATERIALS,
    FALL_MATERIAL,FALL_WINDOW,FALL_DURATION,fallPhaseAt,fallingSprite,
    BOSS_MATERIALS,BOSS_DURATION,bossPhaseAt,
    CLASSROOM_LAYOUT,ACTORS,EXTERIOR,
    portraitPlacement,lightingAt,camera,project,create});
});