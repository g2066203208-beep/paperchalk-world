/* -------------------- WORLD -------------------- */
const WORLD_ZONE_WIDTH=6000;
const WORLD_ZONE_COUNT=20;
const MAP_WIDTH=WORLD_ZONE_WIDTH*WORLD_ZONE_COUNT; // 120000px continuous world, no region loading screens
const MAP_SPAWN_X=460;
const MAP_EXIT_X=MAP_WIDTH-520; // compatibility/debug far-edge marker; no transition gate
let MAP_GROUND_SCREEN_Y=112;
let VIEW_W=1280,VIEW_H=720;
const PLAYER_BODY=Object.freeze({halfW:27,standH:108,crouchH:78});
const VIEWPORT_REFERENCE=Object.freeze({w:1280,h:720});
const PLAYER_VISUAL_BASE=Object.freeze({w:104,h:156});
const PLAYER_VISUAL={w:104,h:156,scale:1};
const PLAYER_ACTION_ASSETS=Object.freeze({
  idle:'./assets/player/runtime/idle.webp?v=responsive-actions-r2',
  crouch:'./assets/player/runtime/crouch.webp?v=responsive-actions-r2',
  'jump-up':'./assets/player/runtime/jump-up.webp?v=responsive-actions-r2',
  'jump-down':'./assets/player/runtime/jump-down.webp?v=responsive-actions-r2',
  walk:'./assets/player/runtime/walk.webp?v=responsive-actions-r2'
});
const PLAYER_ACTION_META=Object.freeze({
  idle:Object.freeze({scale:1,sourceFacing:1}),
  walk:Object.freeze({scale:.92,sourceFacing:-1}),
  crouch:Object.freeze({scale:.76,sourceFacing:1}),
  'jump-up':Object.freeze({scale:.88,sourceFacing:1}),
  'jump-down':Object.freeze({scale:.86,sourceFacing:1})
});
const WORLD_NODES=[
  {id:'village',name:'A村',x:170,y:650,kind:'village'},
  {id:'meadowFork',name:'风草岔口',x:450,y:640,kind:'junction'},
  {id:'forestGate',name:'旧林入口',x:720,y:350,kind:'forest'},
  {id:'riverbank',name:'枯溪岸',x:740,y:900,kind:'river'},
  {id:'stonePass',name:'浅石谷',x:1010,y:620,kind:'mountain'},
  {id:'oldRuins',name:'古纸遗迹',x:1240,y:170,kind:'ruins'},
  {id:'windmill',name:'风车丘',x:1320,y:430,kind:'windmill'},
  {id:'caveMouth',name:'回声洞口',x:1070,y:1020,kind:'cave'},
  {id:'marsh',name:'雾泽',x:1450,y:960,kind:'marsh'},
  {id:'highland',name:'长草台地',x:1650,y:620,kind:'highland'},
  {id:'brokenBridge',name:'断桥',x:1840,y:900,kind:'bridge'},
  {id:'pineRidge',name:'雾松岭',x:1890,y:330,kind:'forest'},
  {id:'northCamp',name:'北野营地',x:2220,y:160,kind:'camp'},
  {id:'tower',name:'旧塔原',x:2230,y:590,kind:'tower'},
  {id:'sunkenCity',name:'沉纸城',x:2230,y:1020,kind:'ruins'},
  {id:'farShrine',name:'远岬祭坛',x:2540,y:560,kind:'shrine'}
];
const WORLD_ROUTES=[
  {id:'village-road',name:'A村外道路',from:'village',to:'meadowFork',biome:'meadow',bend:0},
  {id:'wind-grass-slope',name:'风草坡',from:'meadowFork',to:'forestGate',biome:'meadow',bend:-38},
  {id:'shallow-creek-road',name:'浅溪旧道',from:'meadowFork',to:'riverbank',biome:'river',bend:42},
  {id:'old-forest-edge',name:'旧林边',from:'forestGate',to:'stonePass',biome:'forest',bend:36},
  {id:'dry-creek-bank',name:'枯溪岸',from:'riverbank',to:'stonePass',biome:'river',bend:-28},
  {id:'canopy-road',name:'林冠古道',from:'forestGate',to:'oldRuins',biome:'forest',bend:-46},
  {id:'ruin-high-slope',name:'遗迹高坡',from:'oldRuins',to:'windmill',biome:'ruins',bend:24},
  {id:'shallow-stone-valley',name:'浅石谷',from:'stonePass',to:'windmill',biome:'mountain',bend:-18},
  {id:'lower-rock-fork',name:'下岩岔路',from:'stonePass',to:'caveMouth',biome:'cave',bend:52},
  {id:'echo-cave-way',name:'回声洞道',from:'caveMouth',to:'marsh',biome:'cave',bend:-24},
  {id:'reed-lowland',name:'芦苇低地',from:'riverbank',to:'marsh',biome:'marsh',bend:38},
  {id:'windmill-waste-road',name:'风车荒径',from:'windmill',to:'highland',biome:'meadow',bend:18},
  {id:'mist-marsh-boardwalk',name:'雾泽栈道',from:'marsh',to:'highland',biome:'marsh',bend:-30},
  {id:'north-wind-slope',name:'北风坡',from:'windmill',to:'pineRidge',biome:'highland',bend:-52},
  {id:'long-grass-tableland',name:'长草台地',from:'highland',to:'pineRidge',biome:'highland',bend:-18},
  {id:'broken-bridge-road',name:'断桥旧道',from:'highland',to:'brokenBridge',biome:'river',bend:34},
  {id:'mist-pine-ridge',name:'雾松岭',from:'pineRidge',to:'northCamp',biome:'forest',bend:-24},
  {id:'old-post-road',name:'旧驿道',from:'pineRidge',to:'tower',biome:'ruins',bend:32},
  {id:'sunken-city-waterway',name:'沉城水路',from:'brokenBridge',to:'sunkenCity',biome:'marsh',bend:26},
  {id:'far-cape-old-road',name:'远岬古道',from:'tower',to:'farShrine',biome:'shrine',bend:-14}
];
const WORLD_NODE_BY_ID=new Map(WORLD_NODES.map(n=>[n.id,n]));
WORLD_ROUTES.forEach((r,i)=>r.index=i);
function worldZoneIndexAt(x){return Math.max(0,Math.min(WORLD_ROUTES.length-1,Math.floor(Math.max(0,x)/WORLD_ZONE_WIDTH)))}
function routeForWorldX(x){return WORLD_ROUTES[worldZoneIndexAt(x)]}
function regionNameAt(x){return routeForWorldX(x)?.name||'未知道路'}
function routeBaseX(routeIndex){return routeIndex*WORLD_ZONE_WIDTH}
function routeLocalX(x){const i=worldZoneIndexAt(x);return x-routeBaseX(i)}
function routesAtNode(nodeId){return WORLD_ROUTES.filter(r=>r.from===nodeId||r.to===nodeId)}
function otherNodeOfRoute(route,nodeId){return WORLD_NODE_BY_ID.get(route.from===nodeId?route.to:route.from)}
function nodeDegree(nodeId){return routesAtNode(nodeId).length}
const ROUTE_ENDPOINT_PAD=150;
const FORK_LANE_LEVELS=[142,72,0];
function forkAssignments(routeIndex,nodeId){
  const options=routesAtNode(nodeId)
    .filter(r=>r.index!==routeIndex)
    .sort((a,b)=>{
      const ay=otherNodeOfRoute(a,nodeId)?.y??0;
      const by=otherNodeOfRoute(b,nodeId)?.y??0;
      return ay-by;
    });
  let levels=[0];
  if(options.length===2)levels=[72,0];
  else if(options.length>=3)levels=[142,72,0];
  return options.slice(0,3).map((route,i)=>({route,laneY:levels[i]??0,target:otherNodeOfRoute(route,nodeId)}));
}
const MAP_TERRAIN=[
  {id:'rock-1',kind:'rock',x:1120,y:0,w:104,h:70},
  {id:'platform-1',kind:'platform',x:1540,y:0,w:360,h:72},
  {id:'platform-2',kind:'platform',x:2920,y:0,w:330,h:104},
  {id:'rock-2',kind:'rock',x:3720,y:0,w:138,h:80},
  {id:'platform-3',kind:'platform',x:4280,y:0,w:380,h:126},
  {id:'rock-3',kind:'rock',x:5140,y:0,w:126,h:62}
];
const MAP_OBJECTS=[
  {id:'crate-1',kind:'crate',x:2390,y:0,w:88,h:88,solid:true,breakable:true},
  /* Trees remain visible world props, but never form an unavoidable 190px movement wall. */
  {id:'tree-1',kind:'tree',x:4980,y:0,w:156,h:208,solid:false}
];
const MAP_LANDMARKS=[
  {id:'sign-start',kind:'sign',x:250,text:'A村外道路'},
  {id:'sign-combat',kind:'sign',x:1440,text:'前方有游荡者'},
  {id:'sign-lookout',kind:'sign',x:4160,text:'旧土坡'}
];
const MAP_PICKUPS=[
  {id:'herb-1',x:3330,y:108,type:'herb'},
  {id:'herb-crate',x:2434,y:28,type:'herb',requiresBroken:'crate-1'}
];
const MAP_NPCS=[
  {
    id:'npc-phone-girl',x:760,name:'？？？',portrait:'phone-girl-offline',
    sprite:'./assets/npcs/phone-girl-offline-r1.webp?v=npc-left-r15',
    dialoguePortrait:'./assets/npcs/phone-girl-offline-r1.webp?v=npc-left-r15',
    text:'……你好。',
    dialogue:{
      opening:'……你好。',
      choices:[
        {text:'你是谁？',reply:'……暂时不重要。'},
        {text:'你在看手机？',reply:'嗯。只是随便看看。'},
        {text:'我先走了。',reply:'好。'}
      ]
    }
  }
];
const ENEMY_SPAWNS=[
  {id:'enemy-1',x:2140,patrolMin:2010,patrolMax:2290},
  {id:'enemy-2',x:4780,patrolMin:4680,patrolMax:4920}
];
for(let zone=1;zone<WORLD_ZONE_COUNT;zone++){
  const base=zone*WORLD_ZONE_WIDTH;
  const offset=1750+(zone%4)*720;
  const x=base+offset;
  ENEMY_SPAWNS.push({
    id:'enemy-zone-'+zone,
    x,
    patrolMin:x-170-(zone%3)*20,
    patrolMax:x+170+(zone%2)*30
  });
}

/* Deterministic continuation: every 6000px is authored into the same coordinate space.
   Nothing is fetched or swapped while crossing a zone boundary. */
for(let zone=1;zone<WORLD_ZONE_COUNT;zone++){
  const base=zone*WORLD_ZONE_WIDTH;
  const variant=zone%5;
  MAP_LANDMARKS.push({id:'zone-sign-'+zone,kind:'sign',x:base+390,text:regionNameAt(base+390)});
  MAP_TERRAIN.push(
    {id:'zone-rock-a-'+zone,kind:'rock',x:base+820+variant*35,y:0,w:96+variant*8,h:54+variant*6},
    {id:'zone-platform-a-'+zone,kind:'platform',x:base+1640-variant*30,y:0,w:300+variant*18,h:76+variant*8},
    {id:'zone-platform-b-'+zone,kind:'platform',x:base+3180+variant*22,y:0,w:340-variant*12,h:92+variant*7},
    {id:'zone-rock-b-'+zone,kind:'rock',x:base+4070-variant*26,y:0,w:118+variant*5,h:60+variant*5},
    {id:'zone-platform-c-'+zone,kind:'platform',x:base+4860+variant*18,y:0,w:315+variant*14,h:104+variant*6}
  );
  MAP_OBJECTS.push(
    {id:'zone-tree-'+zone,kind:'tree',x:base+1160+variant*24,y:0,w:156,h:208,solid:false},
    {id:'zone-crate-'+zone,kind:'crate',x:base+2700+variant*34,y:0,w:82,h:82,solid:true,breakable:true}
  );
  const route=WORLD_ROUTES[zone];
  if(route?.biome==='forest'){
    MAP_OBJECTS.push(
      {id:'forest-tree-a-'+zone,kind:'tree',x:base+2050,y:0,w:156,h:208,solid:false},
      {id:'forest-tree-b-'+zone,kind:'tree',x:base+4450,y:0,w:156,h:208,solid:false}
    );
  }else if(route?.biome==='river'||route?.biome==='marsh'){
    MAP_OBJECTS.push(
      {id:'reed-a-'+zone,kind:'reed',x:base+1760,y:0,w:120,h:66,solid:false},
      {id:'reed-b-'+zone,kind:'reed',x:base+4380,y:0,w:120,h:66,solid:false}
    );
    if(route.id==='broken-bridge-road')MAP_OBJECTS.push({id:'bridge-'+zone,kind:'bridge-post',x:base+3550,y:0,w:150,h:78,solid:false});
  }else if(route?.biome==='ruins'){
    MAP_OBJECTS.push(
      {id:'ruin-a-'+zone,kind:'ruin',x:base+1880,y:0,w:128,h:120,solid:false},
      {id:'ruin-b-'+zone,kind:'ruin',x:base+4300,y:0,w:128,h:120,solid:false}
    );
  }else if(route?.biome==='cave'){
    MAP_OBJECTS.push({id:'cave-mouth-'+zone,kind:'cave-mouth',x:base+3360,y:0,w:158,h:126,solid:false});
  }else if(route?.biome==='mountain'||route?.biome==='highland'){
    MAP_TERRAIN.push(
      {id:'ridge-rock-a-'+zone,kind:'rock',x:base+2200,y:0,w:116,h:76},
      {id:'ridge-rock-b-'+zone,kind:'rock',x:base+4580,y:0,w:126,h:82}
    );
  }
  if(route?.id==='windmill-waste-road')MAP_OBJECTS.push({id:'windmill-'+zone,kind:'windmill',x:base+3600,y:0,w:126,h:180,solid:false});
  if(route?.biome==='shrine')MAP_OBJECTS.push({id:'shrine-'+zone,kind:'shrine',x:base+4020,y:0,w:140,h:134,solid:false});
  MAP_PICKUPS.push(
    {id:'zone-herb-'+zone,x:base+3660+variant*17,y:104,type:'herb'},
    {id:'zone-crate-herb-'+zone,x:base+2741+variant*34,y:28,type:'herb',requiresBroken:'zone-crate-'+zone}
  );
}
const FORK_SOLIDS=[];
WORLD_ROUTES.forEach((route,i)=>{
  const base=routeBaseX(i);
  [
    {nodeId:route.from,side:'left',boundary:base+ROUTE_ENDPOINT_PAD},
    {nodeId:route.to,side:'right',boundary:base+WORLD_ZONE_WIDTH-ROUTE_ENDPOINT_PAD}
  ].forEach(endpoint=>{
    const assignments=forkAssignments(i,endpoint.nodeId);
    if(assignments.length<=1)return;
    assignments.filter(a=>a.laneY===72).forEach((a,laneIndex)=>{
      const w=540;
      const x=endpoint.side==='left'?endpoint.boundary-18:endpoint.boundary-w+18;
      FORK_SOLIDS.push({
        id:'fork-shelf-'+i+'-'+endpoint.side+'-'+laneIndex,
        kind:'platform',x,y:a.laneY-12,w,h:12,oneWay:true,fork:true
      });
    });
  });
});
MAP_TERRAIN.push(...FORK_SOLIDS);
/* clean-stage-r14: remove all assistant-authored terrain, props, signs and pickups. */
MAP_TERRAIN.length=0;
MAP_OBJECTS.length=0;
MAP_LANDMARKS.length=0;
MAP_PICKUPS.length=0;
const mapState={broken:new Set(),collected:new Set(),visitedRoutes:new Set([0]),visitedNodes:new Set(['village']),exitReached:false};
let mapNoticeTimer=null;
let mapDebugBuilt=false;
const VISUAL_WINDOW_STEP=3000;
const VISUAL_WINDOW_SPAN=15000;
let visualOriginX=0;
const mapNpcEls=new Map();
let lastNearNpcId=null;

const SOLID_BUCKET_SIZE=1200;
const solidBuckets=new Map();
const solidQueryBuffer=[];
let solidQueryToken=0;
function addSolidToIndex(rect){
  const a=Math.floor(rect.x/SOLID_BUCKET_SIZE);
  const b=Math.floor((rect.x+rect.w)/SOLID_BUCKET_SIZE);
  for(let i=a;i<=b;i++){
    let bucket=solidBuckets.get(i);
    if(!bucket){bucket=[];solidBuckets.set(i,bucket)}
    bucket.push(rect);
  }
}
function rebuildSolidSpatialIndex(){
  solidBuckets.clear();
  MAP_TERRAIN.forEach(addSolidToIndex);
  MAP_OBJECTS.forEach(o=>{if(o.solid)addSolidToIndex(o)});
}
rebuildSolidSpatialIndex();

const rear=[];
const front=[];

function showMapNotice(message,duration=1600){
  mapNotice.textContent=message;
  mapNotice.classList.add('is-show');
  clearTimeout(mapNoticeTimer);
  mapNoticeTimer=setTimeout(()=>mapNotice.classList.remove('is-show'),duration);
}
const mapVisualPools={
  terrain:new Map(),
  object:new Map(),
  landmark:new Map()
};
let mapVisualSyncCount=0;
let mapVisualCreateCount=0;

function pooledMapNode(pool,track,key,create){
  let el=pool.get(key);
  if(!el){
    el=create();
    el.dataset.visualKey=key;
    pool.set(key,el);
    track.appendChild(el);
    mapVisualCreateCount++;
  }
  el.hidden=false;
  return el;
}
function hideMapPool(pool){
  for(const el of pool.values())el.hidden=true;
}

function buildMapVisuals(){
  // Retained-mode DOM: reuse nodes instead of deleting/recreating the visible world every 3000px.
  // This removes the largest layout/GC spike in the old mobile path.
  mapVisualSyncCount++;
  hideMapPool(mapVisualPools.terrain);
  hideMapPool(mapVisualPools.object);
  hideMapPool(mapVisualPools.landmark);
  mapDebugTrack.innerHTML='';
  mapDebugBuilt=false;
  mapNpcEls.clear();
  lastNearNpcId=null;

  const visualMinX=visualOriginX-400;
  const visualMaxX=visualOriginX+VISUAL_WINDOW_SPAN+400;

  MAP_TERRAIN.forEach(t=>{
    if(t.x+t.w<visualMinX||t.x>visualMaxX)return;
    const key='terrain:'+t.id;
    const el=pooledMapNode(mapVisualPools.terrain,terrainTrack,key,()=>{
      const node=document.createElement('div');
      node.dataset.mapId=t.id;
      return node;
    });
    el.className='terrain-piece '+t.kind+(t.fork?' fork-shelf':'');
    Object.assign(el.style,{
      left:(t.x-visualOriginX)+'px',
      bottom:(MAP_GROUND_SCREEN_Y+t.y)+'px',
      width:t.w+'px',
      height:t.h+'px'
    });
  });

  MAP_OBJECTS.forEach(o=>{
    if(o.x+o.w<visualMinX||o.x>visualMaxX)return;
    const key='object:'+o.id;
    const el=pooledMapNode(mapVisualPools.object,mapObjectTrack,key,()=>{
      const node=document.createElement('div');
      node.dataset.mapId=o.id;
      return node;
    });
    el.className='map-object '+o.kind;
    Object.assign(el.style,{
      left:(o.x-visualOriginX)+'px',
      bottom:(MAP_GROUND_SCREEN_Y+o.y)+'px',
      width:o.w+'px',
      height:o.h+'px'
    });
    el.classList.toggle('is-broken',mapState.broken.has(o.id));
  });

  MAP_PICKUPS.forEach(p=>{
    if(p.x<visualMinX||p.x>visualMaxX)return;
    const key='pickup:'+p.id;
    const el=pooledMapNode(mapVisualPools.object,mapObjectTrack,key,()=>{
      const node=document.createElement('div');
      node.className='pickup';
      node.dataset.pickupId=p.id;
      return node;
    });
    el.className='pickup';
    el.style.left=(p.x-visualOriginX)+'px';
    el.style.bottom=(MAP_GROUND_SCREEN_Y+p.y)+'px';
    const hidden=mapState.collected.has(p.id)||(p.requiresBroken&&!mapState.broken.has(p.requiresBroken));
    el.classList.toggle('is-collected',hidden);
  });

  MAP_NPCS.forEach(n=>{
    if(n.x<visualMinX||n.x>visualMaxX)return;
    const key='npc:'+n.id;
    const el=pooledMapNode(mapVisualPools.landmark,mapLandmarkTrack,key,()=>{
      const node=document.createElement('div');
      node.className='map-npc';
      node.dataset.npcId=n.id;
      node.innerHTML='<img class="map-npc-art" alt="" decoding="async" draggable="false"><div class="map-npc-name"></div><div class="map-npc-prompt">E / 聊</div>';
      return node;
    });
    el.className='map-npc';
    el.style.left=(n.x-visualOriginX)+'px';
    const artEl=el.querySelector('.map-npc-art');
    if(artEl&&n.sprite&&artEl.getAttribute('src')!==n.sprite)artEl.src=n.sprite;
    const nameEl=el.querySelector('.map-npc-name');
    if(nameEl&&nameEl.textContent!==n.name)nameEl.textContent=n.name;
    mapNpcEls.set(n.id,el);
  });

  MAP_LANDMARKS.forEach(m=>{
    if(m.x<visualMinX||m.x>visualMaxX)return;
    const key='landmark:'+m.id;
    const el=pooledMapNode(mapVisualPools.landmark,mapLandmarkTrack,key,()=>{
      const node=document.createElement('div');
      node.dataset.mapId=m.id;
      if(m.kind==='exit'){
        node.className='map-landmark map-exit';
      }else{
        node.className='map-landmark sign';
        const span=document.createElement('span');
        span.textContent=m.text;
        node.appendChild(span);
      }
      return node;
    });
    el.style.left=(m.x-visualOriginX)+'px';
  });

  // No authored route boards/guides in the clean stage.

}
function ensureMapDebugVisuals(){
  if(mapDebugBuilt)return;
  mapDebugTrack.innerHTML='';
  const minX=visualOriginX-400,maxX=visualOriginX+VISUAL_WINDOW_SPAN+400;
  MAP_TERRAIN.forEach(t=>{
    if(t.x+t.w<minX||t.x>maxX)return;
    const dbg=document.createElement('div');
    dbg.className='map-debug-rect collider';
    dbg.dataset.debugFor=t.id;
    Object.assign(dbg.style,{left:(t.x-visualOriginX)+'px',bottom:(MAP_GROUND_SCREEN_Y+t.y)+'px',width:t.w+'px',height:t.h+'px'});
    mapDebugTrack.appendChild(dbg);
  });
  MAP_OBJECTS.forEach(o=>{
    if(!o.solid||o.x+o.w<minX||o.x>maxX)return;
    const dbg=document.createElement('div');
    dbg.className='map-debug-rect collider';
    dbg.dataset.debugFor=o.id;
    Object.assign(dbg.style,{left:(o.x-visualOriginX)+'px',bottom:(MAP_GROUND_SCREEN_Y+o.y)+'px',width:o.w+'px',height:o.h+'px'});
    if(mapState.broken.has(o.id))dbg.style.display='none';
    mapDebugTrack.appendChild(dbg);
  });
  ENEMY_SPAWNS.forEach(spawn=>{
    if(spawn.patrolMax<minX||spawn.patrolMin>maxX)return;
    const dbg=document.createElement('div');
    dbg.className='map-debug-rect spawn';
    dbg.dataset.debugFor='spawn-'+spawn.id;
    Object.assign(dbg.style,{left:(spawn.patrolMin-visualOriginX)+'px',bottom:MAP_GROUND_SCREEN_Y+'px',width:(spawn.patrolMax-spawn.patrolMin)+'px',height:'142px'});
    mapDebugTrack.appendChild(dbg);
  });
  mapDebugBuilt=true;
}

function spritePosition(index){
  const col=index%3,row=Math.floor(index/3);
  return (col*50)+'% '+(row*100)+'%';
}
const PROP_PERIOD=2200;
const PROP_POOL_REPEATS=5;
const propPools=[];
function buildProps(id,data,parallax){
  const root=document.getElementById(id);
  root.textContent='';
  root.style.width=MAP_WIDTH+'px';
  const pool={root,data,parallax,startRepeat:null,originX:0,els:[]};
  for(let slot=0;slot<PROP_POOL_REPEATS;slot++){
    const row=[];
    data.forEach(p=>{
      const el=document.createElement('div');
      el.className='prop '+p.c;
      el.style.width=p.w+'px';
      el.style.backgroundPosition=spritePosition(p.s);
      el.style.display='none';
      root.appendChild(el);
      row.push(el);
    });
    pool.els.push(row);
  }
  root.style.width=(PROP_POOL_REPEATS*PROP_PERIOD+PROP_PERIOD)+'px';
  propPools.push(pool);
  return pool;
}
function updatePropPools(sceneryX,force=false){
  const viewW=VIEW_W;
  for(const pool of propPools){
    const cameraX=sceneryX*pool.parallax;
    const centerRepeat=Math.floor((cameraX+viewW*.5)/PROP_PERIOD);
    const startRepeat=centerRepeat-2;
    if(!force&&pool.startRepeat===startRepeat)continue;
    pool.startRepeat=startRepeat;
    pool.originX=startRepeat*PROP_PERIOD;
    for(let slot=0;slot<PROP_POOL_REPEATS;slot++){
      const repIndex=startRepeat+slot;
      const row=pool.els[slot];
      pool.data.forEach((p,i)=>{
        const el=row[i];
        const x=repIndex*PROP_PERIOD+p.x;
        if(repIndex<0||x<-300||x>MAP_WIDTH+300){
          el.style.display='none';
          return;
        }
        el.style.display='';
        el.style.left=(x-pool.originX)+'px';
        el.style.animationDelay=(-((i*.71+repIndex*.43)%4.8))+'s';
      });
    }
  }
}
const rearPropPool=buildProps('rearTrack',rear,.97);
const frontPropPool=buildProps('frontTrack',front,1.03);

// clean-stage-r14: legacy midground atlas removed.
const roadSurface=document.getElementById('roadSurface');
const roadTrack=document.getElementById('roadTrack');
const roadTile=document.getElementById('roadTile');
const rearTrack=document.getElementById('rearTrack');
const frontTrack=document.getElementById('frontTrack');
const mapTrack=document.getElementById('mapTrack');
const midgroundBuildingTrack=document.getElementById('midgroundBuildingTrack');
const midgroundApartment=document.getElementById('midgroundApartment');
const apartmentDoorPrompt=document.getElementById('apartmentDoorPrompt');
const interiorScene=document.getElementById('interiorScene');
const interiorFarLayer=document.getElementById('interiorFarLayer');
const interiorMidLayer=document.getElementById('interiorMidLayer');
const interiorNearLayer=document.getElementById('interiorNearLayer');
const interiorExitDoor=document.getElementById('interiorExitDoor');
const APARTMENT_WORLD_X=520;
const APARTMENT_PARALLAX=.78;
const APARTMENT_DOOR_X_RATIO=.525;
const APARTMENT_DOOR_PROMPT_Y_RATIO=.43;

// Interior world uses the same 128 px = 1 m scale as the outdoor world.
const INTERIOR_MAP_WIDTH=3072;        // 24 m
const INTERIOR_MAP_HEIGHT=1280;       // 10 m
const INTERIOR_WALL_THICKNESS=96;
const INTERIOR_DOOR_X=896;            // 7 m from the room origin
const INTERIOR_SECOND_FLOOR_Y=512;    // 4 m above first floor
const INTERIOR_STAIRS=Object.freeze({
  x0:1408,                            // 11 m
  x1:2048,                            // 16 m
  y0:0,
  y1:INTERIOR_SECOND_FLOOR_Y
});
const OUTDOOR_FLIGHT_MAX_Y=50000;

let sceneLocation='outside';
let sceneTransitionBusy=false;
let interiorPlayerX=0;                // compatibility: fixed screen X
let interiorPlayerWorldX=INTERIOR_DOOR_X;
let interiorCameraX=INTERIOR_DOOR_X;
let interiorCameraY=0;
let interiorDoorAnchorX=0;
let interiorSceneShiftX=0;            // compatibility/debug = -interiorCameraX
let exteriorReturnX=MAP_SPAWN_X;
let exteriorReturnY=0;
let stageHeldActorX=0;
let stageHeldPlayerY=0;
let lastSceneDoorAnchorErrorX=0;
const APARTMENT_CULL_MARGIN=180;
let apartmentDisplayWidth=780;
let midgroundApartmentVisible=null;

function refreshSceneryMetrics(){
  const apartmentW=midgroundApartment?.getBoundingClientRect().width||0;
  if(apartmentW>0)apartmentDisplayWidth=apartmentW;
}
midgroundApartment?.addEventListener('error',()=>{
  midgroundApartment.hidden=true;
  midgroundApartmentVisible=false;
  console.warn('APARTMENT_ASSET_UNAVAILABLE');
},{once:true});
function updateMidgroundApartmentVisibility(sceneryX,force=false){
  if(!midgroundApartment)return;
  const screenLeft=APARTMENT_WORLD_X-sceneryX*APARTMENT_PARALLAX;
  const visible=screenLeft+apartmentDisplayWidth>-APARTMENT_CULL_MARGIN
    &&screenLeft<VIEW_W+APARTMENT_CULL_MARGIN;
  if(force||visible!==midgroundApartmentVisible){
    midgroundApartmentVisible=visible;
    midgroundApartment.hidden=!visible;
  }
}
function apartmentDoorScreenX(){
  const sceneryX=worldX+sceneryOffsetX;
  return APARTMENT_WORLD_X-sceneryX*APARTMENT_PARALLAX+apartmentDisplayWidth*APARTMENT_DOOR_X_RATIO;
}
function apartmentDoorScreenY(){
  const h=midgroundApartment?.getBoundingClientRect().height||1040;
  return MAP_GROUND_SCREEN_Y+h*APARTMENT_DOOR_PROMPT_Y_RATIO-playerY;
}
function nearbyApartmentDoor(maxDistance=78){
  if(sceneLocation!=='outside'||sceneTransitionBusy||midgroundApartment?.hidden)return false;
  return playerY<68&&Math.abs(actorX-apartmentDoorScreenX())<=maxDistance;
}

function interiorWalkSurfaceY(x){
  if(x<=INTERIOR_STAIRS.x0)return 0;
  if(x>=INTERIOR_STAIRS.x1)return INTERIOR_SECOND_FLOOR_Y;
  const t=(x-INTERIOR_STAIRS.x0)/(INTERIOR_STAIRS.x1-INTERIOR_STAIRS.x0);
  return INTERIOR_STAIRS.y0+(INTERIOR_STAIRS.y1-INTERIOR_STAIRS.y0)*t;
}
function interiorHorizontalBounds(){
  return {
    left:INTERIOR_WALL_THICKNESS+PLAYER_BODY.halfW,
    right:INTERIOR_MAP_WIDTH-INTERIOR_WALL_THICKNESS-PLAYER_BODY.halfW
  };
}
function updateInteriorCamera(){
  // The player never moves on screen. Indoor X/Y are real world coordinates;
  // all visible room layers move opposite those coordinates.
  interiorCameraX=interiorPlayerWorldX-playerScreenAnchorX;
  interiorCameraY=playerY;
  interiorSceneShiftX=-interiorCameraX;
  interiorPlayerX=playerScreenAnchorX;
  actorX=playerScreenAnchorX;
  interiorDoorAnchorX=INTERIOR_DOOR_X-interiorCameraX;
}
function moveInteriorHorizontal(dx,{flight=false}={}){
  if(!dx)return 0;
  const bounds=interiorHorizontalBounds();
  const oldX=interiorPlayerWorldX;
  interiorPlayerWorldX=clamp(oldX+dx,bounds.left,bounds.right);
  if(!flight){
    // Stairs are a continuous walking surface, never a platform/jump target.
    playerY=interiorWalkSurfaceY(interiorPlayerWorldX);
    playerVy=0;
    playerGrounded=true;
    coyoteTimer=COYOTE_TIME;
  }
  updateInteriorCamera();
  return interiorPlayerWorldX-oldX;
}
function interiorExitX(){
  return INTERIOR_DOOR_X-interiorCameraX;
}
function syncInteriorDoorWithExterior(){
  // Enter exactly on the indoor doorway. Because camera = world - screenAnchor,
  // the doorway's first rendered pixel is exactly under the fixed player.
  interiorPlayerWorldX=INTERIOR_DOOR_X;
  interiorCameraX=INTERIOR_DOOR_X-playerScreenAnchorX;
  interiorCameraY=0;
  interiorSceneShiftX=-interiorCameraX;
  interiorPlayerX=playerScreenAnchorX;
  interiorDoorAnchorX=playerScreenAnchorX;
  return playerScreenAnchorX;
}
function alignInteriorSceneToStage(force=false){
  if(!interiorScene||sceneLocation!=='interior')return;
  const key=VIEW_W+'x'+VIEW_H+'@'+MAP_GROUND_SCREEN_Y;
  if(!force&&alignInteriorSceneToStage._key===key)return;
  interiorScene.style.left='0px';
  interiorScene.style.top='0px';
  interiorScene.style.right='0px';
  interiorScene.style.bottom='0px';
  interiorScene.style.width='auto';
  interiorScene.style.height='auto';
  const stageRect=worldEl.getBoundingClientRect();
  const sceneRect=interiorScene.getBoundingClientRect();
  const dx=stageRect.left-sceneRect.left;
  const dy=stageRect.top-sceneRect.top;
  interiorScene.style.left=dx.toFixed(2)+'px';
  interiorScene.style.top=dy.toFixed(2)+'px';
  interiorScene.style.right='auto';
  interiorScene.style.bottom='auto';
  interiorScene.style.width=stageRect.width.toFixed(2)+'px';
  interiorScene.style.height=stageRect.height.toFixed(2)+'px';
  alignInteriorSceneToStage._key=key;
}
function positionInteriorExitDoor(){
  if(!interiorExitDoor)return;
  // Door position is authored in finite indoor world coordinates.
  interiorExitDoor.style.right='auto';
  interiorExitDoor.style.left=INTERIOR_DOOR_X.toFixed(1)+'px';
  interiorExitDoor.style.translate='-50% 0';
  interiorExitDoor.style.bottom='0px';
}
function updateInteriorDepthLayers(){
  const transform='translate3d('+(-interiorCameraX).toFixed(2)+'px,'+interiorCameraY.toFixed(2)+'px,0)';
  if(interiorFarLayer)interiorFarLayer.style.transform=transform;
  if(interiorMidLayer)interiorMidLayer.style.transform=transform;
  if(interiorNearLayer)interiorNearLayer.style.transform=transform;
  return sceneLocation==='interior';
}
function nearbyInteriorExit(maxDistance=92){
  return sceneLocation==='interior'&&!sceneTransitionBusy
    &&Math.abs(interiorPlayerWorldX-INTERIOR_DOOR_X)<=maxDistance
    &&Math.abs(playerY)<=72;
}
function renderDoorPrompt(){
  if(!apartmentDoorPrompt)return;
  if(sceneLocation!=='outside'||!nearbyApartmentDoor()){
    apartmentDoorPrompt.classList.remove('is-visible');
    apartmentDoorPrompt.setAttribute('aria-hidden','true');
    return;
  }
  apartmentDoorPrompt.style.left=apartmentDoorScreenX().toFixed(1)+'px';
  apartmentDoorPrompt.style.bottom=apartmentDoorScreenY().toFixed(1)+'px';
  apartmentDoorPrompt.classList.add('is-visible');
  apartmentDoorPrompt.setAttribute('aria-hidden','false');
}
function exteriorCameraForDoorAt(screenX){
  const maxCamera=Math.max(0,MAP_WIDTH-VIEW_W);
  const aligned=((APARTMENT_WORLD_X+apartmentDisplayWidth*APARTMENT_DOOR_X_RATIO-screenX)/APARTMENT_PARALLAX)-sceneryOffsetX;
  return clamp(aligned,0,maxCamera);
}
function clearSceneStageClasses(){
  worldEl.classList.remove('paper-stage-out','interior-stage-in','interior-stage-out','exterior-stage-in');
}
function enterApartment(){
  if(sceneLocation!=='outside'||sceneTransitionBusy)return false;
  sceneTransitionBusy=true;
  exteriorReturnX=playerWorldX;
  exteriorReturnY=playerY;
  stageHeldActorX=actorX;
  stageHeldPlayerY=playerY;
  syncInteriorDoorWithExterior();
  cancelPlayerActionSettle();
  cancelPlayerTurnFlip({snap:true});
  worldEl.classList.add('stage-transitioning','paper-stage-out');
  apartmentDoorPrompt?.classList.remove('is-visible');
  setTimeout(()=>{
    sceneLocation='interior';
    playerY=0;
    playerVy=0;
    playerGrounded=true;
    interiorPlayerWorldX=INTERIOR_DOOR_X;
    updateInteriorCamera();
    clearSceneStageClasses();
    worldEl.classList.add('scene-interior','interior-stage-in','stage-transitioning');
    interiorScene?.setAttribute('aria-hidden','false');
    renderWorld(true);
    lastSceneDoorAnchorErrorX=interiorExitX()-actorX;
    updateNpcPrompt();
    setTimeout(()=>{
      worldEl.classList.remove('interior-stage-in','stage-transitioning');
      sceneTransitionBusy=false;
      updateNpcPrompt();
    },900);
  },860);
  return true;
}
function exitApartment(){
  if(sceneLocation!=='interior'||sceneTransitionBusy)return false;
  sceneTransitionBusy=true;
  stageHeldActorX=actorX;
  stageHeldPlayerY=playerY;
  cancelPlayerActionSettle();
  cancelPlayerTurnFlip({snap:true});
  worldEl.classList.add('stage-transitioning','interior-stage-out');
  setTimeout(()=>{
    sceneLocation='outside';
    interiorScene?.setAttribute('aria-hidden','true');
    worldEl.classList.remove('scene-interior','interior-stage-out');

    // Restore the outdoor vertical coordinate, then reveal the exterior door
    // directly under the same fixed player screen anchor.
    playerY=exteriorReturnY;
    playerVy=0;
    playerGrounded=playerY<=0;
    refreshSceneryMetrics();
    worldX=exteriorCameraForDoorAt(playerScreenAnchorX);
    playerWorldX=clamp(worldX+playerScreenAnchorX,PLAYER_BODY.halfW,MAP_WIDTH-PLAYER_BODY.halfW);
    actorX=playerScreenAnchorX;

    worldEl.classList.add('exterior-stage-in','stage-transitioning');
    renderWorld(true);
    lastSceneDoorAnchorErrorX=apartmentDoorScreenX()-actorX;
    updateNpcPrompt();

    setTimeout(()=>{
      worldEl.classList.remove('exterior-stage-in','stage-transitioning');
      sceneTransitionBusy=false;
      updateNpcPrompt();
    },900);
  },720);
  return true;
}
const terrainTrack=document.getElementById('terrainTrack');
const mapObjectTrack=document.getElementById('mapObjectTrack');
const mapLandmarkTrack=document.getElementById('mapLandmarkTrack');
const mapDebugTrack=document.getElementById('mapDebugTrack');
const mapNotice=document.getElementById('mapNotice');
const paperBackdrop=document.getElementById('paperBackdrop');
const paperBackdropNext=document.getElementById('paperBackdropNext');
const paperSun=document.getElementById('paperSun');
const paperMoon=document.getElementById('paperMoon');
const paperClock=document.getElementById('paperClock');
const dialogueStage=document.getElementById('dialogueStage');
const dialoguePlayerPortrait=document.getElementById('dialoguePlayerPortrait');
const dialogueNpcPortrait=document.getElementById('dialogueNpcPortrait');
const dialoguePlayerName=document.getElementById('dialoguePlayerName');
const dialogueNpcName=document.getElementById('dialogueNpcName');
const dialoguePlayerArt=document.getElementById('dialoguePlayerArt');
const dialogueNpcArt=document.getElementById('dialogueNpcArt');
const dialoguePlayerBubble=document.getElementById('dialoguePlayerBubble');
const dialogueNpcBubble=document.getElementById('dialogueNpcBubble');
const dialogueChoices=document.getElementById('dialogueChoices');
const dialogueSkip=document.getElementById('dialogueSkip');
dialoguePlayerArt.src='./assets/dialogue/player-portrait-hd.svg?v=1';
dialoguePlayerArt.addEventListener('error',()=>{
  if(window.PAPERCHALK_PLAYER_PORTRAIT)dialoguePlayerArt.src=window.PAPERCHALK_PLAYER_PORTRAIT;
  else dialoguePlayerArt.src=PLAYER_ACTION_ASSETS.idle;
},{once:true});
dialogueNpcArt.src=MAP_NPCS[0]?.dialoguePortrait||MAP_NPCS[0]?.sprite||'';
dialogueNpcArt.addEventListener('error',()=>{
  console.warn('NPC_PORTRAIT_UNAVAILABLE');
},{once:true});
let dialoguePortraitReady=false;
const dialoguePortraitDecode=Promise.allSettled(
  [dialoguePlayerArt,dialogueNpcArt].map(img=>typeof img.decode==='function'?img.decode():Promise.resolve())
).then(result=>{
  dialoguePortraitReady=true;
  return result;
});
const actorEl=document.querySelector('.actor');
const playerFlip=document.getElementById('playerFlip');
const playerSprite=document.getElementById('playerSprite');
const playerActionPreloads=new Map();
const playerReducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let playerActionAssetsReady=false;
let playerDomActionState='idle';
let playerActionSettleRevision=0;
let playerActionSettleAnimation=null;
let playerTurnRevision=0;
let playerTurnOutAnimation=null;
let playerTurnInAnimation=null;
function playerActionMeta(state){return PLAYER_ACTION_META[state]||PLAYER_ACTION_META.idle}
function preloadPlayerActionAssets(){
  if(playerActionAssetsReady)return Promise.resolve();
  const jobs=Object.entries(PLAYER_ACTION_ASSETS).map(([state,src])=>{
    if(playerActionPreloads.has(state))return playerActionPreloads.get(state);
    const img=new Image();
    img.decoding='async';
    img.src=src;
    const job=(typeof img.decode==='function'?img.decode():new Promise((resolve,reject)=>{
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',reject,{once:true});
    })).catch(()=>null);
    playerActionPreloads.set(state,job);
    return job;
  });
  return Promise.allSettled(jobs).then(()=>{playerActionAssetsReady=true});
}
function applyPlayerActionVisual(state){
  const meta=playerActionMeta(state);
  actorEl.dataset.playerState=state;
  actorEl.style.setProperty('--action-scale',String(meta.scale));
  actorEl.style.setProperty('--source-facing',String(meta.sourceFacing));
  const src=PLAYER_ACTION_ASSETS[state]||PLAYER_ACTION_ASSETS.idle;
  if(playerSprite.getAttribute('src')!==src)playerSprite.src=src;
  playerDomActionState=state;
}
function cancelPlayerActionSettle(){
  playerActionSettleRevision++;
  playerActionSettleAnimation?.cancel();
  playerActionSettleAnimation=null;
}
function startPlayerActionSettle(previousState,state){
  const previousMeta=playerActionMeta(previousState);
  const nextMeta=playerActionMeta(state);
  const token=++playerActionSettleRevision;
  playerActionSettleAnimation?.cancel();
  playerActionSettleAnimation=null;
  applyPlayerActionVisual(state);
  // Crouch must swap directly. Scaling the shared card here can expose one frame
  // of the old standing bitmap shrinking before the crouch bitmap is painted.
  if(state==='crouch'||previousState==='crouch')return;
  if(!playerFlip||playerReducedMotion.matches)return;
  const ratio=Math.max(.72,Math.min(1.34,previousMeta.scale/Math.max(.01,nextMeta.scale)));
  if(Math.abs(ratio-1)<.008)return;
  const duration=105;
  playerActionSettleAnimation=playerFlip.animate([
    {scale:String(ratio)},
    {scale:'1'}
  ],{duration,easing:'cubic-bezier(.20,.72,.24,1)'});
  playerActionSettleAnimation.finished.then(()=>{
    if(token===playerActionSettleRevision)playerActionSettleAnimation=null;
  }).catch(()=>{});
}
function clearPlayerTurnAnimations(){
  playerTurnOutAnimation?.cancel();
  playerTurnInAnimation?.cancel();
  playerTurnOutAnimation=null;
  playerTurnInAnimation=null;
}
function cancelPlayerTurnFlip({snap=true}={}){
  playerTurnRevision++;
  clearPlayerTurnAnimations();
  if(snap)actorEl.classList.toggle('facing-left',facing<0);
}
function startPlayerTurnFlip(dir){
  const token=++playerTurnRevision;
  clearPlayerTurnAnimations();
  const visualDir=actorEl.classList.contains('facing-left')?-1:1;
  if(visualDir===dir)return;
  if(!playerFlip||playerReducedMotion.matches){
    actorEl.classList.toggle('facing-left',dir<0);
    return;
  }
  const spin=dir<visualDir?1:-1;
  playerTurnOutAnimation=playerFlip.animate([
    {transform:'perspective(260px) rotateY(0deg)'},
    {transform:'perspective(260px) rotateY('+(spin*82)+'deg)'}
  ],{duration:68,easing:'cubic-bezier(.32,.02,.68,.98)',fill:'forwards'});
  playerTurnOutAnimation.finished.then(()=>{
    if(token!==playerTurnRevision)return;
    actorEl.classList.toggle('facing-left',dir<0);
    playerTurnInAnimation=playerFlip.animate([
      {transform:'perspective(260px) rotateY('+(-spin*82)+'deg)'},
      {transform:'perspective(260px) rotateY(0deg)'}
    ],{duration:82,easing:'cubic-bezier(.18,.76,.22,1)',fill:'forwards'});
    return playerTurnInAnimation.finished;
  }).then(()=>{
    if(token===playerTurnRevision){
      playerTurnOutAnimation=null;
      playerTurnInAnimation=null;
    }
  }).catch(()=>{});
}
function setPlayerActionState(state,force=false){
  if(!PLAYER_ACTION_ASSETS[state])state='idle';
  if(!force&&state===playerActionState)return false;
  const previousState=playerActionState;
  playerActionState=state;
  if(force){
    cancelPlayerActionSettle();
    applyPlayerActionVisual(state);
  }else{
    startPlayerActionSettle(previousState,state);
  }
  return true;
}
function resolvePlayerActionState(){
  if(debugFlightMode)return lastMovingState?'walk':'idle';
  if(playerCrouching&&playerGrounded)return 'crouch';
  if(!playerGrounded)return playerVy>0?'jump-up':'jump-down';
  if(lastMovingState)return 'walk';
  return 'idle';
}
function syncPlayerActionState(force=false){
  return setPlayerActionState(resolvePlayerActionState(),force);
}
function schedulePlayerActionWarmup(){
  const warm=()=>{preloadPlayerActionAssets()};
  if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:900});
  else setTimeout(warm,160);
}
applyPlayerActionVisual('idle');
schedulePlayerActionWarmup();
window.addEventListener('paperchalk-world-enter',()=>{preloadPlayerActionAssets()});
const joystickZone=document.getElementById('joystickZone');
const joystickEl=document.getElementById('joystick');
const backpackBtn=document.getElementById('backpackBtn');
const worldMapBtn=document.getElementById('worldMapBtn');
const worldMapOverlay=document.getElementById('worldMapOverlay');
const worldMapPaper=document.getElementById('worldMapPaper');
const worldMapClose=document.getElementById('worldMapClose');
const worldMapScroll=document.getElementById('worldMapScroll');
const worldMapCanvas=document.getElementById('worldMapCanvas');
const worldMapLocation=document.getElementById('worldMapLocation');
const worldMapZoomOut=document.getElementById('worldMapZoomOut');
const worldMapZoomIn=document.getElementById('worldMapZoomIn');
const worldMapFit=document.getElementById('worldMapFit');
const worldMapLocate=document.getElementById('worldMapLocate');
const worldMapZoomLabel=document.getElementById('worldMapZoomLabel');
const backpackOverlay=document.getElementById('backpackOverlay');
const paperFxLayer=document.getElementById('paperFxLayer');
const paperFxBall=document.getElementById('paperFxBall');
const paperFxUnfold=document.getElementById('paperFxUnfold');
const backpackFrame=document.getElementById('backpackFrame');
const backpackArt=backpackFrame.querySelector('.inventory-art');
const backpackClose=document.getElementById('backpackClose');
const backpackSlots=document.getElementById('backpackSlots');
const inventoryPreviewImage=document.getElementById('inventoryPreviewImage');
const inventoryItemName=document.getElementById('inventoryItemName');
const inventoryItemDesc=document.getElementById('inventoryItemDesc');
const inventoryItemWeight=document.getElementById('inventoryItemWeight');
const inventoryItemCount=document.getElementById('inventoryItemCount');
const inventoryUse=document.getElementById('inventoryUse');
const inventoryDrop=document.getElementById('inventoryDrop');
const worldEl=document.getElementById('world');
const settingLanguage=document.getElementById('settingLanguage');
const settingTimeScale=document.getElementById('settingTimeScale');
const settingLandscape=document.getElementById('settingLandscape');
const settingsStatus=document.getElementById('settingsStatus');
const playerHealthHud=document.getElementById('playerHealthHud');
const playerHealthBar=document.getElementById('playerHealthBar');
const debugToggleBtn=document.getElementById('debugToggleBtn');
const debugPanel=document.getElementById('debugPanel');
const debugCloseBtn=document.getElementById('debugCloseBtn');
const debugStatus=document.getElementById('debugStatus');
const debugCommandForm=document.getElementById('debugCommandForm');
const debugCommandInput=document.getElementById('debugCommandInput');
const debugOutput=document.getElementById('debugOutput');
const debugHitboxBtn=document.getElementById('debugHitboxBtn');
const debugRangeBtn=document.getElementById('debugRangeBtn');
const debugAiBtn=document.getElementById('debugAiBtn');
const debugMapColliderBtn=document.getElementById('debugMapColliderBtn');
const debugSpawnBtn=document.getElementById('debugSpawnBtn');
const debugCameraBtn=document.getElementById('debugCameraBtn');
const debugFlightBtn=document.getElementById('debugFlightBtn');
const debugRendererAutoBtn=document.getElementById('debugRendererAutoBtn');
const debugRendererGpuBtn=document.getElementById('debugRendererGpuBtn');
const debugRendererDomBtn=document.getElementById('debugRendererDomBtn');
const entityTrack=document.getElementById('entityTrack');
const enemyEl=document.getElementById('enemy');
const enemyHealthFill=document.getElementById('enemyHealthFill');
const enemy2El=document.getElementById('enemy2');
const enemy2HealthFill=document.getElementById('enemy2HealthFill');
const interactBtn=document.getElementById('interactBtn');
const crouchBtn=document.getElementById('crouchBtn');
const jumpBtn=document.getElementById('jumpBtn');
const attackBtn=document.getElementById('attackBtn');
const playerHurtboxDebug=document.getElementById('playerHurtboxDebug');
const playerAttackDebug=document.getElementById('playerAttackDebug');
const enemyHurtboxDebug=document.getElementById('enemyHurtboxDebug');
const enemyAttackDebug=document.getElementById('enemyAttackDebug');

function syncViewportMetrics(){
  const vv=window.visualViewport;
  const rawH=Number(vv?.height)||Number(innerHeight)||720;
  const rawW=Number(vv?.width)||Number(innerWidth)||1280;
  const layoutH=Number(document.documentElement.clientHeight)||rawH;
  const layoutW=Number(document.documentElement.clientWidth)||rawW;
  const viewH=Math.max(180,Math.round(Math.min(rawH,layoutH)));
  const viewW=Math.max(280,Math.round(Math.min(rawW,layoutW)));
  const prevW=VIEW_W,prevH=VIEW_H,prevScale=PLAYER_VISUAL.scale;
  const rawScale=Math.min(viewW/VIEWPORT_REFERENCE.w,viewH/VIEWPORT_REFERENCE.h);
  const viewportScale=Math.max(.82,Math.min(1.08,rawScale));
  const playerW=Math.round(PLAYER_VISUAL_BASE.w*viewportScale*100)/100;
  const playerH=Math.round(PLAYER_VISUAL_BASE.h*viewportScale*100)/100;
  const controlScale=Math.max(.84,Math.min(1.06,viewportScale));
  document.documentElement.style.setProperty('--app-height',viewH+'px');
  document.documentElement.style.setProperty('--app-width',viewW+'px');
  document.documentElement.style.setProperty('--world-width',MAP_WIDTH+'px');
  document.documentElement.style.setProperty('--viewport-scale',viewportScale.toFixed(4));
  document.documentElement.style.setProperty('--control-scale',controlScale.toFixed(4));
  document.documentElement.style.setProperty('--player-visual-w',playerW+'px');
  document.documentElement.style.setProperty('--player-visual-h',playerH+'px');
  const nextGround=clamp(Math.round(viewH*.30),72,112);
  document.documentElement.style.setProperty('--ground-screen-y',nextGround+'px');
  const groundChanged=nextGround!==MAP_GROUND_SCREEN_Y;
  const sizeChanged=viewW!==prevW||viewH!==prevH;
  const scaleChanged=Math.abs(viewportScale-prevScale)>.001;
  VIEW_W=viewW;VIEW_H=viewH;
  MAP_GROUND_SCREEN_Y=nextGround;
  PLAYER_VISUAL.w=playerW;PLAYER_VISUAL.h=playerH;PLAYER_VISUAL.scale=viewportScale;
  return {groundChanged,sizeChanged,scaleChanged};
}
function applyWorldDimensions(){
  const width=VISUAL_WINDOW_SPAN+'px';
  if(mapTrack)mapTrack.style.width=width;
  if(entityTrack)entityTrack.style.width=width;
}
syncViewportMetrics();
applyWorldDimensions();
buildMapVisuals();

const WORLD_CLOCK_OFFSET=360; // existing saves at 0 begin visually at 06:00
const DAY_MINUTES=1440;
const DAYLIGHT_KEYS=[
  {m:0,top:[24,30,58],bottom:[53,55,79],horizon:[75,66,76],night:.58,stars:.92,warm:0,sun:0,moon:.95},
  {m:300,top:[44,50,78],bottom:[91,75,89],horizon:[151,107,91],night:.34,stars:.62,warm:.08,sun:0,moon:.70},
  {m:360,top:[101,120,139],bottom:[210,153,112],horizon:[230,184,132],night:.12,stars:.18,warm:.24,sun:.52,moon:.28},
  {m:480,top:[137,177,194],bottom:[222,211,184],horizon:[200,183,139],night:0,stars:0,warm:.05,sun:1,moon:0},
  {m:720,top:[126,178,205],bottom:[229,220,196],horizon:[202,188,147],night:0,stars:0,warm:0,sun:1,moon:0},
  {m:960,top:[142,174,190],bottom:[225,197,164],horizon:[202,167,119],night:0,stars:0,warm:.08,sun:.92,moon:0},
  {m:1080,top:[103,107,135],bottom:[195,128,96],horizon:[178,112,86],night:.12,stars:.10,warm:.30,sun:.45,moon:.20},
  {m:1170,top:[58,61,93],bottom:[116,77,91],horizon:[111,78,84],night:.34,stars:.55,warm:.10,sun:0,moon:.68},
  {m:1260,top:[29,35,65],bottom:[62,59,81],horizon:[78,67,76],night:.54,stars:.90,warm:0,sun:0,moon:.94},
  {m:1440,top:[24,30,58],bottom:[53,55,79],horizon:[75,66,76],night:.58,stars:.92,warm:0,sun:0,moon:.95}
];
let lastDayNightRender=-Infinity;
let sceneFoldTimer=0;

function modDay(v){return ((v%DAY_MINUTES)+DAY_MINUTES)%DAY_MINUTES}
function visibleClockMinutes(){return modDay(worldMinutes+WORLD_CLOCK_OFFSET)}
function lerp(a,b,t){return a+(b-a)*t}
function lerpRgb(a,b,t){return a.map((v,i)=>Math.round(lerp(v,b[i],t)))}
function rgbCss(v){return 'rgb('+v.join(',')+')'}
function daylightState(minutes=visibleClockMinutes()){
  let a=DAYLIGHT_KEYS[0],b=DAYLIGHT_KEYS[DAYLIGHT_KEYS.length-1];
  for(let i=0;i<DAYLIGHT_KEYS.length-1;i++){
    if(minutes>=DAYLIGHT_KEYS[i].m&&minutes<=DAYLIGHT_KEYS[i+1].m){a=DAYLIGHT_KEYS[i];b=DAYLIGHT_KEYS[i+1];break}
  }
  const span=Math.max(1,b.m-a.m),t=clamp((minutes-a.m)/span,0,1);
  return {
    top:lerpRgb(a.top,b.top,t),bottom:lerpRgb(a.bottom,b.bottom,t),horizon:lerpRgb(a.horizon,b.horizon,t),
    night:lerp(a.night,b.night,t),stars:lerp(a.stars,b.stars,t),warm:lerp(a.warm,b.warm,t),
    sun:lerp(a.sun,b.sun,t),moon:lerp(a.moon,b.moon,t)
  };
}
function formatWorldClock(minutes=visibleClockMinutes()){
  const m=Math.floor(modDay(minutes)),hh=Math.floor(m/60),mm=m%60;
  return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
}
function worldTimeName(minutes=visibleClockMinutes()){
  if(minutes<300)return '深夜';
  if(minutes<390)return '黎明';
  if(minutes<660)return '上午';
  if(minutes<900)return '正午';
  if(minutes<1080)return '下午';
  if(minutes<1170)return '黄昏';
  if(minutes<1260)return '入夜';
  return '深夜';
}
function celestialArcPosition(minutes,rise,set){
  const visibleSpan=modDay(set-rise)||DAY_MINUTES;
  const elapsed=modDay(minutes-rise);
  const radius=Math.min(VIEW_W*.46,VIEW_H*.66);
  const cx=VIEW_W*.50;
  const cy=VIEW_H*.74;
  let theta,above;
  if(elapsed<=visibleSpan){
    theta=Math.PI*(elapsed/visibleSpan);
    above=true;
  }else{
    const hiddenSpan=Math.max(1,DAY_MINUTES-visibleSpan);
    theta=Math.PI+Math.PI*((elapsed-visibleSpan)/hiddenSpan);
    above=false;
  }
  return {
    x:cx-radius*Math.cos(theta),
    y:cy-radius*Math.sin(theta),
    above
  };
}
let lastCelestialRender=-Infinity;
function updateCelestialVisuals(force=false){
  const now=performance.now();
  if(!force&&now-lastCelestialRender<50)return;
  lastCelestialRender=now;
  const minutes=visibleClockMinutes();
  const sun=celestialArcPosition(minutes,330,1110);
  const moon=celestialArcPosition(minutes,1050,390);
  worldEl.style.setProperty('--sun-x',sun.x.toFixed(2)+'px');
  worldEl.style.setProperty('--sun-y',sun.y.toFixed(2)+'px');
  worldEl.style.setProperty('--moon-x',moon.x.toFixed(2)+'px');
  worldEl.style.setProperty('--moon-y',moon.y.toFixed(2)+'px');
}
function updateDayNightVisuals(force=false){
  const now=performance.now();
  if(!force&&now-lastDayNightRender<500)return;
  lastDayNightRender=now;
  const minutes=visibleClockMinutes(),state=daylightState(minutes);
  worldEl.style.setProperty('--sky-top',rgbCss(state.top));
  worldEl.style.setProperty('--sky-bottom',rgbCss(state.bottom));
  worldEl.style.setProperty('--horizon',rgbCss(state.horizon));
  worldEl.style.setProperty('--night-alpha',state.night.toFixed(3));
  worldEl.style.setProperty('--warm-alpha',state.warm.toFixed(3));
  worldEl.style.setProperty('--warm-alpha-soft',(state.warm*.55).toFixed(3));
  worldEl.style.setProperty('--stars-alpha',state.stars.toFixed(3));
  worldEl.style.setProperty('--sun-alpha',state.sun.toFixed(3));
  worldEl.style.setProperty('--moon-alpha',state.moon.toFixed(3));
  worldEl.style.setProperty('--footlight-alpha',clamp(state.night*.82+state.warm*.18,0,.52).toFixed(3));
  worldEl.style.setProperty('--paper-shadow','rgba(34,28,24,'+(0.13+state.night*.22).toFixed(3)+')');
  updateCelestialVisuals(force);
  const clock=formatWorldClock(minutes),phase=worldTimeName(minutes);
  paperClock.textContent=clock+' · '+phase;
  paperClock.setAttribute('aria-label','世界时间 '+clock+' '+phase);
}
function setVisibleWorldClock(minutes,{persist=true}={}){
  const target=modDay(Number(minutes)||0);
  const dayBase=Math.floor(worldMinutes/DAY_MINUTES)*DAY_MINUTES;
  worldMinutes=dayBase+modDay(target-WORLD_CLOCK_OFFSET);
  updateDayNightVisuals(true);
  if(persist&&typeof saveWorldState==='function')saveWorldState();
  return formatWorldClock();
}
function triggerPaperSceneFold(nextScene=null){
  const scene=nextScene||routeForWorldX(playerWorldX)?.biome||worldEl.dataset.biome||'meadow';
  clearTimeout(sceneFoldTimer);
  paperBackdropNext.dataset.scene=scene;
  worldEl.classList.remove('scene-shifting');
  void paperBackdropNext.offsetWidth;
  worldEl.classList.add('scene-shifting');
  sceneFoldTimer=setTimeout(()=>{
    paperBackdrop.dataset.scene=scene;
    worldEl.classList.remove('scene-shifting');
  },980);
}
window.PaperchalkTheater={
  fold:triggerPaperSceneFold,
  setClock:setVisibleWorldClock,
  get clock(){return formatWorldClock()},
  get phase(){return worldTimeName()}
};
const PLAYER_MAX_HP=10;
let playerHp=PLAYER_MAX_HP;
let healthPieces=[];
const healthAnimationTimers=new WeakMap();

let last=performance.now();
let roadW=1200;
let worldX=0; // camera X in current route-strip coordinates
let sceneryOffsetX=0; // keeps road/parallax phase continuous when graph edges connect
let playerWorldX=MAP_SPAWN_X;
let orientationRouteIndex=0;
let currentRouteOrientation=1;
let worldMinutes=0;
let worldTimeScale=1;
updateDayNightVisuals(true);
let playerScreenAnchorX=Math.round(VIEW_W*.5);
let actorX=playerScreenAnchorX;
let keyboardLeft=false,keyboardRight=false,keyboardCrouch=false,keyboardFlightUp=false,keyboardFlightDown=false;
let mobileCrouch=false,mobileFlightUp=false,mobileFlightDown=false;
let joystickAxis=0,joystickFlightAxisY=0;
let joystickPointer=null;
let joystickOriginX=0,joystickOriginY=0;
let facing=1;
let playerY=0,playerVy=0,playerGrounded=true;
let playerCrouching=false;
let playerActionState='idle';
let coyoteTimer=0,jumpBufferTimer=0;
let playerAttackTimer=0,playerAttackCooldown=0,playerInvuln=0;
const playerAttackHits=new Set();
const GRAVITY=1850,JUMP_SPEED=820;
const COYOTE_TIME=.12,JUMP_BUFFER_TIME=.14,AUTO_MANTLE_WINDOW=72;
const PLAYER_HURT={w:54,standH:108,crouchH:78,ox:-27,oy:8};
const PLAYER_ATTACK={w:92,h:76,forward:22,oy:30};
const ENEMY_MAX_HP=3;
function createEnemyState(id,el,healthEl){
  return {id,el,healthEl,x:0,spawnX:0,patrolMin:0,patrolMax:0,hp:ENEMY_MAX_HP,alive:true,facing:-1,state:'idle',
    attackTimer:0,attackCooldown:0,hitstun:0,spawned:false,account:null,patrolDir:-1,
    _visible:null,_renderX:null,_renderFacing:null,_renderHp:null,_renderAlive:null};
}
const enemy=createEnemyState('enemy-1',enemyEl,enemyHealthFill);
const enemy2=createEnemyState('enemy-2',enemy2El,enemy2HealthFill);
const enemies=[enemy,enemy2];

for(let i=2;i<ENEMY_SPAWNS.length;i++){
  const spawn=ENEMY_SPAWNS[i];
  const el=document.createElement('div');
  el.className='enemy';
  el.setAttribute('aria-label','纸境游荡者 '+(i+1));
  const health=document.createElement('div');
  health.className='enemy-health';
  const fill=document.createElement('div');
  fill.className='enemy-health-fill';
  health.appendChild(fill);
  const img=document.createElement('img');
  img.src='./assets/enemies/rag-drifter.svg?v=1';
  img.alt='敌人';
  el.appendChild(health);
  el.appendChild(img);
  entityTrack.appendChild(el);
  enemies.push(createEnemyState(spawn.id,el,fill));
}
let showHitboxes=false;
let showAttackRange=false;
let enemyAiEnabled=true;
let showMapColliders=false;
let showSpawnZones=false;
let showCameraDebug=false;
let debugFlightMode=false;

function clampPlayerHp(value){
  const n=Number(value);
  if(!Number.isFinite(n))return PLAYER_MAX_HP;
  return Math.max(0,Math.min(PLAYER_MAX_HP,Math.round(n)));
}
function buildPlayerHealthBar(){
  playerHealthBar.innerHTML='';
  healthPieces=[];
  for(let i=0;i<PLAYER_MAX_HP;i++){
    const img=document.createElement('img');
    const isTail=i===PLAYER_MAX_HP-1;
    img.className='hp-segment '+(isTail?'hp-segment--tail':'hp-segment--cell');
    img.src=isTail?'./assets/ui/health/hp-tail.webp?v=1':'./assets/ui/health/hp-cell.webp?v=1';
    img.alt='';
    img.draggable=false;
    img.dataset.hpIndex=String(i);
    playerHealthBar.appendChild(img);
    healthPieces.push(img);
  }
}
function clearHealthPieceAnimation(piece){
  const timer=healthAnimationTimers.get(piece);
  if(timer)clearTimeout(timer);
  healthAnimationTimers.delete(piece);
  piece.classList.remove('is-hit','is-heal');
  piece.style.animationDelay='';
}
function renderPlayerHealth(previousHp=playerHp,animateChange=false){
  playerHp=clampPlayerHp(playerHp);
  previousHp=clampPlayerHp(previousHp);
  playerHealthHud.setAttribute('aria-valuemax',String(PLAYER_MAX_HP));
  playerHealthHud.setAttribute('aria-valuenow',String(playerHp));
  playerHealthHud.setAttribute('aria-valuetext',playerHp+' / '+PLAYER_MAX_HP+' 生命值');

  healthPieces.forEach((piece,i)=>{
    const filled=i<playerHp;
    piece.classList.toggle('is-empty',!filled);

    if(!animateChange)return;
    if(playerHp<previousHp && i>=playerHp && i<previousHp){
      clearHealthPieceAnimation(piece);
      void piece.offsetWidth;
      piece.classList.add('is-hit');
      const timer=setTimeout(()=>{
        piece.classList.remove('is-hit');
        healthAnimationTimers.delete(piece);
      },300);
      healthAnimationTimers.set(piece,timer);
      return;
    }

    if(playerHp>previousHp && i>=previousHp && i<playerHp){
      clearHealthPieceAnimation(piece);
      const order=i-previousHp;
      const delay=order*45;
      piece.style.animationDelay=delay+'ms';
      void piece.offsetWidth;
      piece.classList.add('is-heal');
      const timer=setTimeout(()=>{
        piece.classList.remove('is-heal');
        piece.style.animationDelay='';
        healthAnimationTimers.delete(piece);
      },380+delay);
      healthAnimationTimers.set(piece,timer);
    }
  });
}
function setPlayerHp(value,{persist=true,animate=true}={}){
  const previousHp=playerHp;
  playerHp=clampPlayerHp(value);
  renderPlayerHealth(previousHp,animate);
  if(persist && typeof saveWorldState==='function')saveWorldState();
  return playerHp;
}
function damagePlayer(amount=1){
  const n=Math.max(0,Number(amount)||0);
  return setPlayerHp(playerHp-n);
}
function healPlayer(amount=1){
  const n=Math.max(0,Number(amount)||0);
  return setPlayerHp(playerHp+n);
}
buildPlayerHealthBar();
renderPlayerHealth();
window.PaperchalkHealth={
  get hp(){return playerHp},
  get maxHp(){return PLAYER_MAX_HP},
  set(value){return setPlayerHp(value)},
  damage(amount=1){return damagePlayer(amount)},
  heal(amount=1){return healPlayer(amount)},
  reset(){return setPlayerHp(PLAYER_MAX_HP)}
};

let debugLastUiUpdate=0;
let perfWindowStart=performance.now(),perfFrameCount=0,perfFps=60,perfFrameMs=16.7;
let perfLongTasks=0,perfWorstLongTask=0,perfLastLongTaskAt=0;
try{
  if('PerformanceObserver' in window){
    const longTaskObserver=new PerformanceObserver(list=>{
      for(const entry of list.getEntries()){
        perfLongTasks++;
        perfWorstLongTask=Math.max(perfWorstLongTask,entry.duration||0);
        perfLastLongTaskAt=performance.now();
      }
    });
    longTaskObserver.observe({type:'longtask',buffered:true});
  }
}catch(err){console.debug('LONGTASK_OBSERVER_UNAVAILABLE',err)}
let perfLow=false,perfLowWindows=0,perfHighWindows=0;
const coarsePointer=matchMedia('(pointer:coarse)').matches;
function setPerfLow(next){
  next=!!next;
  if(next===perfLow)return;
  perfLow=next;
  worldEl.classList.toggle('perf-low',perfLow);
}
function sampleFramePerf(now){
  perfFrameCount++;
  const span=now-perfWindowStart;
  if(span>=1000){
    perfFps=Math.round(perfFrameCount*1000/span);
    perfFrameMs=span/perfFrameCount;
    perfFrameCount=0;perfWindowStart=now;
    if(coarsePointer){
      if(perfFps<45){
        perfLowWindows++;perfHighWindows=0;
        if(perfLowWindows>=3)setPerfLow(true);
      }else if(perfFps>=54){
        perfHighWindows++;perfLowWindows=0;
        if(perfHighWindows>=6)setPerfLow(false);
      }else{
        perfLowWindows=0;perfHighWindows=0;
      }
    }
  }
}
function debugIsOpen(){return debugPanel.classList.contains('is-open')}
function updateDebugStatus(){
  const session=typeof getSession==='function'?getSession():null;
  const alive=enemies.filter(e=>e.alive).length;
  const nearest=nearestLivingEnemy();
  debugStatus.innerHTML=
    '<span>HP <b>'+playerHp+' / '+PLAYER_MAX_HP+'</b></span>'+
    '<span>时间 <b>'+formatWorldClock()+' '+worldTimeName()+'</b></span>'+
    '<span>玩家X <b>'+playerWorldX.toFixed(1)+'</b></span>'+
    '<span>Camera <b>'+worldX.toFixed(1)+'</b></span>'+
    '<span>脚底Y <b>'+playerY.toFixed(1)+'</b></span>'+
    '<span>账号 <b>'+(session?.account||'未登录')+'</b></span>'+
    '<span>敌人 <b>'+alive+' / '+enemies.length+'</b></span>'+
    '<span>最近敌距 <b>'+(nearest?Math.round(Math.abs(playerWorldX-nearest.x)):'--')+'</b></span>'+
    '<span>地形碰撞 <b>'+(showMapColliders?'开':'关')+'</b></span>'+
    '<span>Camera调试 <b>'+(showCameraDebug?'开':'关')+'</b></span>'+
    '<span>自由飞行 <b>'+(debugFlightMode?'四向':'关')+'</b></span>'+
    '<span>FPS <b>'+perfFps+' / '+perfFrameMs.toFixed(1)+'ms</b></span>'+
    '<span>长任务 <b>'+perfLongTasks+' / '+perfWorstLongTask.toFixed(0)+'ms</b></span>'+
    '<span>对象池 <b>路'+roadTrack.children.length+' / 景'+(rearTrack.children.length+frontTrack.children.length)+'</b></span>'+
    '<span>性能档 <b>'+(perfLow?'自动低负载':'完整效果')+'</b></span>'+
    '<span>渲染器 <b>'+(window.PaperchalkRenderer?.mode||'dom')+'</b></span>'+
    '<span>角色运行时 <b>'+(window.PaperchalkRenderer?.stats?.playerPuppetReady?('PaperPuppet/'+window.PaperchalkRenderer.stats.playerPuppetMode):'DOM/Legacy')+'</b></span>'+
    '<span>角色层数 <b>'+(window.PaperchalkRenderer?.stats?.playerPuppetLayers||1)+'</b></span>'+
    '<span>GPU耗时 <b>'+(window.PaperchalkRenderer?.mode==='pixi'?(window.PaperchalkRenderer.stats.renderMs.toFixed(2)+'ms'):'--')+'</b></span>';
}
function updateCombatDebugButtons(){
  debugHitboxBtn.textContent='碰撞箱：'+(showHitboxes?'开':'关');
  debugRangeBtn.textContent='攻击范围：'+(showAttackRange?'开':'关');
  debugAiBtn.textContent='敌人AI：'+(enemyAiEnabled?'开':'停');
  debugMapColliderBtn.textContent='地形碰撞：'+(showMapColliders?'开':'关');
  debugSpawnBtn.textContent='出生区：'+(showSpawnZones?'开':'关');
  debugCameraBtn.textContent='Camera：'+(showCameraDebug?'开':'关');
  if(debugFlightBtn){debugFlightBtn.textContent='自由飞行：'+(debugFlightMode?'开':'关');debugFlightBtn.classList.toggle('is-active',debugFlightMode);}
  const renderer=window.PaperchalkRenderer;
  const requested=renderer?.requested||'auto';
  debugRendererAutoBtn?.classList.toggle('is-active',requested==='auto');
  debugRendererGpuBtn?.classList.toggle('is-active',requested==='pixi');
  debugRendererDomBtn?.classList.toggle('is-active',requested==='dom');
}
function writeDebugOutput(message){
  debugOutput.textContent=String(message);
  debugOutput.scrollTop=debugOutput.scrollHeight;
}
function openDebugPanel(){
  if(!document.getElementById('uiShell').classList.contains('is-hidden'))return false;
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  debugPanel.classList.add('is-open');
  debugPanel.setAttribute('aria-hidden','false');
  debugToggleBtn.setAttribute('aria-expanded','true');
  updateDebugStatus();
  updateCombatDebugButtons();
  renderCombatDebug();
  return true;
}
function closeDebugPanel({focus=true}={}){
  if(!debugIsOpen())return false;
  debugPanel.classList.remove('is-open');
  debugPanel.setAttribute('aria-hidden','true');
  debugToggleBtn.setAttribute('aria-expanded','false');
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  if(focus)debugToggleBtn.focus({preventScroll:true});
  return true;
}
function toggleDebugPanel(){
  return debugIsOpen()?closeDebugPanel():openDebugPanel();
}

function setDebugFlightMode(enabled){
  debugFlightMode=!!enabled;
  keyboardFlightUp=keyboardFlightDown=false;
  mobileFlightUp=mobileFlightDown=false;
  joystickFlightAxisY=0;
  playerVy=0;jumpBufferTimer=0;coyoteTimer=0;
  if(sceneLocation==='interior'&&!debugFlightMode){
    playerY=interiorWalkSurfaceY(interiorPlayerWorldX);
    playerGrounded=true;
    updateInteriorCamera();
  }else{
    playerGrounded=debugFlightMode?false:playerY<=0;
  }
  if(playerCrouching)setPlayerCrouching(false,{force:true});
  actorEl.classList.toggle('is-flying',debugFlightMode);
  syncPlayerActionState(true);
  renderWorld(true);
  updateCombatDebugButtons();
  return debugFlightMode;
}
function toggleDebugFlightMode(){return setDebugFlightMode(!debugFlightMode)}
function runDebugCommand(rawCommand){
  const raw=String(rawCommand||'').trim();
  if(!raw)return '请输入命令。输入 help 查看帮助。';
  const parts=raw.split(/\s+/);
  const cmd=parts[0].toLowerCase();
  const arg=parts[1];

  if(cmd==='help'){
    return [
      'hp              查看血量',
      'hp 5            设为 5 血',
      'hp -1 / hp +1   扣血 / 回血',
      'hp max          满血',
      'damage 2        扣 2 血',
      'heal 2          回 2 血',
      'time 18:30      世界时间设为 18:30',
      'stage            测试纸片舞台翻景',
      'renderer auto    自动选择渲染器',
      'renderer pixi    Pixi/WebGL 动态实体',
      'renderer dom     DOM 安全后端',
      'pos             查看玩家/Camera坐标',
      'map             查看地图状态',
      'tp 3000         传送到地图 X=3000',
      'resetpos        回到村口出生点',
      'save            立即保存',
      'enemy reset      重置全地图敌人',
      'enemy near       把一号敌人放到附近',
      'hitbox           开/关战斗碰撞箱',
      'range            开/关攻击范围预览',
      'collider         开/关地形 collider',
      'spawn            开/关敌人出生区',
      'camera           开/关 Camera 调试',
      'fly              开/关自由飞行（四向）',
      'fly on / off     指定开启/关闭自由飞行',
      'ai               开/关敌人AI',
      'jump             跳跃测试',
      'attack           攻击测试',
      'clear           清空输出'
    ].join('\n');
  }
  if(cmd==='hp'){
    if(arg===undefined)return 'HP '+playerHp+' / '+PLAYER_MAX_HP;
    if(arg.toLowerCase()==='max'||arg.toLowerCase()==='full'){
      setPlayerHp(PLAYER_MAX_HP);
      return 'HP -> '+playerHp+' / '+PLAYER_MAX_HP;
    }
    if(/^[+-]\d+(?:\.\d+)?$/.test(arg)){
      const delta=Number(arg);
      setPlayerHp(playerHp+delta);
      return 'HP -> '+playerHp+' / '+PLAYER_MAX_HP;
    }
    const target=Number(arg);
    if(!Number.isFinite(target))return 'hp 参数无效。例：hp 5 / hp -1 / hp max';
    setPlayerHp(target);
    return 'HP -> '+playerHp+' / '+PLAYER_MAX_HP;
  }
  if(cmd==='damage'||cmd==='dmg'){
    const n=arg===undefined?1:Number(arg);
    if(!Number.isFinite(n)||n<0)return 'damage 参数必须是非负数字';
    damagePlayer(n);
    return 'HP -> '+playerHp+' / '+PLAYER_MAX_HP;
  }
  if(cmd==='heal'){
    const n=arg===undefined?1:Number(arg);
    if(!Number.isFinite(n)||n<0)return 'heal 参数必须是非负数字';
    healPlayer(n);
    return 'HP -> '+playerHp+' / '+PLAYER_MAX_HP;
  }
  if(cmd==='time'){
    let target;
    if(typeof arg==='string'&&/^\d{1,2}:\d{2}$/.test(arg)){
      const [h,m]=arg.split(':').map(Number);
      if(h>23||m>59)return 'time 格式：00:00–23:59';
      target=h*60+m;
    }else{
      const n=Number(arg);
      if(!Number.isFinite(n))return '用法：time 18:30';
      target=n;
    }
    setVisibleWorldClock(target);
    return '世界时间 -> '+formatWorldClock()+' '+worldTimeName();
  }
  if(cmd==='stage'||cmd==='fold'){triggerPaperSceneFold();return '纸片舞台换景测试。';}
  if(cmd==='renderer'){
    const target=String(arg||'auto').toLowerCase();
    if(!['auto','pixi','dom'].includes(target))return '用法：renderer auto|pixi|dom';
    if(!window.PaperchalkRenderer)return 'GPU 渲染器尚未加载';
    window.PaperchalkRenderer.setMode(target);
    return '渲染器请求 -> '+target;
  }
  if(cmd==='pos'||cmd==='position'){
    if(sceneLocation==='interior'){
      return 'interiorX='+interiorPlayerWorldX.toFixed(2)+' interiorY='+playerY.toFixed(2)+' cameraX='+interiorCameraX.toFixed(2)+' cameraY='+interiorCameraY.toFixed(2)+' screenX='+actorX.toFixed(2);
    }
    return 'playerX='+playerWorldX.toFixed(2)+' playerY='+playerY.toFixed(2)+' cameraX='+worldX.toFixed(2)+' cameraY='+playerY.toFixed(2)+' screenX='+actorX.toFixed(2);
  }
  if(cmd==='map'){
    return '世界图 '+WORLD_NODES.length+' 节点 / '+WORLD_ROUTES.length+' 道路 | 当前='+regionNameAt(playerWorldX)+' | edge='+worldZoneIndexAt(playerWorldX)+' | 已探索道路='+mapState.visitedRoutes.size;
  }
  if(cmd==='tp'||cmd==='teleport'){
    const x=Number(arg);
    if(!Number.isFinite(x))return '用法：tp 3000';
    teleportTo(x,{notice:'调试传送到 X='+Math.round(x)});
    return 'playerX -> '+playerWorldX.toFixed(1);
  }
  if(cmd==='resetpos'){
    teleportTo(MAP_SPAWN_X,{notice:'已回到 A村外道路村口'});
    saveWorldState();
    return '位置已重置：playerX='+MAP_SPAWN_X;
  }
  if(cmd==='save'){
    return saveWorldState()?'存档已写入。':'当前没有登录账号，无法保存。';
  }
  if(cmd==='enemy'){
    const sub=String(arg||'reset').toLowerCase();
    if(sub==='near'){placeEnemyNear();return '一号敌人已放到玩家前方。'}
    resetMapEnemies();return '全地图敌人已按各区域出生区重置。';
  }
  if(cmd==='hitbox')return '碰撞箱 -> '+(toggleHitboxes()?'开启':'关闭');
  if(cmd==='range')return '攻击范围预览 -> '+(toggleAttackRange()?'开启':'关闭');
  if(cmd==='collider')return '地形 collider -> '+(toggleMapColliders()?'开启':'关闭');
  if(cmd==='spawn')return '敌人出生区 -> '+(toggleSpawnZones()?'开启':'关闭');
  if(cmd==='camera')return 'Camera 调试 -> '+(toggleCameraDebug()?'开启':'关闭');
  if(cmd==='fly'||cmd==='flight'){
    const target=String(arg||'toggle').toLowerCase();
    const enabled=target==='on'?setDebugFlightMode(true):target==='off'?setDebugFlightMode(false):toggleDebugFlightMode();
    return '自由飞行模式 -> '+(enabled?'开启':'关闭');
  }
  if(cmd==='ai')return '敌人AI -> '+(toggleEnemyAi()?'开启':'暂停');
  if(cmd==='jump'){debugJump();return 'jump'}
  if(cmd==='attack'){debugAttack();return 'attack'}
  if(cmd==='clear'){
    debugOutput.textContent='';
    return '';
  }
  return '未知命令：'+cmd+'。输入 help 查看帮助。';
}
function executeDebugCommand(command){
  const message=runDebugCommand(command);
  if(message!=='')writeDebugOutput(message);
  updateDebugStatus();
  return message;
}
debugToggleBtn.addEventListener('click',toggleDebugPanel);
debugCloseBtn.addEventListener('click',()=>closeDebugPanel());
debugCommandForm.addEventListener('submit',e=>{
  e.preventDefault();
  executeDebugCommand(debugCommandInput.value);
  debugCommandInput.select();
});
debugPanel.querySelectorAll('[data-debug-action]').forEach(button=>{
  button.addEventListener('click',()=>{
    const action=button.dataset.debugAction;
    if(action==='damage1')damagePlayer(1);
    else if(action==='heal1')healPlayer(1);
    else if(action==='damage3')damagePlayer(3);
    else if(action==='zero')setPlayerHp(0);
    else if(action==='full')setPlayerHp(PLAYER_MAX_HP);
    else if(action==='hitboxes'){
      writeDebugOutput('碰撞箱 -> '+(toggleHitboxes()?'开启':'关闭'));
      updateDebugStatus();updateCombatDebugButtons();return;
    }else if(action==='attackRange'){
      writeDebugOutput('攻击范围预览 -> '+(toggleAttackRange()?'开启':'关闭'));
      updateDebugStatus();updateCombatDebugButtons();return;
    }else if(action==='enemyAI'){
      writeDebugOutput('敌人AI -> '+(toggleEnemyAi()?'开启':'暂停'));
      updateDebugStatus();updateCombatDebugButtons();return;
    }else if(action==='enemyNear'){
      placeEnemyNear();writeDebugOutput('敌人已放到玩家前方 210px。');
      updateDebugStatus();return;
    }else if(action==='enemyReset'){
      resetMapEnemies();writeDebugOutput('全地图敌人已按各区域出生区重置。');
      updateDebugStatus();return;
    }else if(action==='attackTest'){
      debugAttack();writeDebugOutput('执行一次攻击测试。');
      updateDebugStatus();return;
    }else if(action==='mapColliders'){
      writeDebugOutput('地形 collider -> '+(toggleMapColliders()?'开启':'关闭'));
      updateDebugStatus();return;
    }else if(action==='spawnZones'){
      writeDebugOutput('敌人出生区 -> '+(toggleSpawnZones()?'开启':'关闭'));
      updateDebugStatus();return;
    }else if(action==='cameraDebug'){
      writeDebugOutput('Camera 调试 -> '+(toggleCameraDebug()?'开启':'关闭'));
      updateDebugStatus();return;
    }else if(action==='flightMode'){
      writeDebugOutput('自由飞行模式 -> '+(toggleDebugFlightMode()?'开启':'关闭'));
      updateDebugStatus();updateCombatDebugButtons();return;
    }else if(action==='teleportStart'){
      teleportTo(MAP_SPAWN_X,{notice:'传送：A村村口'});writeDebugOutput('playerX -> '+playerWorldX);
      updateDebugStatus();return;
    }else if(action==='teleportMid'){
      teleportTo(3000,{notice:'传送：地图中段'});writeDebugOutput('playerX -> '+playerWorldX);
      updateDebugStatus();return;
    }else if(action==='teleportEnd'){
      teleportTo(MAP_WIDTH-1200,{notice:'传送：大世界远端'});writeDebugOutput('playerX -> '+playerWorldX);
      updateDebugStatus();return;
    }else if(action==='timeDawn'){
      setVisibleWorldClock(360);writeDebugOutput('时间 -> '+formatWorldClock()+' 日出');updateDebugStatus();return;
    }else if(action==='timeNoon'){
      setVisibleWorldClock(720);writeDebugOutput('时间 -> '+formatWorldClock()+' 正午');updateDebugStatus();return;
    }else if(action==='timeDusk'){
      setVisibleWorldClock(1080);writeDebugOutput('时间 -> '+formatWorldClock()+' 黄昏');updateDebugStatus();return;
    }else if(action==='timeNight'){
      setVisibleWorldClock(0);writeDebugOutput('时间 -> '+formatWorldClock()+' 深夜');updateDebugStatus();return;
    }else if(action==='stageFold'){
      triggerPaperSceneFold();writeDebugOutput('执行纸片舞台翻景。');return;
    }else if(action==='rendererAuto'||action==='rendererPixi'||action==='rendererDom'){
      const mode=action==='rendererPixi'?'pixi':action==='rendererDom'?'dom':'auto';
      if(!window.PaperchalkRenderer){writeDebugOutput('GPU 渲染器尚未加载');return}
      window.PaperchalkRenderer.setMode(mode).then(actual=>{
        writeDebugOutput('渲染器 -> '+actual+'（请求 '+mode+'）');
        updateDebugStatus();updateCombatDebugButtons();
      });
      return;
    }
    updateDebugStatus();
    writeDebugOutput('HP -> '+playerHp+' / '+PLAYER_MAX_HP);
  });
});
addEventListener('keydown',e=>{
  if(e.code==='Escape'&&debugIsOpen()){
    e.preventDefault();
    closeDebugPanel();
  }
});
window.addEventListener('paperchalk-renderer-change',()=>{
  updateCombatDebugButtons();
  if(debugIsOpen())updateDebugStatus();
});
window.PaperchalkScene={
  get location(){return sceneLocation},
  get transitioning(){return sceneTransitionBusy},
  enter:enterApartment,
  exit:exitApartment,
  get doorScreenX(){return apartmentDoorScreenX()},
  get interiorDoorScreenX(){return interiorExitX()},
  get interiorDoorAnchorX(){return interiorDoorAnchorX},
  get interiorSceneShiftX(){return interiorSceneShiftX},
  get playerScreenX(){return actorX},
  get playerScreenAnchorX(){return playerScreenAnchorX},
  get centerX(){return VIEW_W*.5},
  get lastDoorAnchorErrorX(){return lastSceneDoorAnchorErrorX},
  get interiorDoorGroundY(){return MAP_GROUND_SCREEN_Y-interiorCameraY},
  get interiorX(){return interiorPlayerWorldX},
  get interiorY(){return playerY},
  get interiorCamera(){return {x:interiorCameraX,y:interiorCameraY}},
  get interiorMap(){return {
    width:INTERIOR_MAP_WIDTH,
    height:INTERIOR_MAP_HEIGHT,
    leftWall:INTERIOR_WALL_THICKNESS,
    rightWall:INTERIOR_MAP_WIDTH-INTERIOR_WALL_THICKNESS,
    secondFloorY:INTERIOR_SECOND_FLOOR_Y,
    doorX:INTERIOR_DOOR_X,
    stairs:{...INTERIOR_STAIRS}
  }},
  get depthLayers(){return {far:3,mid:4,player:5,near:6}}
};
window.PaperchalkDebug={
  open:openDebugPanel,
  close:closeDebugPanel,
  toggle:toggleDebugPanel,
  run:executeDebugCommand,
  get flight(){return debugFlightMode},
  setFlight(value){return setDebugFlightMode(value)},
  perf(){return {
    fps:perfFps,
    frameMs:perfFrameMs,
    longTasks:perfLongTasks,
    worstLongTaskMs:perfWorstLongTask,
    lastLongTaskAt:perfLastLongTaskAt,
    roadTiles:roadTrack.children.length,
    propNodes:rearTrack.children.length+frontTrack.children.length,
    visualOriginX,
    mapVisualSyncCount,
    mapVisualCreateCount,
    pooledMapNodes:mapVisualPools.terrain.size+mapVisualPools.object.size+mapVisualPools.landmark.size,
    deferredAssets:{
      backpack:deferredImageReady(backpackArt),
      paperBall:deferredImageReady(paperFxBall),
      paperUnfold:deferredImageReady(paperFxUnfold)
    }
  }}
};

let routeTransitionBusy=false;
let deadEndNoticeAt=0;

function directionLabelFromNode(nodeId,route){
  const here=WORLD_NODE_BY_ID.get(nodeId);
  const there=otherNodeOfRoute(route,nodeId);
  if(!here||!there)return '前往';
  const dx=there.x-here.x,dy=there.y-here.y;
  if(Math.abs(dy)>Math.abs(dx)*.62)return dy<0?'北上':'南下';
  return dx>=0?'东行':'西行';
}
function routeOrientationFor(route){
  return route.index===orientationRouteIndex?currentRouteOrientation:1;
}
function routeBoundaryInfo(x=playerWorldX){
  const route=routeForWorldX(x),base=routeBaseX(route.index);
  const orientation=routeOrientationFor(route);
  return {
    route,base,orientation,
    left:base+ROUTE_ENDPOINT_PAD,
    right:base+WORLD_ZONE_WIDTH-ROUTE_ENDPOINT_PAD,
    leftNodeId:orientation>0?route.from:route.to,
    rightNodeId:orientation>0?route.to:route.from
  };
}
function setRouteEntryOrientation(route,nodeId,moveDir){
  orientationRouteIndex=route.index;
  if(moveDir>=0){
    currentRouteOrientation=route.from===nodeId?1:-1;
  }else{
    currentRouteOrientation=route.to===nodeId?1:-1;
  }
}
function physicallyEnterRoute(route,nodeId,laneY,moveDir){
  if(routeTransitionBusy)return false;
  routeTransitionBusy=true;

  const oldSceneryCamera=worldX+sceneryOffsetX;
  setRouteEntryOrientation(route,nodeId,moveDir);
  const base=routeBaseX(route.index);
  playerWorldX=moveDir>=0
    ? base+ROUTE_ENDPOINT_PAD+30
    : base+WORLD_ZONE_WIDTH-ROUTE_ENDPOINT_PAD-30;
  playerY=laneY;
  playerVy=0;
  playerGrounded=true;
  coyoteTimer=COYOTE_TIME;
  jumpBufferTimer=0;
  setFacing(moveDir>=0?1:-1);

  mapState.visitedRoutes.add(route.index);
  mapState.visitedNodes.add(nodeId);
  const other=otherNodeOfRoute(route,nodeId);
  if(other)mapState.visitedNodes.add(other.id);
  updateMapInteractions._zone=route.index;

  applyCurrentRouteTheme(true);
  updateCamera();
  sceneryOffsetX=oldSceneryCamera-worldX;
  renderWorld();
  saveWorldState();

  showMapNotice(route.name,700);
  routeTransitionBusy=false;
  return true;
}
function tryLeaveCurrentRoute(side,moveDir){
  if(routeTransitionBusy)return false;
  const bounds=routeBoundaryInfo();
  const nodeId=side==='left'?bounds.leftNodeId:bounds.rightNodeId;
  const assignments=forkAssignments(bounds.route.index,nodeId);
  mapState.visitedNodes.add(nodeId);

  if(assignments.length===0){
    const now=performance.now();
    if(now-deadEndNoticeAt>1100){
      deadEndNoticeAt=now;
      showMapNotice((WORLD_NODE_BY_ID.get(nodeId)?.name||'道路尽头')+' · 前方没有路，直接掉头',1000);
    }
    return false;
  }

  let chosen=assignments[0];
  if(assignments.length>1){
    // No popup, no pause: physical Y position is the fork.
    // Ground=low route, shelf≈72px=middle route, airborne high gate≈142px=upper route.
    chosen=assignments.reduce((best,a)=>
      Math.abs(playerY-a.laneY)<Math.abs(playerY-best.laneY)?a:best
    ,assignments[0]);
  }
  return physicallyEnterRoute(chosen.route,nodeId,chosen.laneY,moveDir);
}

function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function playerBodyHeight(){return playerCrouching?PLAYER_BODY.crouchH:PLAYER_BODY.standH}
function playerHurtHeight(){return playerCrouching?PLAYER_HURT.crouchH:PLAYER_HURT.standH}
function playerWorldPos(){return {x:playerWorldX,y:playerY}}
function getPlayerHurtbox(){const p=playerWorldPos();return{x:p.x+PLAYER_HURT.ox,y:p.y+PLAYER_HURT.oy,w:PLAYER_HURT.w,h:playerHurtHeight()}}
function getPlayerAttackBox(){const p=playerWorldPos();return facing>0?{x:p.x+PLAYER_ATTACK.forward,y:p.y+PLAYER_ATTACK.oy,w:PLAYER_ATTACK.w,h:PLAYER_ATTACK.h}:{x:p.x-PLAYER_ATTACK.forward-PLAYER_ATTACK.w,y:p.y+PLAYER_ATTACK.oy,w:PLAYER_ATTACK.w,h:PLAYER_ATTACK.h}}
function activeSolidRects(centerX=playerWorldX,radius=900){
  const minX=centerX-radius,maxX=centerX+radius;
  const first=Math.floor(minX/SOLID_BUCKET_SIZE),lastBucket=Math.floor(maxX/SOLID_BUCKET_SIZE);
  const out=solidQueryBuffer;out.length=0;
  const token=++solidQueryToken;
  for(let i=first;i<=lastBucket;i++){
    const bucket=solidBuckets.get(i);
    if(!bucket)continue;
    for(const r of bucket){
      if(r._solidQueryToken===token||r.x+r.w<=minX||r.x>=maxX)continue;
      r._solidQueryToken=token;
      if(r.breakable&&mapState.broken.has(r.id))continue;
      out.push(r);
    }
  }
  return out;
}
function horizontalOverlapAt(centerX,halfW,rect){return centerX+halfW>rect.x&&centerX-halfW<rect.x+rect.w}
function canStandUp(){
  const body={x:playerWorldX-PLAYER_BODY.halfW,y:playerY,w:PLAYER_BODY.halfW*2,h:PLAYER_BODY.standH};
  for(const r of activeSolidRects()){
    if(r.oneWay)continue;
    if(body.x+body.w<=r.x+1||body.x>=r.x+r.w-1)continue;
    if(body.y+body.h<=r.y+1||body.y>=r.y+r.h-1)continue;
    return false;
  }
  return true;
}
function setPlayerCrouching(active,{force=false}={}){
  active=!!active;
  if(active){
    if(!force&&(!playerGrounded||playerAttackTimer>0))return false;
    if(playerCrouching)return true;
    playerCrouching=true;
    actorEl.classList.add('is-crouching');
    crouchBtn?.classList.add('is-active');
    syncPlayerActionState();
    return true;
  }
  if(!playerCrouching)return true;
  if(!force&&!canStandUp())return false;
  playerCrouching=false;
  actorEl.classList.remove('is-crouching');
  crouchBtn?.classList.remove('is-active');
  syncPlayerActionState();
  return true;
}
function updateCrouchState(){
  const requested=keyboardCrouch||mobileCrouch;
  if(requested&&playerGrounded&&!playerAttackTimer)setPlayerCrouching(true);
  else if(!requested&&playerCrouching)setPlayerCrouching(false);
  if(!playerGrounded&&playerCrouching)setPlayerCrouching(false,{force:true});
}
function resetPlayerPoseState(){
  cancelPlayerTurnFlip({snap:true});
  keyboardCrouch=false;
  mobileCrouch=false;
  playerCrouching=false;
  lastMovingState=false;
  actorEl.classList.remove('is-crouching','is-jumping','is-moving');
  crouchBtn?.classList.remove('is-active');
  setPlayerActionState('idle',true);
}
function movePlayerHorizontal(dx){
  if(!dx)return 0;
  const oldX=playerWorldX;
  // Free flight is true 2D world traversal. It must not snap to road forks or
  // reset Y when crossing the 6000px route-strip boundaries.
  if(debugFlightMode&&sceneLocation==='outside'){
    playerWorldX=clamp(oldX+dx,PLAYER_BODY.halfW,MAP_WIDTH-PLAYER_BODY.halfW);
    return playerWorldX-oldX;
  }
  const bounds=routeBoundaryInfo(oldX);
  const requested=oldX+dx;
  if(requested<bounds.left&&dx<0){
    playerWorldX=bounds.left;
    const crossed=tryLeaveCurrentRoute('left',-1);
    return crossed?dx:playerWorldX-oldX;
  }
  if(requested>bounds.right&&dx>0){
    playerWorldX=bounds.right;
    const crossed=tryLeaveCurrentRoute('right',1);
    return crossed?dx:playerWorldX-oldX;
  }
  let nextX=clamp(requested,bounds.left,bounds.right);
  const oldBody={x:oldX-PLAYER_BODY.halfW,y:playerY,w:PLAYER_BODY.halfW*2,h:playerBodyHeight()};
  const proposed={x:nextX-PLAYER_BODY.halfW,y:playerY,w:PLAYER_BODY.halfW*2,h:playerBodyHeight()};
  for(const r of activeSolidRects()){
    if(r.oneWay)continue;
    const vertical=proposed.y<r.y+r.h-1&&proposed.y+proposed.h>r.y+1;
    if(!vertical)continue;
    const hitRight=dx>0&&oldBody.x+oldBody.w<=r.x+2&&proposed.x+proposed.w>r.x;
    const hitLeft=dx<0&&oldBody.x>=r.x+r.w-2&&proposed.x<r.x+r.w;
    if(!hitRight&&!hitLeft)continue;

    /* Forgiving ledge assist: while rising, reaching the upper lip snaps onto it.
       This prevents mobile players from getting hard-stuck on otherwise reachable terrain. */
    const top=r.y+r.h;
    const riseToTop=top-playerY;
    if(!playerGrounded&&playerVy>0&&riseToTop>0&&riseToTop<=AUTO_MANTLE_WINDOW){
      playerY=top;playerVy=0;playerGrounded=true;coyoteTimer=COYOTE_TIME;
      actorEl.classList.remove('is-jumping');
      continue;
    }
    if(hitRight)nextX=Math.min(nextX,r.x-PLAYER_BODY.halfW);
    if(hitLeft)nextX=Math.max(nextX,r.x+r.w+PLAYER_BODY.halfW);
  }
  playerWorldX=clamp(nextX,bounds.left,bounds.right);
  return playerWorldX-oldX;
}
function supportAt(x,y,tolerance=3){
  let support=Math.abs(y)<=tolerance?0:null;
  for(const r of activeSolidRects()){
    const top=r.y+r.h;
    if(horizontalOverlapAt(x,PLAYER_BODY.halfW-3,r)&&Math.abs(y-top)<=tolerance){
      if(support===null||top>support)support=top;
    }
  }
  return support;
}
function performJump(){
  if(playerCrouching){
    playerCrouching=false;
    actorEl.classList.remove('is-crouching');
    crouchBtn?.classList.remove('is-active');
  }
  playerVy=JUMP_SPEED;
  playerGrounded=false;
  coyoteTimer=0;
  jumpBufferTimer=0;
  actorEl.classList.add('is-jumping');
  syncPlayerActionState();
}
function updatePlayerVertical(dt,interactive){
  if(!interactive)return;
  jumpBufferTimer=Math.max(0,jumpBufferTimer-dt);
  if(playerGrounded)coyoteTimer=COYOTE_TIME;
  else coyoteTimer=Math.max(0,coyoteTimer-dt);

  if(jumpBufferTimer>0&&(playerGrounded||coyoteTimer>0))performJump();

  if(playerGrounded){
    const support=supportAt(playerWorldX,playerY,5);
    if(support===null){playerGrounded=false;playerVy=0}
    else{playerY=support;return}
  }
  const oldY=playerY;
  playerVy-=GRAVITY*dt;
  let nextY=playerY+playerVy*dt;
  const solids=activeSolidRects();
  if(playerVy<=0){
    let landing=null;
    for(const r of solids){
      const top=r.y+r.h;
      if(!horizontalOverlapAt(playerWorldX,PLAYER_BODY.halfW-4,r))continue;
      if(oldY>=top-2&&nextY<=top){
        if(landing===null||top>landing)landing=top;
      }
    }
    if(oldY>=0&&nextY<=0)landing=Math.max(0,landing??0);
    if(landing!==null){
      playerY=landing;playerVy=0;playerGrounded=true;coyoteTimer=COYOTE_TIME;actorEl.classList.remove('is-jumping');
      if(jumpBufferTimer>0)performJump();
      return;
    }
  }else{
    const oldHead=oldY+playerBodyHeight();
    const nextHead=nextY+playerBodyHeight();
    for(const r of solids){
      if(r.oneWay)continue;
      if(!horizontalOverlapAt(playerWorldX,PLAYER_BODY.halfW-4,r))continue;
      if(oldHead<=r.y+2&&nextHead>=r.y){
        nextY=r.y-playerBodyHeight();playerVy=0;break;
      }
    }
  }
  playerY=Math.max(-80,nextY);
  if(playerY<-60)teleportTo(MAP_SPAWN_X,{notice:'跌落后回到村口'});
}
let lastAppliedRouteIndex=-1;
function applyCurrentRouteTheme(force=false){
  const route=routeForWorldX(playerWorldX);
  if(!route)return;
  if(route.index!==orientationRouteIndex){
    orientationRouteIndex=route.index;
    currentRouteOrientation=1;
  }
  const changed=route.index!==lastAppliedRouteIndex;
  if(force||changed){
    const hadScene=lastAppliedRouteIndex>=0;
    lastAppliedRouteIndex=route.index;
    const biome=route.biome||'meadow';
    worldEl.dataset.biome=biome;
    mapState.visitedRoutes.add(route.index);
    if(hadScene&&changed)triggerPaperSceneFold(biome);
    else if(!worldEl.classList.contains('scene-shifting'))paperBackdrop.dataset.scene=biome;
  }
}
function updateCamera(){
  applyCurrentRouteTheme();
  const viewW=VIEW_W;
  const maxCamera=Math.max(0,MAP_WIDTH-viewW);
  worldX=clamp(playerWorldX-playerScreenAnchorX,0,maxCamera);
  actorX=playerScreenAnchorX;
}
function jumpPlayer(force=false){
  if(!force&&!worldInteractive())return false;
  if(playerCrouching){
    if(!force&&!canStandUp())return false;
    setPlayerCrouching(false,{force:true});
  }
  jumpBufferTimer=JUMP_BUFFER_TIME;
  if(force||playerGrounded||coyoteTimer>0){performJump();return true}
  return true;
}
function startPlayerAttack(force=false){
  if((!force&&!worldInteractive())||playerAttackCooldown>0||playerAttackTimer>0)return false;
  playerAttackTimer=.30;playerAttackCooldown=.38;playerAttackHits.clear();actorEl.classList.add('is-attacking');return true;
}
function debugJump(){return jumpPlayer(true)}
function debugAttack(){return startPlayerAttack(true)}
function setCrouchControl(active=true){
  mobileCrouch=!!active;
  updateCrouchState();
  renderWorld(true);
  return playerCrouching;
}
function getEnemyHurtbox(e){return{x:e.x-31,y:10,w:62,h:108}}
function getEnemyAttackBox(e){return e.facing>0?{x:e.x+20,y:24,w:74,h:72}:{x:e.x-94,y:24,w:74,h:72}}
function setEnemyVisual(e,force=false){
  const visible=e.x>=worldX-320&&e.x<=worldX+VIEW_W+320;
  if(force||e._visible!==visible){
    e._visible=visible;
    e.el.style.display=visible?'':'none';
  }
  if(!visible)return;
  if(force||e._renderX!==e.x||e._renderOrigin!==visualOriginX){
    e._renderX=e.x;
    e._renderOrigin=visualOriginX;
    e.el.style.setProperty('--enemy-x',(e.x-visualOriginX).toFixed(2)+'px');
  }
  if(force||e._renderFacing!==e.facing){e._renderFacing=e.facing;e.el.style.setProperty('--enemy-facing',e.facing)}
  if(force||e._renderHp!==e.hp){e._renderHp=e.hp;e.healthEl.style.width=(e.hp/ENEMY_MAX_HP*100)+'%'}
  if(force||e._renderAlive!==e.alive){e._renderAlive=e.alive;e.el.classList.toggle('is-dead',!e.alive)}
}
function resetEnemyState(e,spawn){
  e.x=spawn.x;e.spawnX=spawn.x;e.patrolMin=spawn.patrolMin;e.patrolMax=spawn.patrolMax;
  e.hp=ENEMY_MAX_HP;e.alive=true;e.facing=-1;e.state='patrol';e.attackTimer=0;e.attackCooldown=.7;e.hitstun=0;e.spawned=true;
  e.account=typeof getSession==='function'?(getSession()?.account||null):null;e.patrolDir=-1;
  e.el.classList.remove('is-dead','is-hit','is-attacking','is-moving');if(!pixiDynamicActive())setEnemyVisual(e);
}
function resetMapEnemies(){
  enemies.forEach((e,i)=>{
    const spawn=ENEMY_SPAWNS[i];
    if(spawn)resetEnemyState(e,spawn);
  });
}
function resetEnemy(offset=360){
  const x=clamp(playerWorldX+offset,80,MAP_WIDTH-80);
  resetEnemyState(enemy,{x,patrolMin:Math.max(40,x-125),patrolMax:Math.min(MAP_WIDTH-40,x+125)});
  renderWorld();
}
function placeEnemyNear(distance=210){resetEnemy(distance);enemy.attackCooldown=.55;renderWorld()}
function damageEnemy(e,amount=1,knockDir=facing){
  if(!e.alive||e.hitstun>0)return false;
  e.hp=Math.max(0,e.hp-amount);e.hitstun=.22;e.el.classList.add('is-hit');
  setTimeout(()=>e.el.classList.remove('is-hit'),220);
  e.x=clamp(e.x+knockDir*34,40,MAP_WIDTH-40);
  if(e.hp<=0){e.alive=false;e.state='dead';e.el.classList.remove('is-moving','is-attacking');e.el.classList.add('is-dead')}
  if(!pixiDynamicActive())setEnemyVisual(e);return true;
}
function enemyCanMove(e,dx){
  const old={x:e.x-31,y:0,w:62,h:108};
  const next={x:e.x+dx-31,y:0,w:62,h:108};
  for(const r of activeSolidRects(e.x,520)){
    if(r.oneWay)continue;
    const vertical=next.y<r.y+r.h-1&&next.y+next.h>r.y+1;
    if(!vertical)continue;
    if(dx>0&&old.x+old.w<=r.x+2&&next.x+next.w>r.x)return false;
    if(dx<0&&old.x>=r.x+r.w-2&&next.x<r.x+r.w)return false;
  }
  return true;
}
function moveEnemy(e,dx){
  if(enemyCanMove(e,dx)){e.x=clamp(e.x+dx,35,MAP_WIDTH-35);return true}
  return false;
}
function updateEnemy(e,dt,interactive){
  if(!e.spawned||!e.alive)return;
  e.attackCooldown=Math.max(0,e.attackCooldown-dt);e.hitstun=Math.max(0,e.hitstun-dt);
  if(!interactive||e.hitstun>0)return;
  if(!enemyAiEnabled){e.state='frozen';e.el.classList.remove('is-moving','is-attacking');return}
  const dx=playerWorldX-e.x,dist=Math.abs(dx);
  if(dist>1650){
    if(e.state!=='sleep'){
      e.state='sleep';
      e.el.classList.remove('is-moving','is-attacking');
    }
    return;
  }
  e.facing=dx>=0?1:-1;
  if(e.attackTimer>0){
    e.state='attack';e.attackTimer=Math.max(0,e.attackTimer-dt);
    if(e.attackTimer<=0){e.el.classList.remove('is-attacking');e.attackCooldown=.9}
    else if(e.attackTimer<.20&&e.attackTimer>.08&&playerInvuln<=0&&rectsOverlap(getEnemyAttackBox(e),getPlayerHurtbox())){
      damagePlayer(1);playerInvuln=.72;
      if(!pixiDynamicActive())actorEl.animate([{filter:'brightness(1.7)'},{filter:'brightness(1)'}],{duration:220});
    }
  }else if(dist<84&&e.attackCooldown<=0){
    e.state='attack';e.attackTimer=.34;e.el.classList.remove('is-moving');e.el.classList.add('is-attacking');
  }else if(dist<=700&&dist>74){
    e.state='chase';e.el.classList.add('is-moving');
    const step=Math.sign(dx)*Math.min(118*dt,Math.max(0,dist-72));
    if(!moveEnemy(e,step)){e.state='blocked';e.el.classList.remove('is-moving')}
  }else{
    e.state='patrol';e.el.classList.add('is-moving');
    if(e.x<=e.patrolMin)e.patrolDir=1;
    if(e.x>=e.patrolMax)e.patrolDir=-1;
    e.facing=e.patrolDir;
    if(!moveEnemy(e,e.patrolDir*48*dt))e.patrolDir*=-1;
  }
}
function breakMapObject(id){
  const obj=MAP_OBJECTS.find(o=>o.id===id&&o.breakable);
  if(!obj||mapState.broken.has(id))return false;
  mapState.broken.add(id);markRuntimeMapChanged();
  const el=mapObjectTrack.querySelector('[data-map-id="'+id+'"]');if(el)el.classList.add('is-broken');
  const dbg=mapDebugTrack.querySelector('[data-debug-for="'+id+'"]');if(dbg)dbg.style.display='none';
  const dependent=MAP_PICKUPS.filter(p=>p.requiresBroken===id);
  dependent.forEach(p=>{const pe=mapObjectTrack.querySelector('[data-pickup-id="'+p.id+'"]');if(pe)pe.classList.remove('is-collected')});
  showMapNotice('木箱被打碎了');
  saveWorldState();return true;
}
function addInventoryItem(item){
  const stack=inventoryItems.find(v=>v&&v.id===item.id);
  if(stack){stack.count=(stack.count||1)+(item.count||1);renderInventory();return true}
  const slot=inventoryItems.findIndex(v=>!v);
  if(slot<0){showMapNotice('背包已满');return false}
  inventoryItems[slot]={...item};renderInventory();return true;
}
function collectPickup(p){
  if(mapState.collected.has(p.id))return false;
  const item=p.type==='herb'?{id:'rough-herb',name:'粗纸药草',desc:'揉碎后能恢复 2 点生命。',count:1,weight:.1,consumable:true,action:'heal',heal:2}:null;
  if(!item||!addInventoryItem(item))return false;
  mapState.collected.add(p.id);markRuntimeMapChanged();
  const el=mapObjectTrack.querySelector('[data-pickup-id="'+p.id+'"]');if(el)el.classList.add('is-collected');
  showMapNotice('拾取：'+item.name);saveWorldState();return true;
}
let dialogueState={
  open:false,closing:false,npc:null,phase:'',choiceIndex:-1
};
let dialogueCloseTimer=0;
let dialogueOpeningTimer=0;

function dialogueIsOpen(){return dialogueState.open||dialogueState.closing}
function playerDialogueName(){
  const session=typeof getSession==='function'?getSession():null;
  return session?.displayName||'旅人';
}
function setDialogueBubble(side,text,{continueHint=true}={}){
  dialogueStage.classList.toggle('speaker-player',side==='player');
  dialogueStage.classList.toggle('speaker-npc',side==='npc');
  const mine=side==='player'?dialoguePlayerBubble:dialogueNpcBubble;
  const other=side==='player'?dialogueNpcBubble:dialoguePlayerBubble;
  other.classList.remove('is-visible');
  other.textContent='';
  mine.innerHTML='';
  const span=document.createElement('span');
  span.textContent=text;
  mine.appendChild(span);
  if(continueHint){
    const small=document.createElement('small');
    small.textContent='轻触继续';
    mine.appendChild(small);
  }
  mine.classList.add('is-visible');
}
function clearDialogueBubbles(){
  dialoguePlayerBubble.classList.remove('is-visible');
  dialogueNpcBubble.classList.remove('is-visible');
  dialoguePlayerBubble.textContent='';
  dialogueNpcBubble.textContent='';
}
function showDialogueOpening(){
  const npc=dialogueState.npc;
  if(!npc)return;
  dialogueState.phase='opening';
  dialogueStage.classList.remove('is-choice');
  worldEl.classList.remove('dialogue-choice-camera');
  dialogueChoices.innerHTML='';
  setDialogueBubble('npc',npc.dialogue?.opening||npc.text||'……');
}
function showDialogueChoices(){
  const npc=dialogueState.npc;
  const choices=npc?.dialogue?.choices||[];
  if(!choices.length){closeDialogue();return}
  dialogueState.phase='choice';
  clearDialogueBubbles();
  dialogueChoices.innerHTML='';
  choices.slice(0,3).forEach((choice,index)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='dialogue-choice';
    btn.dataset.choiceIndex=String(index);
    btn.textContent=choice.text;
    btn.addEventListener('click',e=>{e.stopPropagation();selectDialogueChoice(index)});
    dialogueChoices.appendChild(btn);
  });
  dialogueStage.classList.add('is-choice');
}
function selectDialogueChoice(index){
  const npc=dialogueState.npc;
  const choice=npc?.dialogue?.choices?.[index];
  if(!choice||dialogueState.phase!=='choice')return false;
  dialogueState.choiceIndex=index;
  dialogueState.phase='player-line';
  dialogueStage.classList.remove('is-choice');
  worldEl.classList.remove('dialogue-choice-camera');
  dialogueChoices.innerHTML='';
  setDialogueBubble('player',choice.text);
  return true;
}
function advanceDialogue(){
  if(!dialogueState.open||dialogueState.closing)return false;
  const npc=dialogueState.npc;
  if(dialogueState.phase==='opening'){
    showDialogueChoices();
    return true;
  }
  if(dialogueState.phase==='player-line'){
    const choice=npc?.dialogue?.choices?.[dialogueState.choiceIndex];
    dialogueState.phase='npc-reply';
    setDialogueBubble('npc',choice?.reply||'嗯。');
    return true;
  }
  if(dialogueState.phase==='npc-reply'){
    closeDialogue();
    return true;
  }
  return false;
}
function openDialogue(npc){
  if(!npc||dialogueIsOpen())return false;
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  closeDebugPanel({focus:false});
  clearTimeout(dialogueCloseTimer);
  clearTimeout(dialogueOpeningTimer);
  dialogueState={open:true,closing:false,npc,phase:'entering',choiceIndex:-1};
  dialoguePlayerName.textContent=playerDialogueName();
  dialogueNpcName.textContent=npc.name||'旅人';
  const npcPortraitSrc=npc.dialoguePortrait||npc.sprite||'';
  if(npcPortraitSrc&&dialogueNpcArt.getAttribute('src')!==npcPortraitSrc)dialogueNpcArt.src=npcPortraitSrc;
  dialogueStage.classList.remove('is-closing','is-choice','is-opening','is-entering','speaker-player','speaker-npc');
  dialogueStage.dataset.portrait=npc.portrait||'paper';
  worldEl.classList.remove('dialogue-choice-camera');
  dialogueStage.classList.add('is-open','is-opening');
  dialogueStage.setAttribute('aria-hidden','false');
  worldEl.classList.add('dialogue-active');
  clearDialogueBubbles();
  showDialogueOpening();
  dialogueOpeningTimer=setTimeout(()=>{
    if(dialogueState.open)dialogueStage.classList.remove('is-opening');
  },940);
  return true;
}
function finalizeDialogueClose(){
  dialogueStage.classList.remove('is-open','is-choice','is-closing','is-opening','is-entering','speaker-player','speaker-npc');
  dialogueStage.setAttribute('aria-hidden','true');
  worldEl.classList.remove('dialogue-active');
  dialogueState={open:false,closing:false,npc:null,phase:'',choiceIndex:-1};
}
function closeDialogue({immediate=false}={}){
  if(!dialogueIsOpen())return false;
  clearTimeout(dialogueCloseTimer);
  clearTimeout(dialogueOpeningTimer);
  worldEl.classList.remove('dialogue-choice-camera');
  dialogueStage.classList.remove('is-opening','is-entering');
  if(immediate){
    finalizeDialogueClose();
    clearDialogueBubbles();
    dialogueChoices.innerHTML='';
    return true;
  }
  if(dialogueState.closing)return true;
  dialogueState.closing=true;dialogueState.open=false;
  dialogueStage.classList.remove('is-choice');
  dialogueStage.classList.add('is-closing');
  clearDialogueBubbles();
  dialogueChoices.innerHTML='';

  let finished=false;
  const finish=()=>{
    if(finished)return;
    finished=true;
    clearTimeout(dialogueCloseTimer);
    dialogueNpcPortrait.removeEventListener('animationend',onAnimationEnd);
    finalizeDialogueClose();
  };
  const onAnimationEnd=e=>{
    if(e.target===dialogueNpcPortrait&&e.animationName==='puppetNpcArcOut')finish();
  };
  dialogueNpcPortrait.addEventListener('animationend',onAnimationEnd);
  dialogueCloseTimer=setTimeout(finish,1100); // accessibility/browser fallback only
  return true;
}
dialogueStage.addEventListener('pointerup',e=>{
  if(!dialogueState.open||dialogueState.closing)return;
  if(e.target.closest('#dialogueSkip,.dialogue-choice'))return;
  if(dialogueState.phase==='choice')return;
  e.preventDefault();
  advanceDialogue();
});
dialogueSkip.addEventListener('click',e=>{e.stopPropagation();closeDialogue()});

function nearbyNpc(maxDistance=92){
  let best=null,bestD=Infinity;
  for(const n of MAP_NPCS){
    const d=Math.abs(playerWorldX-n.x);
    if(d<bestD&&d<=maxDistance&&playerY<80){best=n;bestD=d}
  }
  return best;
}
function updateNpcPrompt(){
  const nearNpc=sceneLocation==='outside'?nearbyNpc():null;
  const nearDoor=nearbyApartmentDoor();
  const nearExit=nearbyInteriorExit();
  const nextId=nearNpc?.id||null;
  if(nextId!==lastNearNpcId){
    if(lastNearNpcId)mapNpcEls.get(lastNearNpcId)?.classList.remove('is-near');
    if(nextId&&!nearDoor)mapNpcEls.get(nextId)?.classList.add('is-near');
    lastNearNpcId=nextId;
  }
  const active=nearDoor||nearExit||!!nearNpc;
  interactBtn.disabled=!active;
  interactBtn.style.opacity=active?'1':'.45';
  interactBtn.textContent=nearDoor?'开门':nearExit?'出门':'聊';
  renderDoorPrompt();
  return nearDoor?{kind:'door'}:nearExit?{kind:'exit'}:nearNpc;
}
function interactWithNpc(){
  if(sceneTransitionBusy)return false;
  if(sceneLocation==='interior'){
    if(nearbyInteriorExit())return exitApartment();
    showMapNotice('走到门边可以出去');
    return false;
  }
  if(nearbyApartmentDoor())return enterApartment();
  const npc=nearbyNpc();
  if(!npc){showMapNotice('附近没有可以交互的对象');return false}
  return openDialogue(npc);
}
function updateMapInteractions(){
  updateNpcPrompt();
  for(const p of MAP_PICKUPS){
    if(mapState.collected.has(p.id)||(p.requiresBroken&&!mapState.broken.has(p.requiresBroken)))continue;
    if(Math.abs(playerWorldX-p.x)<42&&Math.abs(playerY-p.y)<70)collectPickup(p);
  }
  const zone=worldZoneIndexAt(playerWorldX);
  if(updateMapInteractions._zone!==zone){
    const previous=updateMapInteractions._zone;
    updateMapInteractions._zone=zone;
    if(zone>0){
      showMapNotice('进入 · '+regionNameAt(playerWorldX),1200);
    }
  }
}
function teleportTo(x,{notice='已传送'}={}){
  playerWorldX=clamp(Number(x)||MAP_SPAWN_X,PLAYER_BODY.halfW,MAP_WIDTH-PLAYER_BODY.halfW);
  orientationRouteIndex=worldZoneIndexAt(playerWorldX);currentRouteOrientation=1;sceneryOffsetX=0;
  playerY=0;playerVy=0;playerGrounded=true;coyoteTimer=COYOTE_TIME;jumpBufferTimer=0;resetPlayerPoseState();
  updateMapInteractions._zone=worldZoneIndexAt(playerWorldX);
  lastInteractionX=NaN;lastInteractionY=NaN;
  updateCamera();renderWorld(true);if(notice)showMapNotice(notice);return playerWorldX;
}
function updateCombat(dt,interactive){
  if(!enemies.every(e=>e.spawned)){if(interactive)resetMapEnemies();else return}
  if(playerAttackCooldown>0)playerAttackCooldown=Math.max(0,playerAttackCooldown-dt);
  if(playerInvuln>0)playerInvuln=Math.max(0,playerInvuln-dt);
  if(playerAttackTimer>0&&interactive){
    playerAttackTimer=Math.max(0,playerAttackTimer-dt);
    if(playerAttackTimer<=0)actorEl.classList.remove('is-attacking');
    else if(playerAttackTimer<.22&&playerAttackTimer>.08){
      const attackBox=getPlayerAttackBox();
      for(const e of enemies){
        if(e.alive&&!playerAttackHits.has(e.id)&&rectsOverlap(attackBox,getEnemyHurtbox(e))){
          if(damageEnemy(e,1,facing))playerAttackHits.add(e.id);
        }
      }
      for(const o of MAP_OBJECTS){
        if(o.breakable&&!mapState.broken.has(o.id)&&rectsOverlap(attackBox,{x:o.x,y:o.y,w:o.w,h:o.h}))breakMapObject(o.id);
      }
    }
  }
  for(const e of enemies)updateEnemy(e,dt,interactive);
}
function nearestLivingEnemy(){
  let best=null,bestD=Infinity;
  for(const e of enemies){if(!e.spawned||!e.alive)continue;const d=Math.abs(playerWorldX-e.x);if(d<bestD){best=e;bestD=d}}
  return best;
}
function debugRect(el,r){
  if(!r){
    el.hidden=true;el.style.width='0';el.style.height='0';return;
  }
  el.hidden=false;
  el.style.left=(r.x-worldX)+'px';el.style.bottom=(MAP_GROUND_SCREEN_Y+r.y)+'px';el.style.width=r.w+'px';el.style.height=r.h+'px';
}
function renderCombatDebug(){
  if(!showHitboxes&&!showAttackRange)return;
  const playerAttackActive=playerAttackTimer>0&&playerAttackTimer<.22&&playerAttackTimer>.08;
  const target=nearestLivingEnemy();
  debugRect(playerHurtboxDebug,getPlayerHurtbox());
  debugRect(playerAttackDebug,(showAttackRange||playerAttackActive)?getPlayerAttackBox():null);
  playerAttackDebug.classList.toggle('is-preview',showAttackRange&&!playerAttackActive);
  playerAttackDebug.classList.toggle('is-active-box',playerAttackActive);
  debugRect(enemyHurtboxDebug,target?getEnemyHurtbox(target):null);
  debugRect(enemyAttackDebug,target&&target.attackTimer>0&&target.attackTimer<.20&&target.attackTimer>.08?getEnemyAttackBox(target):null);
}
function toggleHitboxes(force){showHitboxes=typeof force==='boolean'?force:!showHitboxes;worldEl.classList.toggle('show-hitboxes',showHitboxes);renderCombatDebug();updateCombatDebugButtons();return showHitboxes}
function toggleAttackRange(force){showAttackRange=typeof force==='boolean'?force:!showAttackRange;worldEl.classList.toggle('show-attack-range',showAttackRange);renderCombatDebug();updateCombatDebugButtons();return showAttackRange}
function toggleEnemyAi(force){enemyAiEnabled=typeof force==='boolean'?force:!enemyAiEnabled;if(!enemyAiEnabled)enemies.forEach(e=>e.el.classList.remove('is-moving','is-attacking'));updateCombatDebugButtons();return enemyAiEnabled}
function toggleMapColliders(force){showMapColliders=typeof force==='boolean'?force:!showMapColliders;if(showMapColliders)ensureMapDebugVisuals();worldEl.classList.toggle('show-map-colliders',showMapColliders);updateCombatDebugButtons();return showMapColliders}
function toggleSpawnZones(force){showSpawnZones=typeof force==='boolean'?force:!showSpawnZones;if(showSpawnZones)ensureMapDebugVisuals();worldEl.classList.toggle('show-spawn-zones',showSpawnZones);updateCombatDebugButtons();return showSpawnZones}
function toggleCameraDebug(force){showCameraDebug=typeof force==='boolean'?force:!showCameraDebug;worldEl.classList.toggle('show-camera-debug',showCameraDebug);updateCombatDebugButtons();return showCameraDebug}
window.PaperchalkDialogue={
  openById(id){const npc=MAP_NPCS.find(n=>n.id===id);return npc?openDialogue(npc):false},
  close:closeDialogue,
  advance:advanceDialogue,
  choose:selectDialogueChoice,
  get state(){return {...dialogueState,npc:dialogueState.npc?.id||null,assetsReady:dialoguePortraitReady}}
};

window.PaperchalkMap={
  width:MAP_WIDTH,spawnX:MAP_SPAWN_X,farEdgeX:MAP_EXIT_X,zoneWidth:WORLD_ZONE_WIDTH,zoneCount:WORLD_ZONE_COUNT,nodes:WORLD_NODES,routes:WORLD_ROUTES,terrain:MAP_TERRAIN,objects:MAP_OBJECTS,npcs:MAP_NPCS,enemySpawns:ENEMY_SPAWNS,
  teleport:teleportTo,interact:interactWithNpc,toggleColliders:toggleMapColliders,toggleSpawns:toggleSpawnZones,toggleCamera:toggleCameraDebug,
  get playerX(){return playerWorldX},
  get traversal(){return {routeIndex:worldZoneIndexAt(playerWorldX),orientation:currentRouteOrientation,nodeBounds:routeBoundaryInfo(playerWorldX)}},
  get state(){return {broken:[...mapState.broken],collected:[...mapState.collected],exitReached:mapState.exitReached}}
};
window.PaperchalkCombat={
  jump:jumpPlayer,attack:startPlayerAttack,crouch:setCrouchControl,resetEnemy,placeEnemyNear,resetMapEnemies,
  toggleHitboxes,toggleAttackRange,toggleEnemyAi,
  get enemy(){return {x:enemy.x,spawnX:enemy.spawnX,hp:enemy.hp,alive:enemy.alive,state:enemy.state,ai:enemyAiEnabled}},
  get enemies(){return enemies.map(e=>({id:e.id,x:e.x,hp:e.hp,alive:e.alive,state:e.state,patrolMin:e.patrolMin,patrolMax:e.patrolMax}))},
  get player(){const meta=playerActionMeta(playerActionState);return {x:playerWorldX,y:playerY,vy:playerVy,grounded:playerGrounded,crouching:playerCrouching,action:playerActionState,bodyH:playerBodyHeight(),facing,sourceFacing:meta.sourceFacing,actionScale:meta.scale,attacking:playerAttackTimer>0}},
  get debug(){return {hitboxes:showHitboxes,attackRange:showAttackRange,mapColliders:showMapColliders,spawnZones:showSpawnZones,camera:showCameraDebug}}
};

/* -------------------- RUNTIME / RENDERER CONTRACT V2 --------------------
   Simulation and HTML UI remain authoritative. Renderers subscribe to a reused
   mutable frame-state object so the hot path does not allocate snapshots/arrays. */
const runtimeObservers=new Set();
let runtimeRevision=0;
const runtimeFrameState={
  revision:0,
  viewport:{width:VIEW_W,height:VIEW_H,groundY:MAP_GROUND_SCREEN_Y},
  camera:{x:worldX,y:playerY,visualOriginX,sceneryOffsetX},
  time:{minutes:worldMinutes,visibleMinutes:visibleClockMinutes(),scale:worldTimeScale},
  route:{index:0,id:'',biome:'meadow',orientation:1},
  player:{
    x:playerWorldX,y:playerY,vy:playerVy,screenX:actorX,facing,hp:playerHp,maxHp:PLAYER_MAX_HP,
    grounded:playerGrounded,crouching:playerCrouching,action:playerActionState,
    moving:false,attacking:false,attackTimer:0,invulnerable:false
  },
  enemies:enemies.map(e=>({
    id:e.id,x:e.x,hp:e.hp,alive:e.alive,facing:e.facing,state:e.state,
    patrolMin:e.patrolMin,patrolMax:e.patrolMax,attackTimer:e.attackTimer,hitstun:e.hitstun
  })),
  mapRevision:0
};
let runtimeMapRevision=0;

function refreshRuntimeFrameState(){
  const route=routeForWorldX(playerWorldX);
  const s=runtimeFrameState;
  s.revision=runtimeRevision;
  s.viewport.width=VIEW_W;s.viewport.height=VIEW_H;s.viewport.groundY=MAP_GROUND_SCREEN_Y;
  const activeCameraX=sceneLocation==='interior'?interiorCameraX:worldX;
  const activePlayerX=sceneLocation==='interior'?interiorPlayerWorldX:playerWorldX;
  s.camera.x=activeCameraX;s.camera.y=playerY;s.camera.visualOriginX=visualOriginX;s.camera.sceneryOffsetX=sceneryOffsetX;
  s.time.minutes=worldMinutes;s.time.visibleMinutes=visibleClockMinutes();s.time.scale=worldTimeScale;
  s.route.index=route?.index??0;s.route.id=route?.id||'';s.route.biome=route?.biome||'meadow';s.route.orientation=currentRouteOrientation;
  s.player.x=activePlayerX;s.player.y=playerY;s.player.vy=playerVy;s.player.screenX=actorX;s.player.facing=facing;
  s.player.hp=playerHp;s.player.maxHp=PLAYER_MAX_HP;s.player.grounded=playerGrounded;
  s.player.crouching=playerCrouching;s.player.action=playerActionState;
  s.player.moving=lastMovingState;s.player.attacking=playerAttackTimer>0;s.player.attackTimer=playerAttackTimer;
  s.player.invulnerable=playerInvuln>0;
  for(let i=0;i<enemies.length;i++){
    const e=enemies[i],o=s.enemies[i];
    o.x=e.x;o.hp=e.hp;o.alive=e.alive;o.facing=e.facing;o.state=e.state;
    o.patrolMin=e.patrolMin;o.patrolMax=e.patrolMax;o.attackTimer=e.attackTimer;o.hitstun=e.hitstun;
  }
  s.mapRevision=runtimeMapRevision;
  return s;
}
function runtimeSnapshot(){
  const s=refreshRuntimeFrameState();
  return {
    revision:s.revision,
    viewport:{...s.viewport},
    camera:{...s.camera},
    time:{...s.time},
    route:{...s.route},
    player:{...s.player},
    enemies:s.enemies.map(e=>({...e})),
    map:{
      width:MAP_WIDTH,
      revision:runtimeMapRevision,
      broken:[...mapState.broken],
      collected:[...mapState.collected]
    },
    scene:{
      location:sceneLocation,
      interior:sceneLocation==='interior'?{
        width:INTERIOR_MAP_WIDTH,
        height:INTERIOR_MAP_HEIGHT,
        playerX:interiorPlayerWorldX,
        playerY,
        cameraX:interiorCameraX,
        cameraY:interiorCameraY,
        stairs:{...INTERIOR_STAIRS}
      }:null
    }
  };
}
function markRuntimeMapChanged(){runtimeMapRevision++}
function notifyRuntimeObservers(){
  if(runtimeObservers.size===0)return;
  runtimeRevision++;
  const frame=refreshRuntimeFrameState();
  for(const observer of runtimeObservers){
    try{observer(frame)}catch(err){console.error('RUNTIME_OBSERVER_FAILED',err)}
  }
}
window.PaperchalkRuntime={
  version:2,
  worldData:Object.freeze({
    width:MAP_WIDTH,
    zoneWidth:WORLD_ZONE_WIDTH,
    terrain:MAP_TERRAIN,
    objects:MAP_OBJECTS,
    pickups:MAP_PICKUPS,
    npcs:MAP_NPCS,
    enemySpawns:ENEMY_SPAWNS,
    playerVisual:PLAYER_VISUAL,
    playerActions:PLAYER_ACTION_ASSETS,
    playerActionMeta:PLAYER_ACTION_META
  }),
  getSnapshot:runtimeSnapshot,
  subscribe(observer){
    if(typeof observer!=='function')throw new TypeError('observer must be a function');
    runtimeObservers.add(observer);
    observer(refreshRuntimeFrameState());
    return ()=>runtimeObservers.delete(observer);
  },
  markMapChanged:markRuntimeMapChanged,
  requestDomSync(){renderWorld(true)},
  get subscriberCount(){return runtimeObservers.size}
};

let roadPoolFirst=-1;
let roadPoolOriginX=0;
function updateRoadPool(sceneryX,force=false){
  if(!(roadW>0))return;
  const first=Math.max(0,Math.floor(Math.max(0,sceneryX)/roadW)-1);
  if(!force&&first===roadPoolFirst)return;
  roadPoolFirst=first;
  roadPoolOriginX=first*roadW;
  [...roadTrack.children].forEach((tile,i)=>{
    const index=first+i;
    const x=index*roadW;
    tile.style.display=x<MAP_WIDTH+roadW?'':'none';
    tile.style.left=(x-roadPoolOriginX)+'px';
  });
}
function ensureRoadTiles(){
  if(!(roadW>0))return;
  const viewW=VIEW_W;
  const needed=Math.max(4,Math.ceil(viewW/roadW)+3);
  while(roadTrack.children.length<needed){
    const clone=roadTile.cloneNode(false);
    clone.removeAttribute('id');
    roadTrack.appendChild(clone);
  }
  while(roadTrack.children.length>needed&&roadTrack.lastElementChild!==roadTile){
    roadTrack.lastElementChild.remove();
  }
  roadTrack.style.width=(needed*roadW+roadW)+'px';
  roadPoolFirst=-1;
  updateRoadPool(worldX+sceneryOffsetX,true);
}
function refreshRoadW(){
  const w=roadTile.getBoundingClientRect().width;
  if(w>0){roadW=Math.max(1,w-1);ensureRoadTiles()}
  updateCamera();
  actorEl.style.setProperty('--actor-x',actorX.toFixed(2)+'px');
  actorEl.style.setProperty('--actor-y',(-MAP_GROUND_SCREEN_Y).toFixed(2)+'px');
  renderCombatDebug();
}
let viewportRebuildTimer=0;
let viewportSyncRaf=0;
function flushViewportChange(){
  viewportSyncRaf=0;
  const change=syncViewportMetrics();
  if(!change.sizeChanged&&!change.groundChanged&&!change.scaleChanged)return;
  refreshRoadW();
  refreshSceneryMetrics();
  if(change.sizeChanged){
    playerScreenAnchorX=Math.round(VIEW_W*.5);
    actorX=playerScreenAnchorX;
    interiorPlayerX=playerScreenAnchorX;
    if(sceneLocation==='outside')updateCamera();
    else updateInteriorCamera();
  }
  if(change.groundChanged||change.sizeChanged){
    clearTimeout(viewportRebuildTimer);
    viewportRebuildTimer=setTimeout(()=>{
      buildMapVisuals();
      renderWorld(true);
      if(worldMapOverlay.classList.contains('is-open'))drawWorldMap();
    },90);
  }else{
    renderWorld(true);
  }
}
function handleViewportChange(){
  if(viewportSyncRaf)return;
  viewportSyncRaf=requestAnimationFrame(flushViewportChange);
}
addEventListener('resize',handleViewportChange,{passive:true});
addEventListener('orientationchange',()=>setTimeout(handleViewportChange,80),{passive:true});
addEventListener('pageshow',()=>{handleViewportChange();setTimeout(handleViewportChange,120)},{passive:true});
window.visualViewport?.addEventListener('resize',handleViewportChange,{passive:true});
refreshRoadW();
refreshSceneryMetrics();

function posMod(v,m){return ((v%m)+m)%m}
function pixiDynamicActive(){return worldEl.classList.contains('renderer-pixi-dynamic')}
function worldInteractive(){
  return !!uiShell
    && uiShell.classList.contains('is-hidden')
    && !backpackOverlay.classList.contains('is-open')
    && !worldMapOverlay.classList.contains('is-open')
    && !dialogueIsOpen()
    && !debugIsOpen()
    && !sceneTransitionBusy;
}
function movementAxis(){
  if(keyboardLeft!==keyboardRight)return keyboardLeft?-1:1;
  return joystickAxis;
}
function flightVerticalAxis(){
  const buttons=((keyboardFlightUp||mobileFlightUp)?1:0)-((keyboardFlightDown||mobileFlightDown)?1:0);
  return clamp(buttons+joystickFlightAxisY,-1,1);
}
function flightCeiling(){
  return sceneLocation==='interior'
    ? Math.max(0,INTERIOR_MAP_HEIGHT-playerBodyHeight()-24)
    : OUTDOOR_FLIGHT_MAX_Y;
}
function setFacing(dir){
  if(!dir||dir===facing)return;
  facing=dir;
  startPlayerTurnFlip(dir);
}
function desiredVisualOrigin(cameraX=worldX){
  const raw=Math.floor((cameraX-VISUAL_WINDOW_STEP)/VISUAL_WINDOW_STEP)*VISUAL_WINDOW_STEP;
  return clamp(raw,0,Math.max(0,MAP_WIDTH-VISUAL_WINDOW_SPAN));
}
function updateVisualWindow(force=false){
  const next=desiredVisualOrigin();
  if(!force&&next===visualOriginX)return false;
  visualOriginX=next;
  buildMapVisuals();
  if(showMapColliders||showSpawnZones)ensureMapDebugVisuals();
  mapTrack.style.width=VISUAL_WINDOW_SPAN+'px';
  entityTrack.style.width=VISUAL_WINDOW_SPAN+'px';
  enemies.forEach(e=>{e._renderX=null;e._visible=null});
  return true;
}

const renderCache={road:'',midground:'',rear:'',front:'',map:'',entity:'',actorLeft:'',actorBottom:'',actorAir:''};
function writeTransform(el,key,value){
  if(renderCache[key]===value)return;
  renderCache[key]=value;el.style.transform=value;
}
function renderWorld(force=false){
  const sceneryX=worldX+sceneryOffsetX;
  if(roadSurface)roadSurface.style.setProperty('--road-surface-x',(-posMod(sceneryX,512)).toFixed(2)+'px');
  const windowChanged=updateVisualWindow(force);
  if(windowChanged)force=true;
  updateRoadPool(sceneryX,force);
  updatePropPools(sceneryX,force);
  const worldCameraY=playerY;
  worldEl.style.setProperty('--world-camera-y',worldCameraY.toFixed(2)+'px');
  const roadT='translate3d('+(-(sceneryX-roadPoolOriginX))+'px,'+worldCameraY.toFixed(2)+'px,0)';
  updateMidgroundApartmentVisibility(sceneryX,force);
  const midgroundT='translate3d('+(-(sceneryX*APARTMENT_PARALLAX))+'px,'+worldCameraY.toFixed(2)+'px,0)';
  const rearCamera=sceneryX*.97,frontCamera=sceneryX*1.03;
  const rearT='translate3d('+(-(rearCamera-rearPropPool.originX))+'px,'+worldCameraY.toFixed(2)+'px,0)';
  const frontT='translate3d('+(-(frontCamera-frontPropPool.originX))+'px,'+worldCameraY.toFixed(2)+'px,0)';
  const mapT='translate3d('+(-(worldX-visualOriginX))+'px,'+worldCameraY.toFixed(2)+'px,0)';
  writeTransform(roadTrack,'road',roadT);
  if(midgroundBuildingTrack)writeTransform(midgroundBuildingTrack,'midground',midgroundT);
  writeTransform(rearTrack,'rear',rearT);
  writeTransform(frontTrack,'front',frontT);
  writeTransform(mapTrack,'map',mapT);
  writeTransform(entityTrack,'entity',mapT);
  const actorLeft=actorX.toFixed(2)+'px';
  const actorBottom=MAP_GROUND_SCREEN_Y.toFixed(2)+'px';
  const actorAir=playerY.toFixed(2)+'px';
  if(!pixiDynamicActive()){
    if(force||renderCache.actorLeft!==actorLeft){
      renderCache.actorLeft=actorLeft;
      actorEl.style.setProperty('--actor-x',actorLeft);
    }
    if(force||renderCache.actorBottom!==actorBottom){
      renderCache.actorBottom=actorBottom;
      actorEl.style.setProperty('--actor-y',(-Number.parseFloat(actorBottom)).toFixed(2)+'px');
    }
    if(force||renderCache.actorAir!==actorAir){
      renderCache.actorAir=actorAir;
      actorEl.style.setProperty('--player-air-y',actorAir);
    }
    enemies.forEach(e=>{if(e.spawned)setEnemyVisual(e,force)});
  }
  if(sceneLocation==='interior'){
    alignInteriorSceneToStage(force);
    positionInteriorExitDoor();
    updateInteriorDepthLayers();
  }
  renderDoorPrompt();
  renderCombatDebug();
  notifyRuntimeObservers();
}
let lastInteractionTick=0;
let lastInteractionX=NaN,lastInteractionY=NaN;
let lastAmbientVisualTick=0;
let combatAccumulator=0;
let lastCombatProbe=0,nearbyCombatCached=false;
let lastMovingState=false;
let lastWalkDuration='';
function hasNearbyCombat(now){
  if(playerAttackTimer>0||playerAttackCooldown>0||playerInvuln>0)return true;
  if(now-lastCombatProbe>=120){
    lastCombatProbe=now;
    nearbyCombatCached=false;
    for(const e of enemies){
      if(e.spawned&&e.alive&&Math.abs(playerWorldX-e.x)<1700){nearbyCombatCached=true;break}
    }
  }
  return nearbyCombatCached;
}
function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  sampleFramePerf(now);
  if(document.hidden){requestAnimationFrame(frame);return}

  if(debugIsOpen()&&now-debugLastUiUpdate>250){
    updateDebugStatus();
    debugLastUiUpdate=now;
  }
  const interactive=worldInteractive();
  const worldSession=uiShell.classList.contains('is-hidden');
  // World time never advances on the menu/auth/settings screens.
  if(worldSession&&worldTimeScale>0)worldMinutes+=dt*worldTimeScale;
  // Active play updates every frame. Paused overlays/dialogue update ambient visuals
  // at 10–15 Hz; menus only at 4 Hz. This avoids needless style writes and phone heat.
  const ambientInterval=interactive?0:(worldSession?(dialogueIsOpen()?66:100):250);
  if(interactive||now-lastAmbientVisualTick>=ambientInterval){
    lastAmbientVisualTick=now;
    updateCelestialVisuals();
    updateDayNightVisuals();
  }
  if(!interactive){
    requestAnimationFrame(frame);
    return;
  }

  updateCrouchState();
  const rawAxis=movementAxis();
  const axis=(playerCrouching&&!debugFlightMode)?0:rawAxis;
  const magnitude=Math.abs(axis);
  const moving=magnitude>.02;
  if(moving!==lastMovingState){
    lastMovingState=moving;
    actorEl.classList.toggle('is-moving',moving);
  }

  let playerDynamic=!playerGrounded||jumpBufferTimer>0;
  if(sceneLocation==='interior'){
    playerVy=0;jumpBufferTimer=0;
    if(debugFlightMode){
      playerGrounded=false;coyoteTimer=0;
      const vy=flightVerticalAxis();
      if(Math.abs(vy)>.02){
        playerY=clamp(playerY+vy*Math.max(220,VIEW_H*.50)*dt,0,flightCeiling());
        playerDynamic=true;
      }
      if(moving){
        const dir=Math.sign(axis);
        setFacing(dir);
        const speed=Math.max(175,Math.min(255,VIEW_W*.21))*magnitude;
        moveInteriorHorizontal(dir*speed*dt,{flight:true});
        playerDynamic=true;
      }else if(playerDynamic){
        updateInteriorCamera();
      }
    }else{
      playerGrounded=true;coyoteTimer=COYOTE_TIME;
      playerY=interiorWalkSurfaceY(interiorPlayerWorldX);
      if(moving){
        const dir=Math.sign(axis);
        setFacing(dir);
        const speed=Math.max(175,Math.min(255,VIEW_W*.21))*magnitude;
        moveInteriorHorizontal(dir*speed*dt);
        playerDynamic=true;
      }else{
        updateInteriorCamera();
      }
    }
  }else{
    if(debugFlightMode){
      playerGrounded=false;playerVy=0;jumpBufferTimer=0;coyoteTimer=0;
      const vy=flightVerticalAxis();
      if(Math.abs(vy)>.02){
        playerY=clamp(playerY+vy*Math.max(220,VIEW_H*.50)*dt,0,flightCeiling());
        playerDynamic=true;
      }
    }
    if(moving){
      const dir=Math.sign(axis);
      setFacing(dir);
      const maxSpeed=Math.max(170,Math.min(260,VIEW_W*.22));
      const speed=maxSpeed*magnitude;
      const walkDuration=(0.90-0.34*magnitude).toFixed(2)+'s';
      if(walkDuration!==lastWalkDuration){
        lastWalkDuration=walkDuration;
        actorEl.style.setProperty('--walk-duration',walkDuration);
      }
      movePlayerHorizontal(dir*speed*dt);
      playerDynamic=true;
    }
    if(playerDynamic&&!debugFlightMode)updatePlayerVertical(dt,true);
    if(playerDynamic)updateCamera();
  }
  const actionChanged=syncPlayerActionState();

  let combatTick=false;
  if(hasNearbyCombat(now)){
    const fixedStep=1/60;
    combatAccumulator=Math.min(combatAccumulator+dt,.05);
    let combatSteps=0;
    while(combatAccumulator>=fixedStep&&combatSteps<3){
      updateCombat(fixedStep,true);
      combatAccumulator-=fixedStep;
      combatSteps++;
      combatTick=true;
    }
  }else{
    combatAccumulator=0;
  }

  const interactionCoord=sceneLocation==='interior'?interiorPlayerWorldX:playerWorldX;
  const interactionMoved=!Number.isFinite(lastInteractionX)||Math.abs(interactionCoord-lastInteractionX)>8||Math.abs(playerY-lastInteractionY)>8;
  if(interactionMoved&&now-lastInteractionTick>=80){
    lastInteractionTick=now;
    lastInteractionX=interactionCoord;lastInteractionY=playerY;
    updateMapInteractions();
  }

  if(playerDynamic||combatTick||actionChanged||showHitboxes||showAttackRange)renderWorld();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function isEditableTarget(target){
  return target instanceof HTMLElement &&
    (target.matches('input,textarea,select,[contenteditable="true"]'));
}
addEventListener('keydown',e=>{
  if(dialogueIsOpen()){
    if(e.code==='Escape'){e.preventDefault();closeDialogue();return}
    if(dialogueState.phase==='choice'&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(e.code)){
      e.preventDefault();
      const index=Number(e.code.slice(-1))-1;
      selectDialogueChoice(index);
      return;
    }
    if((e.code==='Space'||e.code==='Enter')&&dialogueState.phase!=='choice'){
      e.preventDefault();advanceDialogue();return;
    }
    return;
  }
  if(isEditableTarget(e.target)||!worldInteractive())return;
  if(e.code==='ArrowLeft'||e.code==='KeyA'){keyboardLeft=true;e.preventDefault()}
  if(e.code==='ArrowRight'||e.code==='KeyD'){keyboardRight=true;e.preventDefault()}
  if(e.code==='ArrowDown'||e.code==='KeyS'){
    if(debugFlightMode)keyboardFlightDown=true;
    else if(sceneLocation!=='interior'){keyboardCrouch=true;updateCrouchState()}
    e.preventDefault();
  }
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){
    if(debugFlightMode)keyboardFlightUp=true;
    else if(sceneLocation!=='interior')jumpPlayer();
    e.preventDefault();
  }
  if(e.code==='KeyJ'){startPlayerAttack();e.preventDefault()}
  if(e.code==='KeyE'){interactWithNpc();e.preventDefault()}
});
addEventListener('keyup',e=>{
  if(e.code==='ArrowLeft'||e.code==='KeyA'){keyboardLeft=false;e.preventDefault()}
  if(e.code==='ArrowRight'||e.code==='KeyD'){keyboardRight=false;e.preventDefault()}
  if(e.code==='ArrowDown'||e.code==='KeyS'){keyboardFlightDown=false;keyboardCrouch=false;updateCrouchState();e.preventDefault()}
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){keyboardFlightUp=false;e.preventDefault()}
});
interactBtn.addEventListener('pointerdown',e=>{e.preventDefault();interactWithNpc()});
crouchBtn.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(debugFlightMode){
    mobileFlightDown=true;
    crouchBtn.classList.add('is-active');
  }else{
    if(sceneLocation==='interior')return;
    mobileCrouch=true;
    updateCrouchState();
  }
  try{crouchBtn.setPointerCapture(e.pointerId)}catch{}
});
const releaseMobileCrouch=e=>{
  if(e)e.preventDefault();
  mobileCrouch=false;
  mobileFlightDown=false;
  crouchBtn.classList.remove('is-active');
  updateCrouchState();
};
crouchBtn.addEventListener('pointerup',releaseMobileCrouch);
crouchBtn.addEventListener('pointercancel',releaseMobileCrouch);
crouchBtn.addEventListener('lostpointercapture',releaseMobileCrouch);
jumpBtn.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(debugFlightMode){
    mobileFlightUp=true;
    jumpBtn.classList.add('is-active');
    try{jumpBtn.setPointerCapture(e.pointerId)}catch{}
  }else{
    if(sceneLocation==='interior')return;
    jumpPlayer();
  }
});
const releaseMobileFlightUp=e=>{
  if(e)e.preventDefault();
  mobileFlightUp=false;
  jumpBtn.classList.remove('is-active');
};
jumpBtn.addEventListener('pointerup',releaseMobileFlightUp);
jumpBtn.addEventListener('pointercancel',releaseMobileFlightUp);
jumpBtn.addEventListener('lostpointercapture',releaseMobileFlightUp);
attackBtn.addEventListener('pointerdown',e=>{e.preventDefault();startPlayerAttack()});
function resetJoystick(){
  joystickAxis=0;
  joystickFlightAxisY=0;
  joystickPointer=null;
  joystickEl.classList.remove('is-active');
  joystickEl.style.setProperty('--joy-x','0px');
  joystickEl.style.setProperty('--joy-y','0px');
}
addEventListener('blur',()=>{
  keyboardLeft=keyboardRight=keyboardCrouch=keyboardFlightUp=keyboardFlightDown=false;
  mobileCrouch=mobileFlightUp=mobileFlightDown=false;
  joystickFlightAxisY=0;
  if(playerCrouching)setPlayerCrouching(false);
  resetJoystick();
});

const JOY_RADIUS=39;
const JOY_DEADZONE=.14;

function updateJoystick(clientX,clientY){
  let dx=clientX-joystickOriginX;
  let dy=clientY-joystickOriginY;
  const distance=Math.hypot(dx,dy);
  if(distance>JOY_RADIUS){
    const scale=JOY_RADIUS/distance;
    dx*=scale;dy*=scale;
  }
  joystickEl.style.setProperty('--joy-x',dx.toFixed(1)+'px');
  joystickEl.style.setProperty('--joy-y',dy.toFixed(1)+'px');

  const raw=dx/JOY_RADIUS;
  const a=Math.abs(raw);
  joystickAxis=a<=JOY_DEADZONE?0:Math.sign(raw)*Math.min(1,(a-JOY_DEADZONE)/(1-JOY_DEADZONE));
  if(debugFlightMode){
    const rawY=-dy/JOY_RADIUS;
    const ay=Math.abs(rawY);
    joystickFlightAxisY=ay<=JOY_DEADZONE?0:Math.sign(rawY)*Math.min(1,(ay-JOY_DEADZONE)/(1-JOY_DEADZONE));
  }else joystickFlightAxisY=0;
}
joystickZone.addEventListener('pointerdown',e=>{
  if(!worldInteractive()||joystickPointer!==null)return;
  e.preventDefault();
  joystickPointer=e.pointerId;

  const rect=joystickZone.getBoundingClientRect();
  const pad=62;
  joystickOriginX=Math.max(rect.left+pad,Math.min(rect.right-pad,e.clientX));
  joystickOriginY=Math.max(rect.top+pad,Math.min(rect.bottom-pad,e.clientY));

  joystickEl.style.left=(joystickOriginX-rect.left)+'px';
  joystickEl.style.top=(joystickOriginY-rect.top)+'px';
  joystickEl.classList.add('is-active');
  try{joystickZone.setPointerCapture(e.pointerId)}catch{}
  updateJoystick(e.clientX,e.clientY);
});
joystickZone.addEventListener('pointermove',e=>{
  if(e.pointerId!==joystickPointer)return;
  e.preventDefault();
  updateJoystick(e.clientX,e.clientY);
});
function endJoystick(e){
  if(e.pointerId!==joystickPointer)return;
  e.preventDefault();
  resetJoystick();
}
joystickZone.addEventListener('pointerup',endJoystick);
joystickZone.addEventListener('pointercancel',endJoystick);
joystickZone.addEventListener('lostpointercapture',e=>{
  if(e.pointerId===joystickPointer)resetJoystick();
});

/* reusable paper UI transition
   Any current/future UI can call:
   paperUIFrom(clickedElement, revealFunction, targetElement)
*/
let paperUIBusy=false;

function paperFxOrigin(triggerEl){
  if(triggerEl && typeof triggerEl.getBoundingClientRect==='function'){
    const r=triggerEl.getBoundingClientRect();
    if(r.width||r.height)return {x:r.left+r.width/2,y:r.top+r.height/2};
  }
  return {x:innerWidth*.5,y:innerHeight*.5};
}
function setPaperFxAt(el,x,y,size){
  el.style.left=(x-size/2)+'px';
  el.style.top=(y-size/2)+'px';
}
const deferredImagePromises=new WeakMap();
function deferredImageReady(img){
  return !!(img&&img.currentSrc&&img.complete&&img.naturalWidth>0);
}
function ensureDeferredImage(img){
  if(!img)return Promise.resolve(null);
  if(deferredImageReady(img))return Promise.resolve(img);
  let pending=deferredImagePromises.get(img);
  if(pending)return pending;
  const source=img.dataset.src;
  if(!source)return Promise.resolve(img);
  pending=(async()=>{
    if(!img.getAttribute('src'))img.src=source;
    try{
      if(typeof img.decode==='function')await img.decode();
      else await new Promise((resolve,reject)=>{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',reject,{once:true});
      });
    }catch(err){
      if(!img.complete||!img.naturalWidth)throw err;
    }
    return img;
  })().catch(err=>{
    deferredImagePromises.delete(img);
    console.warn('DEFERRED_IMAGE_FAILED',source,err);
    throw err;
  });
  deferredImagePromises.set(img,pending);
  return pending;
}
function ensurePaperFxAssets(){
  return Promise.allSettled([ensureDeferredImage(paperFxBall),ensureDeferredImage(paperFxUnfold)]);
}
function ensureBackpackArt(){
  if(deferredImageReady(backpackArt)){
    backpackFrame.classList.remove('is-art-loading');
    return Promise.resolve(backpackArt);
  }
  backpackFrame.classList.add('is-art-loading');
  return ensureDeferredImage(backpackArt).then(img=>{
    backpackFrame.classList.remove('is-art-loading');
    return img;
  }).catch(err=>{
    backpackFrame.classList.remove('is-art-loading');
    return null;
  });
}
function warmPaperFxWhenIdle(){
  const run=()=>{ensurePaperFxAssets()};
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1800});
  else setTimeout(run,700);
}
async function paperUIFrom(triggerEl,revealFn,targetEl){
  if(typeof revealFn!=='function')return;
  if(paperUIBusy){revealFn();return}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){revealFn();return}
  // Never block a first interaction on ~0.9 MB of decorative transition art.
  // Reveal immediately and warm it in the background; later transitions animate normally.
  if(!deferredImageReady(paperFxBall)||!deferredImageReady(paperFxUnfold)){
    revealFn();
    ensurePaperFxAssets();
    return;
  }

  paperUIBusy=true;
  const origin=paperFxOrigin(triggerEl);
  const center={x:innerWidth*.5,y:innerHeight*.5};
  const ballSize=Math.max(54,Math.min(84,innerWidth*.062));
  const unfoldSize=Math.max(150,Math.min(290,innerWidth*.20));
  let flight=null,unfold=null,targetAnim=null;

  paperFxBall.getAnimations().forEach(a=>a.cancel());
  paperFxUnfold.getAnimations().forEach(a=>a.cancel());
  if(targetEl)targetEl.getAnimations().forEach(a=>a.cancel());
  paperFxBall.style.opacity='1';
  paperFxUnfold.style.opacity='0';
  setPaperFxAt(paperFxBall,origin.x,origin.y,ballSize);
  setPaperFxAt(paperFxUnfold,center.x,center.y,unfoldSize);

  const dx=center.x-origin.x;
  const dy=center.y-origin.y;
  const arc=-Math.min(74,Math.max(24,Math.abs(dx)*.09+24));

  try{
    flight=paperFxBall.animate([
      {transform:'translate(0,0) scale(.68) rotate(-10deg)',opacity:0},
      {offset:.12,transform:'translate(0,0) scale(.92) rotate(-4deg)',opacity:1},
      {offset:.56,transform:'translate('+(dx*.55)+'px,'+(dy*.55+arc)+'px) scale(1.03) rotate(145deg)',opacity:1},
      {transform:'translate('+dx+'px,'+dy+'px) scale(.82) rotate(310deg)',opacity:1}
    ],{duration:330,easing:'cubic-bezier(.22,.72,.22,1)',fill:'forwards'});
    await flight.finished;
    flight.cancel();
    flight=null;

    paperFxBall.style.opacity='0';
    revealFn();

    if(targetEl && typeof targetEl.animate==='function'){
      targetEl.classList.add('paper-ui-transitioning');
      targetAnim=targetEl.animate([
        {opacity:0,transform:'scale(.90) rotate(-.7deg)'},
        {offset:.62,opacity:1,transform:'scale(1.012) rotate(.18deg)'},
        {opacity:1,transform:'scale(1) rotate(0)'}
      ],{duration:260,easing:'cubic-bezier(.16,.82,.25,1)',fill:'both'});
    }

    paperFxUnfold.style.opacity='1';
    unfold=paperFxUnfold.animate([
      {transform:'scale(.18,.13) rotate(-13deg)',opacity:0},
      {offset:.22,transform:'scale(.48,.40) rotate(-7deg)',opacity:1},
      {offset:.72,transform:'scale(1.05,.96) rotate(1.6deg)',opacity:1},
      {transform:'scale(1.38,1.18) rotate(0)',opacity:0}
    ],{duration:270,easing:'cubic-bezier(.18,.78,.22,1)',fill:'forwards'});

    await Promise.allSettled([unfold.finished,targetAnim?targetAnim.finished:Promise.resolve()]);
  }catch(err){
    console.warn('PAPER_UI_TRANSITION_FALLBACK',err);
    revealFn();
  }finally{
    try{flight?.cancel()}catch{}
    try{unfold?.cancel()}catch{}
    try{targetAnim?.cancel()}catch{}
    if(targetEl)targetEl.classList.remove('paper-ui-transitioning');
    paperFxBall.getAnimations().forEach(a=>a.cancel());
    paperFxUnfold.getAnimations().forEach(a=>a.cancel());
    paperFxBall.style.opacity='0';
    paperFxUnfold.style.opacity='0';
    paperUIBusy=false;
  }
}
window.PaperUITransition={openFrom:paperUIFrom};

/* -------------------- NETWORK WORLD MAP -------------------- */
const WORLD_MAP_BASE_W=2700;
const WORLD_MAP_BASE_H=1200;
let worldMapZoom=1;
let worldMapLastTrigger=null;

function routeControlPoint(route){
  const a=WORLD_NODE_BY_ID.get(route.from),b=WORLD_NODE_BY_ID.get(route.to);
  const mx=(a.x+b.x)*.5,my=(a.y+b.y)*.5;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));
  return {x:mx+(-dy/len)*(route.bend||0),y:my+(dx/len)*(route.bend||0)};
}
function routePoint(route,t){
  const a=WORLD_NODE_BY_ID.get(route.from),b=WORLD_NODE_BY_ID.get(route.to),c=routeControlPoint(route);
  const u=1-clamp(t,0,1),tt=clamp(t,0,1);
  return {
    x:u*u*a.x+2*u*tt*c.x+tt*tt*b.x,
    y:u*u*a.y+2*u*tt*c.y+tt*tt*b.y
  };
}
function routeProgressForWorldX(x){
  const route=routeForWorldX(x);
  const local=routeLocalX(x);
  let t=clamp((local-ROUTE_ENDPOINT_PAD)/(WORLD_ZONE_WIDTH-ROUTE_ENDPOINT_PAD*2),0,1);
  if(route.index===orientationRouteIndex&&currentRouteOrientation<0)t=1-t;
  return {route,t};
}
function mapPointForWorldX(x){
  const p=routeProgressForWorldX(x);
  return routePoint(p.route,p.t);
}
function traceRoute(ctx,route){
  const a=WORLD_NODE_BY_ID.get(route.from),b=WORLD_NODE_BY_ID.get(route.to),c=routeControlPoint(route);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(c.x,c.y,b.x,b.y);
}
function drawMapForest(ctx,x,y,scale=1){
  ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(74,91,61,.32)';
  for(let i=0;i<10;i++){
    const px=((i*37)%126)-63,py=((i*53)%88)-44;
    ctx.beginPath();ctx.moveTo(px,py-24*scale);ctx.lineTo(px-15*scale,py+12*scale);ctx.lineTo(px+15*scale,py+12*scale);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
function drawMapMountains(ctx,x,y){
  ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(99,91,82,.25)';
  [[-66,20,58],[-10,-4,76],[56,18,54]].forEach(([px,py,h])=>{ctx.beginPath();ctx.moveTo(px,py-h);ctx.lineTo(px-h*.55,py+16);ctx.lineTo(px+h*.55,py+16);ctx.closePath();ctx.fill()});
  ctx.restore();
}
function drawMapBackdrop(ctx){
  ctx.fillStyle='#dfcda7';ctx.fillRect(0,0,WORLD_MAP_BASE_W,WORLD_MAP_BASE_H);
  ctx.strokeStyle='rgba(91,68,42,.07)';ctx.lineWidth=1;
  for(let y=55;y<WORLD_MAP_BASE_H;y+=74){
    ctx.beginPath();
    for(let x=0;x<=WORLD_MAP_BASE_W;x+=24){
      const yy=y+Math.sin(x*.012+y*.02)*8;
      if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
    }
    ctx.stroke();
  }
  // Southern river/wetland band.
  ctx.strokeStyle='rgba(103,126,120,.28)';ctx.lineWidth=76;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(600,910);ctx.bezierCurveTo(1030,1090,1510,900,1810,930);ctx.bezierCurveTo(2100,960,2330,1080,2570,1030);ctx.stroke();
  ctx.strokeStyle='rgba(234,224,195,.42)';ctx.lineWidth=3;ctx.setLineDash([12,16]);ctx.stroke();ctx.setLineDash([]);
  drawMapForest(ctx,720,330,1);drawMapForest(ctx,1875,300,1.15);
  drawMapMountains(ctx,1010,630);drawMapMountains(ctx,1650,630);
  ctx.fillStyle='rgba(112,128,83,.18)';ctx.beginPath();ctx.ellipse(1450,960,180,100,-.15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(111,95,79,.15)';ctx.fillRect(1160,105,170,120);ctx.fillRect(2140,960,180,100);
}
function drawNodeIcon(ctx,node,visited){
  const degree=nodeDegree(node.id);
  ctx.save();ctx.translate(node.x,node.y);
  ctx.globalAlpha=visited?1:.62;
  ctx.fillStyle=visited?'#514231':'#81745f';
  ctx.strokeStyle='#ead8b4';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(0,0,degree>2?15:11,0,Math.PI*2);ctx.fill();ctx.stroke();

  ctx.strokeStyle='#5a4936';ctx.fillStyle='#7a674e';ctx.lineWidth=3;
  if(node.kind==='village'){
    ctx.fillRect(-18,-34,36,24);ctx.beginPath();ctx.moveTo(-22,-34);ctx.lineTo(0,-52);ctx.lineTo(22,-34);ctx.closePath();ctx.fill();
  }else if(node.kind==='forest'){
    ctx.fillStyle='#596b4c';ctx.beginPath();ctx.moveTo(0,-52);ctx.lineTo(-20,-18);ctx.lineTo(20,-18);ctx.closePath();ctx.fill();
  }else if(node.kind==='mountain'||node.kind==='highland'){
    ctx.fillStyle='#777169';ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(-25,-16);ctx.lineTo(27,-16);ctx.closePath();ctx.fill();
  }else if(node.kind==='cave'){
    ctx.strokeStyle='#625b52';ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,-28,20,Math.PI,0);ctx.stroke();
  }else if(node.kind==='windmill'){
    ctx.font='42px serif';ctx.textAlign='center';ctx.fillStyle='#665743';ctx.fillText('✣',0,-20);
  }else if(node.kind==='ruins'||node.kind==='tower'||node.kind==='shrine'){
    ctx.fillStyle='#77685b';ctx.fillRect(-16,-50,9,31);ctx.fillRect(7,-44,9,25);ctx.fillRect(-20,-52,40,7);
  }else if(node.kind==='bridge'){
    ctx.strokeStyle='#765d42';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-26,-24);ctx.lineTo(26,-24);ctx.stroke();
  }else if(node.kind==='marsh'||node.kind==='river'){
    ctx.strokeStyle='#65755e';ctx.lineWidth=3;for(let i=-14;i<=14;i+=7){ctx.beginPath();ctx.moveTo(i,-18);ctx.lineTo(i-4,-45);ctx.stroke()}
  }else{
    ctx.fillStyle='#78664e';ctx.fillRect(-14,-41,28,20);
  }
  ctx.restore();
}
function drawWorldMap(){
  const canvas=worldMapCanvas;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  canvas.width=WORLD_MAP_BASE_W;canvas.height=WORLD_MAP_BASE_H;
  ctx.clearRect(0,0,WORLD_MAP_BASE_W,WORLD_MAP_BASE_H);
  drawMapBackdrop(ctx);

  // Draw the whole topology first. Unvisited roads stay visible but faint/dashed.
  for(const route of WORLD_ROUTES){
    const visited=mapState.visitedRoutes.has(route.index);
    traceRoute(ctx,route);
    ctx.strokeStyle=visited?'rgba(80,61,39,.56)':'rgba(95,79,59,.22)';
    ctx.lineWidth=visited?18:11;ctx.lineCap='round';
    ctx.setLineDash(visited?[]:[12,12]);ctx.stroke();
    traceRoute(ctx,route);
    ctx.strokeStyle=visited?'#b18d59':'rgba(186,160,116,.42)';
    ctx.lineWidth=visited?11:6;ctx.setLineDash(visited?[]:[9,13]);ctx.stroke();ctx.setLineDash([]);

    const mid=routePoint(route,.5);
    ctx.save();ctx.translate(mid.x,mid.y);ctx.rotate(Math.atan2(WORLD_NODE_BY_ID.get(route.to).y-WORLD_NODE_BY_ID.get(route.from).y,WORLD_NODE_BY_ID.get(route.to).x-WORLD_NODE_BY_ID.get(route.from).x));
    ctx.fillStyle=visited?'rgba(232,216,181,.94)':'rgba(232,216,181,.66)';
    ctx.fillRect(-48,-11,96,22);
    ctx.fillStyle='#5e4f3d';ctx.font='700 10px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(route.name,0,0);
    ctx.restore();
  }

  // World nodes and junction names.
  for(const node of WORLD_NODES){
    const visited=mapState.visitedNodes.has(node.id)||routesAtNode(node.id).some(r=>mapState.visitedRoutes.has(r.index));
    drawNodeIcon(ctx,node,visited);
    ctx.fillStyle=visited?'#4d4031':'rgba(83,70,54,.58)';
    ctx.font=(nodeDegree(node.id)>2?'800 15px':'700 13px')+' "Noto Serif SC","Songti SC",serif';
    ctx.textAlign='center';ctx.textBaseline='top';
    ctx.fillText(node.name,node.x,node.y+21);
    if(nodeDegree(node.id)>2){
      ctx.fillStyle='rgba(91,73,51,.62)';ctx.font='700 10px system-ui,sans-serif';
      ctx.fillText(nodeDegree(node.id)+' 路岔口',node.x,node.y+40);
    }
  }

  // Known enemies and pickups are plotted on their actual route positions.
  for(let i=0;i<ENEMY_SPAWNS.length;i++){
    const spawn=ENEMY_SPAWNS[i],route=routeForWorldX(spawn.x);
    if(!mapState.visitedRoutes.has(route.index))continue;
    const live=enemies[i];if(live&&live.spawned&&!live.alive)continue;
    const p=mapPointForWorldX(live&&live.spawned?live.x:spawn.x);
    ctx.fillStyle='#8b3c32';ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x-6,p.y+3);ctx.lineTo(p.x+6,p.y+3);ctx.closePath();ctx.fill();
  }
  for(const pickup of MAP_PICKUPS){
    const route=routeForWorldX(pickup.x);
    if(!mapState.visitedRoutes.has(route.index)||mapState.collected.has(pickup.id))continue;
    if(pickup.requiresBroken&&!mapState.broken.has(pickup.requiresBroken))continue;
    const p=mapPointForWorldX(pickup.x);ctx.fillStyle='#6f8452';ctx.beginPath();ctx.arc(p.x,p.y+10,5,0,Math.PI*2);ctx.fill();
  }

  const player=mapPointForWorldX(playerWorldX);
  ctx.strokeStyle='#f6e8c8';ctx.lineWidth=6;ctx.fillStyle='#3f3024';
  ctx.beginPath();ctx.arc(player.x,player.y,10,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#44382b';ctx.font='800 13px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.fillText('你在这里',player.x,player.y-16);

  const progress=routeProgressForWorldX(playerWorldX);
  const bounds=routeBoundaryInfo(playerWorldX);
  const from=WORLD_NODE_BY_ID.get(bounds.leftNodeId),to=WORLD_NODE_BY_ID.get(bounds.rightNodeId);
  const visualT=clamp((routeLocalX(playerWorldX)-ROUTE_ENDPOINT_PAD)/(WORLD_ZONE_WIDTH-ROUTE_ENDPOINT_PAD*2),0,1);
  worldMapLocation.textContent='当前位置：'+progress.route.name+' · '+(from?.name||'')+' ↔ '+(to?.name||'')+' · '+Math.round(visualT*100)+'%';
  applyWorldMapZoom(false);
}
function applyWorldMapZoom(preserveCenter=true){
  const oldW=parseFloat(worldMapCanvas.style.width)||WORLD_MAP_BASE_W;
  const oldCenter=(worldMapScroll.scrollLeft+worldMapScroll.clientWidth*.5)/Math.max(1,oldW);
  const cssW=WORLD_MAP_BASE_W*worldMapZoom;
  const cssH=WORLD_MAP_BASE_H*worldMapZoom;
  worldMapCanvas.style.width=cssW+'px';
  worldMapCanvas.style.height=cssH+'px';
  worldMapZoomLabel.textContent=Math.round(worldMapZoom*100)+'%';
  if(preserveCenter)requestAnimationFrame(()=>{
    worldMapScroll.scrollLeft=oldCenter*cssW-worldMapScroll.clientWidth*.5;
  });
}
function locatePlayerOnWorldMap({minimumZoom=.70}={}){
  if(worldMapZoom<minimumZoom){worldMapZoom=minimumZoom;applyWorldMapZoom(false)}
  requestAnimationFrame(()=>{
    const p=mapPointForWorldX(playerWorldX);
    const px=p.x*worldMapZoom,py=p.y*worldMapZoom;
    worldMapScroll.scrollTo({
      left:Math.max(0,px-worldMapScroll.clientWidth*.5),
      top:Math.max(0,py-worldMapScroll.clientHeight*.52),
      behavior:'smooth'
    });
  });
}
function fitWholeWorldMap(){
  const availableW=Math.max(280,worldMapScroll.clientWidth-8);
  const availableH=Math.max(180,worldMapScroll.clientHeight-8);
  worldMapZoom=clamp(Math.min(availableW/WORLD_MAP_BASE_W,availableH/WORLD_MAP_BASE_H),.18,1);
  applyWorldMapZoom(false);
  requestAnimationFrame(()=>worldMapScroll.scrollTo({left:0,top:0,behavior:'smooth'}));
}
function revealWorldMap(){
  drawWorldMap();
  worldMapOverlay.classList.add('is-open');
  worldMapOverlay.setAttribute('aria-hidden','false');
  worldEl.setAttribute('inert','');
  locatePlayerOnWorldMap();
}
function openWorldMap(triggerEl=worldMapBtn){
  const shell=document.getElementById('uiShell');
  if(!shell.classList.contains('is-hidden')||worldMapOverlay.classList.contains('is-open'))return false;
  closeDebugPanel({focus:false});
  closeBackpack(true);
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  worldMapLastTrigger=triggerEl;
  paperUIFrom(triggerEl,revealWorldMap,worldMapPaper);
  return true;
}
function closeWorldMap(immediate=false){
  if(!worldMapOverlay.classList.contains('is-open'))return false;
  worldMapOverlay.classList.remove('is-open');
  worldMapOverlay.setAttribute('aria-hidden','true');
  if(document.getElementById('uiShell').classList.contains('is-hidden')&&!backpackOverlay.classList.contains('is-open'))worldEl.removeAttribute('inert');
  const restore=worldMapLastTrigger;worldMapLastTrigger=null;
  if(!immediate&&restore&&typeof restore.focus==='function')restore.focus({preventScroll:true});
  return true;
}
worldMapBtn.addEventListener('click',e=>openWorldMap(e.currentTarget));
worldMapClose.addEventListener('click',()=>closeWorldMap(false));
worldMapOverlay.addEventListener('pointerdown',e=>{if(e.target===worldMapOverlay)closeWorldMap(false)});
worldMapZoomIn.addEventListener('click',()=>{worldMapZoom=clamp(worldMapZoom+.18,.18,1.8);applyWorldMapZoom()});
worldMapZoomOut.addEventListener('click',()=>{worldMapZoom=clamp(worldMapZoom-.18,.18,1.8);applyWorldMapZoom()});
worldMapFit.addEventListener('click',fitWholeWorldMap);
worldMapLocate.addEventListener('click',()=>locatePlayerOnWorldMap({minimumZoom:.82}));
addEventListener('keydown',e=>{
  if(isEditableTarget(e.target))return;
  if(e.code==='KeyM'&&document.getElementById('uiShell').classList.contains('is-hidden')){
    e.preventDefault();
    worldMapOverlay.classList.contains('is-open')?closeWorldMap(false):openWorldMap(worldMapBtn);
  }else if(e.code==='Escape'&&worldMapOverlay.classList.contains('is-open')){
    e.preventDefault();closeWorldMap(false);
  }
});
window.PaperchalkWorldMap={
  open:openWorldMap,close:closeWorldMap,locate:locatePlayerOnWorldMap,fit:fitWholeWorldMap,redraw:drawWorldMap,
  get zoom(){return worldMapZoom}
};

/* inventory */
const INVENTORY_CAPACITY=20;
const inventoryItems=Array.from({length:INVENTORY_CAPACITY},()=>null);
let inventorySelected=-1;
let backpackClosing=false;
let lastBackpackTrigger=null;

function normalizeInventory(raw){
  const source=Array.isArray(raw)?raw:[];
  return Array.from({length:INVENTORY_CAPACITY},(_,i)=>{
    const item=source[i];
    if(!item||typeof item!=='object')return null;
    const copy={...item};
    copy.count=Math.max(1,Math.floor(Number(copy.count)||1));
    copy.weight=Math.max(0,Number(copy.weight)||0);
    return copy;
  });
}
function setInventoryFromSave(raw){
  inventoryItems.splice(0,INVENTORY_CAPACITY,...normalizeInventory(raw));
  inventorySelected=-1;
  renderInventory();
}
function inventorySnapshot(){
  return inventoryItems.map(item=>item?{...item}:null);
}
function setInventoryMessage(message){
  inventoryItemDesc.textContent=message||'';
}
function decrementInventoryItem(index,amount=1){
  const item=inventoryItems[index];
  if(!item)return false;
  const left=Math.max(0,(Number(item.count)||1)-amount);
  if(left<=0)inventoryItems[index]=null;
  else item.count=left;
  if(!inventoryItems[index])inventorySelected=-1;
  return true;
}

for(let i=0;i<INVENTORY_CAPACITY;i++){
  const slot=document.createElement('button');
  slot.type='button';
  slot.className='inventory-slot';
  slot.dataset.index=String(i);
  slot.setAttribute('aria-label','背包格 '+(i+1));
  slot.addEventListener('click',()=>{
    inventorySelected=i;
    renderInventory();
  });
  backpackSlots.appendChild(slot);
}

function renderInventoryDetail(){
  const item=inventorySelected>=0?inventoryItems[inventorySelected]:null;
  if(!item){
    inventoryPreviewImage.removeAttribute('src');
    inventoryPreviewImage.style.display='none';
    inventoryItemName.textContent='';
    inventoryItemDesc.textContent='';
    inventoryItemWeight.textContent='0.0';
    inventoryItemCount.textContent='0';
    inventoryUse.disabled=true;
    inventoryDrop.disabled=true;
    return;
  }
  inventoryPreviewImage.style.display=item.icon?'block':'none';
  if(item.icon)inventoryPreviewImage.src=item.icon;
  else inventoryPreviewImage.removeAttribute('src');
  inventoryItemName.textContent=item.name||'未命名物品';
  inventoryItemDesc.textContent=item.desc||'';
  inventoryItemWeight.textContent=Number(item.weight||0).toFixed(1);
  inventoryItemCount.textContent=String(item.count||1);
  inventoryUse.disabled=!(item.consumable===true||item.usable===true||item.action==='consume'||item.action==='heal');
  inventoryDrop.disabled=false;
}
function renderInventory(){
  [...backpackSlots.children].forEach((slot,i)=>{
    const item=inventoryItems[i];
    slot.classList.toggle('is-selected',i===inventorySelected);
    slot.setAttribute('aria-label','背包格 '+(i+1)+(item?'：'+(item.name||'物品'):'：空'));
    slot.innerHTML='';
    if(item){
      if(item.icon){
        const img=document.createElement('img');
        img.className='item-icon';img.src=item.icon;img.alt='';
        slot.appendChild(img);
      }
      if(Number(item.count||1)>1){
        const count=document.createElement('span');
        count.className='item-count';count.textContent=String(item.count);
        slot.appendChild(count);
      }
    }
  });
  renderInventoryDetail();
}
function backpackFocusables(){
  return [...backpackFrame.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])')]
    .filter(el=>!el.hidden&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none');
}
function revealBackpack(){
  backpackOverlay.classList.add('is-open');
  backpackOverlay.setAttribute('aria-hidden','false');
  worldEl.setAttribute('inert','');
}
function openBackpack(triggerEl=backpackBtn){
  const shell=document.getElementById('uiShell');
  if(!shell.classList.contains('is-hidden')||backpackClosing||backpackOverlay.classList.contains('is-open'))return;
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  lastBackpackTrigger=triggerEl;
  renderInventory();
  // Pointer-down starts this request before click; first open still stays responsive
  // and shows a paper placeholder if decoding is not finished yet.
  ensureBackpackArt();
  paperUIFrom(triggerEl,revealBackpack,backpackFrame).then(()=>{
    if(backpackOverlay.classList.contains('is-open'))backpackClose.focus({preventScroll:true});
  });
}
function closeBackpack(immediate=false){
  if(!backpackOverlay.classList.contains('is-open'))return;
  backpackClosing=true;
  backpackOverlay.classList.remove('is-open');
  backpackOverlay.setAttribute('aria-hidden','true');
  if(document.getElementById('uiShell').classList.contains('is-hidden'))worldEl.removeAttribute('inert');
  backpackClosing=false;
  const restore=lastBackpackTrigger;
  lastBackpackTrigger=null;
  if(!immediate&&restore&&typeof restore.focus==='function')restore.focus({preventScroll:true});
}
inventoryUse.addEventListener('click',()=>{
  const item=inventorySelected>=0?inventoryItems[inventorySelected]:null;
  if(!item)return;
  if(!(item.consumable===true||item.usable===true||item.action==='consume'||item.action==='heal')){
    setInventoryMessage('这个物品目前不能直接使用');
    return;
  }
  const name=item.name||'物品';
  if(item.consumable===true||item.action==='consume'||item.action==='heal'){
    if(item.action==='heal')healPlayer(Math.max(1,Number(item.heal)||1));
    decrementInventoryItem(inventorySelected,1);
    saveWorldState();
    renderInventory();
    if(inventorySelected>=0)setInventoryMessage('已使用 '+name+(item.action==='heal'?'，恢复生命':''));
  }else{
    item.lastUsedAt=Date.now();
    saveWorldState();
    setInventoryMessage('已使用 '+name);
  }
});
inventoryDrop.addEventListener('click',()=>{
  const item=inventorySelected>=0?inventoryItems[inventorySelected]:null;
  if(!item)return;
  const name=item.name||'物品';
  decrementInventoryItem(inventorySelected,1);
  saveWorldState();
  renderInventory();
  if(inventorySelected>=0)setInventoryMessage('已丢弃 1 个 '+name);
});
backpackBtn.addEventListener('pointerenter',()=>{ensureBackpackArt()},{passive:true});
backpackBtn.addEventListener('pointerdown',()=>{ensureBackpackArt()},{passive:true});
backpackBtn.addEventListener('click',e=>openBackpack(e.currentTarget));
backpackClose.addEventListener('click',()=>closeBackpack(false));
backpackOverlay.addEventListener('pointerdown',e=>{
  if(e.target===backpackOverlay)closeBackpack(false);
});
addEventListener('keydown',e=>{
  if(backpackOverlay.classList.contains('is-open')){
    if(e.code==='Escape'){
      e.preventDefault();
      closeBackpack(false);
      return;
    }
    if(e.key==='Tab'){
      const focusable=backpackFocusables();
      if(focusable.length){
        const first=focusable[0],lastFocusable=focusable[focusable.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastFocusable.focus()}
        else if(!e.shiftKey&&document.activeElement===lastFocusable){e.preventDefault();first.focus()}
        else if(!backpackFrame.contains(document.activeElement)){e.preventDefault();first.focus()}
      }
      return;
    }
  }
  if(isEditableTarget(e.target))return;
  const shell=document.getElementById('uiShell');
  if(e.code==='KeyB' && shell.classList.contains('is-hidden')){
    e.preventDefault();
    backpackOverlay.classList.contains('is-open')?closeBackpack(false):openBackpack(backpackBtn);
  }
});
renderInventory();

/* -------------------- MENU / LOCAL ACCOUNT -------------------- */
const uiShell=document.getElementById('uiShell');
const pages={
  menu:document.getElementById('pageMenu'),
  auth:document.getElementById('pageAuth'),
  settings:document.getElementById('pageSettings')
};
const profileNote=document.getElementById('profileNote');
const continueBtn=document.getElementById('continueBtn');
const enterBtn=document.getElementById('enterBtn');
const authBtn=document.getElementById('authBtn');
const settingsBtn=document.getElementById('settingsBtn');
const authMsg=document.getElementById('authMsg');

const KEY_USERS='paperchalk.localUsers.v1';
const KEY_SESSION='paperchalk.session.v1';
const KEY_SAVE_LEGACY='paperchalk.save.v1';
const KEY_SAVE_PREFIX='paperchalk.save.v2.';
const KEY_SETTINGS='paperchalk.settings.v1';

const memoryStore={};
function storageGet(key){
  try{return localStorage.getItem(key)}catch{return memoryStore[key]??null}
}
function storageSet(key,value){
  try{localStorage.setItem(key,value);return true}
  catch{memoryStore[key]=String(value);return false}
}
function storageRemove(key){
  try{localStorage.removeItem(key)}catch{delete memoryStore[key]}
}
function getUsers(){
  try{return JSON.parse(storageGet(KEY_USERS)||'{}')}catch{return{}}
}
function getSession(){
  try{return JSON.parse(storageGet(KEY_SESSION)||'null')}catch{return null}
}
function setSession(v){return storageSet(KEY_SESSION,JSON.stringify(v))}
function accountSaveKey(account){
  return KEY_SAVE_PREFIX+encodeURIComponent(String(account||''));
}
function defaultSave(session){
  return {
    account:session.account,
    location:'A村外道路',
    createdAt:Date.now(),
    worldMinutes:0,
    worldX:0,
    playerWorldX:MAP_SPAWN_X,
    playerY:0,
    actorRatio:.35,
    playerHp:PLAYER_MAX_HP,
    mapState:{broken:[],collected:[],visitedRoutes:[0],visitedNodes:['village'],exitReached:false},
    inventory:Array.from({length:INVENTORY_CAPACITY},()=>null)
  };
}
function readSaveForSession(session=getSession()){
  if(!session||!session.account)return null;
  const key=accountSaveKey(session.account);
  let raw=storageGet(key);

  // One-time compatible migration from the original shared save.
  if(!raw){
    try{
      const legacy=JSON.parse(storageGet(KEY_SAVE_LEGACY)||'null');
      if(legacy&&legacy.account===session.account){
        storageSet(key,JSON.stringify(legacy));
        raw=JSON.stringify(legacy);
      }
    }catch{}
  }
  if(!raw)return null;
  try{
    const save=JSON.parse(raw);
    return save&&save.account===session.account?save:null;
  }catch{return null}
}
function writeSaveForSession(session,save){
  if(!session||!session.account)return false;
  save.account=session.account;
  return storageSet(accountSaveKey(session.account),JSON.stringify(save));
}
function getSettings(){
  const defaults={language:'zh-CN',timeScale:1,preferLandscape:true};
  try{
    const parsed=JSON.parse(storageGet(KEY_SETTINGS)||'{}');
    return {...defaults,...parsed};
  }catch{return defaults}
}
function applySettings(settings=getSettings()){
  const scale=Number(settings.timeScale);
  worldTimeScale=Number.isFinite(scale)?Math.max(0,Math.min(20,scale)):1;
  document.documentElement.lang=settings.language==='zh-CN'?'zh-CN':'zh-CN';
  document.body.classList.toggle('prefer-landscape',settings.preferLandscape!==false);
  settingLanguage.value='zh-CN';
  settingTimeScale.value=String(worldTimeScale);
  settingLandscape.checked=settings.preferLandscape!==false;
}
function saveSettingsFromUI(){
  const settings={
    language:settingLanguage.value||'zh-CN',
    timeScale:Number(settingTimeScale.value)||0,
    preferLandscape:settingLandscape.checked
  };
  storageSet(KEY_SETTINGS,JSON.stringify(settings));
  applySettings(settings);
  settingsStatus.textContent='设置已保存';
  clearTimeout(saveSettingsFromUI._timer);
  saveSettingsFromUI._timer=setTimeout(()=>{settingsStatus.textContent=''},1200);
}
function hashText(text){
  // Synchronous local-only hash for maximum Android WebView compatibility.
  // This is a prototype local account system, not server authentication.
  let h1=0x811c9dc5,h2=0x9e3779b9;
  const t='paperchalk-local-v1|'+String(text);
  for(let i=0;i<t.length;i++){
    const c=t.charCodeAt(i);
    h1^=c; h1=Math.imul(h1,0x01000193);
    h2^=(c+i); h2=Math.imul(h2,0x85ebca6b);
  }
  return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');
}
function showPage(name){
  Object.values(pages).forEach(p=>{
    p.getAnimations().forEach(a=>a.cancel());
    p.classList.remove('active');
  });
  pages[name].classList.add('active');
  authMsg.textContent='';
  if(name==='settings'){
    applySettings();
    settingsStatus.textContent='';
  }
}
function refreshMenu(){
  const session=getSession();
  const hasSave=!!readSaveForSession(session);
  profileNote.textContent=session?'当前旅人：'+session.displayName:'尚未登录';
  continueBtn.style.display=(session&&hasSave)?'block':'none';
  enterBtn.textContent=session?'进入世界':'开始游戏';
  authBtn.textContent=session?'切换账号 / 退出':'登录 / 注册';
}
function saveWorldState(){
  const session=getSession();
  if(!session)return false;
  const save=readSaveForSession(session)||defaultSave(session);
  save.location=regionNameAt(playerWorldX);
  save.worldX=worldX;
  save.playerWorldX=playerWorldX;
  save.playerY=playerY;
  save.routeOrientation={routeIndex:orientationRouteIndex,sign:currentRouteOrientation};
  save.worldMinutes=worldMinutes;
  save.actorRatio=innerWidth>0?actorX/innerWidth:.35;
  save.playerHp=playerHp;
  save.mapState={broken:[...mapState.broken],collected:[...mapState.collected],visitedRoutes:[...mapState.visitedRoutes],visitedNodes:[...mapState.visitedNodes],exitReached:mapState.exitReached};
  save.inventory=inventorySnapshot();
  save.updatedAt=Date.now();
  return writeSaveForSession(session,save);
}
window.PaperchalkSaveNow=()=>saveWorldState();

function loadWorldState(){
  const session=getSession();
  if(!session)return;
  const save=readSaveForSession(session)||defaultSave(session);
  worldMinutes=Number.isFinite(save.worldMinutes)?save.worldMinutes:0;
  playerHp=Number.isFinite(save.playerHp)?clampPlayerHp(save.playerHp):PLAYER_MAX_HP;

  const oldRatio=Number.isFinite(save.actorRatio)?save.actorRatio:.35;
  const migratedX=Number.isFinite(save.worldX)?save.worldX+innerWidth*oldRatio:MAP_SPAWN_X;
  playerWorldX=clamp(Number.isFinite(save.playerWorldX)?save.playerWorldX:migratedX,PLAYER_BODY.halfW,MAP_WIDTH-PLAYER_BODY.halfW);
  const savedOrientation=save.routeOrientation&&typeof save.routeOrientation==='object'?save.routeOrientation:null;
  orientationRouteIndex=savedOrientation&&Number.isFinite(savedOrientation.routeIndex)?savedOrientation.routeIndex:worldZoneIndexAt(playerWorldX);
  currentRouteOrientation=savedOrientation&&savedOrientation.sign===-1?-1:1;
  if(orientationRouteIndex!==worldZoneIndexAt(playerWorldX)){orientationRouteIndex=worldZoneIndexAt(playerWorldX);currentRouteOrientation=1}
  sceneryOffsetX=0;
  updateMapInteractions._zone=worldZoneIndexAt(playerWorldX);
  playerY=Math.max(0,Number.isFinite(save.playerY)?save.playerY:0);
  playerVy=0;playerGrounded=supportAt(playerWorldX,playerY,5)!==null;
  if(!playerGrounded){playerY=0;playerGrounded=true}
  resetPlayerPoseState();

  const savedMap=save.mapState&&typeof save.mapState==='object'?save.mapState:{};
  mapState.broken=new Set(Array.isArray(savedMap.broken)?savedMap.broken:[]);
  mapState.collected=new Set(Array.isArray(savedMap.collected)?savedMap.collected:[]);
  mapState.visitedRoutes=new Set(Array.isArray(savedMap.visitedRoutes)?savedMap.visitedRoutes:[worldZoneIndexAt(playerWorldX)]);
  mapState.visitedNodes=new Set(Array.isArray(savedMap.visitedNodes)?savedMap.visitedNodes:['village']);
  mapState.exitReached=!!savedMap.exitReached;
  markRuntimeMapChanged();
  buildMapVisuals();

  setInventoryFromSave(save.inventory);
  renderPlayerHealth();
  updateCamera();
  renderWorld();
}
function openUI(fromWorld=false){
  closeDebugPanel({focus:false});
  closeWorldMap(true);
  closeBackpack(true);
  if(fromWorld)saveWorldState();
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  uiShell.getAnimations().forEach(a=>a.cancel());
  uiShell.removeAttribute('inert');
  worldEl.setAttribute('inert','');
  refreshMenu();
  showPage('menu');
  uiShell.classList.remove('is-hidden');
  uiShell.classList.remove('board-enter');
  window.dispatchEvent(new CustomEvent('paperchalk-world-leave'));
}
function enterWorld(){
  closeDebugPanel({focus:false});
  closeWorldMap(true);
  closeBackpack(true);
  const session=getSession();
  if(!session){showPage('auth');return}
  if(!readSaveForSession(session))writeSaveForSession(session,defaultSave(session));
  loadWorldState();
  if(enemies.some(e=>!e.spawned||e.account!==session.account))resetMapEnemies();
  keyboardLeft=keyboardRight=false;
  resetJoystick();
  uiShell.getAnimations().forEach(a=>a.cancel());
  uiShell.classList.add('is-hidden');
  uiShell.classList.remove('board-enter');
  uiShell.setAttribute('inert','');
  worldEl.removeAttribute('inert');
  window.dispatchEvent(new CustomEvent('paperchalk-world-enter'));
  warmPaperFxWhenIdle();
  backpackBtn.focus({preventScroll:true});
}
document.getElementById('worldMenuBtn').addEventListener('click',e=>{
  paperUIFrom(e.currentTarget,()=>openUI(true),uiShell);
});
continueBtn.addEventListener('click',enterWorld);
enterBtn.addEventListener('click',enterWorld);
settingsBtn.addEventListener('click',e=>{
  paperUIFrom(e.currentTarget,()=>showPage('settings'),pages.settings);
});
document.querySelectorAll('[data-back="menu"]').forEach(b=>b.addEventListener('click',e=>{
  paperUIFrom(e.currentTarget,()=>showPage('menu'),pages.menu);
}));

authBtn.addEventListener('click',e=>{
  const trigger=e.currentTarget;
  paperUIFrom(trigger,()=>{
    const session=getSession();
    if(session){
      saveWorldState();
      storageRemove(KEY_SESSION);
      setInventoryFromSave([]);
      worldX=0;sceneryOffsetX=0;playerWorldX=MAP_SPAWN_X;orientationRouteIndex=0;currentRouteOrientation=1;playerY=0;playerVy=0;playerGrounded=true;coyoteTimer=COYOTE_TIME;jumpBufferTimer=0;resetPlayerPoseState();updateMapInteractions._zone=0;
      mapState.broken.clear();mapState.collected.clear();mapState.visitedRoutes=new Set([0]);mapState.visitedNodes=new Set(['village']);mapState.exitReached=false;markRuntimeMapChanged();buildMapVisuals();
      enemies.forEach(e=>{e.spawned=false;e.alive=true;e.el.classList.remove('is-dead','is-moving','is-attacking')});
      worldMinutes=0;
      playerHp=PLAYER_MAX_HP;
      updateCamera();renderPlayerHealth();renderWorld();
      refreshMenu();
    }
    showPage('auth');
  },pages.auth);
});

settingLanguage.addEventListener('change',saveSettingsFromUI);
settingTimeScale.addEventListener('change',saveSettingsFromUI);
settingLandscape.addEventListener('change',saveSettingsFromUI);
applySettings();

const tabLogin=document.getElementById('tabLogin');
const tabRegister=document.getElementById('tabRegister');
const loginForm=document.getElementById('loginForm');
const registerForm=document.getElementById('registerForm');
function setAuthTab(mode){
  const isLogin=mode==='login';
  tabLogin.classList.toggle('active',isLogin);
  tabRegister.classList.toggle('active',!isLogin);
  loginForm.classList.toggle('hidden',!isLogin);
  registerForm.classList.toggle('hidden',isLogin);
  authMsg.textContent='';
}
tabLogin.addEventListener('click',()=>setAuthTab('login'));
tabRegister.addEventListener('click',()=>setAuthTab('register'));

registerForm.addEventListener('submit',e=>{
  e.preventDefault();
  authMsg.textContent='';
  try{
    const rawAccount=document.getElementById('regUser').value.trim();
    const account=rawAccount.toLocaleLowerCase();
    const displayName=document.getElementById('regName').value.trim();
    const pass=document.getElementById('regPass').value;

    if(account.length<2||account.length>24){
      authMsg.textContent='账号需要 2–24 个字符';return;
    }
    if(/\s/.test(account)){
      authMsg.textContent='账号中不能包含空格';return;
    }
    if(displayName.length<1||displayName.length>16){
      authMsg.textContent='旅人名称需要 1–16 个字符';return;
    }
    if(pass.length<4){
      authMsg.textContent='密码至少 4 位';return;
    }

    const users=getUsers();
    if(users[account]){
      authMsg.textContent='这个账号已经存在，可以切换到“登录”';return;
    }

    users[account]={
      displayName,
      passwordHash:hashText(pass),
      createdAt:Date.now()
    };

    const usersPersisted=storageSet(KEY_USERS,JSON.stringify(users));
    setSession({account,displayName});
    refreshMenu();

    if(!usersPersisted){
      authMsg.textContent='当前环境无法持久保存账号，已临时进入游戏';
    }
    enterWorld();
  }catch(err){
    console.error('REGISTER_FAILED',err);
    authMsg.textContent='注册失败：'+(err&&err.message?err.message:'未知错误');
  }
});

window.PaperchalkHandleBack=function(){
  if(dialogueIsOpen()){
    closeDialogue();
    return true;
  }
  if(debugIsOpen()){
    closeDebugPanel({focus:false});
    return true;
  }
  if(worldMapOverlay.classList.contains('is-open')){
    closeWorldMap(false);
    return true;
  }
  if(backpackOverlay.classList.contains('is-open')){
    closeBackpack(false);
    return true;
  }
  if(uiShell.classList.contains('is-hidden')){
    openUI(true);
    return true;
  }
  if(!pages.menu.classList.contains('active')){
    showPage('menu');
    refreshMenu();
    return true;
  }
  return false;
};

loginForm.addEventListener('submit',e=>{
  e.preventDefault();
  authMsg.textContent='';
  try{
    const account=document.getElementById('loginUser').value.trim().toLocaleLowerCase();
    const pass=document.getElementById('loginPass').value;
    const users=getUsers();
    const user=users[account];

    if(!user){authMsg.textContent='未找到这个账号';return}
    if(user.passwordHash!==hashText(pass)){authMsg.textContent='密码不正确';return}

    setSession({account,displayName:user.displayName});
    refreshMenu();
    enterWorld();
  }catch(err){
    console.error('LOGIN_FAILED',err);
    authMsg.textContent='登录失败：'+(err&&err.message?err.message:'未知错误');
  }
});

/* show fatal runtime problems instead of silently ignoring taps */
addEventListener('unhandledrejection',e=>{
  console.error('UNHANDLED_REJECTION',e.reason);
  if(!uiShell.classList.contains('is-hidden')){
    authMsg.textContent='运行错误：'+(e.reason&&e.reason.message?e.reason.message:String(e.reason||'未知错误'));
  }
});
addEventListener('pagehide',saveWorldState);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&worldInteractive())saveWorldState()});

/* first launch always lands on main menu, no prologue */
refreshMenu();
openUI(false);
