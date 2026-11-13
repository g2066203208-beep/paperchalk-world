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
 assert.equal(await page.locator('#hand .hand-card').count(),12,'7 original characters, 3 facilities and 2 reusable terrain action cards');
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
 assert.equal(await page.locator('#hand .hand-card:visible').count(),5,'seven characters leave the hand, three facilities and two terrain tools remain');
 await page.screenshot({path:out+'/09-6x16-formation-seven-1920.png'});
 await page.locator('#reset').click();
 assert.equal(await page.locator('#hand .hand-card:visible').count(),12,'reset restores seven character cards and both terrain tools');
 // Actual click-based terrain interactions through the hosted game's card UI.
 assert.equal(await page.evaluate(()=>!!window.__terrainEngine),true,'reusable engine is mounted to the real battle scene');
 const range=await page.evaluate(()=>({min:window.__terrainEngine.minLevel,max:window.__terrainEngine.maxLevel,step:window.__terrainEngine.levelStep}));
 assert.deepEqual([range.min,range.max],[-3,3],'terrain levels are exactly -3 through +3');
 await page.locator('[data-card-id="dig"]').click();
 async function digOrFillAt(c,r) {
  const point=await page.evaluate(([c,r])=>window.__terrainDebug.projectTile(c,r),[c,r]);
  await page.mouse.move(point.x,point.y);
  await page.mouse.click(point.x,point.y);
  return await page.evaluate(([c,r])=>window.__terrainEngine.cell(c,r).level,[c,r]);
 }
 const dugLevels=[];
 for(let i=0;i<4;i++)dugLevels.push(await digOrFillAt(4,3));
 assert.deepEqual(dugLevels,[-1,-2,-3,-3],'digging three layers reaches the lower bound and cannot go below it');
 assert.equal(await page.locator('[data-card-id="dig"]').getAttribute('aria-pressed'),'true','dig card remains selected for repeat operations');
 await page.waitForTimeout(350);
 await page.screenshot({path:out+'/11-6x16-digging-3-deep-real-webgl.png'});
 await page.locator('[data-card-id="build"]').click();
 const risingLevels=[];
 for(let i=0;i<7;i++)risingLevels.push(await digOrFillAt(4,3));
 assert.deepEqual(risingLevels,[-2,-1,0,1,2,3,3],'earth-building works three above original height and stops at upper bound');
 await page.waitForTimeout(350);
 await page.screenshot({path:out+'/12-6x16-building-3-high-real-webgl.png'});
 // Mix adjacent highs and lows: renderer must form joined soil cliffs, never separate bricks.
 await page.evaluate(()=>{
  const t=window.__terrainEngine;
  t.setLevel(3,3,2);t.setLevel(4,4,2);t.setLevel(5,3,1);
  t.setLevel(10,2,-3);t.setLevel(11,2,-2);t.setLevel(10,3,-1);
 });
 await page.waitForTimeout(500);
 await page.screenshot({path:out+'/13-6x16-mountains-pits-real-webgl.png'});
 const elevations=await page.evaluate(()=>{
  const t=window.__terrainEngine,all=t.snapshot();
  return {levels:[...new Set(all.map(c=>c.level))].sort(),
    raised:t.cell(4,3).height>t.cell(4,3).height-t.levelStep,
    neighbor:t.neighbors(10,2).heightChange,
    type:t.cell(10,2).kind,
    revision:t.revision};
 });
 assert.deepEqual(elevations.levels,[-3,-2,-1,0,1,2,3]);
 assert.equal(elevations.neighbor,true,'adjacent height topology updated automatically');
 assert.equal(elevations.type,'grass','digging changes the underlying 3D height, not terrain type');
 await page.locator('#reset').click();
 assert.equal(await page.evaluate(()=>window.__terrainEngine.snapshot().every(c=>c.level===0)),true,'reset returns all 96 tiles to the original plane');
 await page.locator('#hand .hand-card').first().click();
 await page.mouse.move(960,710);
 await page.waitForTimeout(420);
 await page.screenshot({path:out+'/10-6x16-formation-valid-slots-1920.png'});
 assert.deepEqual(errors,[],'no uncaught browser errors');
} finally {
 await browser.close();
}
