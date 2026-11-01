import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,copyFile} from 'node:fs/promises';
test('4-color technique workstation on actual desktop/mobile Chromium with zero training data',async()=>{
 const server=spawn('python3',['-m','http.server','8933','--directory','site'],{stdio:'ignore'});let browser;
 try{
  for(let i=0;i<35;i++){try{const r=await fetch('http://localhost:8933/pixel-lab/character-ai/four-colour-study.html');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,180))}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});await mkdir('artifacts/four-colour',{recursive:true});
  for(const [device,width,height] of [['mobile',390,844],['desktop',1440,960]]){
   const page=await browser.newPage({viewport:{width,height},acceptDownloads:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://localhost:8933/pixel-lab/character-ai/four-colour-study.html',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>window.__FOUR_COLOR_STUDY__?.state().report?.colorBudgetPass);
   assert.equal(await page.locator('#works a').count(),5);
   assert.match(await page.locator('#artist-summary').textContent(),/TofuPxl/);
   await page.screenshot({path:'artifacts/four-colour/'+device+'-initial.png',fullPage:true});
   await page.locator('#palette').selectOption('marine');
   await page.locator('#resolution').selectOption('192x256');
   assert.deepEqual((await page.evaluate(()=>window.__FOUR_COLOR_STUDY__.state())).outputSize,[192,256]);
   const dl=page.waitForEvent('download');await page.locator('#export-png').click();const png=await dl;
   const data=await readFile(await png.path());assert.equal(data.subarray(1,4).toString(),'PNG');
   assert.equal(data.readUInt32BE(16),192);assert.equal(data.readUInt32BE(20),256);
   if(device==='desktop')await copyFile(await png.path(),'artifacts/four-colour/native-original-four-colour-192x256.png');
   const report=page.waitForEvent('download');await page.locator('#export-json').click();const json=JSON.parse(await readFile(await (await report).path(),'utf8'));
   assert.equal(json.audit.colorBudgetPass,true);assert.equal(json.originalWorkUsedAsTrainingData,false);
   const original=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=256;c.height=256;const q=c.getContext('2d');q.fillStyle='#123456';q.fillRect(0,0,256,256);q.fillStyle='#cc99bb';q.fillRect(30,30,70,120);return c.toDataURL('image/png').split(',')[1]});
   await page.locator('#image-file').setInputFiles({name:'my-test.png',mimeType:'image/png',buffer:Buffer.from(original,'base64')});
   await page.waitForFunction(()=>window.__FOUR_COLOR_STUDY__.state().uploaded);
   assert.equal((await page.evaluate(()=>window.__FOUR_COLOR_STUDY__.state())).report.colorBudgetPass,true);
   await page.screenshot({path:'artifacts/four-colour/'+device+'-imported.png',fullPage:true});
   assert.deepEqual(errors,[]);
   await page.close();
  }
 }finally{if(browser)await browser.close();server.kill()}
},{timeout:120000});
