const PIXI_MODULE='../../vendor/pixi/pixi-8.21.0.mjs';
const STORAGE_KEY='paperchalk.renderer.v1';
const world=document.getElementById('world');
const host=document.getElementById('pixiEntityLayer');
const runtime=window.PaperchalkRuntime;

let app=null;
let Assets=null,Container=null,Graphics=null,Sprite=null;
let playerNode=null;
let enemyNodes=[];
let latestFrame=null;
let unsubscribe=null;
let initPromise=null;
let activeMode='dom';
let requestedMode='auto';
let lastViewportW=-1,lastViewportH=-1;

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
  playerScreenX:0,
  playerWorldX:0
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
  // GPU dynamic entities matter most on touch/mobile WebViews; desktop keeps the
  // already-stable DOM path unless explicitly opted in for A/B comparison.
  return coarsePointer&&!reducedMotion?'pixi':'dom';
}
function resolvedMode(value){
  const normalized=normalizeMode(value);
  return normalized==='auto'?autoMode():normalized;
}
function fitSprite(sprite,texture,maxW,maxH){
  const tw=Math.max(1,Number(texture.width)||1);
  const th=Math.max(1,Number(texture.height)||1);
  const scale=Math.min(maxW/tw,maxH/th);
  sprite.scale.set(scale,scale);
  return scale;
}
function makePlayer(texture){
  const root=new Container();
  root.eventMode='none';
  root.interactiveChildren=false;

  const shadow=new Graphics()
    .ellipse(0,0,38,8)
    .fill({color:0x312519,alpha:.30});
  const sprite=new Sprite(texture);
  sprite.anchor.set(.5,1);
  const scale=fitSprite(sprite,texture,126,150);

  root.addChild(shadow,sprite);
  return {root,shadow,sprite,scale};
}
function makeEnemy(texture,id){
  const root=new Container();
  root.label=id;
  root.eventMode='none';
  root.interactiveChildren=false;

  const sprite=new Sprite(texture);
  sprite.anchor.set(.5,1);
  const scale=fitSprite(sprite,texture,112,132);

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
  const mobile=frame.viewport.width<=800||frame.viewport.height<=520;
  const maxW=mobile?106:126;
  const texture=playerNode.sprite.texture;
  playerNode.scale=fitSprite(playerNode.sprite,texture,maxW,mobile?128:150);
}
function renderPlayer(frame,now){
  const p=frame.player,v=frame.viewport;
  const node=playerNode;
  if(!node)return;

  const footY=v.height-v.groundY-p.y;
  let bob=0,rotation=0,offsetX=0;
  if(p.moving&&p.grounded){
    const phase=now*.011;
    bob=-1.8*(.5+.5*Math.sin(phase));
    rotation=Math.sin(phase*.5)*.012;
  }
  if(p.attacking){
    const progress=Math.max(0,Math.min(1,(.30-p.attackTimer)/.30));
    const swing=Math.sin(progress*Math.PI);
    offsetX=p.facing*12*swing;
    rotation+=p.facing*.13*swing;
  }

  node.root.position.set(p.screenX+offsetX,footY+bob);
  node.sprite.scale.x=Math.abs(node.scale)*p.facing;
  node.sprite.scale.y=Math.abs(node.scale);
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
  const v=frame.viewport,cameraX=frame.camera.x;
  let rendered=0;
  for(let i=0;i<enemyNodes.length;i++){
    const data=frame.enemies[i],node=enemyNodes[i];
    if(!data||!node){continue}
    const screenX=data.x-cameraX;
    const inView=screenX>-180&&screenX<v.width+180;
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

    node.root.position.set(screenX+offsetX,v.height-v.groundY+bob);
    node.sprite.scale.x=Math.abs(node.scale)*data.facing;
    node.sprite.scale.y=Math.abs(node.scale);
    node.root.alpha=data.alive?1:.18;
    node.root.rotation=data.alive?rotation:(84*Math.PI/180);
    node.health.visible=data.alive;
    node.fill.scale.x=Math.max(0,Math.min(1,data.hp/3));
  }
  stats.renderedEnemies=rendered;
}
function renderFrame(){
  if(activeMode!=='pixi'||!latestFrame||!app)return;
  const now=performance.now();
  renderPlayer(latestFrame,now);
  renderEnemies(latestFrame,now);
  stats.frameCount++;
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
      powerPreference:'high-performance'
    });
    app.canvas.className='pixi-entity-canvas';
    app.canvas.setAttribute('aria-hidden','true');
    host.appendChild(app.canvas);

    const [playerTexture,enemyTexture]=await Promise.all([
      Assets.load('./assets/traveler.webp?v=traveler-r3'),
      Assets.load('./assets/enemies/rag-drifter.svg?v=1')
    ]);

    playerNode=makePlayer(playerTexture);
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
    });

    app.ticker.add(renderFrame);
    app.ticker.stop();

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
      host.hidden=false;
      world.classList.add('renderer-pixi-dynamic');
      activeMode='pixi';
      app.ticker.start();
      renderFrame();
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

  world.classList.remove('renderer-pixi-dynamic');
  host.hidden=true;
  activeMode='dom';
  app?.ticker?.stop();
  runtime?.requestDomSync?.();
  dispatchMode();
  return activeMode;
}

window.PaperchalkRenderer={
  version:2,
  setMode,
  get mode(){return activeMode},
  get requested(){return requestedMode},
  get resolved(){return resolvedMode(requestedMode)},
  get stats(){return {...stats}},
  get ready(){return stats.ready}
};

requestedMode=modeFromLocation();
setMode(requestedMode,{persist:false});

document.addEventListener('visibilitychange',()=>{
  if(!app)return;
  if(document.hidden)app.ticker.stop();
  else if(activeMode==='pixi')app.ticker.start();
});

window.addEventListener('pagehide',()=>{
  try{unsubscribe?.()}catch{}
});
