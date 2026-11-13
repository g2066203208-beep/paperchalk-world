import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const out='artifacts/card-battle-tactile';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:4173/card-battle/formation-6x16-3d.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('canvas#stage').count(),1);
 assert.equal(await page.locator('#hand .hand-card').count(),10,'7 original character cards + 3 facility cards');
 const gl=await page.evaluate(()=>{
   const stage=document.querySelector('#stage');
   const ctx=stage.getContext('webgl');
   return {hasContext:!!ctx,width:stage.width,height:stage.height,version:ctx?.getParameter(ctx.VERSION)};
 });
 assert.equal(gl.hasContext,true,'a genuine WebGL scene must render');
 console.log('3D render context:',gl.version,gl.width,gl.height);
 for(const img of await page.locator('#hand .hand-card img').all()){
   assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true,'original character card PNG loads');
 }
 await page.waitForTimeout(600);
 await page.screenshot({path:out+'/08-6x16-formation-empty-1920.png'});
 await page.locator('#demo').click();
 await page.waitForTimeout(1900);
 assert.equal(await page.locator('#hand .hand-card:visible').count(),3,'all 7 original characters leave the hand');
 await page.screenshot({path:out+'/09-6x16-formation-seven-1920.png'});
 await page.locator('#reset').click();
 assert.equal(await page.locator('#hand .hand-card:visible').count(),10,'reset restores seven character cards to hand');
 await page.locator('#hand .hand-card').first().click();
 await page.mouse.move(960,710);
 await page.waitForTimeout(420);
 await page.screenshot({path:out+'/10-6x16-formation-valid-slots-1920.png'});
 assert.deepEqual(errors,[],'no uncaught browser errors');
} finally {
 await browser.close();
}
