import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='artifacts/school-corridor';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.on('pageerror',err=>console.error('CORRIDOR_PAGE_ERROR',String(err)));
try {
 await page.goto('http://127.0.0.1:8765/?scene=school-corridor&storyCapture=1',
   {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{
   const s=window.PaperWorldSchoolCorridorRenderer?.inspect?.();
   if(s?.error)throw Error(s.error);
   return s?.active&&s?.textureCount===s?.expectedTextures;
 },null,{timeout:60000});
 const diag=await page.evaluate(()=>{
   const s=window.PaperWorldSchoolCorridorRenderer.inspect();
   return {scene:document.querySelector('#scene')?.dataset?.scene,
     ...s,windowAlphaSource:s.textures.windows.src};
 });
 assert.equal(diag.scene,'school-corridor');
 assert.deepEqual(diag.dimensions,{width:2.8,height:3.38,length:27,moduleLength:9,modules:3});
 assert.equal(diag.textureCount,diag.expectedTextures);
 assert.deepEqual(diag.moduleCounts,{doorWall:3,windowWall:3,floorStrips:6,ceilingStrips:6});
 assert.equal(diag.geometryPolicy,'textured-2d-planes-only');
 assert.match(diag.windowAlphaSource,/gpt-left-wall-painted-alpha-2048x768\.webp$/);
 const snap=async(name,x,y,z,minute,w=1920,h=1080)=>{
   await page.setViewportSize({width:w,height:h});
   const data=await page.evaluate(({x,y,z,minute})=>{
     const r=window.PaperWorldSchoolCorridorRenderer;
     r.setPreviewPosition(z);r.setLightingPreview(minute);
     if(!r.render(x,y))throw Error(r.inspect().error||'Corridor rendering failed');
     return r.canvas.toDataURL('image/png');
   },{x,y,z,minute});
   assert.ok(data.startsWith('data:image/png;base64,')&&data.length>50000,name+' empty canvas');
   writeFileSync(out+'/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
 };
 await snap('corridor-center-1920x1080',0,0,0,750);
 await snap('corridor-look-left-windows',-.85,0,0,750);
 await snap('corridor-look-right-doors',.85,0,0,750);
 await snap('corridor-midpoint',0,0,12.8,750);
 await snap('corridor-evening',0,0,0,1080);
 await snap('corridor-phone-landscape',0,0,0,750,844,390);
 console.log('CORRIDOR_REAL_WEBGL_PROOF',JSON.stringify({dims:diag.dimensions,counts:diag.moduleCounts,textures:diag.textures,shots:6}));
} finally {await browser.close();}