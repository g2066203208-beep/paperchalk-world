import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  const path=resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!path.startsWith(root+'/'))throw Error('Forbidden path');
  const data=readFileSync(path);
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(data);
 }catch(e){res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const port=server.address().port;
 const url='http://127.0.0.1:'+port+'/pixel-lab/palette-choices.html';
 const page=await browser.newPage({viewport:{width:1440,height:1024},deviceScaleFactor:1,acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url,{waitUntil:'load'});
 await page.waitForFunction(()=>Boolean(window.PALETTE_STUDIO?.ready),{timeout:25000});
 const cards=page.locator('.palette-card');
 assert.equal(await cards.count(),30,'Exactly thirty visual choices');
 assert.equal(await page.locator('.card-world-canvas').count(),30,'Thirty independent world boards');
 assert.equal(await page.locator('#activeWorldCanvas').getAttribute('width'),'224');
 const ids=await cards.evaluateAll(els=>els.map(x=>x.dataset.id));
 assert.deepEqual(ids,'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(['AA','AB','AC','AD']));
 const results=await page.evaluate(()=>window.PALETTE_STUDIO.palettes().map(x=>({id:x.id,swatches:x.colors,...window.PALETTE_STUDIO.inspect(x.id)})));
 for(const entry of results){
  assert.equal(entry.swatches.length,4,'Four allowed colors');
  assert.equal(new Set(entry.swatches).size,4,'Palette colors unique');
  assert.equal(entry.width,384);assert.equal(entry.height,512);
  assert.equal(entry.sourceTokens,384*512);
  assert.equal(entry.colors,4,'ALL four palette colors present');
  assert.equal(entry.other,0,'No phantom color');
  assert.equal(entry.alpha,0,'No alpha interpolation');
  assert.deepEqual(entry.world,{width:224,height:144,colors:4,invalid:0,transparency:0},'True four-color original world preview');
 }
 const original=await page.evaluate(()=>window.PALETTE_STUDIO.snapshot('A'));
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/thirty-palettes-desktop.png',fullPage:true});
 await page.locator('.palette-card[data-id="H"] .choose-button').click();
 assert.equal(await page.locator('#selectedLetter').innerText(),'H.');
 assert.equal(await page.locator('#selectedTitle').innerText(),'橘日港湾');
 assert.equal(await page.locator('#activeWorldName').innerText(),'夕阳码头');
 assert.equal(await page.locator('#compareId').innerText(),'B');
 await page.locator('#compareSelect').selectOption('F');
 assert.equal(await page.locator('#compareName').innerText(),'冰极警报');
 assert.equal(await page.locator('#compareWorldName').innerText(),'冰冠电台');
 await page.locator('#inspectPart').selectOption('shoe');
 await page.locator('#inspectCanvas').click({position:{x:100,y:100}});
 assert.match(await page.locator('#inspectCoord').innerText(),/像素坐标/);
 await page.locator('#showGrid').uncheck();
 assert.equal((await page.evaluate(()=>window.PALETTE_STUDIO.inspect('H'))).grid,false);
 await page.locator('#showGrid').check();
 const same=await page.evaluate(()=>window.PALETTE_STUDIO.snapshot('A'));
 assert.equal(original,same,'Grid/selection must not change underlying sprite geometry');

 // The 22 new visual worlds are real scenes, not bare swatches; filter and compare on mobile.
 await page.locator('#categorySelect').selectOption('暗黑奇谭');
 assert.deepEqual(await page.evaluate(()=>window.PALETTE_STUDIO.visible()),['L','P','W','Z']);
 await page.locator('#paletteSearch').fill('荆棘');
 assert.deepEqual(await page.evaluate(()=>window.PALETTE_STUDIO.visible()),['W']);
 assert.match(await page.locator('#showingCount').innerText(),/1 \/ 30/);
 await page.locator('#clearFilters').click();
 assert.equal(await page.locator('.palette-card:not([hidden])').count(),30);
 await page.locator('.palette-card[data-id="AC"] .choose-button').click();
 assert.equal(await page.locator('#activeWorldName').innerText(),'灵波废弃电台');
 await page.locator('#compareSelect').selectOption('AA');
 assert.equal(await page.locator('#compareWorldName').innerText(),'蓝瓷花窗城');
 assert.equal((await page.evaluate(()=>window.PALETTE_STUDIO.inspect('AD'))).world.colors,4);
 const pending=page.waitForEvent('download');
 await page.locator('#downloadPNG').click();
 const download=await pending;
 assert.match(download.suggestedFilename(),/game-palette-AC-.*384x512\.png/);
 await page.screenshot({path:'repixel-browser-artifacts/thirty-palettes-new-AC-selected.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto(url+'?p=C');
 await mobile.waitForFunction(()=>window.PALETTE_STUDIO?.ready);
 assert.equal(await mobile.locator('#selectedLetter').innerText(),'C.');
 assert.equal(await mobile.locator('.palette-card').count(),30);
 assert.equal(await mobile.locator('.card-world-canvas').count(),30);
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),true,'No horizontal overflow on mobile');
 await mobile.screenshot({path:'repixel-browser-artifacts/thirty-palettes-mobile.png',fullPage:true});
 assert.deepEqual(errors,[],'Desktop browser console errors');
 assert.deepEqual(mobileErrors,[],'Mobile browser console errors');
 console.log('PASS 30 real recolored 384x512 palettes, four colors each, zero alpha/other, responsive, export, grid and mobile',results.map(x=>({id:x.id,colors:x.colors,alpha:x.alpha,other:x.other})));
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
