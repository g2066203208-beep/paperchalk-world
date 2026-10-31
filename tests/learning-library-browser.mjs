import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.html':'text/html; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const pathname=resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
  if(!pathname.startsWith(root+'/'))throw Error('invalid');
  res.writeHead(200,{'Content-Type':mime[extname(pathname)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(pathname));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const origin='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/learning-library',{recursive:true});
try{
 for(const [type,width,height] of [['mobile-portrait',390,844],['mobile-landscape',844,390],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:type!=='desktop',isMobile:type!=='desktop'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'learning-library/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__PAPERWORLD_LEARNING_LIBRARY__?.totalPhotos>=19,{timeout:12000});
  const info=await page.evaluate(()=>window.__PAPERWORLD_LEARNING_LIBRARY__);
  assert.equal(info.totalGames,23);
  assert.equal(info.coreCount,5);
  assert.ok(info.totalPhotos>=19);
  assert.ok(await page.locator('.photo').count()>5);
  assert.ok(await page.locator('.game-item').count()>=20);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,type+' no horizontal page overflow');
  await page.screenshot({path:'artifacts/learning-library/'+type+'-gameplay-library.png',fullPage:true});
  await page.locator('#core-only').check();
  assert.equal(await page.locator('.game-item').count(),5);
  await page.locator('.game-item').filter({hasText:'咖啡心语'}).first().click();
  assert.equal(await page.locator('#selection-title').textContent(),'咖啡心语');
  assert.ok(await page.locator('.photo').count()>=2);
  await page.locator('.photo .view').first().click();
  assert.equal(await page.locator('#viewer').evaluate(el=>el.open),true);
  assert.ok((await page.locator('#viewer-source').getAttribute('href')).startsWith('https://'));
  await page.locator('#viewer-close').click();
  assert.equal(await page.locator('#viewer').evaluate(el=>el.open),false);
  assert.deepEqual(errors,[],type+' must not throw JS errors');
  await page.screenshot({path:'artifacts/learning-library/'+type+'-coffee-talk-focus.png'});
  console.log('PASS',type,JSON.stringify({photos:info.totalPhotos,core:5,imagesOpened:true,overflow:false}));
  await context.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
