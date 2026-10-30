import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const urlPath=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+(urlPath==='/'?'/index.html':urlPath));
  if(!path.startsWith(root+'/'))throw Error('path escape');
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/game',{recursive:true});
const origin='http://127.0.0.1:'+server.address().port+'/';
const allowed=new Set(['57,54,87,255','242,165,194,255','169,186,233,255','255,245,230,255','0,0,0,0']);
async function clickGame(page,index){
 const b=await page.evaluate(i=>window.__PAPERWORLD_MENU__.buttons[i],index);
 const pos=await page.locator('#menu').boundingBox();
 const size=await page.evaluate(()=>window.__PAPERWORLD_MENU__.logical);
 assert.ok(b&&pos,'menu button '+index+' exists');
 const px=pos.x+(b.x+b.w/2)/size[0]*pos.width,py=pos.y+(b.y+b.h/2)/size[1]*pos.height;
 await page.mouse.click(px,py);
 await page.waitForTimeout(80);
}
try{
 for(const [name,width,height] of [['portrait',390,844],['landscape',844,390],['tablet',768,1024],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:name!=='desktop',isMobile:name!=='desktop',deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(origin,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.buttons.length===4);
  await page.waitForTimeout(180);
  const info=await page.evaluate(()=>{
   const c=document.querySelector('#menu'),bg=document.querySelector('#background');
   const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const inkSet=new Set();
   for(let i=0;i<data.length;i+=4)inkSet.add(data[i]+','+data[i+1]+','+data[i+2]+','+data[i+3]);
   const bdata=bg.getContext('2d').getImageData(0,0,bg.width,bg.height).data;
   const colors=new Set();
   for(let i=0;i<bdata.length;i+=4)colors.add(bdata[i]+','+bdata[i+1]+','+bdata[i+2]+','+bdata[i+3]);
   const rects=window.__PAPERWORLD_MENU__.buttons;
   return {colors:[...inkSet],background:[...colors],buttons:rects,logical:[c.width,c.height],
    state:window.__PAPERWORLD_MENU__.state,layout:rects.map(b=>b.y+b.h),
    viewport:[innerWidth,innerHeight],canvasCount:document.querySelectorAll('canvas').length,
    drawCount:window.__PAPERWORLD_BACKGROUND__.redraws,
    bgAnimation:getComputedStyle(bg).animationDuration};
  });
  assert.equal(info.canvasCount,2,'animated background + 100% procedural menu overlay');
  assert.equal(info.state,'menu');
  assert.equal(info.buttons.length,4);
  assert.ok(info.colors.every(c=>allowed.has(c)),'only four exact official pixels + transparency: '+info.colors);
  assert.ok(info.colors.includes('242,165,194,255'),'the primary button is pink');
  assert.deepEqual(info.background.sort(),['169,186,233,255','255,245,230,255']);
  assert.equal(info.bgAnimation,'8s');
  assert.ok(info.buttons.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=info.logical[0]&&b.y+b.h<=info.logical[1]),'all tap targets fit viewport');
  assert.ok(info.buttons.every(b=>b.h*2>=48),'tap targets at least 48 CSS px tall');
  for(let i=0;i<info.buttons.length-1;i++)assert.ok(info.buttons[i].y+info.buttons[i].h<info.buttons[i+1].y);
  await page.screenshot({path:'artifacts/game/'+name+'-main-menu.png'});
  await clickGame(page,1); // Continue cannot fabricate a saved game.
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'menu');
  await clickGame(page,0); // Start creates a persisted starting point.
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'play');
  await page.screenshot({path:'artifacts/game/'+name+'-prologue.png'});
  await clickGame(page,0); // Back to menu.
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'menu');
  await clickGame(page,1); // Continue now truly resumes the created journey.
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'play');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(90);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'menu');
  await clickGame(page,2);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'settings');
  const before=await page.evaluate(()=>window.__PAPERWORLD_MENU__.prefs.particles);
  await clickGame(page,1);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.prefs.particles),!before);
  await page.screenshot({path:'artifacts/game/'+name+'-settings.png'});
  await clickGame(page,3);
  await clickGame(page,3);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'exit');
  await clickGame(page,0);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'menu');
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_BACKGROUND__.redraws),info.drawCount,'the moving stripe texture must not be repainted');
  assert.deepEqual(errors,[],'no Javascript errors');
  await context.close();
 }
 console.log('PASS: procedural pixel menu + four exact inks + 4 devices + touch + saves + settings + particles');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
