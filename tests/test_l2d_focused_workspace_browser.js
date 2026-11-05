/* End-to-end layout regression: no duplicate panels, original rigs untouched.
 * Assumes site is served from localhost:8132 by the L2D CI workflow.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const devices=[
   {width:1440,height:900,mobile:false},
   {width:390,height:844,mobile:true},
   {width:320,height:568,mobile:true},
   {width:844,height:390,mobile:true}
  ];
  for(const device of devices){
   const context=await browser.newContext({
    viewport:{width:device.width,height:device.height},
    isMobile:device.mobile,hasTouch:device.mobile,deviceScaleFactor:device.mobile?2:1
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8132/character-editor/?character=protagonist-crouch-axe&side=front',
    {waitUntil:'load'});
   await page.waitForFunction(()=>
    window.PaperchalkPartRigStudio?.state?.active&&
    window.PaperchalkStudio?.current==='protagonist-crouch-axe'&&
    Object.keys(window.PaperchalkPartRigStudio.state.model?.parts||{}).length===25&&
    document.body.dataset.focusedWorkspace==='v3'&&
    document.querySelector('link[data-workspace-style="v3"]')?.sheet,
    null,{timeout:75000});
   const basis=await page.evaluate(()=>{
    const mesh=window.PaperchalkPartRigStudio.state.model;
    const rect=document.querySelector('#stage').getBoundingClientRect();
    return {
     tool:window.characterEditor.S.tool,
     transformEnabled:window.PaperchalkPartRigStudio.state.fitMode,
     sourceCount:Object.keys(mesh.parts).length,
     actor:mesh.characterId,view:mesh.face,
     stageW:rect.width,stageH:rect.height,
     scrollW:document.documentElement.scrollWidth,viewportW:innerWidth,
     primaryTools:document.querySelectorAll('#easy-quickbar > button').length,
     secondaryTools:document.querySelectorAll('#workspace-quick-more-list button').length,
     navCount:document.querySelectorAll('#mobile-studio-tabs').length
    };
   });
   assert.equal(basis.tool,'pan','safe pan is default');
   assert.equal(basis.transformEnabled,false,'resize is opt-in only');
   assert.equal(basis.sourceCount,25,'original 25 real parts retained');
   assert.equal(basis.actor,'protagonist-crouch-axe');
   assert.equal(basis.view,'front');
   assert.ok(basis.stageW>=device.width*.7,'viewport should dominate available width');
   assert.ok(basis.stageH>170,'stage must remain usable');
   assert.ok(basis.scrollW<=basis.viewportW+4,'must not overflow horizontally '+JSON.stringify(basis));
   assert.equal(basis.navCount,1,'no duplicate phone navigation');
   assert.ok(basis.primaryTools<=5,'no overcrowded quickbar');
   assert.ok(basis.secondaryTools>=3,'advanced canvas actions remain reachable');

   // On phones, keep original person/layer/canvas navigation, only fewer items.
   if(device.mobile){
    assert.equal(await page.locator('#mobile-studio-tabs').isVisible(),true);
    assert.equal(await page.locator('#workspace-mobile-more').isVisible(),true);
    await page.locator('#mobile-studio-tabs [data-studio-pane="motion"]').click();
   }
   assert.equal(await page.locator('#workspace-inspector-tabs').isVisible(),true);
   assert.equal(await page.locator('#part-rig-panel').isVisible(),true);
   assert.equal(await page.locator('#rig-quick-panel').isVisible(),true);
   assert.equal(await page.locator('#rig-mask-panel').isVisible(),false,
    'mask editor is not stacked below motion sliders');
   assert.equal(await page.locator('#rig-fit-panel').isVisible(),false,
    'placement editor is not stacked below motion sliders');

   await page.locator('#workspace-inspector-tabs [data-inspector="placement"]').click();
   assert.equal(await page.locator('#rig-fit-panel').isVisible(),true);
   assert.equal(await page.locator('#rig-mask-panel').isVisible(),false);
   assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'false');
   await page.locator('#workspace-inspector-tabs [data-inspector="mask"]').click();
   assert.equal(await page.locator('#rig-mask-panel').isVisible(),true);
   await page.locator('#workspace-rig-more > summary').click();
   assert.equal(await page.locator('#rig-advanced').isVisible(),true,
     'professional binding remains available under optional advanced');
   await page.locator('#workspace-inspector-tabs [data-inspector="paint"]').click();
   assert.equal(await page.locator('#tools').isVisible(),true,
     'painting is reachable after switching to the paint workspace');

   // Menu controls are not removed. Their original DOM nodes still drive
   // save/undo/export; the workflow never creates fake replacements.
   await page.locator('#workspace-more > summary').click();
   assert.equal(await page.locator('#btnExport').isVisible(),true);
   assert.equal(await page.locator('#btnUndo').isVisible(),true);
   assert.equal(await page.locator('#btnRedo').isVisible(),true);
   assert.equal(await page.locator('#btnSave').count(),1);
   await page.locator('#workspace-more > summary').click();

   if(device.mobile){
    await page.locator('#workspace-mobile-more > summary').click();
    await page.locator('#mobile-studio-recover').click();
    assert.equal(await page.locator('#studio-recovery').isVisible(),true);
    await page.locator('.workspace-recovery-close').click();
    assert.equal(await page.locator('#studio-recovery').isVisible(),false);
   }
   assert.deepEqual(errors,[],'runtime errors '+JSON.stringify(device));
   console.log('PASS L2D focused workspace',device.width+'x'+device.height,JSON.stringify(basis));
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});