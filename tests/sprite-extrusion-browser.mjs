/** In-repository real Chrome/WebGL acceptance: a single image forms an
 * actual noncircular THREE.ExtrudeGeometry, both faces, black side walls.
 * Saves screenshots for front/edge/thickness and real mobile 3D preview.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const output='artifacts/coin-model-3d';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
for(const d of [{name:'desktop',w:1365,h:850},{name:'phone',w:390,h:844}]){
 const context=await browser.newContext({viewport:{width:d.w,height:d.h},deviceScaleFactor:1,
  recordVideo:{dir:output,size:{width:d.w,height:d.h}}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const response=await page.goto('http://127.0.0.1:4173/card-battle/coin-model-lab.html',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.PaperchalkSpriteCoinQA?.loaded,{timeout:15000});
  const initial=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert(initial.triangles>50,'actual 3D triangulated body required');
  assert(initial.pixelArt,'reference-style coin must preserve pixel-art shading');
  assert(initial.sourceSample.includes('slots-style-pixel-coin.svg'),'should never regress to the bright star/casino SVG default');
  assert.equal(initial.outlines,1);
  assert(initial.thickness<.09,'reference chip is a thin 3D cutout, not a thick gold cylinder');
  assert(initial.frontMapped,'texture front should use original single uploaded file');
  assert(initial.actualExtrusion,'body must be real geometry, not billboard/HTML');
  assert.equal(initial.geometryType,'ExtrudeGeometry','solid must be an actual THREE.ExtrudeGeometry');
  assert(Math.abs(initial.measuredDepth-initial.thickness)<1e-5,'actual geometry must have nonzero Z-depth');
  await page.screenshot({path:`${output}/${d.name}-angled-default-coin.png`});
  await page.locator('#front').click();
  await page.screenshot({path:`${output}/${d.name}-original-reference-style-coin-front.png`});
  await page.locator('#angled').click();
  await page.locator('#side').click();
  await page.screenshot({path:`${output}/${d.name}-edge-visible.png`});
  await page.locator('#front').click();
  await page.screenshot({path:`${output}/${d.name}-front-visible.png`});
  await page.locator('#thickness').evaluate(el=>{el.value='0.16';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const thick=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert(Math.abs(thick.thickness-.16)<1e-6,'thickness slider must rebuild actual extrusion');
  assert(Math.abs(thick.measuredDepth-.16)<1e-5,'depth must change in mesh coordinates, not fake side shading');
  assert(thick.triangles>50);
  // The silhouette is NOT a built-in cylinder: use a strongly concave STAR.
  const star='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path d="M128 20 L151 93 230 93 167 139 192 216 128 170 64 216 89 139 26 93 105 93Z" fill="#f3c24a" stroke="#211b12" stroke-width="7"/></svg>';
  await page.locator('#source').setInputFiles({name:'custom-star.svg',mimeType:'image/svg+xml',buffer:Buffer.from(star)});
  await page.waitForFunction(()=>window.PaperchalkSpriteCoinQA?.profile?.shapes[0]?.outer.length>=10);
  const custom=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert(custom.triangles>40,'concave sprite extrusion has sides and caps');
  assert.equal(custom.outlines,1);
  await page.locator('#angled').click();
  await page.screenshot({path:`${output}/${d.name}-custom-image-extruded-star.png`});
  // Actual cutout holes must be modeled, not painted away on a solid disc.
  const ring='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path d="M128,18 A110,110 0 1 0 128,238 A110,110 0 1 0 128,18 M128,81 A47,47 0 1 1 128,175 A47,47 0 1 1 128,81" fill="#f8c75a" fill-rule="evenodd"/></svg>';
  await page.locator('#source').setInputFiles({name:'custom-hole.svg',mimeType:'image/svg+xml',buffer:Buffer.from(ring)});
  await page.waitForFunction(()=>window.PaperchalkSpriteCoinQA?.profile?.shapes[0]?.holes?.length===1);
  const hole=await page.evaluate(()=>window.PaperchalkSpriteCoinQA.snapshot());
  assert.equal(hole.holes,1,'hole in source image must form a real 3D hole');
  await page.screenshot({path:`${output}/${d.name}-through-hole.png`});
  assert.deepEqual(errors,[],'no console JavaScript exceptions');
  results.push({viewport:d.name,passed:true,initial,thick,custom,hole});
  console.log(`PASS 3D coin image extrusion ${d.name}`,{triangles:custom.triangles,holes:hole.holes});
 }catch(e){results.push({viewport:d.name,passed:false,error:e.stack||String(e),errors});
  console.error('FAIL 3D coin image extrusion '+d.name,e);
  await page.screenshot({path:`${output}/${d.name}-FAIL.png`}).catch(()=>{});
 }finally{await context.close();}
}
await browser.close();writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));
assert(results.every(x=>x.passed),'3D extruded image verification failed');