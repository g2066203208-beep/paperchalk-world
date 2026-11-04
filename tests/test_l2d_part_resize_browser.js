/* Real Chromium contract: independent, nondestructive ArtMesh sizing
 * survives Save, reload and stays attached to the correct character. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=female-06&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio.state.model.parts.pants_overlay,
   null,{timeout:50000});
  // The real work area starts immediately in drag mode; no dialogs or form.
  assert.equal(await page.locator('#rig-part').inputValue(),'pants_overlay');
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#rig-fit-precise').getAttribute('open'),null,
   'numbers must be folded away by default');
  assert.equal(await page.locator('#rig-fit-panel').isVisible(),true);
  // The transparent oversized wing must NOT steal a visible shorts click.
  await page.locator('#rig-part').selectOption('wings_l');
  const pick=await page.evaluate(()=>{
   const S=window.characterEditor.S,part=window.PaperchalkPartRigStudio.state.model.parts.pants_overlay;
   const c=window.PaperchalkPartRigCore.placedBounds(part);
   const rect=document.querySelector('#stage').getBoundingClientRect();
   return {x:rect.left+S.px+(c.x+c.w*.5)*S.zoom,
    y:rect.top+S.py+(c.y+c.h*.65)*S.zoom};
  });
  await page.mouse.click(pick.x,pick.y);
  assert.equal(await page.locator('#rig-part').inputValue(),'pants_overlay',
   'click the visible pants pixels, not the transparent wing rectangle');
  await page.locator('#rig-fit-precise summary').click();
  assert.equal(await page.locator('#rig-fit-width').inputValue(),'120');
  await page.locator('#rig-fit-lock').uncheck();
  await page.locator('#rig-fit-width').fill('86');
  await page.locator('#rig-fit-height').fill('110');
  await page.locator('#rig-fit-x').fill('8');
  await page.locator('#rig-fit-y').fill('-11');
  await page.locator('#rig-fit-help').click();
  let scaled=await page.evaluate(()=>{
   const ed=window.characterEditor,m=window.PaperchalkPartRigStudio.state.model;
   const p=m.parts.pants_overlay,part=ed.S.layers.front.find(x=>x.partId==='pants_overlay');
   const b=window.PaperchalkPartRigCore.placedBounds(p);
   return {placement:p.placement,original:{w:part.canvas.width,h:part.canvas.height},
    bounds:b,skin:p._garmentLegs===m.parts.legwear};
  });
  assert.deepEqual(scaled.placement,{scaleX:.86,scaleY:1.1,offsetX:8,offsetY:-11});
  assert.equal(scaled.skin,true);
  assert.equal(scaled.original.w>0&&scaled.original.h>0,true);
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'true');
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const x=await window.PaperchalkStudio.readPartRig('female-06','front');
   return x?.parts?.pants_overlay?.placement?.scaleX===.86&&
    x?.parts?.pants_overlay?.placement?.offsetY===-11;
  },null,{timeout:35000});
  // Saved rig must render with the identical transform in the REAL game.
  await page.goto('http://127.0.0.1:8134/?dev=1',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready,null,{timeout:35000});
  await page.evaluate(()=>window.PaperchalkCharacterDev.assign('enemy','female-06','front',false));
  await page.waitForFunction(()=>
   window.PaperchalkL2DLibrary?.get('enemy')?.model?.parts?.pants_overlay?.placement?.scaleX===.86,
   null,{timeout:45000});
  const gameFit=await page.evaluate(()=>window.PaperchalkL2DLibrary.get('enemy').model.parts.pants_overlay.placement);
  assert.deepEqual(gameFit,{scaleX:.86,scaleY:1.1,offsetX:8,offsetY:-11},
   'same authored fit must load into the live game actor');
  await page.goto('http://127.0.0.1:8134/character-editor/?character=female-06&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>
   window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active,null,{timeout:50000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>
   window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkPartRigStudio.state.model.parts.pants_overlay.placement.scaleX===.86,
   null,{timeout:50000});
  assert.equal(await page.locator('#rig-part').inputValue(),'pants_overlay');
  await page.locator('#rig-fit-precise summary').click();
  assert.equal(await page.locator('#rig-fit-width').inputValue(),'86');
  assert.equal(await page.locator('#rig-fit-height').inputValue(),'110');
  // The canvas handles are not decorative: drag the real lower-right
  // corner in viewport pixels and verify the stored ArtMesh width changes.
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'true');
  const handle=await page.evaluate(()=>{
   const s=window.characterEditor.S,p=window.PaperchalkPartRigStudio.state.model.parts.pants_overlay;
   const b=window.PaperchalkPartRigCore.placedBounds(p);
   const rect=document.querySelector('#stage').getBoundingClientRect();
   return {x:rect.left+s.px+(b.x+b.w)*s.zoom,
    y:rect.top+s.py+(b.y+b.h)*s.zoom};
  });
  await page.mouse.move(handle.x,handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x+16,handle.y+12,{steps:5});
  await page.mouse.up();
  const resized=await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.parts.pants_overlay.placement.scaleX);
  assert.ok(resized>.86,'dragging the ArtMesh handle must resize the garment');
  await page.locator('#rig-fit-reset').click();
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const rig=await window.PaperchalkStudio.readPartRig('female-06','front');
   const t=rig.parts.pants_overlay.placement;
   return t.scaleX===1.2&&t.scaleY===1&&t.offsetX===-15&&t.offsetY===-17;
  },null,{timeout:35000});
  assert.deepEqual(errors,[],'no browser page errors during sizing/save/reload');
  console.log('PASS female06 resize inspector: independent X/Y scale, offset, canvas handles, save/reload, reset, source PNG preserved');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
