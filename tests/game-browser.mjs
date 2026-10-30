import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const p=resolve(root,'.'+(route==='/'?'/index.html':route));
  if(!p.startsWith(root+'/'))throw Error('invalid route');
  res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(p));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(fn=>server.listen(0,'127.0.0.1',fn));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/game',{recursive:true});
const colors=new Set(['57,54,87,255','242,165,194,255','169,186,233,255','255,245,230,255','0,0,0,0']);
async function point(page,x,y){
 const v=await page.evaluate(()=>window.__PAPERWORLD_MENU__);
 const rect=await page.locator('#menu').boundingBox();
 await page.mouse.click(rect.x+x/v.logical[0]*rect.width,rect.y+y/v.logical[1]*rect.height);
}
async function button(page,index){
 const state=await page.evaluate(()=>window.__PAPERWORLD_MENU__);
 const b=state.buttons[index];assert.ok(b,'button '+index+' must be present in '+state.state);
 await point(page,b.x+b.w/2,b.y+b.h/2);
}
async function inState(page,target){
 await page.waitForFunction(state=>window.__PAPERWORLD_MENU__?.state===state&&!window.__PAPERWORLD_MENU__?.transition,target,{timeout:10000});
}
try{
 for(const [name,width,height] of [['portrait',390,844],['landscape',844,390],['tablet',768,1024],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:name!=='desktop',isMobile:name!=='desktop',deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage();const exceptions=[];page.on('pageerror',e=>exceptions.push(String(e)));
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.buttons.length===4);
  const menu=await page.evaluate(()=>{
   const m=window.__PAPERWORLD_MENU__,c=document.getElementById('menu');
   const raw=c.getContext('2d').getImageData(0,0,c.width,c.height).data,found=new Set();
   for(let i=0;i<raw.length;i+=4)found.add([raw[i],raw[i+1],raw[i+2],raw[i+3]].join(','));
   return {state:m.state,buttons:m.buttons,logical:m.logical,palette:[...found]};
  });
  assert.equal(menu.state,'menu');assert.equal(menu.buttons.length,4);
  assert.ok(menu.palette.every(c=>colors.has(c)),'main menu uses exact four inks');
  assert.ok(menu.buttons.every(b=>b.y>=0&&b.y+b.h<=menu.logical[1]));
  await page.screenshot({path:'artifacts/game/'+name+'-menu.png'});

  // The simple click-pixel feedback applies to empty screen too.
  await point(page,menu.logical[0]*.49,15);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.particleCount===6);
  await page.waitForTimeout(320);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.particleCount),0);
  await button(page,1);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.state),'menu','continue without save is disabled');

  await button(page,0);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.transition?.phase==='close');
  await page.screenshot({path:'artifacts/game/'+name+'-slow-page-transition.png'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.state==='intro'&&window.__PAPERWORLD_MENU__?.intro?.loaded);
  await inState(page,'intro');
  const first=await page.evaluate(()=>window.__PAPERWORLD_MENU__.intro);
  assert.equal(first.phase,'silhouette','hostess appears first as grayscale silhouette');
  await page.screenshot({path:'artifacts/game/'+name+'-gray-silhouette.png'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.phase==='reveal',{timeout:4000});
  await page.screenshot({path:'artifacts/game/'+name+'-pixel-portrait-reveal.png'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.phase==='talk',{timeout:4000});
  await page.waitForTimeout(120);
  const story=await page.evaluate(()=>{
    const c=document.getElementById('menu'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,s=new Set();
    for(let i=0;i<d.length;i+=4)s.add([d[i],d[i+1],d[i+2],d[i+3]].join(','));
    return {scene:window.__PAPERWORLD_MENU__,colors:[...s]};
  });
  assert.ok(story.colors.every(c=>colors.has(c)),'fully revealed portrait and UI must be EXACT four colors');
  assert.deepEqual(story.scene.intro.portrait,[192,256]);
  await page.screenshot({path:'artifacts/game/'+name+'-hostess-dialogue.png'});

  // Click dialogue once to complete typed text, again for next sentence.
  const logical=story.scene.logical;
  const advance={x:logical[0]*.5,y:logical[1]*.53};
  await point(page,advance.x,advance.y);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.intro.shown),
    await page.evaluate(()=>window.__PAPERWORLD_MENU__.intro.full),'first tap reveals whole current sentence');
  await point(page,advance.x,advance.y);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.line===1);
  // Change automatic reading in its actual bubble option.
  const dims=await page.evaluate(()=>{
    const [W,H]=window.__PAPERWORLD_MENU__.logical,land=W/H>1.25;
    const x=land?Math.round(W*.49):9, y=land?12:H-139;
    const w=land?Math.round(W*.49-8):W-18;
    return {x:x+w-33,y:y+18};
  });
  await point(page,dims.x,dims.y);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.intro.auto),false,'auto mode can be disabled');
  await point(page,advance.x,advance.y);
  await point(page,advance.x,advance.y);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.line===2);
  await point(page,dims.x,dims.y);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.intro.auto),true);
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.intro?.line>=3,{timeout:9000});
  await page.screenshot({path:'artifacts/game/'+name+'-hostess-auto-next-line.png'});

  // Return to menu and continue from saved chapter.
  await point(page,30,16);
  await inState(page,'menu');
  await button(page,1);
  await inState(page,'intro');
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.intro.phase),'silhouette',
    'continuing a saved start always replays hostess entry sequence');
  await page.keyboard.press('Escape');
  await inState(page,'menu');
  await button(page,2);
  await inState(page,'settings');
  const was=await page.evaluate(()=>window.__PAPERWORLD_MENU__.prefs.particles);
  await button(page,1);
  assert.equal(await page.evaluate(()=>window.__PAPERWORLD_MENU__.prefs.particles),!was);
  await button(page,1);
  await button(page,3);
  await inState(page,'menu');
  assert.deepEqual(exceptions,[],'no runtime JS errors');
  await context.close();
 }
 console.log('PASS: real pixel hostess, grayscale silhouette then reveal, integer breathing, typewriter+auto dialogue, four viewports');
}finally{
 await browser.close();await new Promise(fn=>server.close(fn));
}
