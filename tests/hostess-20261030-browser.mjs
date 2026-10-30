import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html;charset=utf-8','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=createServer((req,res)=>{
 try{
  let u=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(u.endsWith('/'))u+='index.html';
  const p=resolve(root,'.'+u);
  if(!p.startsWith(root+'/'))throw Error('path');
  res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(p));
 }catch(e){res.writeHead(404);res.end('missing')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/hostess-new',{recursive:true});
try{
 for(const [device,w,h] of [['desktop',1300,900],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const url='http://127.0.0.1:'+server.address().port+'/pixel-lab/hostess-20261030.html';
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('#figure')?.naturalWidth===384);
  assert.match(await page.locator('#figure').getAttribute('src'),/reference-384x512\.webp/);
  assert.equal(await page.locator('#figure').evaluate(x=>x.naturalHeight),512);
  await page.screenshot({path:'artifacts/hostess-new/'+device+'-color-reference.png',fullPage:true});
  await page.locator('#version').click();
  await page.waitForFunction(()=>document.querySelector('#figure')?.naturalWidth===192);
  assert.match(await page.locator('#figure').getAttribute('src'),/D-192x256\.png/);
  assert.equal(await page.locator('#figure').evaluate(x=>x.naturalHeight),256);
  await page.locator('#figure').click({position:{x:55,y:90}});
  assert.match(await page.locator('#coord').textContent(),/坐标：\d+, \d+/);
  await page.locator('#background').click();
  assert.equal(await page.locator('#figure').evaluate(x=>x.classList.contains('cream')),true);
  await page.locator('#grid').click();
  assert.equal(await page.locator('#grid').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#zoom').evaluate(x=>x.width===256&&x.height===256),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'artifacts/hostess-new/'+device+'-true4color-native.png',fullPage:true});
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/hostess-20261030-quality.html');
  await page.waitForFunction(()=>document.querySelector('#verdict')?.textContent.includes('验收不通过'));
  await page.waitForFunction(()=>document.querySelector('#tiny')?.textContent==='1,206');
  assert.equal(await page.locator('#all').textContent(),'16,724');
  assert.equal(await page.locator('#single').textContent(),'617');
  assert.equal(await page.locator('#heat').evaluate(el=>{
   const d=el.getContext('2d').getImageData(0,0,192,256).data;
   let count=0;for(let i=0;i<192*256;i++){const p=i*4;if(d[p]===255&&d[p+1]===80&&d[p+2]===42)count++;}
   return count;
  }),1206);
  await page.screenshot({path:'artifacts/hostess-new/'+device+'-honest-1to3px-cluster-audit.png',fullPage:true});
  await page.locator('#overlay').click();
  assert.equal(await page.locator('#overlay').getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: new heroine color reference and original indexed four-color pixels loaded on desktop and mobile');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
