import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','4181','--directory','site'],{stdio:'ignore'});
let browser;
try{
 await mkdir('character-artifacts',{recursive:true});
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1550,height:1000},deviceScaleFactor:1,acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let loaded=false;
 for(let i=0;i<30;i++){
  try{await page.goto('http://127.0.0.1:4181/character-lab/',{waitUntil:'networkidle',timeout:1800});loaded=true;break;}catch{}
  await new Promise(r=>setTimeout(r,170));
 }
 assert.ok(loaded);
 await page.waitForFunction(()=>Boolean(window.__CHARACTER_ATELIER__?.svg));
 assert.match(await page.locator('h1').innerText(),/先设计角色/);
 assert.ok((await page.locator('#avatar path').count())>30,'must have real authored vector geometry');
 assert.equal(await page.locator('#avatar').isVisible(),true);
 await page.screenshot({path:'character-artifacts/01-anime-vector.png',fullPage:true});
 const before=await page.locator('#mouth').getAttribute('d');
 await page.locator('#mood').selectOption('bright');
 const after=await page.locator('#mouth').getAttribute('d');
 assert.notEqual(before,after,'expression should alter actual face geometry');
 assert.equal(await page.locator('#eyes-happy').evaluate(el=>getComputedStyle(el).display),'inline');
 await page.screenshot({path:'character-artifacts/02-smiling-expression.png',fullPage:true});
 await page.locator('#mood').selectOption('sleepy');
 await page.locator('[data-palette="purple"]').click();
 assert.equal(await page.evaluate(()=>window.__CHARACTER_ATELIER__.state.palette),'purple');
 await page.locator('[data-palette="blue"]').click();
 await page.locator('[data-mode="pixel"]').click();
 await page.waitForFunction(()=>document.querySelector('#pixel').width===64);
 assert.equal(await page.locator('#pixel').isVisible(),true);
 await page.screenshot({path:'character-artifacts/03-pixel-64.png',fullPage:true});
 const results=[];
 for(const n of [16,32,128]){
  await page.locator('[data-res="'+n+'"]').click();
  await page.waitForFunction(n=>document.querySelector('#pixel').width===n,n);
  const colors=await page.locator('#pixel').evaluate(canvas=>{
   const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   return new Set(Array.from({length:data.length/4},(_,i)=>[data[i*4],data[i*4+1],data[i*4+2],data[i*4+3]].join(','))).size;
  });
  assert.ok(colors>5,'pixel preview cannot be blank '+n);
  results.push({resolution:n,colors});
  await page.screenshot({path:'character-artifacts/04-pixel-'+n+'.png',fullPage:true});
 }
 await page.locator('[data-mode="vector"]').click();
 await page.locator('#outline').uncheck();
 assert.ok(await page.locator('#avatar').evaluate(el=>el.classList.contains('no-outline')));
 await page.locator('#outline').check();
 const [svgDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#save-svg').click()]);
 assert.ok(svgDownload.suggestedFilename().endsWith('.svg'));
 const [pngDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#save-png').click()]);
 assert.ok(pngDownload.suggestedFilename().endsWith('.png'));
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto('http://127.0.0.1:4181/character-lab/',{waitUntil:'networkidle'});
 assert.ok(await mobile.locator('#avatar').isVisible());
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<8,'mobile horizontal overflow '+overflow);
 await mobile.screenshot({path:'character-artifacts/05-mobile.png',fullPage:true});
 assert.deepEqual(errors,[],'browser must not throw');
 console.log('PASS CHARACTER ATELIER / designed layered curves, real face expression, palette, pixel sizes, SVG PNG downloads, responsive.',results);
}finally{
 await browser?.close();server.kill('SIGTERM');
}