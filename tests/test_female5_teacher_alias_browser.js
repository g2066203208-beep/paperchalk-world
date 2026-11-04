/* CHAR-006 female five is the SAME person as the previously published teacher.
 * Verify real hosted PSD parts, editor identity and game assignment. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8136';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/character-editor/?character=char-006&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>
    window.PaperchalkStudio?.current==='char-006'&&
    window.PaperchalkPartRigStudio?.state?.active===true&&
    window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length>=15,
    null,{timeout:50000});
  const editor=await page.evaluate(()=>{
   const m=window.PaperchalkPartRigStudio.state.model;
   const src=window.characterEditor.S.layers.front.filter(p=>p.sourcePart);
   return {id:m.characterId,realParts:src.length,rigParts:Object.keys(m.parts||{}).length,
     visibleLabel:document.querySelector('#studio-character-tree')?.textContent||''};
  });
  assert.equal(editor.id,'char-006');
  assert.ok(editor.realParts>=15&&editor.rigParts>=15,'must load real teacher PSD layers as female five');
  assert.ok(editor.visibleLabel.includes('女五'),'the editor must identify the character as female five');
  await page.goto(base+'/character-editor/?character=class-teacher-geography-candidate&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-006',null,{timeout:35000});
  await page.goto(base+'/?dev=1',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready,null,{timeout:30000});
  const ids=await page.evaluate(()=>window.PaperchalkCharacterDev.characters.map(c=>c.id));
  assert.ok(ids.includes('char-006'),'female five missing from game catalog');
  assert.ok(!ids.includes('class-teacher-geography-candidate'),'teacher must not become a duplicate NPC');
  await page.evaluate(()=>window.PaperchalkCharacterDev.assign('enemy','char-006','front',false));
  await page.waitForFunction(()=>window.PaperchalkL2DLibrary?.get('enemy')?.layers?.length>=15,
   null,{timeout:35000});
  const game=await page.evaluate(()=>({id:window.PaperchalkL2DLibrary.get('enemy').model.characterId,
    parts:window.PaperchalkL2DLibrary.get('enemy').layers.length}));
  assert.equal(game.id,'char-006');
  assert.deepEqual(errors,[]);
  console.log('PASS female five/teacher canonical char-006: editor, old URL redirect, game, real PSD ArtMeshes',editor.realParts,game.parts);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
