/* Studio save -> hosted game SAME PartRig+authored PSD PNG -> reload.
 * Requires built Pages site at http://127.0.0.1:8132/ and Playwright.
 * Uses a disposable browser context; never alters user data or GitHub assets.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8132/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'character-editor/?character=protagonist&side=front&slot=player',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist'&&
   window.PaperchalkPartRigStudio?.state?.active===true&&
   Object.keys(window.PaperchalkPartRigStudio.state.model?.parts||{}).length===20,
   null,{timeout:60000});
  const expected=await page.evaluate(async()=>{
   const editor=window.characterEditor,rig=window.PaperchalkPartRigStudio.state.model;
   const art=editor.S.layers.front.find(p=>p.sourcePart&&p.partId==='front_hair');
   if(!art)throw Error('Expected real front_hair ArtMesh missing');
   // A conspicuous disposable test pixel at a valid texture coordinate.
   const canvas=art.canvas,ctx=canvas.getContext('2d');
   ctx.fillStyle='rgb(14,237,113)';ctx.fillRect(3,3,2,2);
   rig.parts.front_hair.motion.angle=2.375;
   const done=await window.PaperchalkStudio.saveToGame();
   if(!done?.applied)throw Error('Studio reported draft instead of applied');
   const saved=await window.PaperchalkStudio.readPartRig('protagonist','front');
   if(saved?.parts?.front_hair?.motion?.angle!==2.375)
    throw Error('Saved rig does not match the editor');
   const image=canvas.toDataURL('image/png');
   function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
   return {part:'front_hair',angle:2.375,pngHash:hash(image),pngLength:image.length};
  });
  await page.goto(BASE+'?scene=classroom&dev=1',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready&&
   window.PaperchalkL2DLibrary?.get('player')?.model?.characterId==='protagonist'&&
   window.PaperchalkL2DLibrary?.get('player')?.renderedFrames>1,
   null,{timeout:60000});
  const actual=await page.evaluate(name=>{
   const bind=window.PaperchalkCharacterDev.assigned.player;
   const state=window.PaperchalkL2DLibrary.get('player');
   const edited=state.layers.find(l=>l.partId===name);
   function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
   return {side:bind.side,id:bind.id,
    angle:state.model.parts[name].motion.angle,
    personalised:state.personalised,
    edition:state.actor.root.dataset.l2dEdition,
    pngHash:hash(edited.canvas.src),pngLength:edited.canvas.src.length,
    frames:state.renderedFrames};
  },expected.part);
  assert.equal(actual.side,'front','game must honour the saved edited view');
  assert.equal(actual.id,'protagonist');
  assert.equal(actual.angle,expected.angle,'game must animate the saved Studio bones');
  assert.equal(actual.pngLength,expected.pngLength);
  assert.equal(actual.pngHash,expected.pngHash,'game must use the exact Studio painted PNG bytes');
  assert.equal(actual.personalised,true);
  assert.match(actual.edition,/(?:local-studio|locally-edited)/);
  // Verify fresh reload still uses the edited original asset, not stale V4.
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready&&
   window.PaperchalkL2DLibrary?.get('player')?.renderedFrames>1,
   null,{timeout:60000});
  const reloaded=await page.evaluate(()=>
   ({side:window.PaperchalkCharacterDev.assigned.player.side,
     angle:window.PaperchalkL2DLibrary.get('player').model.parts.front_hair.motion.angle,
     edition:window.PaperchalkL2DLibrary.get('player').actor.root.dataset.l2dEdition}));
  assert.equal(reloaded.side,'front');
  assert.equal(reloaded.angle,2.375);
  assert.match(reloaded.edition,/(?:local-studio|locally-edited)/);
  assert.deepEqual(errors,[], 'no JS errors in Studio or game');
  console.log('PASS end-to-end Studio original PNG + edited 20-part bone -> game live renderer + reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
