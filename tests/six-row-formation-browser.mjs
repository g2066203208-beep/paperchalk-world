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
 // Assert the reusable terrain engine, not just a screenshot or hard-coded painted checker.
 const terrainProof=await page.evaluate(()=>{
  const engine=window.__terrainEngine,debug=window.__terrainDebug;
  if(!engine||!debug)return {loaded:false};
  const tiles=debug.tiles,slots=debug.slots;
  const align=slots.map(s=>{
   const p=engine.center(s.tileC,s.tileR);
   return Math.hypot(p.x-s.x,p.z-s.z);
  });
  const colors=tiles.map(t=>t.color.map(v=>Number(v.toFixed(4))).join(','));
  const a=engine.color(7,1),b=engine.color(8,1);
  const original=engine.cell(5,3).kind;
  const oldNeighbor=engine.neighbors(5,3).east.connected;
  engine.set(5,3,'dirt');
  const updated=engine.neighbors(5,3).east.connected;
  engine.set(5,3,original);
  return {loaded:true,version:debug.version,cols:engine.cols,rows:engine.rows,
   tiles:tiles.length,slots:slots.length,maxSlotError:Math.max(...align),
   paletteRange:colors.length,
   neighborConnection:oldNeighbor,changedConnection:updated,
   centerLookup:engine.atWorld(engine.center(7,2).x,engine.center(7,2).z)?.c===7,
   colorContrast:Math.max(...a.slice(0,3).map((v,i)=>Math.abs(v-b[i])))};
 });
 assert.equal(terrainProof.loaded,true,'voxel terrain engine is present');
 assert.equal(terrainProof.tiles,96,'the actual map has 96 terrain cells');
 assert.equal(terrainProof.slots,66,'the 3x3 unit bases and two facility flanks share terrain coordinates');
 assert.equal(terrainProof.maxSlotError,0,'every card slot matches its exact underlying terrain center');
 assert.ok(terrainProof.paletteRange>60,'terrain colors vary automatically across the board');
 assert.ok(terrainProof.colorContrast>.035,'neighboring terrain blocks differ visibly but stay in one grass palette');
 assert.equal(terrainProof.neighborConnection,true,'same-type neighbor terrain auto-connects');
 assert.equal(terrainProof.changedConnection,false,'a changed material automatically updates its adjoining boundary');
 assert.equal(terrainProof.centerLookup,true,'world position maps back to the correct terrain grid cell');
 console.log('Modular 96-cell terrain, shared card coordinates, palette and auto-connect OK:',terrainProof);
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
