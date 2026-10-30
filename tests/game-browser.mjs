import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const urlPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(urlPath==='/'?'/index.html':urlPath));
  if(!path.startsWith(root+'/'))throw Error('bad route');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const origin='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/game',{recursive:true});
const official=new Set(['57,54,87,255','242,165,194,255','169,186,233,255','255,245,230,255','0,0,0,0']);
const state=page=>page.evaluate(()=>window.__PAPERWORLD_MENU__);
async function clicked(page,i){
 const m=await state(page),b=m.buttons[i];
 assert.ok(b,'button '+i+' exists in '+m.state);
 const r=await page.locator('#menu').boundingBox();
 await page.mouse.click(r.x+(b.x+b.w/2)/m.logical[0]*r.width,r.y+(b.y+b.h/2)/m.logical[1]*r.height);
}
async function waitScene(page,which){
 await page.waitForFunction(name=>window.__PAPERWORLD_MENU__?.state===name&&!window.__PAPERWORLD_MENU__?.transition,which,{timeout:10000});
}
async function exactCanvasColors(page){
 return page.evaluate(()=>{
  const c=document.querySelector('#menu'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,colors=new Set();
  for(let i=0;i<d.length;i+=4)colors.add([d[i],d[i+1],d[i+2],d[i+3]].join(','));
  return [...colors];
 });
}
try{
 for(const [screen,width,height] of [['portrait',390,844],['landscape',844,390],['tablet',768,1024],['desktop',1440,900]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:screen!=='desktop',isMobile:screen!=='desktop',reducedMotion:'no-preference'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(origin,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.buttons?.length===5);
  const home=await state(page);
  assert.equal(home.state,'menu');
  assert.ok(home.buttons.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=home.logical[0]&&b.y+b.h<=home.logical[1]));
  assert.ok((await exactCanvasColors(page)).every(c=>official.has(c)));
  await page.screenshot({path:'artifacts/game/'+screen+'-home.png'});

  // Any touch, even blank space, should show just a few visible square pixels.
  await page.mouse.click(width/2,26);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.particleCount===7);
  await page.waitForTimeout(370);
  assert.equal((await state(page)).particleCount,0);
  // Real three-dimensional scene: WebGL triangles, depth, and independent yaw/pitch/roll.
  await clicked(page,2);
  await waitScene(page,'world');
  await page.waitForFunction(()=>window.__PAPERWORLD_WORLD3D__?.triangles>200);
  assert.ok((await page.locator('#pw-world-canvas').evaluate(el=>el.width))>30);
  assert.ok((await page.locator('#pw-world-canvas').evaluate(el=>el.height))>30);
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-real-perspective.png'});
  const neutral=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.pose);
  await page.keyboard.press('e');
  await page.waitForTimeout(260);
  const side=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.pose);
  assert.ok(side.roll>neutral.roll,'Q/E roll rotates around forward axis');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(260);
  const yawed=await page.evaluate(()=>window.__PAPERWORLD_WORLD3D__.pose);
  assert.ok(yawed.yaw>side.yaw,'3D camera turns around vertical Z axis');
  await page.screenshot({path:'artifacts/game/'+screen+'-3d-banked-turn.png'});
  await page.locator('#pw-motion-center').click();
  await page.waitForTimeout(310);
  await page.locator('#pw-motion-back').click();
  await waitScene(page,'menu');

  await clicked(page,0);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.transition?.phase==='close');
  await page.screenshot({path:'artifacts/game/'+screen+'-transition.png'});
  await waitScene(page,'intro');
  const distant=(await state(page)).intro;
  assert.equal(distant.phase,'approaching');
  assert.ok(distant.scale<=.40,'owner initially appears small and far from camera');
  await page.screenshot({path:'artifacts/game/'+screen+'-far-owner.png'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.phase==='talk',{timeout:6500});
  const near=(await state(page)).intro;
  assert.equal(near.scale,1,'owner reaches near counter at full size');
  assert.ok((await exactCanvasColors(page)).every(c=>official.has(c)),'no gray-fill or antialias fifth ink');
  await page.screenshot({path:'artifacts/game/'+screen+'-owner-near.png'});
  assert.equal(await page.locator('#pw-dialogue').isVisible(),true,'crisp DOM speech bubble appears after approach');
  const breatheSamples=[];
  for(let i=0;i<8;i++){
   breatheSamples.push((await state(page)).intro.breathingY);
   await page.waitForTimeout(240);
  }
  assert.ok(new Set(breatheSamples).size>1,'owner breathes vertically up/down, not sideways');
  assert.equal(await page.locator('#pw-dialogue-auto').count(),0,'no auto-play switch must remain');
  // No timer may advance the text; 10 Chinese chars/sec lets users read.
  const before=(await state(page)).intro;
  await page.waitForTimeout(350);
  const slower=(await state(page)).intro;
  assert.equal(slower.line,before.line,'text cannot skip a line by itself');
  assert.ok(slower.shown-before.shown<=5,'typewriter is deliberately slower than old 25 chars/sec');
  await page.waitForTimeout(2300);
  assert.equal((await state(page)).intro.line,before.line,'even completed text must wait for a tap');
  await page.screenshot({path:'artifacts/game/'+screen+'-manual-slow-dialogue.png'});
  // Two owner messages: first tap completes current sentence, next tap advances.
  for(let i=0;i<6;i++){
   const snap=await state(page);
   if(snap.state==='lease'||snap.transition)break;
   await page.locator('#pw-dialogue-next').click();
   await page.waitForTimeout(65);
  }
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.state==='lease'&&window.__PAPERWORLD_MENU__?.lease?.visible,{timeout:10000});
  assert.equal(await page.locator('#pw-form-step1').isVisible(),true);
  await page.screenshot({path:'artifacts/game/'+screen+'-create-character.png'});

  await page.locator('#pw-next').click(); // Missing name must not pass.
  assert.equal((await state(page)).lease.step,1);
  assert.ok((await page.locator('#pw-form-errors').textContent()).includes('昵称'));
  await page.locator('#pw-nickname').fill('小满');
  await page.locator('#pw-hair').selectOption('双马尾');
  await page.locator('#pw-outfit').selectOption('雾蓝');
  await page.locator('#pw-origin').selectOption('旅行商人');
  assert.equal(await page.locator('#pw-nickname').inputValue(),'小满');
  await page.locator('#pw-next').click();
  await page.waitForFunction(expected=>window.__PAPERWORLD_MENU__?.lease?.step===expected,2,{timeout:3000});
  assert.equal((await state(page)).lease.step,2);
  await page.locator('#pw-next').click(); // Missing shop name must not pass.
  assert.equal((await state(page)).lease.step,2);
  await page.locator('#pw-shopName').fill('蓝铃杂货店');
  await page.locator('#pw-business').selectOption('杂货');
  await page.locator('#pw-district').selectOption('广场');
  await page.locator('#pw-term').selectOption('90');
  assert.ok((await page.locator('#pw-rent').textContent()).includes('770'));
  await page.screenshot({path:'artifacts/game/'+screen+'-rent-shop.png'});
  await page.locator('#pw-next').click();
  await page.waitForFunction(expected=>window.__PAPERWORLD_MENU__?.lease?.step===expected,3,{timeout:3000});
  assert.equal((await state(page)).lease.step,3);
  assert.ok((await page.locator('#pw-contract-details').textContent()).includes('蓝铃杂货店'));
  await page.screenshot({path:'artifacts/game/'+screen+'-verify-contract.png'});
  await page.locator('#pw-next').click();
  await page.waitForFunction(expected=>window.__PAPERWORLD_MENU__?.lease?.step===expected,4,{timeout:3000});
  assert.equal((await state(page)).lease.step,4);
  assert.ok((await state(page)).lease.hasContract);
  assert.ok((await page.locator('#pw-receipt-details').textContent()).includes('PW-'));
  await page.screenshot({path:'artifacts/game/'+screen+'-rental-receipt.png'});

  // Return and resume: do not force replay of fictional introduction.
  await page.locator('#pw-prev').click();
  await waitScene(page,'menu');
  await clicked(page,1);
  await waitScene(page,'lease');
  assert.equal((await state(page)).lease.step,4,'continue directly opens existing lease receipt');
  await page.locator('#pw-prev').click();await waitScene(page,'menu');
  await clicked(page,3);await waitScene(page,'settings');
  await clicked(page,3);await waitScene(page,'menu');
  if(screen==='portrait'){
    // The PixelLab inspector must show the very SAME extracted sprite as the
    // in-game hostess, and keep substantial internal purple pupil/outline ink.
    await page.goto(origin+'pixel-lab/hostess-matte.html',{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent.startsWith('通过'),{timeout:10000});
    const studio=await page.locator('#status').textContent();
    const retained=Number(studio.match(/保留深紫暗部 (\d+)/)?.[1]);
    assert.ok(retained>500,'dark eyelashes/pupils and clothes must not become transparent');
    assert.ok(studio.includes('其他颜色/半透明 0'));
    await page.screenshot({path:'artifacts/game/pixel-lab-hostess-transparent-cutout.png'});
    await page.locator('#grid-toggle').click();
    await page.screenshot({path:'artifacts/game/pixel-lab-hostess-eyes-pixel-grid.png'});
  }
  assert.deepEqual(errors,[],'runtime must not throw errors');
  await ctx.close();
 }
 console.log('PASS: owner alpha matte keeps inner pupils; no autoplay; slow manual typewriter and shop registration on 4 viewports');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
