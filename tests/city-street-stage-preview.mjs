import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync} from 'node:fs';
const dir='artifacts/city-street';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage',
  '--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:8765/?scene=city-street&storyCapture=1',
   {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{
   const x=window.PaperWorldCityStreetRenderer?.inspect?.();
   if(x?.error)throw Error(x.error);
   return x?.imagesLoaded&&x?.frame>1;
 },null,{timeout:45000});
 await page.evaluate(()=>{
   window.PaperWorldCityStreetRenderer.setTrafficPreviewTime(10);
   window.PaperWorldCityStreetRenderer.setLightingPreview(790);
   window.PaperWorldCityStreetRenderer.render(0,0);
 });
 const state=await page.evaluate(()=>({
   scene:document.querySelector('#scene')?.dataset.scene,
   inspect:window.PaperWorldCityStreetRenderer.inspect(),
   canvas:document.querySelector('#city-street-surface')?.getBoundingClientRect().toJSON(),
   visible:!document.querySelector('#city-street-surface')?.hidden
 }));
 assert.equal(state.scene,'city-street');assert.equal(state.inspect.active,true);
 assert.equal(state.inspect.error,null);assert.equal(state.inspect.perspective,true);
 assert.equal(state.inspect.renderer,'webgl-open-air-street');
 assert.equal(state.inspect.geometryPolicy,'textured-2d-art-on-3d-world-planes');
 assert.equal(state.inspect.road,'bidirectional');
 assert.equal(state.inspect.vehicleCount,4);
 assert.ok(state.inspect.traffic.some(v=>v.direction===-1));
 assert.ok(state.inspect.traffic.some(v=>v.direction===1));
 assert.ok(state.inspect.traffic[0].z!==state.inspect.traffic[2].z);
 assert.ok(state.inspect.imagesLoaded);assert.equal(errors.length,0);
 assert.ok(state.canvas.width>1000&&state.canvas.height>600);
 await page.screenshot({path:dir+'/street-webgl-actual-game-1920x1080.png'});
 console.log('CITY_STREET_WEBGL_GAME_SCREENSHOT',JSON.stringify(state));
}finally{await browser.close();}
