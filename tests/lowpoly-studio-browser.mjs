import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildBody} from '../site/card-battle/lowpoly-studio/body.mjs';
import {chromium} from 'playwright';
const data=buildBody();assert.equal(data.stats.connected,true);assert.equal(data.stats.boundaryOrNonManifoldEdges,0);assert.equal(data.stats.degenerate,0);assert.equal(data.stats.euler,2);assert.equal(data.stats.normalizedWeights,true);assert.equal(data.bones.length,15);
const dir='artifacts/lowpoly-studio';mkdirSync(dir,{recursive:true});writeFileSync(dir+'/topology.json',JSON.stringify(data.stats,null,2));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const [name,width,height] of [['desktop',1365,900],['phone',390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const res=await page.goto('http://127.0.0.1:4173/card-battle/lowpoly-studio/',{waitUntil:'domcontentloaded'});assert.equal(res.status(),200);await page.waitForFunction(()=>window.__lowpoly?.mesh?.isSkinnedMesh);
 const result=await page.evaluate(()=>{const {mesh,bones,data}=window.__lowpoly;return {skinned:mesh.isSkinnedMesh,bones:bones.length,vertices:mesh.geometry.attributes.position.count,triangles:mesh.geometry.index.count/3,refs:document.querySelectorAll('.ref').length,stats:data.stats}});assert.equal(result.vertices,464);assert.equal(result.triangles,924);assert.equal(result.bones,15);assert.equal(result.refs,9);
 for(const angle of ['0','90','180','35']){await page.locator('[data-angle="'+angle+'"]').click();await page.waitForTimeout(150);await page.locator('#view').screenshot({path:dir+'/'+name+'-angle-'+angle+'.png'})}
 await page.locator('#wire').click();await page.waitForTimeout(150);await page.locator('#view').screenshot({path:dir+'/'+name+'-quad-wire.png'});
 const pose=page.locator('#pose');await pose.selectOption('arms');await page.locator('#phase').evaluate(e=>e.value='0.85');await page.waitForTimeout(200);
 const moved=await page.evaluate(()=>Math.abs(window.__lowpoly.bones[3].rotation.z)>0.5);assert(moved);await page.locator('#view').screenshot({path:dir+'/'+name+'-arms.png'});
 await pose.selectOption('bend');await page.waitForTimeout(150);await page.locator('#view').screenshot({path:dir+'/'+name+'-bend.png'});
 await page.locator('#media').setInputFiles({name:'fixture.gif',mimeType:'image/gif',buffer:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')});await page.waitForFunction(()=>document.getElementById('frameInfo').textContent.includes('1 / 1'));
 assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close()}
