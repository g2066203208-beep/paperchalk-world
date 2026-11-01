import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,copyFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('real browser pixel game asset production on phone and desktop',async()=>{
 const server=spawn('python3',['-m','http.server','8899','--directory','site'],{stdio:'ignore'});
 let browser;
 try{
  for(let k=0;k<50;k++){try{const r=await fetch('http://localhost:8899/pixel-lab/game-asset-studio.html');if(r.ok)break}catch{}await new Promise(resolve=>setTimeout(resolve,200))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  await mkdir('artifacts/game-production',{recursive:true});
  for(const [device,width,height] of [['mobile',390,844],['desktop',1440,960]]){
   const page=await browser.newPage({viewport:{width,height},acceptDownloads:true,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://localhost:8899/pixel-lab/game-asset-studio.html',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>!!window.__GAME_ASSET_STUDIO__);
   const initial=await page.evaluate(()=>window.__GAME_ASSET_STUDIO__.state());
   assert.equal(initial.scene.width,384);assert.equal(initial.scene.height,216);
   assert.equal(await page.locator('#module-list button').count(),10);
   assert.equal(initial.training.ready,false);
   await page.screenshot({path:'artifacts/game-production/'+device+'-initial.png',fullPage:true});
   await page.locator('#module-list button').filter({hasText:'植物'}).click();
   let current=await page.evaluate(()=>window.__GAME_ASSET_STUDIO__.state());
   assert.equal(current.scene.objects.length,initial.scene.objects.length+1);
   await page.locator('#pos-x').fill('207');await page.locator('#pos-x').press('Tab');
   current=await page.evaluate(()=>window.__GAME_ASSET_STUDIO__.state());
   assert.equal(current.scene.objects.find(x=>x.id===current.selected).x,207);
   await page.locator('#undo').click();
   const undone=await page.evaluate(()=>window.__GAME_ASSET_STUDIO__.state());
   assert.equal(undone.scene.objects.at(-1).x,150);
   await page.locator('#redo').click();
   await page.locator('#front').click();
   const dl=page.waitForEvent('download');
   await page.locator('#save-png').click();
   const file=await dl;const png=await readFile(await file.path());
   assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),384);assert.equal(png.readUInt32BE(20),216);
   if(device==='desktop')await copyFile(await file.path(),'artifacts/game-production/game-scene-384x216.png');
   const saved=page.waitForEvent('download');await page.locator('#save-json').click();const dat=await saved;const bytes=await readFile(await dat.path(),'utf8');const exported=JSON.parse(bytes);assert.equal(exported.width,384);
   await page.screenshot({path:'artifacts/game-production/'+device+'-edited.png',fullPage:true});
   await page.locator('[data-tab="character"]').click();
   await page.locator('img#candidate-one').waitFor({state:'visible'});
   await page.locator('[data-img="candidate-one"]').click();
   assert.match(await page.locator('#character-report').textContent(),/颜色：/);
   await page.screenshot({path:'artifacts/game-production/'+device+'-character.png',fullPage:true});
   await page.locator('[data-tab="lora"]').click();
   assert.match(await page.locator('#report').textContent(),/不能开始角色LoRA训练/);
   await page.locator('#artist-tag').fill('@motocross saito');
   await page.locator('#make-prompt').click();
   assert.match(await page.locator('#prompt-output').inputValue(),/@motocross saito/);
   await page.locator('#prompt-kind').selectOption('environment');
   assert.match(await page.locator('#prompt-output').inputValue(),/cozy rainy night bar/);
   await page.screenshot({path:'artifacts/game-production/'+device+'-training-gate.png',fullPage:true});
   assert.deepEqual(errors,[],'browser errors: '+errors.join(' / '));
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill()}
},{timeout:120000});
