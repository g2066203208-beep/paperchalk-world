import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,copyFile} from 'node:fs/promises';

test('actual phone + desktop material forge, painting, import, exports and screenshots',async()=>{
  const server=spawn('python3',['-m','http.server','8877','--directory','site'],{stdio:'ignore'});
  let browser;
  try{
    for(let k=0;k<40;k++){try{const r=await fetch('http://localhost:8877/pixel-lab/material-forge.html');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    await mkdir('artifacts/material-forge',{recursive:true});
    for(const [name,width,height] of [['mobile',390,844],['desktop',1440,900]]){
      const page=await browser.newPage({viewport:{width,height},acceptDownloads:true,deviceScaleFactor:1});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://localhost:8877/pixel-lab/material-forge.html',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>!!window.__MATERIAL_FORGE__);
      assert.equal(await page.locator('#presets button').count(),12);
      assert.equal(await page.locator('#presets button canvas').count(),12);
      await page.locator('#styleLora').selectOption('gpt');assert.match(await page.locator('#prompt').textContent(),/@gpt-image-2/);
      await page.locator('#styleLora').selectOption('none');assert.doesNotMatch(await page.locator('#prompt').textContent(),/@gpt-image-2/);
      await page.screenshot({path:'artifacts/material-forge/'+name+'-initial.png',fullPage:true});
      assert.equal((await page.evaluate(()=>window.__MATERIAL_FORGE__.state())).audit.exactEdgeMatch,true);
      await page.locator('#presets button[data-kind="brick"]').click();
      await page.locator('#size').selectOption('32');
      assert.equal((await page.evaluate(()=>window.__MATERIAL_FORGE__.state())).size,32);
      await page.locator('#edit').click({position:{x:140,y:140}});
      await page.locator('#heal').click();
      await page.locator('#repeatN').selectOption('5');
      const meta=await page.evaluate(()=>window.__MATERIAL_FORGE__.state());
      assert.equal(meta.audit.exactEdgeMatch,true);
      const task=page.waitForEvent('download');
      await page.locator('#png').click();
      const dl=await task;const output=await dl.path();
      const bytes=await readFile(output);assert.equal(bytes.subarray(1,4).toString(),'PNG');
      assert.equal(bytes.readUInt32BE(16),32);assert.equal(bytes.readUInt32BE(20),32);
      const raw=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=320;c.height=320;let g=c.getContext('2d');g.fillStyle='#6e7058';g.fillRect(0,0,320,320);g.fillStyle='#ac7058';for(let i=0;i<10;i++)g.fillRect(i*32,0,13,320);return c.toDataURL('image/png').split(',')[1]});
      await page.locator('#size').selectOption('64');
      await page.locator('#image').setInputFiles({name:'anima-test.png',mimeType:'image/png',buffer:Buffer.from(raw,'base64')});
      await page.waitForFunction(()=>window.__MATERIAL_FORGE__.state().source==='anima-image-import-not-native-proof');
      assert.equal((await page.evaluate(()=>window.__MATERIAL_FORGE__.state())).audit.exactEdgeMatch,true);
      await page.screenshot({path:'artifacts/material-forge/'+name+'.png',fullPage:true});
      if(name==='desktop'){const pending=page.waitForEvent('download');await page.locator('#atlas').click();const atlasDl=await pending;await copyFile(await atlasDl.path(),'artifacts/material-forge/12-material-atlas.png');const atlasBytes=await readFile('artifacts/material-forge/12-material-atlas.png');assert.equal(atlasBytes.readUInt32BE(16),256);assert.equal(atlasBytes.readUInt32BE(20),192);}
      assert.deepEqual(errors,[]);
      await page.close();
    }
  }finally{if(browser)await browser.close();server.kill();}
},{timeout:120000});
