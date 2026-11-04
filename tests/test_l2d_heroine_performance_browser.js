/* Regression: switching to the 20-mesh protagonist must not start the old
 * 128-frame decoder AND two independent render loops. All on-screen art stays
 * bound to the authentic heroine PartRig, including local masks. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=protagonist&side=front',
    {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor?.S.layers.front.filter(x=>x.sourcePart).length===20,
    null,{timeout:45000});
  const first=await page.evaluate(()=>({
   v4:window.PaperchalkStudio.isV4,
   parts:Object.keys(window.PaperchalkPartRigStudio.state.model.parts).length,
   playing:window.PaperchalkPartRigStudio.state.playing,
   dirty:window.characterEditor.S.sourceDirty
  }));
  assert.equal(first.v4,false,'128-frame V4 decoder must be stopped when independent meshes are available');
  assert.equal(first.parts,20);
  assert.equal(first.dirty,false,'viewing an actor should not mark its source art dirty');
  const sample=await page.evaluate(async()=>{
   const ed=window.characterEditor;
   const old=ed.render;
   let count=0;
   ed.render=function(...args){count++;return old(...args)};
   await new Promise(resolve=>setTimeout(resolve,1400));
   ed.render=old;
   const rig=window.PaperchalkPartRigStudio.state;
   return {count,renderMs:rig.previewRenderMs,budget:rig.previewFrameBudgetMs};
  });
  assert.ok(sample.count>3,'actor must still be animated');
  assert.ok(sample.count<=55,'only one animation loop may redraw the heroine (got '+sample.count+')');
  assert.ok(Number.isFinite(sample.renderMs),'adaptive render measurement should be available');
  await page.evaluate(()=>window.PaperchalkStudio.change('male2','front'));
  await page.waitForFunction(()=>window.PaperchalkStudio.current==='male2'&&
    window.PaperchalkPartRigStudio.state.active&&
    window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length===16,
    null,{timeout:45000});
  const switched=await page.evaluate(async()=>{
   const t=performance.now();
   await window.PaperchalkStudio.change('protagonist','front');
   return performance.now()-t;
  });
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio.state.active&&
    window.PaperchalkStudio.current==='protagonist'&&
    window.PaperchalkPartRigStudio.state.model.parts.battle_axe,
    null,{timeout:45000});
  assert.ok(switched<16000,'switching an unedited actor must avoid heavy layer PNG re-encoding');
  assert.deepEqual(errors,[]);
  console.log('PASS heroine single animation driver / idle V4 off / clean switch. '+JSON.stringify({sample,switchedMs:Math.round(switched)}));
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
