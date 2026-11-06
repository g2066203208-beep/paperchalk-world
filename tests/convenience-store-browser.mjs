import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base='http://127.0.0.1:8137',dir='artifacts/convenience-store';
mkdirSync(dir,{recursive:true});
const server=spawn('python3',['-m','http.server','8137','--bind','127.0.0.1','--directory','site'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<48;i++){
  try{if((await fetch(base+'/convenience-store/')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,'web game not served');
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:1440,height:900},
  deviceScaleFactor:1,recordVideo:{dir,size:{width:1440,height:900}}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/convenience-store/',{waitUntil:'networkidle'});
 assert.equal(await page.title(),'便利店 · 表世界打工');
 assert.equal(await page.locator('#story-screen').isVisible(),true);
 assert.equal(await page.evaluate(()=>fetch('./assets/convenience-story.webp').then(r=>r.ok)),true,'scene art must load');
 await page.screenshot({path:dir+'/01-real-chromium-story.png',fullPage:true});
 await page.locator('[data-view="work"]').click();
 await page.screenshot({path:dir+'/02-start-shift.png',fullPage:true});
 await page.locator('[data-shift="晚班"]').click();
 const images=await page.locator('#counter-assembly img, #back-shelf').evaluateAll(
  imgs=>imgs.map(i=>({loaded:i.complete,width:i.naturalWidth})));
 assert.equal(images.length,8);
 assert.ok(images.every(x=>x.loaded&&x.width>0),'eight individual art pieces must load');
 await page.locator('#action-stock').click();await page.locator('#action-clean').click();
 for(let c=0;c<5;c++){
  const order=await page.evaluate(()=>window.PaperWorldConvenienceGame.game.currentOrder());
  assert.ok(order.items.length>=2);
  for(const id of order.items){
   const name=await page.evaluate(id=>window.PaperWorldConvenienceGame.game.products.find(p=>p.id===id).name,id);
   await page.locator('#goods-tray .good').filter({hasText:name}).first().click();
   await page.locator('#action-scan').click();
  }
  if(c===0)await page.screenshot({path:dir+'/03-scanned-first-order.png',fullPage:true});
  await page.locator('#action-charge').click();
  assert.equal(await page.locator('#receipt-status').textContent(),'收款完成');
  await page.locator('#action-bag').click();
 }
 const result=await page.evaluate(()=>window.PaperWorldConvenienceGame.inspect());
 assert.equal(result.shift.finished,true);assert.equal(result.shift.index,5);
 assert.equal(result.shifts,1);assert.ok(result.wallet>3200);
 assert.equal(await page.locator('#shift-summary').isVisible(),true);
 await page.screenshot({path:dir+'/04-completed-five-customer-shift.png',fullPage:true});
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await page.evaluate(()=>window.PaperWorldConvenienceGame.inspect())).wallet,result.wallet,'wallet persisted');
 await page.locator('#summary-next').click();
 await page.locator('[data-shift="早班"]').click();
 await page.screenshot({path:dir+'/05-second-shift-and-save.png',fullPage:true});
 const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(base+'/convenience-store/?view=work',{waitUntil:'networkidle'});
 await phone.screenshot({path:dir+'/06-real-mobile-390x844.png',fullPage:true});
 assert.equal(await phone.locator('#action-scan').count(),1);
 const entry=await browser.newPage({viewport:{width:1280,height:720}});
 entry.on('pageerror',e=>errors.push(e.message));
 await entry.goto(base+'/',{waitUntil:'domcontentloaded'});
 await entry.locator('#menu-convenience').click();
 await entry.waitForURL('**/convenience-store/');
 assert.equal(await entry.locator('#story-screen').isVisible(),true,'main game menu must open shop');
 await entry.screenshot({path:dir+'/07-enter-from-main-game.png'});
 assert.deepEqual(errors,[],errors.join('\n'));
 await ctx.close();await phone.close();await entry.close();
 console.log('PASS actual Chromium: main site to shop, 8 art parts, 5 customer UI clickthrough, scan/pay/bag, wage, reload save and mobile screenshots');
}finally{await browser?.close();server.kill('SIGTERM')}
