import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','4173','--directory','site'],{stdio:'ignore'});
let browser;
const screenshots=[];
async function capture(page,path){
 // Use only real Canvas pixels for the CI bitmap; stabilizes headless Chromium compositing.
 await page.evaluate(()=>{
  const canvas=document.querySelector('#rig-canvas');
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let nonwhite=0;
  for(let i=0;i<pixels.length;i+=400)if(pixels[i]<200||pixels[i+1]<200||pixels[i+2]<200)nonwhite++;
  if(nonwhite<500)throw new Error('blank or white skeleton canvas, cannot capture '+nonwhite);
  const img=document.createElement('img');img.id='ci-canvas-bitmap';img.src=canvas.toDataURL('image/png');
  img.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
  canvas.after(img);canvas.style.visibility='hidden';
 });
 try{await page.screenshot({path,fullPage:true});}
 finally{await page.evaluate(()=>{
  document.querySelector('#rig-canvas')?.style.removeProperty('visibility');
  document.getElementById('ci-canvas-bitmap')?.remove();
 });}
}

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
 await page.waitForFunction(()=>window.__BONE_LAB__?.pose?.size>10,{},{timeout:6500})
  .catch(async error=>{
   console.error('BOOT DIAGNOSTICS:',JSON.stringify({
    errors,source:await page.locator('script[type=module]').getAttribute('src'),
    state:await page.evaluate(()=>({ready:document.readyState,
     lab:typeof window.__BONE_LAB__,
     body:document.body.innerText.slice(0,300),
     scripts:[...document.scripts].map(s=>s.src)})),
    responses:await Promise.all(['app.js','surface.js','surface-renderer.js','rig.js'].map(async path=>{
     const res=await page.request.get('http://127.0.0.1:4173/'+path);
     return {path,status:res.status(),contentType:res.headers()['content-type']};
    }))
   },null,2));
   throw error;
  });
 assert.match(await page.title(),/骨骼实验室/);
 assert.equal(await page.locator('[data-type]').count(),4);
 assert.equal(await page.locator('#stat-roots').innerText(),'1');
 assert.ok(Number(await page.locator('#stat-nodes').innerText())>20);
 await page.waitForFunction(()=>window.__BONE_LAB__.surface?.contours?.some(c=>c.closed));
 assert.equal(await page.locator('#surface-switch').isChecked(),true);
 assert.equal(await page.locator('#bones-switch').isChecked(),true);
 const originalArea=await page.evaluate(()=>window.__BONE_LAB__.surface.inside);
 await page.locator('#thickness-range').evaluate(el=>{
  el.value='165';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.waitForFunction(before=>window.__BONE_LAB__.surface?.inside>before,originalArea);
 assert.equal((await page.locator('#thickness-output').innerText()),'165%');
 await page.locator('#thickness-range').evaluate(el=>{
  el.value='115';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('#blend-range').evaluate(el=>{
  el.value='17';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 assert.equal((await page.locator('#blend-output').innerText()),'17 u');
 await page.locator('#bones-switch').uncheck();
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.skin.showBones)),false);
 await page.locator('#play-switch').uncheck();
 await page.waitForTimeout(130);
 await capture(page,'artifacts/surface-01-skin-only.png');
 await page.locator('#bones-switch').check();
 const colors=await page.locator('#rig-canvas').evaluate(canvas=>{
  const c=canvas.getContext('2d'),img=c.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
  for(let y=10;y<canvas.height;y+=19)for(let x=10;x<canvas.width;x+=23){
   const k=(y*canvas.width+x)*4;colors.add([img[k],img[k+1],img[k+2]].join(','));
  }
  return colors.size;
 });
 assert.ok(colors>30,'renderer must paint real layered anatomy rather than blank canvas: '+colors);
 await page.locator('#play-switch').uncheck();
 await page.waitForTimeout(140);
 await capture(page,'artifacts/creature-01-quadruped.png');screenshots.push('quadruped');
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
  await capture(page,'artifacts/creature-0'+(type==='biped'?2:type==='hexapod'?3:4)+'-'+type+'.png');
  screenshots.push(type);
 }
 await page.locator('[data-type="quadruped"]').click();
 const before=await page.evaluate(()=>window.__BONE_LAB__.rig.seed);
 await page.locator('#regenerate').click();
 const after=await page.evaluate(()=>window.__BONE_LAB__.rig.seed);
 assert.notEqual(after,before);
 await page.locator('#size-range').evaluate(el=>{el.value='125';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.rig.size)),125);
 await page.locator('#labels-switch').check();
 await page.locator('#play-switch').uncheck();
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.state.playing)),false);
 await page.locator('.bone-row').first().click();
 assert.notEqual((await page.locator('#selected-name').innerText()),'未选中关节');
 // Hit and drag a genuine IK terminal joint within the canvas viewport.
 const location=await page.evaluate(()=>{
  const api=window.__BONE_LAB__,chain=api.rig.chains.at(-1);
  const pt=api.pose.get(chain.end),cam=api.camera,box=document.getElementById('rig-canvas').getBoundingClientRect();
  return {x:box.x+cam.tx+pt.x*cam.scale,y:box.y+cam.ty+pt.y*cam.scale};
 });
 await page.mouse.move(location.x,location.y);
 await page.mouse.down();
 const downState=await page.evaluate(()=>window.__BONE_LAB__.state);
 console.log('IK target click:',JSON.stringify({location,downState}));
 await page.mouse.move(location.x+36,location.y-26,{steps:7});
 const moved=await page.evaluate(()=>window.__BONE_LAB__.state.dragging);
 assert.equal(moved,true,'drag should engage a real IK end effector');
 const constraints=await page.evaluate(()=>{
  const api=window.__BONE_LAB__,chain=api.rig.chains.at(-1);
  const a=api.pose.get(chain.root),b=api.pose.get(chain.mid),c=api.pose.get(chain.end);
  return [Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-chain.l1),
          Math.abs(Math.hypot(b.x-c.x,b.y-c.y)-chain.l2)];
 });
 assert.ok(constraints.every(v=>v<.05),'drag cannot stretch a bone: '+constraints);
 await capture(page,'artifacts/creature-05-ik-drag.png');screenshots.push('IK');
 await page.mouse.up();
 assert.equal((await page.evaluate(()=>window.__BONE_LAB__.state.dragging)),false);
 // Observe actual file anchors and read their Blob/data URL bytes, even when
 // headless Chromium suppresses native download events.
 await page.evaluate(()=>{
  window.__exportChecks=[];
  document.addEventListener('click',event=>{
   const anchor=event.target.closest?.('a[download]');
   if(!anchor)return;
   const name=anchor.download,href=anchor.href;
   fetch(href).then(r=>r.blob()).then(blob=>
    window.__exportChecks.push({name,size:blob.size,mime:blob.type})
   ).catch(err=>window.__exportChecks.push({name,size:0,error:String(err)}));
  },true);
 });
 for(const [selector,extension] of [['#export-json','.json'],['#export-svg','.svg'],['#export-png','.png']]){
  console.log('Validating export '+selector);
  await page.locator(selector).click();
  await page.waitForFunction(ext=>
   window.__exportChecks.some(item=>item.name.endsWith(ext)),extension,{timeout:12000});
  const result=await page.evaluate(ext=>window.__exportChecks.find(i=>i.name.endsWith(ext)),extension);
  assert.ok(result.size>100,selector+' should export actual nonempty image/project bytes '+JSON.stringify(result));
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on('pageerror',e=>errors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await mobile.waitForFunction(()=>window.__BONE_LAB__?.pose?.size>10);
 assert.equal(await mobile.locator('#rig-canvas').isVisible(),true);
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=4,'mobile has horizontal overflow: '+overflow);
 await capture(mobile,'artifacts/creature-06-mobile.png');
 screenshots.push('mobile');
 assert.deepEqual(errors,[],'browser must not throw errors');
 console.log('PASS real browser: '+screenshots.join(', '));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
