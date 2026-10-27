import {selectView} from './view-settings-helper.mjs';
// Exercise actual pointer targets, not debug commands, across mobile CSS sizes/DPR.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import fs from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4187','--bind','127.0.0.1'],{stdio:'ignore'});
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
let browser;const errors=[];
async function aim(page,cmd,key){
 if(['catalogPage','closeCatalog','nextday'].includes(cmd))return;
 if(cmd==='restock'&&(await page.evaluate(()=>window.__KIOSK_TEST__.getHits().some(h=>h.cmd==='closeCatalog'))))return;
 let shot=['slot','toggle','recycleStore','recycleShip'].includes(cmd)?(key||'drawerR'):cmd==='recycleReceive'?'recycle':cmd==='sell'?'register':cmd==='catalog'?'book':cmd==='counter'?'counter':'customer';
 if(cmd==='restock')shot=await page.evaluate(sku=>Object.entries(window.__KIOSK_TEST__.getState().slots).find(([,v])=>(v.sku||v.lastSku)===sku)?.[0]||'front',key);
 await page.waitForFunction(()=>document.getElementById('lobby').hidden&&!document.getElementById('game').inert);
 await selectView(page,shot);
}
async function tap(p,cmd,key){
 await aim(p,cmd,key);
 await p.waitForFunction(([cmd,key])=>document.querySelector('#lobby').hidden&&!document.querySelector('#game').inert&&window.__KIOSK_TEST__.getHits().some(h=>h.cmd===cmd&&(key===null||h.key===key)),[cmd,key??null],{timeout:6000}).catch(async e=>{console.log('FAILED',cmd,key,await state(p),await p.evaluate(()=>window.__KIOSK_TEST__.getHits()));throw e;});
 const h=await p.evaluate(([cmd,key])=>window.__KIOSK_TEST__.getHits().find(h=>h.cmd===cmd&&(key===null||h.key===key)),[cmd,key??null]);
 await p.mouse.click(h.x+h.w/2,h.y+h.h/2);
 await p.waitForTimeout(40);
}
const state=p=>p.evaluate(()=>window.__KIOSK_TEST__.getState());
try{
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 await fs.mkdir('artifacts',{recursive:true});
 for(const [W,H,dpr] of [[320,568,1],[390,844,3],[568,320,2],[844,390,3],[1280,720,1]]){
  const context=await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:dpr});
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
  await p.goto('http://127.0.0.1:4187');await p.locator('#primaryStart').click();
  await tap(p,'window');
  await p.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion().stage==='idle');
  const geometry=await p.evaluate(()=>({screen:window.__KIOSK_TEST__.screen(),hits:window.__KIOSK_TEST__.getHits(),width:document.querySelector('#game').width}));
  assert.equal(geometry.screen.W,W);assert.equal(geometry.screen.H,H);assert.equal(geometry.width,W*dpr);
  for(const h of geometry.hits){assert.ok(h.w>=44&&h.h>=44,`${W}x${H}: ${JSON.stringify(h)}`);assert.ok(h.x>=0&&h.y>=0&&h.x+h.w<=W+1&&h.y+h.h<=H+1);}
  await tap(p,'slot','shelfL2');await tap(p,'counter');await tap(p,'sell');
  assert.equal((await state(p)).mistakes,1);assert.equal((await state(p)).counter,'bread');
  await tap(p,'counter');await tap(p,'slot','shelfL2');
  // Correct first order, then optional tea commission before second bread sale.
  await tap(p,'slot','shelfL1');await tap(p,'counter');await tap(p,'sell');
  assert.equal((await state(p)).served,1);
  await p.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion().stage==='idle');
  await tap(p,'talk');await tap(p,'slot','shelfL1');await tap(p,'counter');await tap(p,'commission');
  assert.equal((await state(p)).favorDone,true);assert.equal((await state(p)).served,1);
  // Explicit purchase book replenishes depleted tea without a hidden hold gesture.
  await tap(p,'catalog');await tap(p,'restock','tea');await tap(p,'slot','shelfL1');
  assert.equal((await state(p)).slots.shelfL1.qty,1);
  // Service business uses the same real customer and the physical right drawer.
  await tap(p,'recycleReceive');await tap(p,'toggle','drawerR');await tap(p,'recycleStore');
  assert.equal((await state(p)).businesses.recycling.stored,1);
  await tap(p,'slot','shelfL2');await tap(p,'counter');await tap(p,'sell');
  await tap(p,'slot','shelfR1');await tap(p,'counter');await tap(p,'sell');
  await tap(p,'toggle','drawerL');await tap(p,'slot','drawerL');await tap(p,'counter');await tap(p,'sell');
  await tap(p,'slot','shelfL1');await tap(p,'counter');await tap(p,'sell');
  const closed=await state(p);assert.equal(closed.phase,'summary');assert.equal(closed.served,5);assert.equal(closed.mistakes,1);assert.equal(closed.favorCount,1);
  await p.screenshot({path:`artifacts/small-shop-${W}x${H}-settlement.png`});
  await tap(p,'nextday');assert.equal((await state(p)).day,2);assert.equal((await state(p)).windowOpen,false);
  await tap(p,'catalog');await tap(p,'catalogPage','improve');await tap(p,'heat');
  assert.equal((await state(p)).upgrades.heating,1);
  await p.reload();await p.locator('#primaryStart').click();
  await p.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.day===2);
  assert.equal((await state(p)).upgrades.heating,1);assert.equal((await state(p)).businesses.recycling.stored,1);
  await tap(p,'window');await p.waitForFunction(()=>window.__KIOSK_TEST__.getCustomerMotion().stage==='idle');
  await p.screenshot({path:`artifacts/small-shop-${W}x${H}-playing.png`});
  await context.close();console.log(`PASS ${W}x${H} DPR ${dpr}: wrong item, commission, purchase, recycling, five sales, settlement, next day and restore`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill();}
