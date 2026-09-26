import {loadPaperPuppet} from '../puppet/paper-puppet-runtime.mjs';
const PIXI_MODULE='../../vendor/pixi/pixi-8.21.0.mjs';
const STORAGE_KEY='paperchalk.renderer.v1';
const world=document.getElementById('world');
const host=document.getElementById('pixiEntityLayer');
const runtime=window.PaperchalkRuntime;

let app=null;
let Assets=null,Container=null,Graphics=null,Sprite=null;
let playerNode=null;
let playerPuppet=null;
let enemyNodes=[];
let latestFrame=null;
let unsubscribe=null;
let initPromise=null;
let activeMode='dom';
let requestedMode='auto';
let worldSessionActive=false;
let visualRaf=0;
let lastVisualRender=0;
let lastViewportW=-1,lastViewportH=-1;
const forcedRendererQuery=new URL(location.href).searchParams.has('renderer');

const coarsePointer=matchMedia('(pointer:coarse)').matches;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const stats={
  ready:false,
  fallback:false,
  reason:'',
  frameCount:0,
  snapshotRevision:0,
  renderedEnemies:0,
  renderer:'',
  resolution:1,
  playerDisplayW:0,
  playerDisplayH:0,
  playerAction:'idle',
  playerActionScale:1,
  playerSourceFacing:1,
  renderMs:0,
  maxRenderMs:0,
  playerScreenX:0,
  playerWorldX:0,
  playerPuppetReady:false,
  playerPuppetMode:'legacy',
  playerPuppetLayers:0,
  playerPuppetReason:''
};

function safeStorageGet(key){
  try{return localStorage.getItem(key)}catch{return null}
}
function safeStorageSet(key,value){
  try{localStorage.setItem(key,value)}catch{}
}
function normalizeMode(value){
  value=String(value||'').toLowerCase();
  return value==='pixi'||value==='dom'||value==='auto'?value:'auto';
}
function modeFromLocation(){
  const q=new URL(location.href).searchParams.get('renderer');
  return q?normalizeMode(q):normalizeMode(safeStorageGet(STORAGE_KEY)||'auto');
}
function autoMode(){
  // Production parity first: desktop and mobile use the same DOM entity backend.
  // Pixi/WebGL remains available through debug or ?renderer=pixi for controlled A/B tests.
  return 'dom';
}
function resolvedMode(value){
  const normalized=normalizeMode(value);
  return normalized==='auto'?autoMode():normalized;
}
function fitSpriteExact(sprite,texture,targetW,targetH){
  const tw=Math.max(1,Number(texture.width)||1);
  const th=Math.max(1,Number(texture.height)||1);
  const sx=targetW/tw;
  const sy=targetH/th;
  sprite.scale.set(sx,sy);
  return {x:sx,y:sy,w:targetW,h:targetH};
}
function playerVisualSize(){
  const size=runtime?.worldData?.playerVisual;
  return {
    w:Number(size?.w)||104,
    h:Number(size?.h)||156
  };
}
const cardCamera=window.PaperchalkCardCamera;

function projectCard(frame,x,z=0,y=0){
  if(!cardCamera)return {visible:false,x:0,y:0,scale:0,depth:0};
  return cardCamera.project({
    worldX:x,worldZ:z,worldY:y,
    playerX:frame.player?.x,playerY:frame.player?.y,cameraZ:frame.camera?.z||0,
    screenX:frame.player?.screenX,viewportHeight:frame.viewport?.height,groundY:frame.viewport?.groundY
  });
}
function playerActionMeta(state){
  const meta=runtime?.worldData?.playerActionMeta?.[state]||runtime?.worldData?.playerActionMeta?.idle;
  return {
    scale:Number(meta?.scale)||1,
    sourceFacing:Number(meta?.sourceFacing)===-1?-1:1
  };
}
function makePlayer(textures){
  const root=new Container();
  root.eventMode='none';
  root.interactiveChildren=false;

  const shadow=new Graphics()
    .ellipse(0,0,38,8)
    .fill({color:0x312519,alpha:.30});
  const initial=textures.idle||Object.values(textures)[0];
  const sprite=new Sprite(initial);
  sprite.anchor.set(.5,1);
  const target=playerVisualSize();
  const meta=playerActionMeta('idle');
  const scale=fitSpriteExact(sprite,initial,target.w*meta.scale,target.h*meta.scale);

  root.addChild(shadow,sprite);
  return {root,shadow,sprite,scale,textures,action:'idle',meta};
}
function makePuppetPlayer(puppet){
  const root=new Container();
  root.eventMode='none';
  root.interactiveChildren=false;
  const shadow=new Graphics()
    .ellipse(0,0,38,8)
    .fill({color:0x312519,alpha:.30});
  puppet.root.position.set(0,0);
  root.addChild(shadow,puppet.root);
  return {
    root,shadow,puppet,isPuppet:true,action:'idle',lastNow:performance.now(),
    meta:{scale:1,sourceFacing:1}
  };
}
function makeEnemy(texture,id){
  const root=new Container();
  root.label=id;
  root.eventMode='none';
  root.interactiveChildren=false;

  const sprite=new Sprite(texture);
  sprite.anchor.set(.5,1);
  const scale=fitSpriteExact(sprite,texture,112,132);

  const health=new Container();
  health.position.set(-36,-142);
  const bg=new Graphics()
    .roundRect(0,0,72,7,3)
    .fill(0xd7c49f)
    .stroke({width:1,color:0x66533d});
  const fill=new Graphics()
    .roundRect(1,1,70,5,2)
    .fill(0x7e2f2d);
  health.addChild(bg,fill);

  root.addChild(sprite,health);
  return {root,sprite,health,fill,scale};
}
function syncStaticScale(frame){
  if(!playerNode)return;
  if(playerNode.isPuppet){
    const target=playerVisualSize();
    playerNode.puppet?.setDisplaySize?.(target.w,target.h);
    const s=playerNode.puppet?.stats||{};
    stats.playerDisplayW=Number(s.displayW)||target.w;
    stats.playerDisplayH=Number(s.displayH)||target.h;
    stats.playerActionScale=Number(s.scale)||1;
    stats.playerSourceFacing=Number(playerNode.puppet?.sourceFacing)===-1?-1:1;
    return;
  }
  const texture=playerNode.sprite.texture;
  const target=playerVisualSize();
  const meta=playerActionMeta(playerNode.action||'idle');
  playerNode.meta=meta;
  playerNode.scale=fitSpriteExact(playerNode.sprite,texture,target.w*meta.scale,target.h*meta.scale);
  stats.playerDisplayW=target.w*meta.scale;
  stats.playerDisplayH=target.h*meta.scale;
  stats.playerActionScale=meta.scale;
  stats.playerSourceFacing=meta.sourceFacing;
}
function renderPlayer(frame,now){
  const p=frame.player,v=frame.viewport;
  const node=playerNode;
  if(!node)return;

  const action=p.action||'idle';
  // Player is a fixed screen anchor. Vertical simulation moves the world,
  // not the player sprite.
  const footY=v.height-v.groundY;
  if(node.isPuppet){
    const dt=Math.min(.05,Math.max(0,(now-node.lastNow)/1000));
    node.lastNow=now;
    node.action=action;
    const target=playerVisualSize();
    node.puppet.setDisplaySize?.(target.w,target.h);
    node.puppet.update({
      ...p,
      action,
      air:Math.max(0,p.y),
      vx:p.moving?(p.facing*240):0
    },dt,now);
    const sourceFacing=Number(node.puppet.sourceFacing)===-1?-1:1;
    const baseX=Math.max(.0001,Math.abs(node.puppet.root.scale.x)||1);
    node.puppet.root.scale.x=baseX*p.facing*sourceFacing;
    node.root.position.set(p.screenX,footY);
    node.root.alpha=p.invulnerable?.78:1;
    const air=Math.max(0,p.y);
    const shadowScale=Math.max(.62,1-air/430);
    node.shadow.scale.set(shadowScale,shadowScale);
    node.shadow.alpha=Math.max(.12,.34-air/620);
    node.shadow.y=air;
    stats.playerAction=action;
    stats.playerActionScale=Number(node.puppet.stats?.scale)||1;
    stats.playerSourceFacing=sourceFacing;
    stats.playerDisplayW=Number(node.puppet.stats?.displayW)||target.w;
    stats.playerDisplayH=Number(node.puppet.stats?.displayH)||target.h;
    stats.playerScreenX=p.screenX;
    stats.playerWorldX=p.x;
    return;
  }
  if(action!==node.action&&node.textures[action]){
    node.action=action;
    node.sprite.texture=node.textures[action];
    const target=playerVisualSize();
    const meta=playerActionMeta(action);
    node.meta=meta;
    node.scale=fitSpriteExact(node.sprite,node.sprite.texture,target.w*meta.scale,target.h*meta.scale);
    stats.playerAction=action;
    stats.playerActionScale=meta.scale;
    stats.playerSourceFacing=meta.sourceFacing;
    stats.playerDisplayW=target.w*meta.scale;
    stats.playerDisplayH=target.h*meta.scale;
  }

  let bob=0,rotation=0,offsetX=0;
  if(action==='walk'&&p.grounded){
    const phase=now*.011;
    bob=-1.8*(.5+.5*Math.sin(phase));
    rotation=Math.sin(phase*.5)*.012;
  }else if(action==='idle'&&p.grounded){
    bob=-.55*(.5+.5*Math.sin(now*.003));
    rotation=Math.sin(now*.0024)*.0025;
  }else if(action==='crouch'&&p.grounded){
    bob=-.35*(.5+.5*Math.sin(now*.0034));
  }
  if(p.attacking){
    const progress=Math.max(0,Math.min(1,(.30-p.attackTimer)/.30));
    const swing=Math.sin(progress*Math.PI);
    offsetX=p.facing*12*swing;
    rotation+=p.facing*.13*swing;
  }

  node.root.position.set(p.screenX+offsetX,footY+bob);
  const sourceFacing=node.meta?.sourceFacing===-1?-1:1;
  node.sprite.scale.x=Math.abs(node.scale.x)*p.facing*sourceFacing;
  node.sprite.scale.y=Math.abs(node.scale.y);
  node.sprite.rotation=rotation;
  node.sprite.alpha=p.invulnerable?.78:1;

  const air=Math.max(0,p.y);
  const shadowScale=Math.max(.62,1-air/430);
  node.shadow.scale.set(shadowScale,shadowScale);
  node.shadow.alpha=Math.max(.12,.34-air/620);
  // Keep the shadow on the ground while the player sprite rises.
  node.shadow.y=air;

  stats.playerScreenX=p.screenX;
  stats.playerWorldX=p.x;
}
function renderEnemies(frame,now){
  const v=frame.viewport;
  let rendered=0;
  for(let i=0;i<enemyNodes.length;i++){
    const data=frame.enemies[i],node=enemyNodes[i];
    if(!data||!node){continue}
    const projection=projectCard(frame,data.x,data.z||0,0);
    const inView=projection.visible&&projection.x>-220&&projection.x<v.width+220&&projection.y>-220&&projection.y<v.height+220;
    node.root.visible=inView;
    if(!inView)continue;
    rendered++;

    let bob=0,offsetX=0,rotation=0;
    if(data.alive&&(data.state==='patrol'||data.state==='chase')){
      bob=-1.5*(.5+.5*Math.sin(now*.009+i*.73));
      rotation=Math.sin(now*.0045+i)*.006;
    }
    if(data.alive&&data.attackTimer>0){
      const progress=Math.max(0,Math.min(1,(.34-data.attackTimer)/.34));
      offsetX=data.facing*10*Math.sin(progress*Math.PI);
      rotation+=data.facing*.10*Math.sin(progress*Math.PI);
    }
    if(data.alive&&data.hitstun>0){
      offsetX-=data.facing*6*(data.hitstun/.22);
      rotation-=data.facing*.06*(data.hitstun/.22);
    }

    node.root.position.set(projection.x+offsetX,projection.y+bob);
    node.root.scale.set(projection.scale,projection.scale);
    node.sprite.scale.x=Math.abs(node.scale.x)*data.facing;
    node.sprite.scale.y=Math.abs(node.scale.y);
    node.root.alpha=data.alive?1:.18;
    node.root.rotation=data.alive?rotation:(84*Math.PI/180);
    node.health.visible=data.alive;
    node.fill.scale.x=Math.max(0,Math.min(1,data.hp/3));
  }
  stats.renderedEnemies=rendered;
}
function renderFrame(frame=latestFrame,now=performance.now()){
  if(activeMode!=='pixi'||!frame||!app)return;
  const started=performance.now();
  renderPlayer(frame,now);
  renderEnemies(frame,now);
  app.renderer.render(app.stage);
  const elapsed=performance.now()-started;
  stats.renderMs=stats.frameCount===0?elapsed:(stats.renderMs*.90+elapsed*.10);
  stats.maxRenderMs=Math.max(stats.maxRenderMs,elapsed);
  stats.frameCount++;
}
function stopVisualLoop(){
  if(visualRaf)cancelAnimationFrame(visualRaf);
  visualRaf=0;
  lastVisualRender=0;
}
function visualLoop(now){
  if(!worldSessionActive||activeMode!=='pixi'){
    visualRaf=0;
    lastVisualRender=0;
    return;
  }
  // Layered paper-puppet physics (hair/skirt/breath) is visual state, not
  // simulation state. Keep it independent of the allocation-free game loop.
  // Phones are capped at 30 fps to avoid recreating the heat/lag problem that
  // prompted the renderer split; desktop can use 60 fps.
  const interval=coarsePointer?1000/30:1000/60;
  if(!lastVisualRender||now-lastVisualRender>=interval){
    lastVisualRender=now;
    renderFrame(latestFrame,now);
  }
  visualRaf=requestAnimationFrame(visualLoop);
}
function startVisualLoop(){
  if(visualRaf||!worldSessionActive||activeMode!=='pixi')return;
  visualRaf=requestAnimationFrame(visualLoop);
}
async function ensurePixi(){
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    if(!runtime||!host||!world)throw new Error('Paperchalk runtime/host unavailable');

    const pixi=await import(PIXI_MODULE);
    const Application=pixi.Application;
    Assets=pixi.Assets;Container=pixi.Container;Graphics=pixi.Graphics;Sprite=pixi.Sprite;

    app=new Application();
    const dpr=Math.max(1,Math.min(Number(devicePixelRatio)||1,coarsePointer?1.25:1.5));
    await app.init({
      resizeTo:world,
      backgroundAlpha:0,
      antialias:false,
      autoDensity:true,
      resolution:dpr,
      preference:'webgl',
      powerPreference:'high-performance',
      autoStart:false
    });
    app.canvas.className='pixi-entity-canvas';
    app.canvas.setAttribute('aria-hidden','true');
    host.appendChild(app.canvas);

    const actionUrls=runtime.worldData?.playerActions||{
      idle:'./assets/player/idle.webp?v=actions-r1',
      crouch:'./assets/player/crouch.webp?v=actions-r1',
      'jump-up':'./assets/player/jump-up.webp?v=actions-r1',
      'jump-down':'./assets/player/jump-down.webp?v=actions-r1',
      walk:'./assets/player/walk.webp?v=actions-r1'
    };
    try{
      playerPuppet=await loadPaperPuppet(
        {Assets,Container,Sprite},
        './assets/puppets/player/manifest.json?v=puppet-r1'
      );
      playerNode=makePuppetPlayer(playerPuppet);
      stats.playerPuppetReady=true;
      stats.playerPuppetMode=playerPuppet.kind||'layered';
      stats.playerPuppetLayers=Number(playerPuppet.stats?.layers)||0;
      stats.playerPuppetReason='';
    }catch(err){
      playerPuppet=null;
      stats.playerPuppetReady=false;
      stats.playerPuppetMode='legacy';
      stats.playerPuppetLayers=0;
      stats.playerPuppetReason=String(err?.message||err);
      const actionEntries=await Promise.all(
        Object.entries(actionUrls).map(async([state,url])=>[state,await Assets.load(url)])
      );
      const playerTextures=Object.fromEntries(actionEntries);
      playerNode=makePlayer(playerTextures);
      console.warn('PAPER_PUPPET_FALLBACK',err);
    }
    const enemyTexture=await Assets.load('./assets/enemies/rag-drifter.svg?v=1');

    app.stage.addChild(playerNode.root);

    const spawns=runtime.worldData?.enemySpawns||[];
    enemyNodes=spawns.map(s=>makeEnemy(enemyTexture,s.id));
    for(const node of enemyNodes)app.stage.addChild(node.root);

    unsubscribe=runtime.subscribe(frame=>{
      const resized=lastViewportW!==frame.viewport.width||lastViewportH!==frame.viewport.height;
      latestFrame=frame;
      stats.snapshotRevision=frame.revision;
      if(resized){
        lastViewportW=frame.viewport.width;
        lastViewportH=frame.viewport.height;
        syncStaticScale(frame);
      }
      // The simulation owns the only RAF loop. Rendering here avoids a second ticker
      // and guarantees visual updates are synchronized to authoritative game state.
      if(worldSessionActive&&activeMode==='pixi'&&!visualRaf)renderFrame(frame,performance.now());
    });

    stats.ready=true;
    stats.renderer=app.renderer?.constructor?.name||'WebGL';
    stats.resolution=dpr;
  })().catch(err=>{
    stats.fallback=true;
    stats.reason=String(err?.message||err);
    console.warn('PIXI_DYNAMIC_RENDERER_FALLBACK',err);
    throw err;
  });
  return initPromise;
}
function dispatchMode(){
  window.dispatchEvent(new CustomEvent('paperchalk-renderer-change',{detail:{mode:activeMode,requested:requestedMode}}));
}
async function setMode(value,{persist=true}={}){
  requestedMode=normalizeMode(value);
  if(persist)safeStorageSet(STORAGE_KEY,requestedMode);
  const target=resolvedMode(requestedMode);

  if(target==='pixi'){
    try{
      await ensurePixi();
      host.hidden=!worldSessionActive;
      world.classList.add('renderer-pixi-dynamic');
      activeMode='pixi';
      if(worldSessionActive||forcedRendererQuery)renderFrame(latestFrame,performance.now());
      startVisualLoop();
      dispatchMode();
      return activeMode;
    }catch{
      host.hidden=true;
      world.classList.remove('renderer-pixi-dynamic');
      activeMode='dom';
      runtime?.requestDomSync?.();
      dispatchMode();
      return activeMode;
    }
  }

  stopVisualLoop();
  world.classList.remove('renderer-pixi-dynamic');
  host.hidden=true;
  activeMode='dom';
  runtime?.requestDomSync?.();
  dispatchMode();
  return activeMode;
}

async function activateWorld(){
  worldSessionActive=true;
  const mode=await setMode(requestedMode,{persist:false});
  if(mode==='pixi'){
    host.hidden=false;
    renderFrame(latestFrame,performance.now());
    startVisualLoop();
  }
  return mode;
}
function suspendWorld(){
  worldSessionActive=false;
  stopVisualLoop();
  host.hidden=true;
}

window.PaperchalkRenderer={
  version:3,
  setMode,
  activateWorld,
  suspendWorld,
  get mode(){return activeMode},
  get requested(){return requestedMode},
  get resolved(){return resolvedMode(requestedMode)},
  get active(){return worldSessionActive},
  get stats(){return {...stats}},
  get ready(){return stats.ready}
};

requestedMode=modeFromLocation();
// Explicit query mode is a developer/test override. Normal auto mode stays cold
// on the menu and only imports Pixi/character textures after entering the world.
if(forcedRendererQuery){
  worldSessionActive=true;
  setMode(requestedMode,{persist:false});
}

window.addEventListener('paperchalk-world-enter',()=>activateWorld());
window.addEventListener('paperchalk-world-leave',()=>suspendWorld());
window.addEventListener('pagehide',()=>{
  stopVisualLoop();
  try{unsubscribe?.()}catch{}
});
