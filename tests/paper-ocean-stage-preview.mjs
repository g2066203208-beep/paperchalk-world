import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdirSync } from 'node:fs';
const dir='artifacts/paper-ocean';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.emulateMedia({reducedMotion:'reduce'});
 page.on('pageerror',e=>console.error('PAPER_DEPTH_PAGE_ERROR',String(e)));
 await page.goto('http://127.0.0.1:8765/?scene=paper-ocean&storyCapture=1',
  {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.PaperWorldPaperOceanRenderer?.inspect?.().imagesLoaded,{timeout:30000});
 let state=await page.evaluate(()=>window.PaperWorldPaperOceanRenderer.inspect());
 assert.equal(state.active,true);
 assert.equal(state.perspective,false);
 assert.equal(state.renderer,'flat-2d-depth-paper-stage');
 assert.equal(state.layers.length,6);
 assert.equal(state.currentLevel,1);
 assert.equal(state.imageCount,7);
 await page.screenshot({path:dir+'/village-start-1920x1080.png'});
 for(let i=1;i<=5;i++){
  const accepted=await page.evaluate(()=>{
   const game=window.PaperWorldPaperOceanRenderer;
   return game.markCleared()&&game.advance();
  });
  assert.equal(accepted,true);
  state=await page.evaluate(()=>window.PaperWorldPaperOceanRenderer.inspect());
  assert.equal(state.currentLevel,i+1);
  assert.equal(state.transitioning,false);
 }
 assert.equal(state.currentId,'boss');
 await page.screenshot({path:dir+'/abyss-boss-1920x1080.png'});
 assert.equal(await page.evaluate(()=>window.PaperWorldPaperOceanRenderer.markCleared()),true);
 assert.equal(await page.evaluate(()=>window.PaperWorldPaperOceanRenderer.advance()),true);
 state=await page.evaluate(()=>window.PaperWorldPaperOceanRenderer.inspect());
 assert.equal(state.currentLevel,1);
 console.log('PAPER_DEPTH_2D_STAGE_VERIFIED',JSON.stringify(state));
}finally{await browser.close()}
