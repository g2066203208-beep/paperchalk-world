// Prove the normal first sale needs neither a camera menu nor a forced shot change.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
const server=spawn('python3',['-m','http.server','4192','--bind','127.0.0.1'],{stdio:'ignore'});let browser;
async function tap(p,cmd,key){
 await p.waitForFunction(([cmd,key])=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd===cmd&&(!key||h.key===key)),[cmd,key]);
 const hit=await p.evaluate(([cmd,key])=>window.__KIOSK_TEST__.getHits().filter(h=>h.cmd===cmd&&(!key||h.key===key)).at(-1),[cmd,key]);
 await p.mouse.click(hit.x+hit.w/2,hit.y+hit.h/2);await p.waitForTimeout(80);
}
try{
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--no-sandbox']});await fs.mkdir('artifacts',{recursive:true});
 for(const [W,H] of [[320,568],[390,844],[844,390],[1280,720]]){
  const p=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',r=>r.fulfill({path:'node_modules/peerjs/dist/peerjs.min.js',contentType:'application/javascript'}));
  await p.goto('http://127.0.0.1:4192');await p.locator('#primaryStart').click();await p.waitForFunction(()=>document.getElementById('lobby').hidden&&!document.getElementById('game').inert&&window.__KIOSK_TEST__.getArtStatus().ready===window.__KIOSK_TEST__.getArtStatus().total);
  assert.equal(await p.locator('#viewSelect').isVisible(),false);
  const camera=await p.evaluate(()=>window.__KIOSK_TEST__.getCamera());
  await tap(p,'window');await p.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion()?.stage==='idle');
  await p.screenshot({path:`artifacts/workbench-${W}x${H}-before.png`});
  await tap(p,'slot','shelfL1');assert.equal((await p.evaluate(()=>window.__KIOSK_TEST__.getState())).players.solo.hand,'tea');
  await tap(p,'counter');await tap(p,'sell');await p.waitForFunction(()=>window.__KIOSK_TEST__.getState().served===1);
  const end=await p.evaluate(()=>({c:window.__KIOSK_TEST__.getCamera(),art:window.__KIOSK_TEST__.getArtStatus()}));
  assert.deepEqual(end.c,camera,'sale must not take the player away from the working view');assert.equal(end.art.failed.length,0);assert.deepEqual(errors,[]);
  await p.screenshot({path:`artifacts/workbench-${W}x${H}-sale.png`});console.log(`PASS ${W}x${H}: fixed workbench first sale via real pointer, no camera menu, all assets loaded`);await p.close();
 }
}finally{await browser?.close();server.kill();}
