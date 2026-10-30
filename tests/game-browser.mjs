import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const urlPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(urlPath==='/'?'/index.html':urlPath));
  if(!path.startsWith(root+'/'))throw Error('bad route');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const origin='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/game',{recursive:true});
const official=new Set(['57,54,87,255','242,165,194,255','169,186,233,255','255,245,230,255','0,0,0,0']);
const state=page=>page.evaluate(()=>window.__PAPERWORLD_MENU__);
async function clicked(page,i){
 const m=await state(page),b=m.buttons[i];
 assert.ok(b,'button '+i+' exists in '+m.state);
 const r=await page.locator('#menu').boundingBox();
 await page.mouse.click(r.x+(b.x+b.w/2)/m.logical[0]*r.width,r.y+(b.y+b.h/2)/m.logical[1]*r.height);
}
async function waitScene(page,which){
 await page.waitForFunction(name=>window.__PAPERWORLD_MENU__?.state===name&&!window.__PAPERWORLD_MENU__?.transition,which,{timeout:10000});
}
async function exactCanvasColors(page){
 return page.evaluate(()=>{
  const c=document.querySelector('#menu'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();
  for(let i=0;i<d.length;i+=4)colors.add([d[i],d[i+1],d[i+2],d[i+3]].join(','));
  return [...colors];
 });
}
try{
 for(const [screen,width,height] of [['portrait',390,844],['landscape',844,390],['tablet',768,1024],['desktop',1440,900]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:screen!=='desktop',isMobile:screen!=='desktop',reducedMotion:'no-preference'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(origin,{waitUntil:'load'});
  try{await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.buttons?.length===5,null,{timeout:9000})}
  catch(e){
   const diagnostics=await page.evaluate(()=>({
    ready:document.readyState,menu:window.__PAPERWORLD_MENU__??null,
    scripts:[...document.scripts].map(x=>x.src),href:location.href
   }));
   console.error('STARTUP_DIAGNOSTICS',screen,errors,JSON.stringify(diagnostics));
   throw e;
  }
  const home=await state(page);
  assert.equal(home.state,'menu');
  assert.ok(home.buttons.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=home.logical[0]&&b.y+b.h<=home.logical[1]));
  assert.ok((await exactCanvasColors(page)).every(c=>official.has(c)));
  await page.screenshot({path:'artifacts/game/'+screen+'-home.png'});

  // Any touch, even blank space, should show just a few visible square pixels.
  await page.mouse.click(width/2,26);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.particleCount===7);
  await page.waitForTimeout(370);
  assert.equal((await state(page)).particleCount,0);
  // Real three-dimensional scene: WebGL triangles, depth, and independent yaw/pitch/roll.
  await clicked(page,2);
  await waitScene(page,'world');
  await page.waitForFunction(()=>window.__PAPERWORLD_WORLD3D__?.triangles>200);
  assert.ok((await page.locator('#pw-world-canvas').evaluate(el=>el.width))>30);
  assert.ok((await page.locator('#pw-world-canvas').evaluate(el=>el.height))>30);
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-real-perspective.png'});

   // Spatial opening activity: pickup is possible at spawn, but delivery
   // cannot grant currency until the player actually reaches the storefront.
   const firstDay=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.shop);
   assert.equal(firstDay.phase,'pickup');
   assert.equal(firstDay.cash,0);
   await page.locator('#pw-shop-interact').click();
   const carrying=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.shop);
   assert.equal(carrying.phase,'deliver');
   assert.equal(carrying.cash,0);
   assert.equal(await page.locator('#pw-shop-interact').isDisabled(),true);
   await page.screenshot({path:'artifacts/game/'+screen+'-first-day-opening-task.png'});

   // Real touch gestures: positive screen X must turn camera RIGHT (-yaw).
   const rightSwipe=await page.evaluate(()=>{
     const w=window.__PAPERWORLD_WORLD3D__,c=document.getElementById('pw-world-canvas'),before=w.target.yaw,id=77;
     c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,clientX:100,clientY:180,pointerType:'touch',bubbles:true}));
     c.dispatchEvent(new PointerEvent('pointermove',{pointerId:id,clientX:190,clientY:180,pointerType:'touch',bubbles:true}));
     c.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,clientX:190,clientY:180,pointerType:'touch',bubbles:true}));
     return {before,after:w.target.yaw};
   });
   assert.ok(rightSwipe.after<rightSwipe.before-.25,'right swipe must rotate camera right');
   const leftSwipe=await page.evaluate(()=>{
     const w=window.__PAPERWORLD_WORLD3D__,c=document.getElementById('pw-world-canvas'),before=w.target.yaw,id=78;
     c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,clientX:190,clientY:180,pointerType:'touch',bubbles:true}));
     c.dispatchEvent(new PointerEvent('pointermove',{pointerId:id,clientX:100,clientY:180,pointerType:'touch',bubbles:true}));
     c.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,clientX:100,clientY:180,pointerType:'touch',bubbles:true}));
     return {before,after:w.target.yaw};
   });
   assert.ok(leftSwipe.after>leftSwipe.before+.25,'left swipe must rotate camera left');
   await page.locator('#pw-motion-center').click();
   // Simulated actual APK native bridge, including a late orientation callback.
   await page.evaluate(()=>{
     window.__pwMock={starts:0,stops:0,late:null};
     window.PaperworldSensor={available:()=>true,start(){
       window.__pwMock.starts++;window.__pwMock.late=window.__PAPERWORLD_NATIVE_ORIENTATION__;
     },stop(){window.__pwMock.stops++}};
   });
   await page.locator('#pw-motion-start').click();
   assert.equal(await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.sensorEnabled),true);
   assert.equal(await page.locator('#pw-motion-start').textContent(),'关闭手机体感');
   await page.evaluate(()=>window.__pwMock.late(Math.SQRT1_2,Math.SQRT1_2,0,0));
   assert.equal(await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.sensor),true);
   await page.locator('#pw-motion-start').click();
   assert.equal(await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.sensorEnabled),false);
   assert.equal(await page.locator('#pw-motion-start').textContent(),'开启手机体感');
   const turnedOff=await page.evaluate(()=>{
     const before=window.__PAPERWORLD_WORLD3D__.target.yaw;
     window.__pwMock.late(Math.SQRT1_2,0,Math.SQRT1_2,0);
     return {before,after:window.__PAPERWORLD_WORLD3D__.target.yaw,
       sensor:window.__PAPERWORLD_WORLD3D__.sensor,
       callback:window.__PAPERWORLD_NATIVE_ORIENTATION__,stops:window.__pwMock.stops};
   });
   assert.equal(turnedOff.sensor,false);
   assert.equal(turnedOff.callback,null);
   assert.equal(turnedOff.after,turnedOff.before,'late Android sensor event must be ignored');
   assert.ok(turnedOff.stops>=1,'native sensor was actually stopped');

  // Q/E are REAL CAMERA translations, not merely bank/roll values.
  await page.keyboard.down('q');
  await page.waitForTimeout(750);
  const left=await page.evaluate(()=>({peek:window.__PAPERWORLD_WORLD3D__.lean,eye:window.__PAPERWORLD_WORLD3D__.eye,player:window.__PAPERWORLD_WORLD3D__.player}));
  await page.keyboard.up('q');
  assert.ok(left.peek.offset>.27,'left lean extends camera well beyond body center');
  assert.ok(left.eye[1]-left.player.position.y>.27,'real eye translates sideways in world coordinates');
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-left-head-peek.png'});
  await page.keyboard.down('e');
  await page.waitForTimeout(850);
  const right=await page.evaluate(()=>({peek:window.__PAPERWORLD_WORLD3D__.lean,eye:window.__PAPERWORLD_WORLD3D__.eye,player:window.__PAPERWORLD_WORLD3D__.player}));
  await page.keyboard.up('e');
  assert.ok(right.peek.offset<-.27,'right lean extends camera in opposite direction');
  assert.ok(right.eye[1]-right.player.position.y<-.27,'right peek actually translates world eye');
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-right-head-peek.png'});
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  assert.ok((await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.pose.yaw))>0,'Z-up turning still works');
  // Synthetic device quaternions run through THE SAME phone sensor route
  // that Android native rotation-vector bridge invokes (not an animation fake).
  const sensorResult=await page.evaluate(async ()=>{
    const w=window.__PAPERWORLD_WORLD3D__;
    const base=[Math.SQRT1_2,Math.SQRT1_2,0,0]; // upright beta=90
    w.injectTestQuaternion(...base);
    const t=40*Math.PI/180/2;
    // qbase * qz(40°)
    const q=[base[0]*Math.cos(t),base[1]*Math.cos(t),
      -base[1]*Math.sin(t),base[0]*Math.sin(t)];
    w.injectTestQuaternion(...q);
    await new Promise(r=>setTimeout(r,900));
    return {lean:w.lean,pose:w.pose,source:w.sensorSource,comfort:w.comfort};
  });
  assert.equal(sensorResult.source,'native');
  assert.equal(sensorResult.comfort,true);
  assert.ok(sensorResult.lean.offset>.13,'native quaternion side tilt moves the real camera left');
  assert.ok(Math.abs(sensorResult.lean.bank)<.0001,'comfort keeps the horizon level');
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-native-gyro-peek-comfort.png'});
  // Verify the *real* hit target. A synthetic/forced click would conceal joystick overlap.
  const comfortHit=await page.locator('#pw-comfort-toggle').evaluate(el=>{
    const r=el.getBoundingClientRect();
    const target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return target===el||el.contains(target);
  });
  assert.ok(comfortHit,'comfort button must not be covered by the joystick/HUD on '+screen);
  await page.locator('#pw-comfort-toggle').click();
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.comfort),false);
  await page.waitForTimeout(500);
  const standardPeek=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.lean);
  assert.ok(standardPeek.offset>sensorResult.lean.offset,'standard mode permits larger peek');
  await page.locator('#pw-comfort-toggle').click();
  // Phone controls work even without acceleration hardware. Check actual X/Y
  // world translation under a held forward and a held backward touch.
  async function holdWorldButton(id,ms){
    return page.evaluate(async ({id,ms})=>{
      const el=document.getElementById(id),player=()=>window.__PAPERWORLD_WORLD3D__.player.position;
      const before=player();
      const pointer=790+(id==='pw-back-hold'?1:0);
      el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:pointer,bubbles:true}));
      await new Promise(r=>setTimeout(r,ms));
      const during=player();
      el.dispatchEvent(new PointerEvent('pointerup',{pointerId:pointer,bubbles:true}));
      return {before,during};
    },{id,ms});
  }
  const up=await holdWorldButton('pw-forward-hold',520);
  const down=await holdWorldButton('pw-back-hold',540);
  const forwardDir=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.pose.yaw);
  const projected=(p,q)=>(q.x-p.x)*Math.cos(forwardDir)+(q.y-p.y)*Math.sin(forwardDir);
  assert.ok(projected(up.before,up.during)>.45,'press forward immediately walks along camera direction');
  assert.ok(projected(down.before,down.during)<-.45,'press backward ACTUALLY moves backwards');
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.forwardHold),0,'releasing touch stops input');
  await page.screenshot({path:'artifacts/game/'+screen+'-real-forward-backward-controls.png'});
  // The camera must TRANSLATE through world geometry, not merely rotate a flat sky.
  const p0=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.player);
  assert.ok((await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.walls))>50,'buildings and trees have real solid footprints');
  await page.keyboard.down('w');
  await page.waitForTimeout(780);
  await page.keyboard.up('w');
  const p1=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.player);
  assert.ok(Math.hypot(p1.position.x-p0.position.x,p1.position.y-p0.position.y)>.45,'W key advances real 3D position');
  await page.locator('#pw-stance-crouch').click();
  await page.waitForTimeout(600);
  const crouched=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.player);
  assert.equal(crouched.stance,'crouch');
  assert.ok(crouched.height<1.18,'crouch lowers camera to real body height');
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-crouched-height.png'});
  await page.locator('#pw-stance-prone').click();
  await page.waitForTimeout(730);
  const prone=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.player);
  assert.equal(prone.stance,'prone');
  assert.ok(prone.height<.55,'prone drops to 0.43m first-person eye height');
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-prone-ground.png'});
  await page.locator('#pw-stance-stand').click();
  await page.waitForTimeout(650);
  assert.ok((await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.player.height))>1.55);
  assert.equal(await page.locator('#pw-walk-toggle').count(),0,'delete unreliable step gait UI');
  assert.equal(await page.locator('#pw-squat-motion').count(),0,'delete inaccurate automatic squat UI');
  assert.equal(await page.locator('#pw-posture-hold').count(),0,'delete unreliable tilt-to-crouch UI');
  // All three stances are still controlled precisely by explicit buttons.
  await page.locator('#pw-motion-center').click();
  await page.waitForTimeout(310);
  await page.locator('#pw-motion-back').click();
  await waitScene(page,'menu');

  await clicked(page,0);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.transition?.phase==='close');
  await page.screenshot({path:'artifacts/game/'+screen+'-transition.png'});
  await waitScene(page,'intro');
  const distant=(await state(page)).intro;
  assert.equal(distant.phase,'approaching');
  const revealScale=(await state(page)).introRevealScale;
  assert.ok(revealScale>=.23&&revealScale<=.25,'owner is small at the first visible reveal frame');
  assert.ok(distant.scale>=revealScale&&distant.scale<1,'owner continues approaching after paper reveal');
  await page.screenshot({path:'artifacts/game/'+screen+'-far-owner.png'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.phase==='talk',{timeout:6500});
  const near=(await state(page)).intro;
  assert.equal(near.scale,1,'owner reaches near counter at full size');
  assert.ok((await exactCanvasColors(page)).every(c=>official.has(c)),'no gray-fill or antialias fifth ink');
  await page.screenshot({path:'artifacts/game/'+screen+'-owner-near.png'});
  assert.equal(await page.locator('#pw-dialogue').isVisible(),true,'crisp DOM speech bubble appears after approach');

  // Reference 2's speech frame must be a real interactive four-ink DOM UI.
  const dialogLayout=await page.locator('#pw-dialogue').evaluate(el=>{
   const r=el.getBoundingClientRect(),css=getComputedStyle(el);
   const speech=el.querySelector('#pw-dialogue-speech'),c=getComputedStyle(speech);
   return {x:r.left,y:r.top,right:r.right,bottom:r.bottom,
    bg:css.backgroundColor,color:c.color,fs:parseFloat(c.fontSize),
    label:el.querySelector('.pw-dialogue-name')?.textContent,
    live:speech.getAttribute('aria-live')};
  });
  assert.ok(dialogLayout.x>=-1&&dialogLayout.y>=-1&&dialogLayout.right<=width+1&&dialogLayout.bottom<=height+1,
   'dialogue frame must fit '+screen+' screen without clipping');
  assert.equal(dialogLayout.bg,'rgb(255, 245, 230)','cream is the only panel fill');
  assert.equal(dialogLayout.color,'rgb(57, 54, 87)','dark-purple text is native and readable');
  assert.equal(dialogLayout.live,'polite');
  assert.equal(dialogLayout.label,'老板娘');
  assert.ok(dialogLayout.fs>=15);
  if(height>width)assert.ok(dialogLayout.y>height*.42,'portrait dialogue is below the face');
  else assert.ok(dialogLayout.x>width*.47,'landscape dialogue is right of owner');
  await page.screenshot({path:'artifacts/game/'+screen+'-native-hostess-rental-dialogue.png'});

  const breatheSamples=[];
  for(let i=0;i<8;i++){
   breatheSamples.push((await state(page)).intro.breathingY);
   await page.waitForTimeout(240);
  }
  assert.ok(new Set(breatheSamples).size>1,'owner breathes vertically up/down, not sideways');
  assert.equal(await page.locator('#pw-dialogue-auto').count(),0,'no auto-play switch must remain');
  // No timer may advance the text; 10 Chinese chars/sec lets users read.
  const before=(await state(page)).intro;
  await page.waitForTimeout(350);
  const slower=(await state(page)).intro;
  assert.equal(slower.line,before.line,'text cannot skip a line by itself');
  assert.ok(slower.shown-before.shown<=5,'typewriter is deliberately slower than old 25 chars/sec');
  await page.waitForTimeout(2300);
  assert.equal((await state(page)).intro.line,before.line,'even completed text must wait for a tap');
  await page.screenshot({path:'artifacts/game/'+screen+'-manual-slow-dialogue.png'});
  // Two owner messages: first tap completes current sentence, next tap advances.
  for(let i=0;i<6;i++){
   const snap=await state(page);
   if(snap.state==='lease'||snap.transition||!await page.locator('#pw-dialogue-next').isVisible())break;
   await page.locator('#pw-dialogue-next').click();
   await page.waitForTimeout(65);
  }
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.state==='lease'&&window.__PAPERWORLD_MENU__?.lease?.visible,{timeout:10000});
  assert.equal(await page.locator('#pw-form-step1').isVisible(),true);
  await page.screenshot({path:'artifacts/game/'+screen+'-create-character.png'});

  await page.locator('#pw-next').click(); // Missing name must not pass.
  assert.equal((await state(page)).lease.step,1);
  assert.ok((await page.locator('#pw-form-errors').textContent()).includes('昵称'));
  await page.locator('#pw-nickname').fill('小满');
  await page.locator('#pw-hair').selectOption('双马尾');
  await page.locator('#pw-outfit').selectOption('雾蓝');
  await page.locator('#pw-origin').selectOption('旅行商人');
  assert.equal(await page.locator('#pw-nickname').inputValue(),'小满');
  await page.locator('#pw-next').click();
  await page.waitForFunction(expected=>window.__PAPERWORLD_MENU__?.lease?.step===expected,2,{timeout:3000});
  assert.equal((await state(page)).lease.step,2);
  await page.locator('#pw-next').click(); // Missing shop name must not pass.
  assert.equal((await state(page)).lease.step,2);
  await page.locator('#pw-shopName').fill('蓝铃杂货店');
  await page.locator('#pw-business').selectOption('杂货');
  await page.locator('#pw-district').selectOption('广场');
  await page.locator('#pw-term').selectOption('90');
  assert.ok((await page.locator('#pw-rent').textContent()).includes('770'));
  await page.screenshot({path:'artifacts/game/'+screen+'-rent-shop.png'});
  await page.locator('#pw-next').click();
  await page.waitForFunction(expected=>window.__PAPERWORLD_MENU__?.lease?.step===expected,3,{timeout:3000});
  assert.equal((await state(page)).lease.step,3);
  assert.ok((await page.locator('#pw-contract-details').textContent()).includes('蓝铃杂货店'));
  await page.screenshot({path:'artifacts/game/'+screen+'-verify-contract.png'});
  await page.locator('#pw-next').click();
  await page.waitForFunction(expected=>window.__PAPERWORLD_MENU__?.lease?.step===expected,4,{timeout:3000});
  assert.equal((await state(page)).lease.step,4);
  assert.ok((await state(page)).lease.hasContract);
  assert.ok((await page.locator('#pw-receipt-details').textContent()).includes('PW-'));
  await page.screenshot({path:'artifacts/game/'+screen+'-rental-receipt.png'});

  // Return and resume: do not force replay of fictional introduction.
  await page.locator('#pw-prev').click();
  await waitScene(page,'menu');
  await clicked(page,1);
  await waitScene(page,'lease');
  assert.equal((await state(page)).lease.step,4,'continue directly opens existing lease receipt');
  await page.locator('#pw-prev').click();await waitScene(page,'menu');
  await clicked(page,3);await waitScene(page,'settings');
  await clicked(page,3);await waitScene(page,'menu');
  if(screen==='portrait'){
    // The PixelLab inspector must show the very SAME extracted sprite as the
    // in-game hostess, and keep substantial internal purple pupil/outline ink.
    await page.goto(origin+'pixel-lab/hostess-matte.html',{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('通过'),{timeout:10000});
    const studio=await page.locator('#status').textContent();
    const retained=Number(studio.match(/保留深紫暗部 (\d+)/)?.[1]);
    assert.ok(retained>500,'dark eyelashes/pupils and clothes must not become transparent');
    assert.ok(studio.includes('其他颜色/半透明 0'));
    await page.screenshot({path:'artifacts/game/pixel-lab-hostess-transparent-cutout.png'});
    await page.locator('#grid-toggle').click();
    await page.screenshot({path:'artifacts/game/pixel-lab-hostess-eyes-pixel-grid.png'});
  }
  assert.deepEqual(errors,[],'runtime must not throw errors');
  await ctx.close();
 }
 console.log('PASS: owner alpha matte keeps inner pupils; no autoplay; slow manual typewriter and shop registration on 4 viewports');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
