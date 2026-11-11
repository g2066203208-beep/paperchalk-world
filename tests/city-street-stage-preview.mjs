import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync} from 'node:fs';
const dir='artifacts/city-street';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.emulateMedia({reducedMotion:'reduce'});
 page.on('pageerror',e=>console.error('CITY_STREET_PAGE_ERROR',String(e)));
 await page.goto('http://127.0.0.1:8765/?scene=city-street&storyCapture=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.PaperWorldCityStreetRenderer?.inspect?.().imagesLoaded,{timeout:30000});
 const state=await page.evaluate(()=>({
   scene:document.querySelector('#scene')?.dataset.scene,
   inspect:window.PaperWorldCityStreetRenderer.inspect(),
   visible:!document.querySelector('#city-street-stage').hidden,
   image:document.querySelector('.city-street-backdrop')?.naturalWidth
 }));
 assert.equal(state.scene,'city-street');
 assert.equal(state.inspect.active,true);
 assert.equal(state.visible,true);
 assert.equal(state.inspect.direction,'side-on');
 assert.equal(state.inspect.road,'bidirectional');
 assert.equal(state.inspect.vehicleCount,4);
 assert.equal(state.inspect.imagesLoaded,true);
 assert.ok(state.image>100);
 assert.ok(state.inspect.traffic.some(v=>v.direction==='left'));
 assert.ok(state.inspect.traffic.some(v=>v.direction==='right'));
 await page.screenshot({path:dir+'/street-live-game-1920x1080.png'});
 console.log('CITY_STREET_REAL_GAME_SCREENSHOT',JSON.stringify(state));
}finally{await browser.close();}
