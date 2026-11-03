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
  try{const data=readFileSync(p);res.writeHead(200,{'content-type':types[extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(data)}
  catch{if(!res.headersSent)res.writeHead(404);res.end('not found')}
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
    // Phone must own RIGHT ONLY: first hide dialogue so there is no
    // independent, legitimate bottom subtitle smoke.
    await page.locator('#menu-toggle').click();
    await page.locator('#hide-button').click();
    assert.equal(await page.locator('#dialogue').isVisible(),false);
    await page.waitForFunction(()=>document.querySelector('.ui-fog-band[data-edge="bottom"]').dataset.active==='false');
    await page.locator('#quick-phone').click({timeout:15000});
    await page.locator('#phone-ui').waitFor({state:'visible'});
    const state=await page.evaluate(()=>{
      const n=document.querySelector('#phone-ui'),frame=n.querySelector('.phone-device');
      const screen=n.querySelector('.phone-screen'),root=document.querySelector('#novel-ui');
      const rect=n.getBoundingClientRect(),quick=document.querySelector('#quick-phone').getBoundingClientRect();
      const shell=frame.querySelector('.phone-shell-art');
      return {ratio:n.offsetWidth/n.offsetHeight,height:n.offsetHeight,rootHeight:root.offsetHeight,
        art:shell?.currentSrc||'',imageLoaded:!!shell?.complete&&shell.naturalWidth>0,
        imageRect:screen.getBoundingClientRect().toJSON(),
        phoneRect:rect.toJSON(),quickRect:quick.toJSON(),
        shellPseudo:getComputedStyle(frame,'::before').content};
    });
    assert.ok(state.art.includes('char001-cat-ear-shell.webp')&&state.imageLoaded,
      'Original cat-ear phone image must be visibly loaded: '+JSON.stringify(state));
    assert.equal(state.shellPseudo,'none','The approved phone has no fabricated CSS ears');
    assert.ok(state.ratio>.47&&state.ratio<.53,'Incorrect smartphone silhouette ratio');
    assert.ok(state.height>state.rootHeight*.87&&state.height<=state.rootHeight*.92,
      'Phone is incorrectly scaled for this logical game viewport: '+JSON.stringify(state));
    assert.equal(await page.locator('#phone-ui .phone-charm').count(),0,'Unwanted hanging accessory');
    assert.equal(await page.locator('#phone-ui .phone-dot').count(),6);
    assert.equal(await page.locator('#phone-ui [data-key]').count(),11);
    const r=await page.request.get(new URL('./assets/phones/char001-cat-ear-shell.webp',page.url()).href);
    assert.equal(r.status(),200,'Approved handset image missing from deployed site');
    assert.ok((await r.body()).length>4000,'Handset image was truncated');
    // Verify native smoke pixels, not just a CSS class. The opened phone
    // must create RIGHT-side smoke ONLY, with absolutely no bottom smoke
    // activation. Preserve the PIN keypad center.
    await page.waitForTimeout(1200);
    const phoneFog=await page.evaluate(()=>{
      const n=document.querySelector('#phone-ui');
      const root=document.querySelector('#novel-ui');
      const base=document.querySelector('#ui-edge-fog');
      const over=document.querySelector('#ui-phone-fog');
      const w=over.width,h=over.height;
      const x=n.offsetLeft*w/root.clientWidth;
      const y=(n.offsetTop-n.offsetHeight*.5)*h/root.clientHeight;
      const pw=n.offsetWidth*w/root.clientWidth;
      const ph=n.offsetHeight*h/root.clientHeight;
      const pixel=(canvas,xf,yf)=>{
        const xi=Math.max(0,Math.min(canvas.width-1,Math.floor(xf)));
        const yi=Math.max(0,Math.min(canvas.height-1,Math.floor(yf)));
        return canvas.getContext('2d',{willReadFrequently:true}).getImageData(xi,yi,1,1).data[3];
      };
      return {
        rightActive:document.querySelector('[data-edge="right"].ui-fog-band')?.dataset.active,
        bottomActive:document.querySelector('[data-edge="bottom"].ui-fog-band')?.dataset.active,
        overlapRight:pixel(over,x+pw*.985,y+ph*.53),
        overlapKeypad:pixel(over,x+pw*.5,y+ph*.52),
        rightFogBehind:pixel(base,x+pw*.90,y+ph*.50),
        middleClassroom:pixel(base,w*.52,h*.42),
        overlays:{back:getComputedStyle(base).zIndex,front:getComputedStyle(over).zIndex,
          phone:getComputedStyle(n).zIndex}
      };
    });
    assert.equal(phoneFog.rightActive,'true','The right fog did not activate with the phone');
    assert.equal(phoneFog.bottomActive,'false',
      'Opening the right-hand phone illegally activates the bottom smoke: '+JSON.stringify(phoneFog));
    assert.ok(phoneFog.rightFogBehind>30,'The right side lacks the native smoky foundation: '+JSON.stringify(phoneFog));
    assert.ok(phoneFog.overlapRight>8,'The native fog is not covering the phone right rim: '+JSON.stringify(phoneFog));
    assert.equal(phoneFog.overlapKeypad,0,
      'The new foreground fog masks the center of the PIN keypad: '+JSON.stringify(phoneFog));
    assert.equal(phoneFog.middleClassroom,0,
      'A black rectangular plate has spilled over the classroom: '+JSON.stringify(phoneFog));
    assert.ok(+phoneFog.overlays.front>+phoneFog.overlays.phone,
      'The foreground fog is still behind the phone: '+JSON.stringify(phoneFog));
    await page.screenshot({path:'artifacts/phone/char001-'+cfg.name+'-native-fog-lock.png'});
    await page.locator('#phone-ui [data-key="1"]').click();
    assert.equal(await page.locator('#phone-ui .phone-dot[data-filled="true"]').count(),1);
    await page.locator('#phone-ui [data-key="erase"]').click();
    assert.equal(await page.locator('#phone-ui .phone-dot[data-filled="true"]').count(),0);
    await page.locator('#phone-fingerprint').click();
    assert.equal(await page.locator('#phone-ui [data-phone-page="home"]').isVisible(),true);
    await page.screenshot({path:'artifacts/phone/char001-'+cfg.name+'-home.png'});
    await page.locator('#quick-phone').click();
    assert.equal(await page.locator('#phone-ui').isVisible(),false);
    await page.waitForTimeout(200);
    const residual=await page.evaluate(()=>{
      const c=document.getElementById('ui-phone-fog');
      const px=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
      for(let i=3;i<px.length;i+=4)if(px[i])return true;
      return false;
    });
    assert.equal(residual,false,'Closing phone leaves a foreground fog ghost behind');
    await page.locator('#quick-phone').click();
    for(const ch of '000000')await page.locator('#phone-ui [data-key="'+ch+'"]').click();
    assert.equal(await page.locator('#phone-ui [data-phone-page="home"]').isVisible(),true);
    await page.locator('#quick-backpack').click();
    assert.equal(await page.locator('#phone-ui').isVisible(),false);
    assert.equal(await page.locator('#quick-panel-title').textContent(),'背包');
    // Hide/show dialogue retains its original bottom fog lifecycle.
    await page.locator('#menu-toggle').click();
    await page.locator('#hide-button').click();
    await page.waitForFunction(()=>document.querySelector('.ui-fog-band[data-edge="bottom"]').dataset.active==='true');
    assert.equal(await page.locator('#dialogue').isVisible(),true);
    assert.deepEqual(errors,[],'Browser runtime errors: '+errors.join('; '));
    console.log('PASS '+cfg.name+' phone shell, responsive display, PIN, fingerprint, app screen and quick-tool lifecycle');
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(ok=>server.close(ok));
}
