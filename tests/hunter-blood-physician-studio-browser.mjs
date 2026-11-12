import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dir='artifacts/hunter-blood-physician-l2d';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const addr='http://127.0.0.1:8134/character-editor/?character=hunter-blood-physician&side=front';
 await page.goto(addr,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.PaperchalkStudio?.current==='hunter-blood-physician',null,{timeout:60000});
 await page.waitForFunction(()=>{
   const p=window.PaperchalkPartRigStudio;
   return p?.state?.model?.characterId==='hunter-blood-physician' &&
     Object.keys(p.state.model.parts||{}).length===17 &&
     (window.characterEditor?.S?.layers?.front||[]).filter(x=>x.sourcePart).length===17;
 },null,{timeout:90000});
 await page.waitForTimeout(1200);
 const state=await page.evaluate(()=>{
  const e=window.characterEditor.S,p=window.PaperchalkPartRigStudio.state;
  return {id:window.PaperchalkStudio.current,count:Object.keys(p.model.parts).length,
    parts:e.layers.front.filter(x=>x.sourcePart).map(x=>({id:x.partId,x:x.x,y:x.y,
      w:x.canvas?.width,h:x.canvas?.height,role:x.role})),
    stage:{w:document.querySelector('#stage')?.clientWidth,
      h:document.querySelector('#stage')?.clientHeight},
    camera:document.body.dataset.focusedWorkspace};
 });
 assert.equal(state.count,17);
 assert.ok(state.parts.some(p=>p.id==='eyewhite'));
 assert.ok(state.parts.some(p=>p.id==='front_hair'));
 assert.ok(state.parts.some(p=>p.id==='handwear'));
 assert.ok(state.parts.some(p=>p.id==='objects'));
 assert.ok(state.parts.every(p=>p.role==='psd-part'),'all parts must be original independent PSD layers');
 assert.ok(state.stage.w>400&&state.stage.h>350);
 await page.screenshot({path:dir+'/01-hunter-blood-physician-in-real-l2d-studio.png',fullPage:false});
 const layer=await page.locator('#part-rig-panel').isVisible();
 assert.ok(layer,'rig editing controls must be present');
 await page.screenshot({path:dir+'/02-editable-parts-workspace.png',fullPage:true});
 assert.deepEqual(errors,[],'no browser runtime exceptions');
 console.log(JSON.stringify({PASS:true,actor:state.id,partCount:state.count,stage:state.stage,parts:state.parts.map(x=>x.id),studioPanelVisible:layer,output:dir}));
}finally{await browser.close()}
