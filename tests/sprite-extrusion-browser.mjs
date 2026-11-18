/** Real WebGL: one 48px sprite -> 8/10/12-sided miniature physical 3D coin,
 * near-black faceted walls and no bevel or smoothing. Desktop + phone QA.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const output='artifacts/coin-model-3d';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const results=[];
for(const d of [{name:'desktop',w:1365,h:850},{name:'phone',w:390,h:844}]){
 const context=await browser.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:1,
  recordVideo:{dir:output,size:{width:d.w,height:d.h}}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  const r=await page.goto('http://127.0.0.1:4173/card-battle/coin-model-lab.html',{waitUntil:'domcontentloaded'});
  assert.equal(r.status(),200);
  await page.waitForFunction(()=>window.PaperchalkSpriteCoinQA?.snapshot().imageLoads>=1,{timeout:15000});
  const initial=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert(initial.lowPoly,'true faceted coin not generic source contour extrusion');
  assert.equal(initial.facets,10,'10 hard flat segments are default');
  assert.equal(initial.radialSegments,10);
  assert.equal(initial.triangles,40,'10-sided cylinder has 20 side+20 face triangles');
  assert.equal(initial.geometryType,'CylinderGeometry');
  assert(initial.pixelArt && initial.nearestFiltered,'nearest neighbor source pixel art default');
  assert(initial.sourceSample.includes('slots-style-pixel-coin.svg'));
  assert(initial.sideBlack,'near-black actual physical side material');
  assert(initial.frontMapped,'single source is mapped to original polygon cap');
  assert(initial.actualExtrusion,'must have an actual Three.js geometry');
  assert(Math.abs(initial.thickness-.042)<1e-6,'the edge is only 1.4% of face width');
  assert(Math.abs(initial.measuredDepth-.042)<1e-5);
  assert(initial.worldDiameter<.45,'the default game-scale coin should be SMALL');
  await page.screenshot({path:`${output}/${d.name}-01-real-game-size.png`});
  await page.locator('#closeup').click();
  const bigger=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert(bigger.worldDiameter>2.5,'magnified inspection should scale same coin mesh');
  await page.locator('#front').click();
  await page.screenshot({path:`${output}/${d.name}-02-front-inspection.png`});
  await page.locator('#angled').click();
  await page.screenshot({path:`${output}/${d.name}-03-10-side-3d.png`});
  await page.locator('#side').click();
  await page.screenshot({path:`${output}/${d.name}-04-real-black-edge.png`});
  await page.locator('#sides').evaluate(el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const eight=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert.equal(eight.facets,8);assert.equal(eight.radialSegments,8);assert.equal(eight.triangles,32);
  await page.locator('#angled').click();
  await page.screenshot({path:`${output}/${d.name}-05-8-faceted-coin.png`});
  await page.locator('#sides').evaluate(el=>{el.value='12';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const twelve=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert.equal(twelve.facets,12);assert.equal(twelve.radialSegments,12);assert.equal(twelve.triangles,48);
  await page.screenshot({path:`${output}/${d.name}-06-12-faceted-coin.png`});
  await page.locator('#thickness').evaluate(el=>{el.value='0.084';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const thick=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert(Math.abs(thick.measuredDepth-.084)<1e-5,'slider changes ACTUAL Z thickness');
  assert.equal(thick.facets,12);
  // User-supplied only one image still makes the full polygon model.
  const custom='<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" shape-rendering="crispEdges"><rect x="5" y="5" width="38" height="38" rx="17" fill="#b8a474" stroke="#14150e" stroke-width="3"/><path d="M23 11h5v26h-5z" fill="#372d1e"/></svg>';
  await page.locator('#source').setInputFiles({name:'single-user-coin.svg',mimeType:'image/svg+xml',buffer:Buffer.from(custom)});
  await page.waitForFunction(()=>window.PaperchalkSpriteCoinQA?.snapshot().imageLoads>=2);
  const uploaded=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert.equal(uploaded.facets,12);
  assert(uploaded.frontMapped);
  assert.equal(uploaded.geometryType,'CylinderGeometry');
  await page.screenshot({path:`${output}/${d.name}-07-uploaded-source-real-3d.png`});
  assert.deepEqual(errors,[],'no errors in the real Three.js WebGL renderer');
  results.push({viewport:d.name,passed:true,initial,bigger,eight,twelve,thick,uploaded});
  console.log('PASS SMALL PIXEL LOW POLY COIN',d.name);
 }catch(e){
  results.push({viewport:d.name,passed:false,error:String(e.stack||e),errors});
  console.error('FAIL SMALL PIXEL LOW POLY COIN',d.name,e.stack||e);
  await page.screenshot({path:`${output}/${d.name}-FAIL.png`}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));
assert(results.every(x=>x.passed),'At least one real browser did not render the required miniature faceted 3D coin');