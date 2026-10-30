import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';

const root=resolve('site'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=createServer((req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!path.startsWith(root+'/'))throw Error('Path escape');
 const data=readFileSync(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)}
 catch(e){res.writeHead(404);res.end('Not Found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const origin='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/game',{recursive:true});
try{
 for(const [name,w,h] of [['desktop',1440,900],['portrait',390,844],['landscape',844,390],['tablet',768,1024]]){
  const context=await browser.newContext({viewport:{width:w,height:h},isMobile:name!=='desktop',hasTouch:name!=='desktop',deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(origin,{waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('#ambient')?.width>0);
  let result=await page.evaluate(()=>{
    const samples={};
    for(const id of ['ambient','scene']){
      const el=document.getElementById(id),data=el.getContext('2d').getImageData(0,0,el.width,el.height).data,colors=new Set();
      for(let i=0;i<data.length;i+=4)colors.add(Array.from(data.slice(i,i+4)).join(','));
      samples[id]={colors:[...colors].sort(),width:el.width,height:el.height};
    }
    return {samples,viewport:{w:innerWidth,h:innerHeight},window:document.querySelector('.screen-shell').getBoundingClientRect().toJSON(),links:[...document.querySelectorAll('#gameLinks a')].map(a=>a.getAttribute('href'))};
  });
  assert.deepEqual(result.samples.ambient.colors,['242,165,194,255','255,245,230,255']);
  assert.deepEqual(result.samples.scene.colors,['169,186,233,255','242,165,194,255','255,245,230,255','57,54,87,255']);
  assert.equal(result.samples.ambient.width,Math.ceil(result.viewport.w/4));
  assert.equal(result.samples.ambient.height,Math.ceil(result.viewport.h/4));
  assert.ok(result.window.width<result.viewport.w,'Center is a window, not a fullscreen viewport');
  assert.ok(result.window.height<result.viewport.h,'Window leaves ambient stripes outside vertically');
  assert.ok(result.links.includes('./bone-lab/'));
  await page.screenshot({path:'artifacts/game/'+name+'-start.png'});
  await page.getByRole('button',{name:'开始游戏'}).first().click();
  assert.match(await page.locator('#dialogueText').textContent(),/柜台后方的灯/);
  await page.getByRole('button',{name:/继续/}).last().click();
  await page.reload();assert.match(await page.locator('#dialogueText').textContent(),/雨声穿过玻璃/);
  for(let i=0;i<2;i++)await page.getByRole('button',{name:/继续|选择回应/}).last().click();
  await page.getByRole('button',{name:'请他坐下'}).click();
  assert.match(await page.locator('#dialogueText').textContent(),/默默坐在柜台/);
  await page.getByRole('button',{name:'菜单 ≡'}).click();
  await page.getByRole('button',{name:'停止背景'}).click();
  assert.equal(await page.getByRole('button',{name:'启动背景'}).count(),1);
  await page.getByRole('button',{name:'回到标题'}).click();
  assert.match(await page.locator('#speaker').textContent(),/第一幕/);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Game root: 4 palette colors, 4 viewports, state, dialogue, menu and legacy studios PASS');
}finally{await browser.close();await new Promise(done=>server.close(done))}
