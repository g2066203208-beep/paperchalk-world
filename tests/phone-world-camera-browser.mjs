/* Actual Chromium game-screen screenshot and phone-world camera smoke.
 * No mocked graphics, photos, browser webcam, or synthetic world preview.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
// Serve the exact checked-out game instead of assuming another test left
// a server running. This test never uses a mocked scene.
const gameRoot=resolve('site');
const types={'.html':'text/html','.js':'application/javascript',
  '.css':'text/css','.json':'application/json','.png':'image/png',
  '.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  const route=new URL(req.url,'http://127.0.0.1').pathname;
  const target=resolve(gameRoot,'.'+(route.endsWith('/')?route+'index.html':route));
  if(!target.startsWith(gameRoot+'/')){res.writeHead(403).end();return;}
  try{
    const data=fs.readFileSync(target);
    res.writeHead(200,{'content-type':types[extname(target)]||'application/octet-stream',
      'cache-control':'no-store'});res.end(data);
  }catch{res.writeHead(404).end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base=process.env.PAPERCHALK_BROWSER_BASE||
  'http://127.0.0.1:'+server.address().port+'/';
const folder=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/phone';
fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(25000);
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
async function shot(file){await page.screenshot({path:folder+'/'+file,fullPage:false,animations:'disabled'})}
try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#menu-start').click();
  await page.waitForFunction(()=>document.getElementById('scene')?.dataset.scene==='bedroom');
  await page.waitForFunction(()=>document.getElementById('scene-transition')?.dataset.active==='false');
  const n=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
  for(let i=0;i<n;i++)await page.locator('#next-line').click();
  await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
  await page.locator('#phone-fingerprint').click();
  await page.locator('[data-app="相机"]').click();
  await page.waitForFunction(()=>{
    const c=document.querySelector('#phone-ui canvas.phone-camera-live');
    if(!c||!c.width||!c.height)return false;
    const pixels=c.getContext('2d')?.getImageData(30,30,1,1)?.data;
    return pixels&&pixels[0]+pixels[1]+pixels[2]>18;
  });
  assert.equal(await page.locator('#phone-ui').getAttribute('data-world-camera'),'true');
  assert.equal(await page.locator('video.phone-camera-live').count(),0);
  await shot('01-game-scene-phone-camera-full.png');
  const title=page.locator('#phone-app-title');
  const before=await page.locator('#phone-ui').boundingBox();
  await title.hover();
  await page.mouse.down();
  await page.mouse.move(before.x-50,before.y+70,{steps:8});
  await page.mouse.up();
  const after=await page.locator('#phone-ui').boundingBox();
  assert.ok(after&&before&&Math.abs(after.x-before.x)>15,'phone should move over the scene');
  await page.locator('#phone-ui .phone-camera-actions button').filter({hasText:'拍照'}).click();
  await page.waitForFunction(()=>document.querySelector('#phone-ui')?.dataset.appName==='相册');
  const saved=await page.evaluate(()=>window.PaperWorldDailyLifeUI.engine.snapshot().mediaPhotos.at(-1));
  assert.ok(saved?.data?.startsWith('data:image/jpeg;base64,'));
  assert.equal(saved.meta?.kind,'game-scene');
  assert.equal(saved.meta?.location,'bedroom');
  await shot('02-game-photo-album-full.png');
  await page.locator('#phone-app-back').click();
  await page.locator('[data-app="直播"]').click();
  await page.waitForFunction(()=>document.querySelector('#phone-ui')?.dataset.worldCamera==='true');
  await page.locator('#phone-ui .phone-camera-actions button').filter({hasText:'开始游戏内直播'}).click();
  assert.match(await page.locator('.phone-world-live-badge').innerText(),/LIVE/);
  await shot('03-live-in-game-scene-full.png');
  await page.locator('#phone-ui .phone-camera-actions button').filter({hasText:'结束直播'}).click();
  await page.locator('#phone-app-back').click();
  assert.equal(await page.locator('#phone-ui').getAttribute('data-world-camera'),null);
  assert.equal(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)).length,0,
    errors.slice(0,5).join('\n'));
  console.log(JSON.stringify({PASS:true,captured:'real running game',photos:saved.meta,
    files:fs.readdirSync(folder),errors:errors.slice(0,8)},null,2));
}finally{await browser.close();server.close()}
