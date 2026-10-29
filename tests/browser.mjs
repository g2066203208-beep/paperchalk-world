import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','4173','--directory','site'],{stdio:'ignore'});
let browser;
const screenshots=[];
try{
 await mkdir('artifacts',{recursive:true});
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1600,height:980},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 for(let n=0;n<40;n++){
  try{await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:2500});break;}
  catch(e){if(n===39)throw e;await new Promise(resolve=>setTimeout(resolve,150));}
 }
 await page.waitForFunction(()=>window.__BONE_LAB__?.pose?.size>10);
 assert.match(await page.title(),/骨骼实验室/);
 assert.equal(await page.locator('[data-type]').count(),4);
 assert.equal(await page.locator('#stat-roots').innerText(),'1');
 assert.ok(Number(await page.locator('#stat-nodes').innerText())>20);
 const colors=await page.locator('#rig-canvas').evaluate(canvas=>{
  const c=canvas.getContext('2d'),img=c.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
  for(let y=10;y<canvas.height;y+=19)for(let x=10;x<canvas.width;x+=23){
   const k=(y*canvas.width+x)*4;colors.add([img[k],img[k+1],img[k+2]].join(','));
  }
  return colors.size;
 });
 assert.ok(colors>30,'renderer must paint real layered anatomy rather than blank canvas: '+colors);
 await page.screenshot({path:'artifacts/creature-01-quadruped.png',fullPage:true});screenshots.push('quadruped');
 // Real generator swaps 4 structural archetypes, not just a label.
 for(const [type,number] of [['biped',2],['hexapod',6],['serpent',0]]){
  await page.locator('[data-type="'+type+'"]').click();
  assert.equal(await page.evaluate(()=>window.__BONE_LAB__.rig.type),type);
  assert.equal(await page.locator('[data-type="'+type+'"]').getAttribute('aria-pressed'),'true');
  const stats=await page.evaluate(()=>window.__BONE_LAB__.inspect());
  assert.equal(stats.roots,1);
  assert.ok(stats.bones>=14);
  if(type==='hexapod')assert.equal(stats.chains,number);
  if(type==='serpent')assert.equal(stats.chains,0);
  await page.waitForTimeout(80);
  await page.screenshot({path:'artifacts/creature-0'+(type==='biped'?2:type==='hexapod'?3:4)+'-'+type+'.png',fullPage:true});
  screenshots.push(type);
 }
 await page.locator('[data-type="quadruped"]').click();
 const before=await page.evaluate(()=>window.__BONE_LAB__.rig.seed);
 await page.locator('#regenerate').click();
 const after=await page.evaluate(()=>window.__BONE_LAB__.rig.seed);
 assert.notEqual(after,before);
 await page.locator('#size-range').fill('125');
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.rig.size)),125);
 await page.locator('#labels-switch').check();
 await page.locator('#play-switch').uncheck();
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.state.playing)),false);
 await page.locator('.bone-row').first().click();
 assert.notEqual((await page.locator('#selected-name').innerText()),'未选中关节');
 // Hit and drag a genuine IK terminal joint within the canvas viewport.
 const location=await page.evaluate(()=>{
  const api=window.__BONE_LAB__,chain=api.rig.chains[0];
  const pt=api.pose.get(chain.end),cam=api.camera,box=document.getElementById('rig-canvas').getBoundingClientRect();
  return {x:box.x+cam.tx+pt.x*cam.scale,y:box.y+cam.ty+pt.y*cam.scale};
 });
 await page.mouse.move(location.x,location.y);
 await page.mouse.down();
 await page.mouse.move(location.x+36,location.y-26,{steps:7});
 const moved=await page.evaluate(()=>window.__BONE_LAB__.state.dragging);
 assert.equal(moved,true,'drag should engage a real IK end effector');
 const constraints=await page.evaluate(()=>{
  const api=window.__BONE_LAB__,chain=api.rig.chains[0];
  const a=api.pose.get(chain.root),b=api.pose.get(chain.mid),c=api.pose.get(chain.end);
  return [Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-chain.l1),
          Math.abs(Math.hypot(b.x-c.x,b.y-c.y)-chain.l2)];
 });
 assert.ok(constraints.every(v=>v<.05),'drag cannot stretch a bone: '+constraints);
 await page.screenshot({path:'artifacts/creature-05-ik-drag.png',fullPage:true});screenshots.push('IK');
 await page.mouse.up();
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.state.dragging)),false);
 for(const [selector,extension] of [['#export-json','.json'],['#export-svg','.svg'],['#export-png','.png']]){
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);
  assert.ok(download.suggestedFilename().endsWith(extension),selector+' downloaded unexpected '+download.suggestedFilename());
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on('pageerror',e=>errors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await mobile.waitForFunction(()=>window.__BONE_LAB__?.pose?.size>10);
 assert.equal(await mobile.locator('#rig-canvas').isVisible(),true);
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=4,'mobile has horizontal overflow: '+overflow);
 await mobile.screenshot({path:'artifacts/creature-06-mobile.png',fullPage:true});
 screenshots.push('mobile');
 assert.deepEqual(errors,[],'browser must not throw errors');
 console.log('PASS real browser: '+screenshots.join(', '));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
