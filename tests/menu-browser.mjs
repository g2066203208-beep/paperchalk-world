import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['tools/dev-server.mjs','--port','4174','--host','127.0.0.1'],{stdio:'ignore'});
for(let i=0;i<30;i++){try{await fetch('http://127.0.0.1:4174');break;}catch{await new Promise(r=>setTimeout(r,100));}}
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
await fs.mkdir('artifacts/menu',{recursive:true});
const errors=[];const results=[];
try{
 for(const [w,h] of [[360,800],[390,844],[844,390],[1280,720]]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});const p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',r=>r.fulfill({path:'node_modules/peerjs/dist/peerjs.min.js',contentType:'application/javascript'}));
  await p.goto(process.env.MENU_TEST_URL||'http://127.0.0.1:4174');await p.waitForFunction(()=>window.__KIOSK_TEST__);await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>[...document.querySelectorAll('#lobby img')].every(n=>n.complete&&n.naturalWidth>0));
  for(const selector of ['#primaryStart','#multiplayer','#settings']){
   const b=await p.locator(selector).boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=w+1&&b.y+b.height<=h+1,`${w}x${h}: clipped ${selector}`);assert(b.height>=44,`${selector} touch size`);
  }
  const overflow=await p.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}));assert(overflow.w<=w&&overflow.h<=h);
  await p.screenshot({path:`artifacts/menu/home-${w}x${h}.png`});
  await p.locator('#settings').click();await p.locator('#motionToggle').uncheck();await p.locator('#largeTextToggle').check();
  assert.equal(await p.locator('#lobby').getAttribute('data-motion'),'false');
  await p.screenshot({path:`artifacts/menu/settings-${w}x${h}.png`});
  await p.getByRole('button',{name:'返回',exact:true}).click();await p.locator('#multiplayer').click();await p.locator('#join').click();
  assert.match(await p.locator('#roomDetails').textContent(),/8 位房间码/);
  await p.screenshot({path:`artifacts/menu/multi-${w}x${h}.png`});
  await p.getByRole('button',{name:'返回',exact:true}).click();await p.locator('#primaryStart').click();
  await p.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.solo);
  await p.locator('#menu').click();await p.locator('#settings').click();await p.locator('#newGame').click();await p.locator('#cancelNew').click();
  assert(await p.locator('#newConfirm').isHidden());
  await p.getByRole('button',{name:'返回',exact:true}).click();
  await p.locator('#primaryStart').click();assert.equal(await p.locator('#lobby').isHidden(),true);
  await p.reload();await p.waitForFunction(()=>window.__KIOSK_TEST__);await p.evaluate(()=>document.fonts.ready);assert.match(await p.locator('#primaryStart').textContent(),/继续经营/);
  assert.equal(await p.locator('#lobby').getAttribute('data-motion'),'false');
  await p.locator('#primaryStart').click();await p.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.solo);
  results.push({viewport:`${w}x${h}`,result:'passed'});await ctx.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile('artifacts/menu/results.json',JSON.stringify({results,pageErrors:errors},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();server.kill();}
