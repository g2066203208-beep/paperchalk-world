import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildBody,buildModules} from '../site/card-battle/lowpoly-studio/body-modular-v8.mjs';
import {chromium} from 'playwright';
const data=buildBody();assert.equal(data.stats.connected,true);assert.equal(data.stats.boundaryOrNonManifoldEdges,0);assert.equal(data.stats.degenerate,0);assert.equal(data.stats.euler,2);assert.equal(data.stats.normalizedWeights,true);assert.equal(data.bones.length,15);
for(const part of Object.values(buildModules())){assert.equal(part.stats.connected,true);assert.equal(part.stats.boundaryOrNonManifoldEdges,0);assert.equal(part.stats.degenerate,0);assert.equal(part.stats.euler,2)}
const dir='artifacts/lowpoly-studio';mkdirSync(dir,{recursive:true});writeFileSync(dir+'/topology.json',JSON.stringify(data.stats,null,2));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{for(const [name,width,height] of [['desktop',1365,900],['phone',390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const res=await page.goto('http://127.0.0.1:4173/card-battle/lowpoly-studio/',{waitUntil:'domcontentloaded'});assert.equal(res.status(),200);await page.waitForFunction(()=>window.__lowpoly?.mesh?.isSkinnedMesh);
 const result=await page.evaluate(()=>{const {mesh,bones,data}=window.__lowpoly;return {skinned:mesh.isSkinnedMesh,bones:bones.length,vertices:mesh.geometry.attributes.position.count,triangles:mesh.geometry.index.count/3,refs:document.querySelectorAll('#refs .ref').length,stats:data.stats}});assert.equal(result.vertices,109);assert.equal(result.triangles,214);assert.equal(result.bones,15);assert.equal(result.refs,9);
 for(const angle of ['0','90','180','35']){await page.locator('[data-angle="'+angle+'"]').click();await page.waitForTimeout(150);await page.locator('#view').screenshot({path:dir+'/'+name+'-angle-'+angle+'.png'})}
 const snapshot=()=>page.evaluate(()=>{const q=window.__lowpoly;return {selected:q.selected(),visible:Object.entries(q.moduleObjects).filter(([id,o])=>o.part.visible).map(([id])=>id),body:JSON.stringify(q.data.positions),attached:q.moduleRoot.parent===q.bones[2]}});
 const initial=await snapshot();assert.deepEqual(initial.selected,['hairClassic','earHorseL','earHorseR']);assert(initial.attached);
 await page.locator('#bareHead').click();assert.deepEqual((await snapshot()).visible,[]);await page.locator('#view').screenshot({path:dir+'/'+name+'-bare-head.png'});
 await page.locator('#hairStyle').selectOption('hairShort');await page.locator('#earL').selectOption('earShortL');assert.deepEqual((await snapshot()).visible,['hairShort','earShortL']);assert.equal((await snapshot()).body,initial.body);
 await page.locator('#view').screenshot({path:dir+'/'+name+'-swapped-modules.png'});
 await page.locator('#restoreHead').click();await page.locator('#explodeHead').click();assert(await page.evaluate(()=>window.__lowpoly.moduleObjects.hairClassic.part.position.y>.3));await page.locator('#view').screenshot({path:dir+'/'+name+'-exploded.png'});await page.locator('#explodeHead').click();
 await page.locator('#pose').selectOption('head');await page.locator('#phase').evaluate(e=>e.value='0');await page.waitForTimeout(100);
 const getPoint=()=>page.evaluate(()=>{const q=window.__lowpoly,o=q.moduleObjects.earHorseR.part;return o.localToWorld(o.position.clone().set(.406,3.13,.2088)).toArray()});const p0=await getPoint();await page.locator('#phase').evaluate(e=>e.value='1');await page.waitForTimeout(150);const p1=await getPoint();assert(Math.hypot(...p1.map((x,i)=>x-p0[i]))>.1);await page.locator('#pose').selectOption('rest');
 await page.locator('#focusBody').click();
 await page.locator('#wire').click();await page.waitForTimeout(150);await page.locator('#view').screenshot({path:dir+'/'+name+'-quad-wire.png'});
 const pose=page.locator('#pose');await pose.selectOption('arms');await page.locator('#phase').evaluate(e=>e.value='0.85');await page.waitForTimeout(200);
 const moved=await page.evaluate(()=>Math.abs(window.__lowpoly.bones[3].rotation.z)>0.5);assert(moved);await page.locator('#view').screenshot({path:dir+'/'+name+'-arms.png'});
 await pose.selectOption('bend');await page.waitForTimeout(150);await page.locator('#view').screenshot({path:dir+'/'+name+'-bend.png'});
 await page.locator('#media').setInputFiles({name:'fixture.gif',mimeType:'image/gif',buffer:Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64')});await page.waitForFunction(()=>document.getElementById('frameInfo').textContent.includes('1 / 1'));
 // Native reference coordinate/overlay test with known synthetic fixture; not artist's media.
 await page.locator('#compareLoad').setInputFiles({name:'coordinate-fixture.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="#30363b"/><rect x="60" y="40" width="120" height="240" fill="#eee"/></svg>')});
 await page.waitForFunction(()=>window.__comparisonQA?.state.ready&&window.__comparisonQA.state.W===240&&window.__comparisonQA.state.H===320);
 const sizes=await page.evaluate(()=>['compareRef','compareModel'].map(id=>[document.getElementById(id).width,document.getElementById(id).height]));assert.deepEqual(sizes,[[240,320],[240,320]]);
 for(const id of ['compareRef','compareModel']){const el=page.locator('#'+id);const box=await el.boundingBox();await el.click({position:{x:box.width*.5,y:box.height*.5}})}
 const marked=await page.evaluate(()=>window.__comparisonQA.state.points);assert.equal(marked[0].length,1);assert.equal(marked[1].length,1);assert(Math.hypot(marked[0][0][0]-marked[1][0][0],marked[0][0][1]-marked[1][0][1])<3);
 await page.locator('#compareOverlay').check();await page.locator('#compareGrid').check();await page.locator('#compareLab').screenshot({path:dir+'/'+name+'-comparison-fixture.png'});
 assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close()}
