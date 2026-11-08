/* Real 3D game subway commuter screenshot test; seeded life fixtures ONLY
 * inside Chromium QA to make the authored route crossing observable.
 * Production world still uses the player's persistent route simulation.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;try{bytes=readFileSync(file)}catch{return res.writeHead(404).end('not found')}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const output='artifacts/metro-civilians';mkdirSync(output,{recursive:true});
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));
try{
 page.setDefaultTimeout(35000);
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?mapLayers=full',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom',null,{timeout:42000});
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const count=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<count;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
  window.PaperWorldQuickTools.close();
  const r=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!r.ok)throw Error(r.reason);
 });
 await page.waitForFunction(()=>window.PaperWorldDailyLifeUI?.npcManifest?.registered>=8,null,{timeout:35000});
 const ready=await page.evaluate(async()=>{
  // QA-only deterministic leg: the actual approved image manifest and scene
  // permissions must validate before the real renderer may draw anybody.
  const [manifest,assignments]=await Promise.all([
   fetch('./data/npc/production-manifest.v1.json').then(r=>r.json()),
   fetch('./data/npc/scene-assignments.v1.json').then(r=>r.json())
  ]);
  const metro=window.PaperWorldMetro,first=metro.nextStop('a','entrance',1);
  if(!first)throw Error('No real metro next station');
  const keys=['NPC-C001','NPC-C002','NPC-SG01'];
  const people=new Map(keys.map((id,i)=>[id,{
   id,phase:'traveling',node:'entrance',leg:{mode:'metro',lineId:'a',
    from:'entrance',to:i===2?'northgate':first,direction:1,progress:0.01}
  }]));
  const fakeLife={get:id=>people.get(id)||null,present:()=>[]};
  const presence=window.PaperWorldNpcScenePresence.create({
   life:fakeLife,metro,manifest,assignments
  });
  if(presence.inspect().renderableIds.length<8)throw Error('bad art manifest');
  const original=window.PaperWorldDailyLifeUI;
  window.PaperWorldDailyLifeUI=Object.freeze({
   ...original,npcLife:fakeLife,npcPresence:presence
  });
  const board=original.engine.metroBoard('a',1);
  if(!board.ok)throw Error('Unable to board real subway: '+board.reason);
  if(!original.cabin.open())throw Error('Real subway did not open');
  return {first,keys};
 });
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect?.();
  return a?.transitMode&&a?.environment==='metro'&&
   a.station3D?.approvedTransitFlow?.waiting.length===3;
 },{timeout:25000});
 let stage=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect().station3D);
 assert.deepEqual(stage.approvedTransitFlow.waiting,ready.keys);
 assert.equal(stage.commuterAtlasStatus,'real-approved-npc');
 await page.screenshot({path:output+'/01-waiting-real-3d-desktop.png',timeout:48000});
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect?.();
  return a?.station3D?.commutersDrawn>0&&
   a.station3D.realCrowdIds.includes('NPC-C001');
 },{timeout:20000});
 await page.screenshot({path:output+'/02-boarding-through-door.png',timeout:48000});
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect?.();
  return a?.station3D?.approvedTransitFlow?.waiting.length===3&&
   a?.station3D?.commutersDrawn===0;
 },{timeout:20000});
 await page.locator('#pw-metro-cabin .pw-cabin-actions button').filter({hasText:'继续乘坐'}).first().click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect()?.transitMotion.moving,{timeout:20000});
 stage=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect().station3D);
 assert.deepEqual(stage.approvedTransitFlow.onboard,ready.keys);
 assert.equal(stage.commutersDrawn,0,'train must leave real station behind');
 await page.screenshot({path:output+'/03-riding-in-one-carriage.png',timeout:48000});
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena.inspect();
  return !a.transitMotion.moving&&
   a.station3D?.approvedTransitFlow?.alighting.length===2;
 },{timeout:30000});
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena.inspect();
  return a.station3D?.realCrowdIds.some(x=>x==='NPC-C001');
 },{timeout:14000});
 stage=await page.evaluate(()=>window.PaperWorldGameRingArena.inspect().station3D);
 assert.deepEqual(stage.approvedTransitFlow.alighting,['NPC-C001','NPC-C002']);
 assert.deepEqual(stage.approvedTransitFlow.onboard,['NPC-SG01']);
 await page.screenshot({path:output+'/04-alighting-at-real-destination.png',timeout:48000});
 const ids=stage.realCrowdIds;
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(!ids.includes('NPC-SG03'));
 console.log('PASS subway NPC browser: true 3D platform, visible authentic citizens, physical door boarding, one cabin, destination-specific alighting.');
 const relevant=errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x));
 assert.deepEqual(relevant,[],relevant.join('; '));
}catch(error){
 const diagnostic=await page.evaluate(()=>({
  scene:document.querySelector('#scene')?.dataset.scene||null,
  transition:document.querySelector('#scene-transition')?.dataset.active||null,
  menuStart:document.querySelector('#menu-start')?.getAttribute('hidden'),
  menuHidden:document.querySelector('#menu')?.hidden,
  dailyReady:!!window.PaperWorldDailyLifeUI,
  renderReady:!!window.PaperWorldGameRingArena,
  currentNpcManifest:window.PaperWorldDailyLifeUI?.npcManifest||null,
  pageText:document.body.innerText.slice(0,250)
 })).catch(e=>({diagnosticError:String(e)}));
 console.error('METRO REAL BROWSER FAILURE',String(error),'DIAG',JSON.stringify(diagnostic),
  'PAGE ERRORS',JSON.stringify(errors.slice(-15)));
 await page.screenshot({path:output+'/00-browser-failure.png',timeout:14000})
  .catch(e=>console.error('Diagnostic screenshot unavailable:',String(e)));
 throw error;
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
