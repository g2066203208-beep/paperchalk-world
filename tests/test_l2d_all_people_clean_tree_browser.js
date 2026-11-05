/* Full cast UX acceptance: one consistent import workflow, no historical
 * source modules or empty placeholders in daily person navigation. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='http://127.0.0.1:8134/character-editor/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
  const cases=[
   ['protagonist','protagonist','女主'],
   ['char-002','char-002','女二'],
   ['char-003','char-003','男主'],
   ['male2','male2','男二'],
   ['char-004','char-004','女三'],
   ['female-06','female-06','女六'],
   ['female-06-outfit-02','female-06','女六'],
   ['char-006','char-006','女五'],
   ['protagonist-sleepwear','protagonist','女主'],
   ['char-003','char-003','男主']
  ];
  for(const [id,family,name] of cases){
   await page.goto(BASE+'?character='+encodeURIComponent(id)+'&side=front',
    {waitUntil:'load'});
   try{
    await page.waitForFunction(id=>window.PaperchalkStudio?.current===id&&
     !!document.getElementById('studio-person-import')&&
     !!document.querySelector('.character-family[data-family="'+
      (window.PaperchalkCharacterLibrary.familyOf(window.PaperchalkStudio.list.get(id)))+'"]'),
     id,{timeout:18000});
   }catch(error){
    console.error('CHARACTER TREE LOAD DIAGNOSTIC '+id,await page.evaluate(()=>({
     current:window.PaperchalkStudio?.current,
     list:[...window.PaperchalkStudio?.list?.keys()||[]],
     error:document.querySelector('#studio-status')?.textContent,
     active:window.PaperchalkPartRigStudio?.state?.active,
     tree:[...document.querySelectorAll('.character-family')].map(x=>x.dataset.family),
     href:location.href
    })),exceptions);
    throw error;
   }
   const audit=await page.evaluate(()=>({
    roots:[...document.querySelectorAll('.character-family')].map(x=>x.dataset.family),
    rootNames:[...document.querySelectorAll('.character-family>summary')].map(x=>x.textContent),
    tree:document.querySelector('#character-tree-items')?.textContent||'',
    imports:document.querySelectorAll('#studio-person-import').length,
    importTarget:document.querySelector('#studio-person-import-target')?.textContent||'',
    importEnabled:!document.querySelector('#studio-person-import')?.disabled,
    male2Buttons:document.querySelectorAll('.male2-direct-import').length,
    archives:document.querySelectorAll('.character-source-archive').length,
    options:[...document.querySelectorAll('#studio-character option')].map(x=>x.textContent),
    current:window.PaperchalkStudio?.current
   }));
   assert.equal(new Set(audit.roots).size,audit.roots.length,
     'one root per character: '+id);
   assert.equal(audit.roots.filter(x=>x===family).length,1,
     'canonical root for '+id);
   assert.equal(audit.rootNames[audit.roots.indexOf(family)],name,
     'human-readable root title '+id);
   assert.equal(audit.imports,1,'a single shared import tool for '+id);
   assert.equal(audit.importEnabled,true,'import must remain available for '+id);
   assert.match(audit.importTarget,new RegExp(name+'.*正面'),'selected actor import target '+id);
   assert.equal(audit.male2Buttons,0);
   assert.equal(audit.archives,0);
   assert.equal(/源稿与历史工程|原稿 \/ 历史|源稿 ·|旧工程 ·|待导入 ·/.test(audit.tree),false,
     'dev source archives must not pollute the people tree '+id);
   assert.equal(audit.options.some(x=>/原稿 \/ 历史/.test(x)),false,
     'drop-down must not list technical source archives: '+id);
   assert.equal(audit.tree.includes('＋ 导入男二'),false);
   assert.equal(audit.current,id);
   if(id==='protagonist'){
     const expected=['protagonist','char-003','char-002','male2','char-004','char-006','female-06'];
     assert.deepEqual(audit.roots.filter(root=>expected.includes(root)),expected,
       'canon roster alternates female and male roles, then existing female-five/six');
     assert.equal(audit.rootNames[audit.roots.indexOf('char-006')],'女五',
       'female five is exactly 女五 without descriptive suffix');
   }
   if(id==='female-06-outfit-02'){
    assert.equal(await page.locator('.character-family[data-family="female-06"]').count(),1,
      'new dress is NOT a second female6 character');
    assert.match(await page.locator('.character-family[data-family="female-06"] [data-category="outfit"] button[data-character="female-06-outfit-02"]').textContent(),/第三套 · 橙棕外套/);
    assert.equal(await page.locator('.character-family[data-family="female-06"] [data-category="outfit"] button[data-character="female-06-outfit-02"]').count(),1,
      'new clothes must appear under 女六 → 服装');
   }
   console.log('PASS actor tree',id,'=>',family,'import',audit.importTarget);
  }
  // The old "outfit" URL now opens the SAME canonical male-lead FRONT.
  await page.goto(BASE+'?character=char-003-outfit-02&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-003',
   null,{timeout:35000});
  assert.equal(await page.locator('.character-family[data-family="char-003"]').count(),1);
  assert.equal(await page.locator('.character-family[data-family="char-003"] [data-category="outfit"] button[data-character="char-003-outfit-02"]').count(),0);
  // Old teacher URL must select the same CHAR-006, not create a second playable teacher.
  await page.goto(BASE+'?character=class-teacher-geography-candidate&side=front',
    {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-006',null,{timeout:35000});
  assert.equal(await page.locator('.character-family[data-family="char-006"]').count(),1);
  // The universal action must trigger the actual PSD/ZIP file picker, not a
  // decoration or a disconnected button.
  const fileChooserPromise=page.waitForEvent('filechooser',{timeout:7000});
  await page.locator('#studio-person-import').click();
  const chooser=await fileChooserPromise;
  assert.equal(await chooser.element().getAttribute('id'),'studio-parts-import');
  // Internal source documents can still be opened from saved deep URLs.
  await page.goto(BASE+'?character=protagonist-battle-front&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-battle-front',
   null,{timeout:45000});
  assert.equal(await page.locator('#studio-character').inputValue(),'protagonist-battle-front');
  assert.equal(await page.locator('.character-source-archive').count(),0);
  assert.deepEqual(exceptions,[],'no uncaught client exceptions for all actors');
  console.log('PASS full cast: 10 character/wardrobe views, uniform file chooser, no archive clutter, deep-link safe');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
