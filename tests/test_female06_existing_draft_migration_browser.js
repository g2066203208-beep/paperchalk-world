/* One-time retirement migration: the approved THIRD outfit becomes female-06.
 * Preserve THIRD local editor drafts; eliminate retired first and second slots. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const uri='http://127.0.0.1:8134/character-editor/?character=female-06&side=front';
  await page.goto(uri,{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===17,
   null,{timeout:60000});
  // Simulate an earlier browser's separate first/second/third wardrobe drafts.
  await page.evaluate(async()=>{
   const db=await new Promise((yes,no)=>{
    const r=indexedDB.open('paperchalk-dev-characters-v1',1);
    r.onsuccess=()=>yes(r.result);r.onerror=()=>no(r.error);
   });
   await new Promise((yes,no)=>{
    const tx=db.transaction('kv','readwrite'),q=tx.objectStore('kv');
    q.delete('migration:female06-third-only-v1');
    q.put({characterId:'female-06',tag:'DELETE-FIRST'},'qa-note:female-06:front');
    q.put({characterId:'female-06-second-outfit',tag:'DELETE-SECOND'},
      'qa-note:female-06-second-outfit:front');
    q.put({characterId:'female-06-outfit-02',tag:'PRESERVE-THIRD'},
      'qa-note:female-06-outfit-02:front');
    q.put([{id:'female-06',label:'first'},
      {id:'female-06-outfit-02',label:'third'},
      {id:'female-06-second-outfit',label:'second'},
      {id:'local-test',label:'unrelated'}],'imported');
    tx.oncomplete=yes;tx.onerror=()=>no(tx.error);
   });db.close();
  });
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===17,
   null,{timeout:60000});
  const state=await page.evaluate(async()=>{
   const db=await new Promise((yes,no)=>{
    const r=indexedDB.open('paperchalk-dev-characters-v1',1);
    r.onsuccess=()=>yes(r.result);r.onerror=()=>no(r.error);
   });
   const read=k=>new Promise((yes,no)=>{
    const r=db.transaction('kv','readonly').objectStore('kv').get(k);
    r.onsuccess=()=>yes(r.result);r.onerror=()=>no(r.error);
   });
   const ids=(await read('imported')||[]).map(x=>x.id);
   const result={
    migrated:await read('qa-note:female-06:front'),
    retiredSecond:await read('qa-note:female-06-second-outfit:front'),
    retiredThirdKey:await read('qa-note:female-06-outfit-02:front'),
    flag:await read('migration:female06-third-only-v1'),
    imported:ids,
    baseCount:Object.keys(window.PaperchalkPartRigStudio.state.model.parts).length,
    variants:[...document.querySelectorAll('.character-family[data-family="female-06"] [data-category="outfit"] button')]
   };
   db.close();return result;
  });
  assert.equal(state.migrated?.tag,'PRESERVE-THIRD');
  assert.equal(state.migrated.characterId,'female-06');
  assert.equal(state.retiredSecond,undefined);
  assert.equal(state.retiredThirdKey,undefined);
  assert.equal(state.flag,true);
  assert.deepEqual(state.imported,['local-test']);
  assert.equal(state.baseCount,17);
  assert.equal(state.variants.length,0);
  assert.deepEqual(errors,[]);
  console.log('PASS female-six migration: third local rig/paint keys take canonical ID; retired originals and second eliminated, unrelated actor retained');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
