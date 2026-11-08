/* Real Chromium NPC test: alpha sprites, camera scale, directions, identity and scene gates. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css',
 '.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let body;try{body=readFileSync(file)}catch{return res.writeHead(404).end('not found')}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(body);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const dir='artifacts/npc-civilian';mkdirSync(dir,{recursive:true});
try{
 const origin='http://127.0.0.1:'+server.address().port;
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const pageErrors=[],httpErrors=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/characters/'))httpErrors.push(r.url()+':'+r.status())});
 await page.goto(origin+'/npc-test/',{waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>window.__NPC_TEST_STATE__?.registered===8 &&
   window.__NPC_TEST_STATE__?.visible===4,{timeout:35000});
 let s=await page.evaluate(()=>window.__NPC_TEST_STATE__);
 assert.equal(s.registered,8);
 assert.equal(s.visible,4);
 assert.equal(s.missingImagePaths.length,0);
 assert.deepEqual(pageErrors,[]);
 assert.deepEqual(httpErrors,[]);
 await page.screenshot({path:dir+'/front-desktop.png',fullPage:true});
 await page.locator('#side_left').click();
 await page.waitForFunction(()=>window.__NPC_TEST_STATE__?.direction==='side_left' &&
  window.__NPC_TEST_STATE__?.visible===4);
 await page.screenshot({path:dir+'/side-desktop.png',fullPage:true});
 await page.locator('#back').click();
 await page.waitForFunction(()=>window.__NPC_TEST_STATE__?.direction==='back' &&
  window.__NPC_TEST_STATE__?.visible===4);
 await page.screenshot({path:dir+'/back-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'老奶奶'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('#views img').length===3);
 assert.equal(await page.locator('#views img').count(),3);
 const imgReady=await page.locator('#views img').evaluateAll(all=>all.every(img=>img.complete&&img.naturalWidth>0));
 assert.equal(imgReady,true,'real side/front/back alpha PNG images must load');
 await page.screenshot({path:dir+'/three-view-inspection.png',fullPage:true});
 await page.locator('#close-inspection').click();
 await page.locator('#mode').click();
 await page.waitForFunction(()=>window.__NPC_TEST_STATE__?.mode==='life');
 s=await page.evaluate(()=>window.__NPC_TEST_STATE__);
 assert.equal(s.mode,'life');
 assert.ok(s.visible<=4);
 await page.locator('#place').selectOption('school');
 const school=await page.evaluate(()=>window.__NPC_TEST_STATE__);
 assert.ok(school.visible<=1,'school mode cannot show regular civilian visitors without permission');
 await page.screenshot({path:dir+'/real-life-schedule.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on('pageerror',e=>pageErrors.push('mobile:'+e.message));
 await mobile.goto(origin+'/npc-test/',{waitUntil:'domcontentloaded',timeout:50000});
 await mobile.waitForFunction(()=>window.__NPC_TEST_STATE__?.visible===4,{timeout:35000});
 const box=await mobile.locator('#stage').boundingBox();
 assert.ok(box.width>=300);
 await mobile.screenshot({path:dir+'/front-mobile.png',fullPage:true});
 assert.deepEqual(pageErrors,[]);
 console.log('PASS NPC browser: 8 identities, 4 visible, side/front/back sources, no missing images, time+location gate, mobile');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
