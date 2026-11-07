// ONE physical zoomable dot map: original city metro, 10-region network,
// real route clicks, stateful side-on L2D cabin and mobile layout screenshots.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/overworld';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(20000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async name=>page.screenshot({path:path.join(out,name),animations:'disabled',timeout:22000});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const lines=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<lines;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
  window.PaperWorldQuickTools.close();
  const res=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!res.ok)throw Error(res.reason);
 });
 await page.locator('#quick-map').click();
 const map=page.locator('.pw-dot-world-map');
 await map.waitFor({state:'visible'});
 assert.equal(await page.locator('.pw-world-map,.pw-map-mode-toggle').count(),0,
  'the retired second atlas and map-mode switch must not exist');
 assert.equal(await page.locator('.pw-transit-grid-dot').count(),1683);
 assert.equal(await page.locator('.pw-dot-local-places .pw-transit-place').count(),8);
 assert.equal(await page.locator('.pw-dot-city').count(),10);
 assert.ok(await page.locator('.pw-dot-poi').count()>=100);
 assert.ok(await page.locator('.pw-dot-regional-lines .pw-transit-segment').count()>=14);
 assert.equal(await page.locator('.pw-dot-urban-lines [data-line="c"]').count(),0);
 assert.equal(await page.locator('.pw-dot-local-places [data-place="hospital"],.pw-dot-local-places [data-place="station"],.pw-dot-local-places [data-place="police"]').count(),0);
 assert.equal(await page.evaluate(()=>window.PaperWorldMetro.getLine('c')),null);
 assert.ok(await page.locator('.pw-dot-local-places [data-place="school"]').isVisible());
 assert.equal(await page.locator('.pw-dot-poi[data-city="kirihama"]:not([hidden])').count(),0,
  'default subway map must not be covered by dozens of investigation photo cards');
 // Even a 1440x810 game view needs actual legible clickable stations:
 // no tiny line strokes or 10px labels hidden by the dotted background.
 const legibility=await page.evaluate(()=>{
  const rail=document.querySelector('.pw-dot-urban-lines .pw-transit-rail');
  const caption=document.querySelector('.pw-dot-local-places [data-place="school"] .pw-transit-place-name');
  const card=document.querySelector('.pw-dot-local-places [data-place="school"]');
  return {stroke:parseFloat(getComputedStyle(rail).strokeWidth),
   vectorEffect:rail.getAttribute('vector-effect'),
   stationFont:parseFloat(getComputedStyle(caption).fontSize),
   photoWidth:card.getBoundingClientRect().width};
 });
 assert.ok(legibility.stroke>=8,JSON.stringify(legibility));
 assert.equal(legibility.vectorEffect,'non-scaling-stroke');
 assert.ok(legibility.stationFont>=14,JSON.stringify(legibility));
 assert.ok(legibility.photoWidth>=95,JSON.stringify(legibility));
 await shot('19-city-dot-world.png');
 const lattice=await page.evaluate(()=>{
  const svg=document.querySelector('.pw-dot-rail-canvas');
  const pts=[...document.querySelectorAll('.pw-transit-grid-dot')];
  const errors=pts.filter(p=>
   (+p.getAttribute('cx'))%40!==0||(+p.getAttribute('cy'))%40!==0);
  const nodes=[...document.querySelectorAll('.pw-dot-city')];
  const off=nodes.filter(n=>
   (+n.dataset.worldX)%40!==0||(+n.dataset.worldY)%40!==0);
  const vb=svg.viewBox.baseVal;
  return {viewWidth:vb.width,viewHeight:vb.height,
   cssScale:getComputedStyle(document.querySelector('.pw-dot-world-canvas')).transform,
   dots:pts.length,offGrid:errors.length,cityOff:off.length,
   localTransitLines:document.querySelectorAll('.pw-dot-municipal-lines .pw-transit-segment').length};
 });
 assert.equal(lattice.cssScale,'none','map must not use compositor bitmap zoom');
 assert.ok(lattice.viewWidth>0&&lattice.viewHeight>0);
 assert.equal(lattice.dots,1683);
 assert.equal(lattice.offGrid,0);assert.equal(lattice.cityOff,0);
 assert.equal(lattice.localTransitLines,11);
 // The ORIGINAL coloured住宅线 is still a physical boarding action,
 // not a decorative fake rail segment or teleport to the destination.
 const hit=await page.evaluate(()=>{
  const p=document.querySelector('.pw-dot-urban-lines [data-line="a"][data-from="entrance"] .pw-transit-line-hit');
  if(!p)throw Error('Metro track is missing');
  const pt=p.getPointAtLength(p.getTotalLength()*.5),m=p.getScreenCTM();
  return {x:m.a*pt.x+m.c*pt.y+m.e,y:m.b*pt.x+m.d*pt.y+m.f};
 });
 await page.mouse.click(hit.x,hit.y);
 const popup=page.locator('.pw-transit-popup:not([hidden])');
 await popup.waitFor();
 assert.match(await popup.innerText(),/住宅线/);
 assert.match(await popup.innerText(),/学园前/);
 await shot('20-dot-metro-board-choices.png');
 await popup.locator('.pw-transit-menu-item.is-primary').first().click();
 await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.snapshot().metro?.onboard===true);
 await page.locator('#pw-metro-cabin:not([hidden])').waitFor();
 // The battle ring renderer now owns the subway 3D wall, floor, ceiling,
 // and real fixtures. Its texture must contain the uploaded 2048x1024 art.
 await page.waitForFunction(()=>{
  const cab=document.querySelector('#pw-metro-cabin:not([hidden])');
  const room=window.PaperWorldGameRingArena?.inspect?.();
  return cab?.dataset.renderer==='ring-3d'&&room?.transitMode===true&&
   room.environment==='metro'&&room.geometry?.shape==='strip'&&
   room.canvasParent==='pw-metro-cabin'&&
   room.roomSurfaces?.floor?.ready&&room.roomSurfaces?.ceiling?.ready&&
   room.connectionMaterial?.ready&&
   room.wallMaterial?.ready===true&&
   room.wallMaterial.url.endsWith('cabin-master.webp')&&
   document.querySelector('#ring-arena-canvas')?.dataset.wallTexture==='ready';
 },null,{timeout:25000});
 const room3d=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(room3d.geometry.shape,'strip');
 assert.ok(room3d.connectionMaterial.ready,
  'both physical end walls must show painted gangways to adjacent cars');
 assert.match(room3d.connectionMaterial.url,/metro-gangway\.svg$/);
 assert.ok(Math.abs(room3d.actorAnchors.hero.height-1.63)<.001,
  'grounded heroine must be real 1.63m human, not a giant screen-plane cutout');
 assert.equal(await page.locator('#pw-metro-cabin .pw-cabin-speech').count(),0,
  'subway does NOT have a dialogue UI');
 assert.equal(await page.locator('#pw-metro-cabin .pw-cabin-person,#pw-metro-cabin .pw-cabin-words').count(),0);

 assert.deepEqual(room3d.visibleActorIds,['hero'],
  'metro keeps the real grounded hero, not unrelated combat enemy rigs');
 assert.ok(room3d.lensShift<.13,
  'metro should show real ceiling fixtures rather than cropping them out');
 assert.ok(room3d.geometry.widthMeters>room3d.geometry.depthMeters);
 assert.equal(room3d.wallMaterial.repeats,1);
 assert.equal(room3d.lighting.positions.length,18);
 assert.ok(room3d.roomSurfaces.floor.vertices>0&&room3d.roomSurfaces.ceiling.vertices>0);
 assert.equal(room3d.cameraParity,true,'same 2.5D shoulder camera as other scene shapes');
 assert.equal(await page.locator('#pw-metro-cabin .pw-cabin-live-actors')
  .evaluate(el=>getComputedStyle(el).display),'none',
  'do not layer flat character cutouts on top of the real WebGL world');
 await shot('21-dot-map-real-metro-carriage.png');
 // Genuine shared six-bulb lighting: use the original world lighting API
 // on strip geometry, not a CSS darkness filter on the artist's bitmap.
 await page.evaluate(()=>window.PaperWorldGameRingArena.setLighting('outage'));
 await page.waitForTimeout(260);
 const emergency=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect().lighting);
 assert.equal(emergency.state,'outage');
 assert.ok(emergency.levels.filter(x=>x>.6).length===2);
 await shot('22-dot-metro-true-3d-emergency-lights.png');
 await page.evaluate(()=>window.PaperWorldGameRingArena.setLighting('on'));
 await page.waitForTimeout(130);

 // A texture upload is NOT proof of a visible carriage. Check actual
 // composited screenshot pixels, so a black screenshot like the user's Edge
 // capture cannot pass this Chromium regression ever again.
 const pixQA=JSON.parse(execFileSync('python3',['-c',`
from PIL import Image
import json,sys
im=Image.open(sys.argv[1]).convert('RGB')
points=[(.33,.28),(.45,.30),(.60,.27),(.77,.40)]
samples=[]
for x,y in points:
 r,g,b=im.getpixel((int(im.width*x),int(im.height*y)))
 samples.append(round((r+g+b)/3))
print(json.dumps({'samples':samples,'bright':sum(v>94 for v in samples)}))
`,path.join(out,'21-dot-map-real-metro-carriage.png')],{encoding:'utf8'}));
 assert.ok(pixQA.bright>=2,
  '3D metro cabin must be VISIBLY lit in the final composed screenshot, not just load textures: '+JSON.stringify(pixQA));
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().metro.station),'entrance');
 await page.locator('#pw-metro-cabin .pw-cabin-actions button').filter({hasText:'继续乘坐'}).click();
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().metro.station),'school');
 await page.locator('#pw-metro-cabin .pw-cabin-actions button').filter({hasText:'下车'}).click();
 await page.waitForFunction(()=>!window.PaperWorldDailyLifeUI.snapshot().metro?.onboard);
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().location),'school');
 const parked=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 assert.equal(parked.transitMode,false);
 assert.equal(parked.canvasParent,'scene',
  'on subway exit the same WebGL canvas must return to its battle-stage parent');
 assert.deepEqual(errors.filter(v=>/ReferenceError|TypeError|SyntaxError/.test(v)),[]);
 console.log('SINGLE DOT METRO QA PASS',JSON.stringify({lattice,ended:'school',errors}));
}finally{await browser.close()}
