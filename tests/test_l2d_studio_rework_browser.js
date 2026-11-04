/* Browser regression: person tree, real ArtMesh painter order, save/restore,
 * undo/redo, and live warped-pixel precision editing. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8134/character-editor/?character=protagonist&side=front';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
    window.PaperchalkStudio?.current==='protagonist'&&
    window.PaperchalkStudio?.countSourceParts?.()===20,null,{timeout:40000});
  const original=await page.evaluate(()=>{
   const state=window.characterEditor.S,rig=window.PaperchalkPartRigStudio.state.model;
   const root=[...document.querySelectorAll('.character-family>summary')]
      .filter(x=>x.textContent.includes('女主角'));
   assert:0;
   return {order:[...rig.layerOrder],ui:state.layers.front.filter(x=>x.sourcePart).map(x=>x.partId),
      roots:root.length,tree:document.querySelector('#studio-character-tree')?.textContent||''};
  });
  assert.equal(original.roots,1,'one heroine root, not independent actors for each pose');
  assert.deepEqual(original.ui,original.order,'source list must equal true rendered Z order');
  assert.match(original.tree,/战斗/);
  assert.match(original.tree,/服装/);
  // Choose a base-layer that has space to move forward one level.
  const from=original.order.indexOf('rear_hair');
  assert.ok(from>=0&&from<original.order.length-1);
  await page.locator('#layers .layer[data-index="'+
    (await page.evaluate(()=>window.characterEditor.S.layers.front.findIndex(p=>p.partId==='rear_hair')))+
    '"] button').nth(1).click();
  const raised=await page.evaluate(()=>{
   const s=window.characterEditor.S,m=window.PaperchalkPartRigStudio.state.model;
   return {ui:s.layers.front.filter(x=>x.sourcePart).map(x=>x.partId),
      rig:[...m.layerOrder],selected:s.layers.front[s.sel].partId};
  });
  assert.equal(raised.selected,'rear_hair');
  assert.equal(raised.rig.indexOf('rear_hair'),from+1,'up means truly moving toward front');
  assert.deepEqual(raised.ui,raised.rig,'live render order follows UI immediately');
  await page.locator('#btnUndo').click();
  await page.waitForFunction(order=>
    JSON.stringify(window.PaperchalkPartRigStudio.state.model.layerOrder)===JSON.stringify(order),
    original.order);
  await page.locator('#btnRedo').click();
  await page.waitForFunction(order=>
    JSON.stringify(window.PaperchalkPartRigStudio.state.model.layerOrder)===JSON.stringify(order),
    raised.rig);
  await page.locator('#btnSave').click();
  await page.waitForFunction(async order=>{
   const saved=await window.PaperchalkStudio.readPartRig('protagonist','front');
   return JSON.stringify(saved?.layerOrder)===JSON.stringify(order);
  },raised.rig,{timeout:20000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
    window.PaperchalkStudio?.current==='protagonist',null,{timeout:40000});
  const restored=await page.evaluate(()=>({
   order:window.PaperchalkPartRigStudio.state.model.layerOrder,
   ui:window.characterEditor.S.layers.front.filter(x=>x.sourcePart).map(x=>x.partId)
  }));
  assert.deepEqual(restored.order,raised.rig,'saved layer order must survive reload');
  assert.deepEqual(restored.ui,raised.rig,'panel must reopen in persisted Z order');
  await page.locator('#main-preview').click();
  assert.equal(await page.evaluate(()=>window.PaperchalkStageMotion.state.enabled),false);
  assert.equal(await page.evaluate(()=>{
   const ctx=document.createElement('canvas').getContext('2d');
   return window.PaperchalkPartRigStudio.drawPreview(ctx);
  }),true,'precision editing must retain live ArtMesh instead of flat static snapshot');
  const uv=await page.evaluate(()=>{
   const studio=window.PaperchalkPartRigStudio,core=window.PaperchalkPartRigCore;
   const m=studio.state.model,p=m.parts.front_hair;
   const u=2/p.mesh.columns,v=2/p.mesh.rows,phase=studio.state.phase;
   const idle=studio.state.visualIdle||m.idleProfile;
   const point=core.warpPoint(p,u,v,phase,core.bonePoses(p,phase,idle),idle);
   const layer=window.characterEditor.S.layers.front.find(x=>x.partId==='front_hair');
   const hit=studio.mapToSource(point,layer);
   return {got:hit,expected:{x:p.x+p.w*u,y:p.y+p.h*v}};
  });
  assert.ok(uv.got,'mesh coordinate must be invertible at visible joint');
  assert.ok(Math.hypot(uv.got.x-uv.expected.x,uv.got.y-uv.expected.y)<2.5,
    'pixel editing should address correct source UV, not the unwarped screen position');
  assert.deepEqual(errors,[]);
  console.log('PASS real Z stack, person tree, undo/redo, save/reload, live mesh refinement');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
