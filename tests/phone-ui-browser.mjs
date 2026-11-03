import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('site'),types={
  '.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.json':'application/json','.webp':'image/webp','.png':'image/png',
  '.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const p=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!p.startsWith(root+'/')){res.writeHead(403).end();return}
  try{res.writeHead(200,{'content-type':types[extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(readFileSync(p))}
  catch{res.writeHead(404).end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/index.html?scene=classroom';
mkdirSync('artifacts/phone',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
  for(const cfg of [{name:'desktop',width:1280,height:720,mobile:false},
                    {name:'mobile',width:390,height:844,mobile:true}]){
    const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},
      deviceScaleFactor:1,isMobile:cfg.mobile,hasTouch:cfg.mobile});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    await page.locator('#quick-phone').click({timeout:15000});
    await page.locator('#phone-ui').waitFor({state:'visible'});
    const state=await page.evaluate(()=>{
      const n=document.querySelector('#phone-ui'),frame=n.querySelector('.phone-device');
      const screen=n.querySelector('.phone-screen'),root=document.querySelector('#novel-ui');
      const rect=n.getBoundingClientRect(),quick=document.querySelector('#quick-phone').getBoundingClientRect();
      return {ratio:n.offsetWidth/n.offsetHeight,height:n.offsetHeight,rootHeight:root.offsetHeight,
        art:getComputedStyle(frame).backgroundImage,
        imageRect:screen.getBoundingClientRect().toJSON(),
        phoneRect:rect.toJSON(),quickRect:quick.toJSON(),
        shellPseudo:getComputedStyle(frame,'::before').content};
    });
    assert.ok(state.art.includes('char001-cat-ear-shell.webp'),JSON.stringify(state));
    assert.equal(state.shellPseudo,'none','The approved phone has no fabricated CSS ears');
    assert.ok(state.ratio>.47&&state.ratio<.53,'Incorrect smartphone silhouette ratio');
    assert.ok(state.height>state.rootHeight*.7&&state.height<state.rootHeight*.9,
      'Phone is incorrectly scaled for this logical game viewport: '+JSON.stringify(state));
    assert.equal(await page.locator('#phone-ui .phone-charm').count(),0,'Unwanted hanging accessory');
    assert.equal(await page.locator('#phone-ui .phone-dot').count(),6);
    assert.equal(await page.locator('#phone-ui [data-key]').count(),11);
    const r=await page.request.get(new URL('./assets/phones/char001-cat-ear-shell.webp',page.url()).href);
    assert.equal(r.status(),200,'Approved handset image missing from deployed site');
    assert.ok((await r.body()).length>4000,'Handset image was truncated');
    await page.screenshot({path:'artifacts/phone/char001-'+cfg.name+'-lock.png'});
    await page.locator('#phone-ui [data-key="1"]').click();
    assert.equal(await page.locator('#phone-ui .phone-dot[data-filled="true"]').count(),1);
    await page.locator('#phone-ui [data-key="erase"]').click();
    assert.equal(await page.locator('#phone-ui .phone-dot[data-filled="true"]').count(),0);
    await page.locator('#phone-fingerprint').click();
    assert.equal(await page.locator('#phone-ui [data-phone-page="home"]').isVisible(),true);
    await page.screenshot({path:'artifacts/phone/char001-'+cfg.name+'-home.png'});
    await page.locator('#quick-phone').click();
    assert.equal(await page.locator('#phone-ui').isVisible(),false);
    await page.locator('#quick-phone').click();
    for(const ch of '000000')await page.locator('#phone-ui [data-key="'+ch+'"]').click();
    assert.equal(await page.locator('#phone-ui [data-phone-page="home"]').isVisible(),true);
    await page.locator('#quick-backpack').click();
    assert.equal(await page.locator('#phone-ui').isVisible(),false);
    assert.equal(await page.locator('#quick-panel-title').textContent(),'背包');
    assert.deepEqual(errors,[],'Browser runtime errors: '+errors.join('; '));
    console.log('PASS '+cfg.name+' phone shell, responsive display, PIN, fingerprint, app screen and quick-tool lifecycle');
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(ok=>server.close(ok));
}
