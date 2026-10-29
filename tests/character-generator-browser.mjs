import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','4185','--directory','site'],{stdio:'ignore'});
let browser;
try{
 await mkdir('character-ml-artifacts',{recursive:true});
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 let loaded=false;
 for(let n=0;n<25;n++){
  try{await page.goto('http://127.0.0.1:4185/pixel-lab/characters.html',{waitUntil:'networkidle',timeout:1600});loaded=true;break;}
  catch{await new Promise(resolve=>setTimeout(resolve,180));}
 }
 assert.ok(loaded,'character generator page must open');
 await page.waitForFunction(()=>window.__CHARACTER_MODEL__?.model?.report?.image_count>50,null,{timeout:12000});
 const info=await page.evaluate(()=>({report:window.__CHARACTER_MODEL__.model.report,
  count:window.__CHARACTER_MODEL__.display.length}));
 assert.ok(info.report.source_count>=4,'actual artist CC0 sources required');
 assert.equal(info.count,32);
 assert.equal(await page.locator('.cell canvas').count(),32);
 let nonempty=await page.locator('.cell canvas').first().evaluate(c=>{
  const data=c.getContext('2d').getImageData(0,0,16,16).data;
  return Array.from({length:256},(_,i)=>data[i*4+3]).filter(a=>a>0).length;
 });
 assert.ok(nonempty>12);
 await page.screenshot({path:'character-ml-artifacts/01-learned-generated-16x16.png',fullPage:true});
 await page.locator('[data-tab="reference"]').click();
 const origins=await page.evaluate(()=>window.__CHARACTER_MODEL__.display);
 assert.ok(origins.every(e=>e.source_id),'original refs must have provenance IDs');
 assert.ok(new Set(origins.map(e=>e.source_id)).size>=4,'artist refs not diversified');
 await page.screenshot({path:'character-ml-artifacts/02-original-cc0-16x16.png',fullPage:true});
 await page.locator('[data-tab="generated"]').click();
 const first=await page.evaluate(()=>window.__CHARACTER_MODEL__.display[0].tokens.join(','));
 await page.locator('#seed').fill('12345');
 await page.locator('#generate').click();
 const second=await page.evaluate(()=>window.__CHARACTER_MODEL__.display[0]?.tokens.join(','));
 assert.ok(second&&first!==second,'button must run the real trained VAE decoder');
 await page.screenshot({path:'character-ml-artifacts/03-live-new-sprites.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on('pageerror',e=>errors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4185/pixel-lab/characters.html',{waitUntil:'networkidle'});
 await mobile.waitForFunction(()=>window.__CHARACTER_MODEL__?.model?.report?.image_count>50);
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=5,'mobile overflow '+overflow);
 await mobile.screenshot({path:'character-ml-artifacts/04-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS artist-source-separated 16x16 character-only training, real VAE-generated sprites, browser decoder, gallery and mobile.');
}finally{await browser?.close();server.kill('SIGTERM');}
