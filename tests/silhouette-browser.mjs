// Browser proof for the replacement UI: fixed full-scene silhouettes + one-tap work.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {PeerServer}=require('peer');
const server=spawn('python3',['-m','http.server','4193','--bind','127.0.0.1'],{stdio:'ignore'});
const relay=PeerServer({port:9103,host:'127.0.0.1',path:'/'});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function open(context,W,H){
 const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);
 await page.setViewportSize({width:W,height:H});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',r=>r.fulfill({path:path.resolve('node_modules/peerjs/dist/peerjs.min.js'),contentType:'application/javascript'}));
 await page.addInitScript(()=>{window.CRYPTBOUND_PEER_OPTIONS={host:'127.0.0.1',port:9103,path:'/',secure:false};});
 for(let i=0;i<12;i++)try{await page.goto('http://127.0.0.1:4193',{waitUntil:'domcontentloaded',timeout:2500});break;}catch(e){if(i===11)throw e;await new Promise(r=>setTimeout(r,250));}
 await page.waitForFunction(()=>window.__KIOSK_TEST__?.getHits,undefined,{timeout:10000});
 return page;
}
async function tap(page,cmd,key){
 await page.waitForFunction(([cmd,key])=>document.getElementById('lobby').hidden&&!document.getElementById('game').inert&&window.__KIOSK_TEST__.getHits().some(h=>h.cmd===cmd&&(key==null||h.key===key)),[cmd,key??null],{timeout:10000});
 const h=await page.evaluate(([cmd,key])=>window.__KIOSK_TEST__.getHits().filter(h=>h.cmd===cmd&&(key==null||h.key===key)).at(-1),[cmd,key??null]);
 await page.mouse.click(h.x+h.w/2,h.y+h.h/2);
 await page.waitForTimeout(85);
}
const state=p=>p.evaluate(()=>window.__KIOSK_TEST__.getState());
try{
 await fs.mkdir('artifacts',{recursive:true});
 for(const [W,H] of [[320,568],[390,844],[844,390],[1280,720]]){
  console.log('SILHOUETTE START',W,H);const ctx=await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:2});
  const p=await open(ctx,W,H);
  assert.equal(await p.locator('#lobby').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await p.locator('#lobby img').count(),0,'old illustrated art not present');
  await p.screenshot({path:'artifacts/silhouette-menu-'+W+'x'+H+'.png'});
  await p.locator('#primaryStart').click();
  await p.waitForFunction(()=>document.getElementById('lobby').hidden&&!document.getElementById('game').inert,undefined,{timeout:10000});
  await p.locator('#storyPanel').waitFor({state:'visible'});
  await p.locator('.protagonist-art').first().evaluate(img=>img.decode());
  await p.locator('.protagonist-art').last().evaluate(img=>img.decode());
  assert.deepEqual(await p.locator('.protagonist-art').evaluateAll(els=>els.map(x=>[x.naturalWidth,x.naturalHeight])),[[96,144],[96,144]]);
  await p.locator('.protagonist-card').nth(W>500?1:0).click();
  const expected=W>500?'male':'female',other=expected==='male'?'female':'male';
  assert.equal((await state(p)).story.assignment.shopkeeper,expected);
  assert.equal((await state(p)).story.assignment.cityWorker,other);
  assert.equal((await state(p)).story.avatar,expected);
  assert.ok((await p.evaluate(()=>window.__KIOSK_TEST__.getHeroBadge())).endsWith('-preview.webp'));
  await p.screenshot({path:'artifacts/protagonist-selected-'+W+'x'+H+'.png'});
  await p.locator('#closeStory').click();
  assert.equal(await p.evaluate(()=>window.__KIOSK_TEST__.getCamera()),null);
  const initial=await state(p);
  assert.equal(initial.windowOpen,true,'no window-open ritual');
  assert.ok(Object.entries(initial.open).every(([,v])=>v===true),'legacy storage is permanently open');
  const hits=await p.evaluate(()=>window.__KIOSK_TEST__.getHits());
  for(const h of hits){
   assert.ok(h.w>=44&&h.h>=44,'hit too small: '+JSON.stringify(h));
   assert.ok(h.x>=-1&&h.y>=0&&h.x+h.w<=W+1&&h.y+h.h<=H+1,'off screen: '+JSON.stringify(h));
  }
  assert.equal(hits.some(h=>['toggle','window','focus','look'].includes(h.cmd)),false);
  for(const key of ['cabinetL','cabinetR','shelfL1','shelfL2','shelfL3','shelfR1','shelfR2','shelfR3','drawerL','drawerR']){
    assert.ok(hits.some(h=>h.cmd==='slot'&&h.key===key),'missing always-visible slot: '+key);
  }
  await p.screenshot({path:'artifacts/silhouette-workbench-'+W+'x'+H+'.png'});
  await tap(p,'slot','shelfL1');
  assert.equal((await state(p)).players.solo.hand,'tea');
  await tap(p,'counter');
  assert.equal((await state(p)).counter,'tea');
  await tap(p,'sell');
  assert.equal((await state(p)).served,1);
  await tap(p,'catalog');
  await tap(p,'restock','tea');
  await tap(p,'slot','shelfL1');
  assert.equal((await state(p)).slots.shelfL1.qty,2,'buy stock by a direct subsequent slot click');
  // Narrative is a real in-game choice UI, not a hardcoded screenshot.
  assert.equal(await p.evaluate(()=>window.__KIOSK_TEST__.getStory().active),'notice');
  assert.equal(hits.some(h=>h.cmd==='recycleReceive'),false,'removed battery-recycling gameplay is not advertised');
  await p.locator('#storyBtn').click();
  assert.match(await p.locator('#storyContent').innerText(),/暂停车辆到站/);
  await p.locator('#storyContent .narrative-option').first().click();
  await p.locator('#storyContent .narrative-option').first().click();
  await p.locator('#storyContent .narrative-option').first().click();
  await p.locator('#storyContent .narrative-option').first().click();
  assert.equal((await state(p)).story.flags.heard_last_bus,true);
  assert.equal((await state(p)).story.active,'after_sale','a completed sale schedules a consequence after the opening conversation');
  await p.screenshot({path:'artifacts/story-first-return-'+W+'x'+H+'.png'});
  await p.locator('#mapTab').click();
  assert.match(await p.locator('#storyContent').innerText(),/末班车站/);
  await p.locator('#storyContent .narrative-location').filter({hasText:'末班车站'}).getByRole('button',{name:'走过去'}).click();
  assert.equal((await state(p)).story.location,'stop');
  await p.locator('#avatarTab').click();
  await p.getByRole('button',{name:'女主角'}).click();
  assert.equal((await state(p)).story.avatar,'female');
  await p.locator('#closeStory').click();
  await p.mouse.move(W*.45,H*.45);await p.mouse.down();await p.mouse.move(W*.6,H*.6,{steps:5});await p.mouse.up();
  await p.mouse.wheel(0,300);
  assert.equal(await p.evaluate(()=>window.__KIOSK_TEST__.getCamera()),null,'input cannot pan or zoom');
  await p.screenshot({path:'artifacts/silhouette-sale-'+W+'x'+H+'.png'});
  await ctx.close();
  console.log('PASS silhouette '+W+'x'+H+' all-in-one click-to-act');
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 const host=await open(ctx,390,844),guest=await open(ctx,390,844);
 console.log('SILHOUETTE WEBRTC START');await host.locator('#multiplayer').click();
 await host.locator('#nickname').fill('店长');
 await host.locator('#host').click();
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host,undefined,{timeout:18000});
 await host.locator('#storyPanel').waitFor({state:'visible'});
 await host.locator('.protagonist-card').first().click();
 assert.equal((await state(host)).story.assignment.cityWorker,'male');
 await host.locator('#closeStory').click();
 const code=(await host.locator('#roomCode').textContent()).split('：')[1].trim();
 assert.equal(code.length,8);
 await guest.locator('#multiplayer').click();
 await guest.locator('#nickname').fill('店员');
 await guest.locator('#joinCode').fill(code);
 await guest.locator('#join').click();
 await guest.waitForFunction(()=>Object.keys(window.__KIOSK_TEST__.getState()?.players||{}).length===2,undefined,{timeout:35000});
 await tap(guest,'slot','shelfL1');
 const guestId=await guest.evaluate(()=>window.__KIOSK_TEST__.getSelfId());
 await host.waitForFunction(id=>window.__KIOSK_TEST__.getState()?.players?.[id]?.hand==='tea',guestId,{timeout:15000});
 await tap(guest,'counter');
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.counter==='tea',undefined,{timeout:12000});
 await tap(host,'sell');
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.served===1,undefined,{timeout:12000});
 assert.equal((await state(guest)).cash,(await state(host)).cash);
 // The guest proposes a choice; the host commits it once, and both see the same memory.
 await guest.locator('#storyBtn').click();
 await guest.locator('#storyContent .narrative-option').first().click();
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getStory()?.flags.read_notice===true,undefined,{timeout:12000});
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getStory()?.active==='clerk_remark',undefined,{timeout:12000});
 assert.equal((await state(host)).story.history.length,1);
 await guest.locator('#closeStory').click();
 await host.screenshot({path:'artifacts/silhouette-webrtc-host.png'});
 await guest.screenshot({path:'artifacts/silhouette-webrtc-guest.png'});
 assert.deepEqual(errors,[],'no JavaScript console exceptions');
 console.log('PASS real two-browser silhouette trade and host-authoritative settlement');
 await ctx.close();
}catch(e){
 console.error('Silhouette E2E failure:',e);
 process.exitCode=1;
}finally{
 await browser.close();
 server.kill();
 if(typeof relay?.close==='function')relay.close();
 // The local PeerServer websocket heartbeat may keep Node's event loop open.
 process.exit(process.exitCode||0);
}
