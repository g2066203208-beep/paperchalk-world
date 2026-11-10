import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdirSync } from 'node:fs';
const dir='artifacts/paper-ocean';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.emulateMedia({reducedMotion:'reduce'});
 page.on('pageerror',e=>console.error('PAPER_OCEAN_PAGE_ERROR',String(e)));
 await page.goto('http://127.0.0.1:8765/?scene=paper-ocean&storyCapture=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.PaperWorldPaperOceanRenderer?.inspect?.().imagesLoaded,{timeout:30000});
 const state=await page.evaluate(()=>({scene:document.querySelector('#scene')?.dataset.scene,
   inspect:window.PaperWorldPaperOceanRenderer.inspect()}));
 assert.equal(state.scene,'paper-ocean');assert.equal(state.inspect.active,true);
 assert.equal(state.inspect.perspective,false);assert.equal(state.inspect.layers.length,5);
 await page.screenshot({path:dir+'/ocean-boss-1920x1080.png'});
 console.log('PAPER_OCEAN_REAL_GAME_SCREENSHOT',JSON.stringify(state));
}finally{await browser.close()}