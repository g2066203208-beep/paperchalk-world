/* Live Chromium proof of a clean, nonduplicated heroine navigation tree.
 * Real 20-mesh standing rig and 24-mesh battle PSD are not interchangeable. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const BASE='http://127.0.0.1:8134/character-editor/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'?character=protagonist&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist'&&
   window.PaperchalkStudio.countSourceParts?.()===20&&
   window.PaperchalkPartRigStudio?.state?.active===true,
   null,{timeout:45000});
  const root=page.locator('.character-family[data-family="protagonist"]');
  assert.equal(await root.count(),1,'heroine has exactly one person root');
  assert.equal(await root.locator('summary').first().textContent(),'女主角');
  assert.deepEqual(await root.locator(':scope > .character-family-children > .character-resource-section > .character-resource-heading').allTextContents(),
   ['基础立绘','动作','服装'],'only canonical primary views, actions and outfits');
  assert.equal(await root.locator('[data-category="base"] button').count(),2);
  assert.equal(await root.locator('[data-category="action"] button').count(),1);
  assert.equal(await root.locator('[data-category="outfit"] button').count(),1);
  assert.equal(await root.locator('[data-category="action"] button[data-action="combat"]').count(),1);
  assert.equal(await root.locator('[data-category="outfit"] button[data-character="protagonist-sleepwear"]').count(),1);
  assert.equal(await root.locator('button[data-character="protagonist-battle-front"]').count(),1,
    '24-part battle PSD retained under archive, NOT used as extra action');
  const archive=root.locator('.character-source-archive');
  assert.equal(await archive.count(),1);
  assert.equal(await archive.evaluate(el=>el.open),false,
    'source archives should be folded by default');
  const groupBattle=await page.locator('#studio-character option[value="protagonist-battle-front"]').evaluate(el=>el.parentElement.label);
  const groupBase=await page.locator('#studio-character option[value="protagonist"]').evaluate(el=>el.parentElement.label);
  assert.equal(groupBattle,groupBase,'original PSD still belongs to heroine');
  // Every person root is unique and has user-facing resource categories.
  const families=await page.locator('.character-family').evaluateAll(nodes=>
   nodes.map(el=>el.dataset.family));
  assert.equal(new Set(families).size,families.length);
  fs.mkdirSync('artifacts/character-editor',{recursive:true});
  await page.screenshot({path:'artifacts/character-editor/HEROINE-CHARACTER-TREE-PRO-V2.png'});
  const sameModel=await page.evaluate(()=>{
   window.__treeOriginalModel=window.PaperchalkPartRigStudio.state.model;
   return Object.keys(window.__treeOriginalModel.parts).length;
  });
  assert.equal(sameModel,20,'canonical heroine art must still be exactly 20 parts');
  await root.locator('[data-category="action"] button[data-action="combat"]').click();
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist'&&
   window.PaperchalkPartRigStudio?.state?.model?.actionState?.to==='combat');
  assert.equal(await page.evaluate(()=>window.__treeOriginalModel===
   window.PaperchalkPartRigStudio.state.model),true,'combat must switch within the SAME actor');
  assert.equal(await page.locator('[data-category="action"] button[data-action="combat"]').getAttribute('aria-current'),'true');
  await root.locator('[data-category="base"] button[data-face="front"]').click();
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.model?.actionState?.to==='idle');
  assert.equal(await page.evaluate(()=>window.__treeOriginalModel===
   window.PaperchalkPartRigStudio.state.model),true,'base front returns to idle without a second rig');
  await page.locator('#studio-person-search').fill('睡衣');
  assert.equal(await page.locator('.character-family').count(),1);
  assert.equal(await page.locator('.character-family>summary').first().textContent(),'女主角');
  await page.locator('#studio-person-search').fill('');
  await page.locator('.character-family[data-family="protagonist"] [data-category="outfit"] button').click();
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-sleepwear'&&
    window.PaperchalkPartRigStudio?.state?.active===true&&
    window.PaperchalkStudio?.countSourceParts?.()===19,
    null,{timeout:45000});
  assert.equal(await page.locator('.character-family[data-family="protagonist"].active').count(),1);
  assert.equal(await page.locator('[data-category="outfit"] button[data-character="protagonist-sleepwear"]').getAttribute('aria-current'),'true');
  await page.goto(BASE+'?character=protagonist-battle-front&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-battle-front'&&
    window.PaperchalkPartRigStudio?.state?.active===true&&
    window.PaperchalkStudio?.countSourceParts?.()===24,
    null,{timeout:45000});
  assert.equal(await page.locator('.character-family[data-family="protagonist"]').count(),1);
  assert.equal(await page.locator('.character-family[data-family="protagonist"] .character-source-archive').evaluate(e=>e.open),true,
    'direct links to a legacy source automatically expand its archive');
  assert.deepEqual(errors,[], 'browser must have no uncaught JS errors');
  console.log('PASS live studio: heroine 1 root / 1 combat action / 1 sleepwear / folded battle PSD / same rig / search / direct source');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
