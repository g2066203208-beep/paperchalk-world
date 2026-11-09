import {chromium} from 'playwright';
import {strict as assert} from 'node:assert';
import {mkdirSync,writeFileSync} from 'node:fs';

const output='artifacts/school-gpt-art';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
page.on('pageerror',e=>console.error('SCENE_PAGE_ERROR',String(e)));
page.on('console',m=>{if(m.type()==='error')console.error('SCENE_CONSOLE_ERROR',m.text());});
try {
 await page.goto('http://127.0.0.1:8765/?scene=school&storyCapture=1',
   {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{
   const s=window.PaperWorldSchoolRoomRenderer?.inspect?.();
   if(s?.error)throw Error(s.error);
   return s?.active&&s?.textureCount===s?.expectedTextures;
 },null,{timeout:60000});
 const assets=await page.evaluate(async()=>{
   const r=window.PaperWorldSchoolRoomRenderer;
   const s=r.inspect();
   const art=window.PaperWorldSchoolRoom;
   const src='./assets/school-room/gpt-student-furniture-atlas.webp';
   const atlas=new Image();
   atlas.src=src;await atlas.decode();
   return {scene:document.querySelector('#scene')?.dataset?.scene,
     renderer:s.renderer,textureCount:s.textureCount,expected:s.expectedTextures,
     geometryPolicy:s.geometryPolicy,
     source:art.GPT_PROP_ATLAS,
     atlas:{width:atlas.naturalWidth,height:atlas.naturalHeight},
     uv:art.FURNITURE_ATLAS,
     furniture:s.furnitureTextures,
     actors:s.actorArtwork};
 });
 assert.equal(assets.scene,'school');
 assert.equal(assets.textureCount,assets.expected);
 assert.equal(assets.geometryPolicy,'textured-2d-planes-only');
 assert.match(assets.source,/gpt-student-furniture-atlas\.webp$/);
 assert.deepEqual(assets.atlas,{width:1152,height:384});
 assert.equal(Object.keys(assets.furniture).length,3);
 for(const item of Object.values(assets.furniture)){
   assert.ok(item.ready,'All GPT-painted props must load on real GPU');
   assert.equal(item.src,assets.source);
 }
 for(const id of ['boy','girl']){
   const art=assets.actors[id];
   assert.equal(art.ready,true);
   assert.match(art.source,/gpt-school-(boy|girl)-temporary\.webp$/);
   assert.ok(Math.abs(art.fit.sourceAspect-art.fit.planeAspect)<1e-9,
     'Do not squash portraits: '+id);
   assert.ok(Math.abs(art.fit.visibleHeight-art.physicalHeight)<1e-6);
 }
 for(const id of ['female2','male1','male2','extra2']){
   assert.ok(assets.actors[id].ready,'Preserve official character asset '+id);
   assert.ok(!assets.actors[id].source.includes('gpt-school-'),
     'Never override approved art of '+id);
 }
 const shots=[];
 for(const w of [[960,540,'desktop-16x9'],[844,390,'phone-landscape']]){
   await page.setViewportSize({width:w[0],height:w[1]});
   const b64=await page.evaluate(()=>{
     const r=window.PaperWorldSchoolRoomRenderer;
     r.setLightingPreview(750);
     r.render(0,0,{...(window.PaperWorldDailyLifeUI?.snapshot?.()||{}),day:1,minute:750});
     if(r.inspect().error)throw Error(r.inspect().error);
     return r.canvas.toDataURL('image/png');
   });
   assert.ok(b64?.startsWith('data:image/png;base64,')&&b64.length>50000,
     'Game must actually draw the new art at '+w[2]);
   writeFileSync(output+'/'+w[2]+'.png',Buffer.from(b64.split(',')[1],'base64'));
   shots.push({name:w[2],viewport:w.slice(0,2),bytes:b64.length});
 }
 console.log('SCHOOL_GPT_ART_REAL_WEBGL_PROOF',
   JSON.stringify({atlas:assets.atlas,characters:Object.fromEntries(
     Object.entries(assets.actors).map(([k,a])=>[k,{source:a.source,ready:a.ready,
       sourcePixels:a.sourcePixels,poseHeight:a.physicalHeight}])),shots}));
}finally{
 await browser.close();
}
