/* Phone safety + crouching heroine hairclip one-part source restoration.
 * Run against a built site: python3 -m http.server 8132 --directory site
 * Chromium is isolated; no real user data is mutated.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8132/character-editor/?character=protagonist-crouch-axe&side=front';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  for(const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'load'});
   await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-crouch-axe'&&
     window.PaperchalkPartRigStudio?.state?.active&&
     Object.keys(window.PaperchalkPartRigStudio.state.model?.parts||{}).length>=25,
     null,{timeout:75000});
   const initial=await page.evaluate(()=>{
    const state=window.PaperchalkPartRigStudio.state;
    const rect=document.querySelector('#stage').getBoundingClientRect();
    return {tool:window.characterEditor.S.tool,fitMode:state.fitMode,
     stageVisible:rect.width>260&&rect.height>180,
     stageWidth:rect.width,stageHeight:rect.height,
     viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
     nav:!!document.querySelector('#mobile-studio-tabs')?.getBoundingClientRect().height};
   });
   assert.equal(initial.tool,'pan','editor opens in non-destructive canvas move mode');
   assert.equal(initial.fitMode,false,'mesh drag & resize must be explicitly unlocked');
   assert.equal(initial.stageVisible,true,'canvas must fit the phone viewport');
   assert.ok(initial.scrollWidth<=initial.viewport+3,
    'phone must not scroll sideways: '+JSON.stringify(initial));
   if(viewport.width<=710){
    assert.equal(initial.nav,true,'mobile navigation must remain accessible');
    await page.locator('[data-mobile-tab=parts]').click();
    assert.equal(await page.locator('body').getAttribute('data-mobile-panel'),'parts');
    assert.equal(await page.locator('.layout .left').isVisible(),true);
    await page.locator('[data-mobile-tab=controls]').click();
    assert.equal(await page.locator('.layout .right').isVisible(),true);
    await page.locator('[data-mobile-tab=canvas]').click();
    assert.equal(await page.locator('.layout .right').isVisible(),false);
   }
   await page.evaluate(async()=>{
    const rig=window.PaperchalkPartRigStudio,ed=window.characterEditor;
    const model=rig.state.model;
    const id=Object.keys(model.parts).find(id=>/^(hair_clip|hairpin|headwear|hair_clip_[lr])$/i.test(id));
    if(!id)throw Error('missing crouch source hairclip/headwear');
    const spec=window.PaperchalkStudio.list.get('protagonist-crouch-axe').l2dModule.front.rig;
    const url=new URL(spec.url,new URL('../',location.href));
    const original=await (await fetch(url)).json(),base=original.parts[id];
    const layer=ed.S.layers.front.find(p=>p.partId===id);
    if(!base||!layer)throw Error('original hairclip mismatch');
    const oldNeighbor=Object.entries(model.parts).find(([k])=>k!==id);
    const neighborBefore=JSON.stringify(oldNeighbor[1]);
    rig.select(id);
    model.parts[id].placement={scaleX:1.8,scaleY:.65,offsetX:37,offsetY:-21};
    model.parts[id].x=base.x+9;layer.x=base.x+9;
    await rig.restoreCrouchHairpin();
    const after=model.parts[id];
    if(after.x!==base.x||after.y!==base.y||layer.x!==base.x||layer.y!==base.y)
     throw Error('original x/y were not recovered');
    for(const name of ['scaleX','scaleY','offsetX','offsetY']){
     const expect=base.placement?.[name]??(name.startsWith('scale')?1:0);
     if(after.placement[name]!==expect)throw Error(name+' was not restored');
    }
    if(JSON.stringify(oldNeighbor[1])!==neighborBefore)throw Error('unrelated part mutated');
    if(rig.state.fitMode)throw Error('recovery unexpectedly enabled drag mode');
   });
   assert.deepEqual(errors,[],'no browser exceptions '+JSON.stringify(viewport));
   await context.close();
   console.log('PASS safe phone canvas, no overflow, source hairclip restore',viewport.width,viewport.height);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
